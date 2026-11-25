import type { RouteObject } from 'react-router-dom'
import RequireRole from '../auth/RequireRole'
import StaffLayout from '../layouts/StaffLayout'
import ProfilePage from '../pages/customer/ProfilePage'
import TodayPage from '../pages/staff/TodayPage'

// Staff pages (STF) are added to the children array of the layout route.
// /staff is today's bookings (STF-01).
// The profile and language page is shared with the customer side (CUS-04).
// C-06: the whole area is for logged-in staff only.
export const staffRoutes: RouteObject[] = [
  {
    element: <RequireRole roles={['staff']} />,
    children: [
      {
        element: <StaffLayout />,
        children: [
          { path: '/staff', element: <TodayPage /> },
          { path: '/staff/profile', element: <ProfilePage /> },
        ],
      },
    ],
  },
]