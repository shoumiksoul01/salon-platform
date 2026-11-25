import { Navigate } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import RequireRole from '../auth/RequireRole'
import CustomerLayout from '../layouts/CustomerLayout'
import MyBookingsPage from '../pages/customer/MyBookingsPage'
import MyQueuePage from '../pages/customer/MyQueuePage'
import NotificationsPage from '../pages/customer/NotificationsPage'
import ProfilePage from '../pages/customer/ProfilePage'

// Customer pages (CUS) are added to the children array of the layout route.
// C-06: the whole area is for logged-in customers only.
export const customerRoutes: RouteObject[] = [
  {
    element: <RequireRole roles={['customer']} />,
    children: [
      {
        element: <CustomerLayout />,
        children: [
          { path: '/me', element: <Navigate to="/me/bookings" replace /> },
          { path: '/me/bookings', element: <MyBookingsPage /> },
          { path: '/me/queue', element: <MyQueuePage /> },
          { path: '/me/notifications', element: <NotificationsPage /> },
          { path: '/me/profile', element: <ProfilePage /> },
        ],
      },
    ],
  },
]