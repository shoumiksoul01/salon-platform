import { Navigate } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import CustomerLayout from '../layouts/CustomerLayout'
import ProfilePage from '../pages/customer/ProfilePage'

// Customer pages (CUS) are added to the children array of the layout route.
// /me has no bookings page yet (CUS-01), so it sends the customer to the profile page.
export const customerRoutes: RouteObject[] = [
  {
    element: <CustomerLayout />,
    children: [
      { path: '/me', element: <Navigate to="/me/profile" replace /> },
      { path: '/me/profile', element: <ProfilePage /> },
    ],
  },
]
