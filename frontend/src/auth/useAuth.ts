import { useContext } from 'react'
import { AuthContext } from './auth-context'

// Who is logged in. user is null unless status is 'signedIn'.
export function useAuth() {
  return useContext(AuthContext)
}