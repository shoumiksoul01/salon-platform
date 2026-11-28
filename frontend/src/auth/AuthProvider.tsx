import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { watchSession } from '../api/auth'
import { fetchSavedLanguage } from '../api/profile'
import { setLanguage } from '../i18n'
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

  // C-07: after login, use the language saved on the server. Runs once per user, not on
  // every token refresh. If nothing is saved (or the call fails) the browser choice stays.
  const userId = state.user?.id
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    fetchSavedLanguage()
      .then((language) => {
        if (!cancelled && language) setLanguage(language)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [userId])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}
