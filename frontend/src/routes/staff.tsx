import type { RouteObject } from 'react-router-dom'
import StaffLayout from '../layouts/StaffLayout'
import ProfilePage from '../pages/customer/ProfilePage'
import StaffQueuePage from '../pages/staff/StaffQueuePage'
import TodayPage from '../pages/staff/TodayPage'

// Staff pages (STF) are added to the children array of the layout route.
// /staff is today's bookings (STF-01).
// The profile and language page is shared with the customer side (CUS-04).
export const staffRoutes: RouteObject[] = [
  {
    element: <StaffLayout />,
    children: [
      { path: '/staff', element: <TodayPage /> },
      { path: '/staff/queue', element: <StaffQueuePage /> },
      { path: '/staff/profile', element: <ProfilePage /> },
    ],
  },
]
