import { getMockMode, mockDelay } from './mock'

// Mock or real data. Flip to false in the wire-up commit for registration.
const USE_MOCK = true

export type RegisterRole = 'customer' | 'owner'

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

export type AuthErrorCode = 'phone_taken' | 'wrong_code' | 'failed'

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