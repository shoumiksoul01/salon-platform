import { createContext } from 'react'
import type { SessionUser } from '../api/auth'

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn'

export interface AuthState {
  status: AuthStatus
  user: SessionUser | null
}

// Until the provider has read the session, nobody is known yet.
export const AuthContext = createContext<AuthState>({ status: 'loading', user: null })