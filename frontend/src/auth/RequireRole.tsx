import { Navigate, Outlet } from 'react-router-dom'
import type { ProfileRole } from '../api/auth'
import { useAuth } from './useAuth'

// Where each role lands (same list as the login page).
const HOME: Record<ProfileRole, string> = {
  customer: '/me',
  owner: '/owner',
  staff: '/staff',
  admin: '/',
}

interface RequireRoleProps {
  roles: ProfileRole[]
}

// C-06: a route guard. It wraps a layout route and shows its pages only to the listed roles.
// This only decides what the browser shows. The real protection is row level security in
// the database and, later, role checks in the backend.
export default function RequireRole({ roles }: RequireRoleProps) {
  const { status, user } = useAuth()

  // Developer shortcut for working on a page without a Supabase account or .env.
  // import.meta.env.DEV is false in a production build, so this never opens the live site.
  if (import.meta.env.DEV && import.meta.env.VITE_SKIP_AUTH_GUARD === 'true') {
    return <Outlet />
  }

  // The session is still being restored after a reload.
  if (status === 'loading') return <div role="status" aria-busy="true" />

  if (status !== 'signedIn' || !user) return <Navigate to="/login" replace />

  if (!roles.includes(user.role)) return <Navigate to={HOME[user.role]} replace />

  return <Outlet />
}