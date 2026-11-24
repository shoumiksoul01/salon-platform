import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { watchSession } from '../api/auth'
import { AuthContext } from './auth-context'
import type { AuthState } from './auth-context'

// Keeps the logged-in user (from the Supabase session and the profiles row) in one place.
// The app also works without a session, so pages never wait on this to render.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null })

  useEffect(() => {
    return watchSession((user) =>
      setState(user ? { status: 'signedIn', user } : { status: 'signedOut', user: null }),
    )
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
