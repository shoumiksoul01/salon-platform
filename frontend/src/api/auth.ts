import { getMockMode, mockDelay } from './mock'
import { getSupabase } from './supabaseClient'

// Mock data for the auth functions that are not wired yet.
// registerAccount is real (Supabase Auth). The others are wired in their own commits.
const USE_MOCK = true

export type RegisterRole = 'customer' | 'owner'
export type UserRole = 'customer' | 'owner' | 'staff'

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
  role: UserRole
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

// AUTH-03 (C-03): log in with email and password using Supabase Auth.
// The password goes to Supabase only and is never stored by our code.
// The role comes from the signup data, which a database trigger copied into profiles.
// It is only used to choose the landing page. Route guards must not rely on it.
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

  const meta = data.user.user_metadata as { full_name?: string; role?: string }
  const role: UserRole =
    meta.role === 'owner' || meta.role === 'staff' ? meta.role : 'customer'
  return { full_name: meta.full_name ?? cleanEmail, role }
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