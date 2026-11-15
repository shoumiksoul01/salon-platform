import { Navigate } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import StaffLayout from '../layouts/StaffLayout'
import ProfilePage from '../pages/customer/ProfilePage'

// Staff pages (STF) are added to the children array of the layout route.
// /staff has no bookings page yet (STF-01), so it sends the staff member to the profile page.
// The profile and language page is shared with the customer side (CUS-04).
export const staffRoutes: RouteObject[] = [
  {
    element: <StaffLayout />,
    children: [
      { path: '/staff', element: <Navigate to="/staff/profile" replace /> },
      { path: '/staff/profile', element: <ProfilePage /> },
    ],
  },
]
