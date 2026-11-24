import type { User } from '@supabase/supabase-js'
import { getMockMode, mockDelay } from './mock'
import { getSupabase } from './supabaseClient'

// Mock data for the auth functions that are not wired yet.
// registerAccount is real (Supabase Auth). The others are wired in their own commits.
const USE_MOCK = true

export type RegisterRole = 'customer' | 'owner'
export type UserRole = 'customer' | 'owner' | 'staff'
// The role stored in the profiles table. Admin accounts are never created from the signup form.
export type ProfileRole = UserRole | 'admin'

export interface RegisterInput {
  full_name: string
  phone: string
  email: string
  password: string
  role: RegisterRole
}

export interface RegisterResult {
  phone: string
  otp_sent: boolean
}

export interface SignUpResult extends RegisterResult {
  email: string
}

export interface LoginResult {
  full_name: string
  role: ProfileRole
}

// The logged-in user: auth data plus the name and role from the profiles row.
export interface SessionUser {
  id: string
  email: string
  full_name: string
  role: ProfileRole
}

export type AuthErrorCode =
  | 'phone_taken'
  | 'wrong_code'
  | 'invalid_credentials'
  | 'not_verified'
  | 'rate_limited'
  | 'failed'

export class AuthError extends Error {
  code: AuthErrorCode

  constructor(code: AuthErrorCode) {
    super(code)
    this.code = code
  }
}

// In the mock, this is the only correct OTP code.
const MOCK_OTP = '123456'
// Mock accounts for the login page. They all use the same password.


// In the mock, this account exists but its phone number is not verified yet.
const PASSWORD_MIN = 8

function normalisePhone(phone: string): string {
  return phone.replace(/^\+?88/, '')
}

// AUTH-01 (C-01): create the account with Supabase Auth and send a 6-digit code to the email.
// The name, phone and role go in as signup data; a database trigger copies them into
// public.profiles. The trigger only accepts the roles customer and owner.
// The password goes to Supabase only and is never stored in the browser.
// With "Confirm email" on, Supabase answers the same way for an email that already
// has an account, so the page cannot tell the user that an email is taken.
export async function registerAccount(input: RegisterInput): Promise<SignUpResult> {
  const phone = normalisePhone(input.phone)
  const email = input.email.trim().toLowerCase()

  const { error } = await getSupabase().auth.signUp({
    email,
    password: input.password,
    options: {
      data: { full_name: input.full_name, phone, role: input.role },
    },
  })

  if (error) {
    if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
      throw new AuthError('rate_limited')
    }
    throw new AuthError('failed')
  }
  return { phone, email, otp_sent: true }
}

// AUTH-02: check the 6-digit code that was sent to the phone.
// AUTH-02 (C-02): check the 6-digit code that was emailed at signup.
// Supabase treats a wrong code and an expired code the same way, so both are wrong_code.
// A correct code also confirms the email and starts a session in this browser.
export async function verifyOtp(email: string, code: string): Promise<{ verified: boolean }> {
  const { error } = await getSupabase().auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code,
    type: 'signup',
  })

  if (error) {
    if (error.status === 429 || error.code === 'over_request_rate_limit') {
      throw new AuthError('rate_limited')
    }
    if (error.code === 'otp_expired' || (error.status && error.status < 500)) {
      throw new AuthError('wrong_code')
    }
    throw new AuthError('failed')
  }
  return { verified: true }
}

// AUTH-02: send a new signup code to the same email.
export async function resendOtp(email: string): Promise<void> {
  const { error } = await getSupabase().auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
  })

  if (error) {
    if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
      throw new AuthError('rate_limited')
    }
    throw new AuthError('failed')
  }
}

function toProfileRole(value: unknown): ProfileRole {
  return value === 'owner' || value === 'staff' || value === 'admin' ? value : 'customer'
}

// The logged-in user with the name and role from the profiles row. A user can read only
// their own row (row level security), and cannot change their role. If the row cannot be
// read, the role falls back to customer, the lowest one, and the name to the signup name.
async function loadSessionUser(user: User | null): Promise<SessionUser | null> {
  if (!user) return null

  const { data } = await getSupabase()
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .maybeSingle()
  const profile = data as { full_name?: string; role?: string } | null

  const email = user.email ?? ''
  const signupName = (user.user_metadata as { full_name?: string }).full_name
  return {
    id: user.id,
    email,
    full_name: profile?.full_name ?? signupName ?? email,
    role: toProfileRole(profile?.role),
  }
}

// AUTH-03 (C-03): log in with email and password using Supabase Auth.
// The password goes to Supabase only and is never stored by our code.
// The role comes from the profiles row (not from the signup data). It chooses the landing
// page here, and route guards must read it the same way (C-06).
export async function loginAccount(email: string, password: string): Promise<LoginResult> {
  const cleanEmail = email.trim().toLowerCase()
  const { data, error } = await getSupabase().auth.signInWithPassword({
    email: cleanEmail,
    password,
  })

  if (error) {
    if (error.code === 'email_not_confirmed') {
      // Send a fresh code so the user can finish verifying on the OTP page.
      await resendOtp(cleanEmail).catch(() => undefined)
      throw new AuthError('not_verified')
    }
    if (error.status === 429 || error.code === 'over_request_rate_limit') {
      throw new AuthError('rate_limited')
    }
    if (error.code === 'invalid_credentials') {
      throw new AuthError('invalid_credentials')
    }
    throw new AuthError('failed')
  }

  const profile = await loadSessionUser(data.user)
  return { full_name: profile?.full_name ?? cleanEmail, role: profile?.role ?? 'customer' }
}

function tryGetSupabase() {
  try {
    return getSupabase()
  } catch {
    return null
  }
}

// C-03 part 2: tells the caller who is logged in now and again whenever that changes
// (login, logout, a session restored after a reload). Returns a function that stops watching.
// Without frontend/.env the app has no Supabase, so it reports "nobody" once and stops.
export function watchSession(onChange: (user: SessionUser | null) => void): () => void {
  const supabase = tryGetSupabase()
  if (!supabase) {
    queueMicrotask(() => onChange(null))
    return () => undefined
  }

  let latest = 0
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED') return
    latest += 1
    const mine = latest
    // Wait one tick: supabase-js can lock up when this callback calls it again straight away.
    setTimeout(() => {
      loadSessionUser(session?.user ?? null)
        .then((user) => {
          if (mine === latest) onChange(user)
        })
        .catch(() => {
          if (mine === latest) onChange(null)
        })
    }, 0)
  })
  return () => data.subscription.unsubscribe()
}

// C-03 part 2: log out of this browser only.
export async function logoutAccount(): Promise<void> {
  const { error } = await getSupabase().auth.signOut({ scope: 'local' })
  if (error) throw new AuthError('failed')
}

// AUTH-04, step 1: send a reset code to the phone.
// The real API must answer the same way whether or not the number has an account.
export async function requestPasswordReset(phone: string): Promise<RegisterResult> {
  if (USE_MOCK) {
    return mockDelay(() => {
      if (getMockMode() === 'error') throw new AuthError('failed')
      return { phone: normalisePhone(phone), otp_sent: true }
    })
  }
  throw new Error('The real reset API is not wired yet')
}

// AUTH-04, step 2: check the code and set the new password.
// The password is sent to the server only, and is never stored in the browser.
export async function resetPassword(
  phone: string,
  code: string,
  password: string,
): Promise<{ reset: boolean }> {
  if (USE_MOCK) {
    return mockDelay(() => {
      if (getMockMode() === 'error') throw new AuthError('failed')
      if (code !== MOCK_OTP) throw new AuthError('wrong_code')
      if (password.length < PASSWORD_MIN) throw new AuthError('failed')
      return { reset: true }
    })
  }
  throw new Error(`The real reset API is not wired yet (${phone})`)
}