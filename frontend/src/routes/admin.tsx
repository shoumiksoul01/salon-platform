import type { RouteObject } from 'react-router-dom'
import AdminLayout from '../layouts/AdminLayout'
import KitPreview from '../pages/dev/KitPreview'

// Admin pages (ADM) are added to the children array of the layout route.
// The /dev/admin-kit page exists only while running "npm run dev"; it shows the layout around the kit preview.
export const adminRoutes: RouteObject[] = [
  {
    element: <AdminLayout />,
    children: [
      ...(import.meta.env.DEV ? [{ path: '/dev/admin-kit', element: <KitPreview /> }] : []),
    ],
  },
]