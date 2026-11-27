import type { RouteObject } from 'react-router-dom'
import RequireRole from '../auth/RequireRole'
import AdminLayout from '../layouts/AdminLayout'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage'
import KitPreview from '../pages/dev/KitPreview'

// Admin pages (ADM) are added to the children array of the guarded layout route.
// Only a signed-in user whose profile role is "admin" can see them (C-06).
// The /dev/admin-kit page exists only while running "npm run dev"; it shows the layout around the kit preview
// and stays outside the guard, so the layout can still be checked without an admin account.
export const adminRoutes: RouteObject[] = [
  {
    element: <RequireRole roles={['admin']} />,
    children: [
      {
        element: <AdminLayout />,
        children: [{ path: '/admin', element: <AdminDashboardPage /> }],
      },
    ],
  },
  ...(import.meta.env.DEV
    ? [
        {
          element: <AdminLayout />,
          children: [{ path: '/dev/admin-kit', element: <KitPreview /> }],
        },
      ]
    : []),
]