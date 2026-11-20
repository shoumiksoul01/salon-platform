import { getMockMode, mockDelay } from './mock'

// Mock or real data. Flip to false in the wire-up commit for registration and login.
const USE_MOCK = true

export type RegisterRole = 'customer' | 'owner'
export type UserRole = 'customer' | 'owner' | 'staff'

export interface RegisterInput {
  full_name: string
  phone: string
  email: string | null
  password: string
  role: RegisterRole
}

export interface RegisterResult {
  phone: string
  otp_sent: boolean
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
  | 'failed'

export class AuthError extends Error {
  code: AuthErrorCode

  constructor(code: AuthErrorCode) {
    super(code)
    this.code = code
  }
}

// In the mock, this number is always "already registered", so the error state can be checked by hand.
const TAKEN_PHONE = '01700000000'
// In the mock, this is the only correct OTP code.
const MOCK_OTP = '123456'
// Mock accounts for the login page. They all use the same password.
const DEMO_PASSWORD = 'password123'
const DEMO_ACCOUNTS: Record<string, LoginResult | undefined> = {
  '01712345678': { full_name: 'Demo Customer', role: 'customer' },
  '01812345678': { full_name: 'Demo Owner', role: 'owner' },
  '01612345678': { full_name: 'Demo Staff', role: 'staff' },
}
// In the mock, this account exists but its phone number is not verified yet.
const UNVERIFIED_PHONE = '01900000000'
const PASSWORD_MIN = 8

function normalisePhone(phone: string): string {
  return phone.replace(/^\+?88/, '')
}

// AUTH-01: create an account and send an OTP code to the phone.
// The password is sent to the server only, and is never stored in the browser.
export async function registerAccount(input: RegisterInput): Promise<RegisterResult> {
  if (USE_MOCK) {
    return mockDelay(() => {
      if (getMockMode() === 'error') throw new AuthError('failed')
      if (normalisePhone(input.phone) === TAKEN_PHONE) throw new AuthError('phone_taken')
      return { phone: normalisePhone(input.phone), otp_sent: true }
    })
  }
  throw new Error('The real register API is not wired yet')
}

// AUTH-02: check the 6-digit code that was sent to the phone.
export async function verifyOtp(phone: string, code: string): Promise<{ verified: boolean }> {
  if (USE_MOCK) {
    return mockDelay(() => {
      if (getMockMode() === 'error') throw new AuthError('failed')
      if (code !== MOCK_OTP) throw new AuthError('wrong_code')
      return { verified: true }
    })
  }
  throw new Error(`The real OTP API is not wired yet (${phone})`)
}

// AUTH-02: send a new code to the same phone.
export async function resendOtp(phone: string): Promise<RegisterResult> {
  if (USE_MOCK) {
    return mockDelay(() => {
      if (getMockMode() === 'error') throw new AuthError('failed')
      return { phone: normalisePhone(phone), otp_sent: true }
    })
  }
  throw new Error('The real OTP API is not wired yet')
}

// AUTH-03: log in with a phone number and a password.
// The password is sent to the server only, and is never stored in the browser.
export async function loginAccount(phone: string, password: string): Promise<LoginResult> {
  if (USE_MOCK) {
    return mockDelay(() => {
      if (getMockMode() === 'error') throw new AuthError('failed')
      const number = normalisePhone(phone)
      if (number === UNVERIFIED_PHONE) throw new AuthError('not_verified')
      const account = DEMO_ACCOUNTS[number]
      if (!account || password !== DEMO_PASSWORD) throw new AuthError('invalid_credentials')
      return account
    })
  }
  throw new Error('The real login API is not wired yet')
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