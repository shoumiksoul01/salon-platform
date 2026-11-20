import { Navigate } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import CustomerLayout from '../layouts/CustomerLayout'
import MyBookingsPage from '../pages/customer/MyBookingsPage'
import MyQueuePage from '../pages/customer/MyQueuePage'
import ProfilePage from '../pages/customer/ProfilePage'

// Customer pages (CUS) are added to the children array of the layout route.
export const customerRoutes: RouteObject[] = [
  {
    element: <CustomerLayout />,
    children: [
      { path: '/me', element: <Navigate to="/me/bookings" replace /> },
      { path: '/me/bookings', element: <MyBookingsPage /> },
      { path: '/me/queue', element: <MyQueuePage /> },
      { path: '/me/profile', element: <ProfilePage /> },
    ],
  },
]
