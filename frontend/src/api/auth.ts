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

export type AuthErrorCode = 'phone_taken' | 'failed'

export class AuthError extends Error {
  code: AuthErrorCode

  constructor(code: AuthErrorCode) {
    super(code)
    this.code = code
  }
}

// In the mock, this number is always "already registered", so the error state can be checked by hand.
const TAKEN_PHONE = '01700000000'

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