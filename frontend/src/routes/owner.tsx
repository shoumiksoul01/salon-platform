import type { RouteObject } from 'react-router-dom'
import RequireRole from '../auth/RequireRole'
import OwnerLayout from '../layouts/OwnerLayout'
import ProfilePage from '../pages/customer/ProfilePage'
import ComponentsPreview from '../pages/dev/ComponentsPreview'
import BookingsPage from '../pages/owner/BookingsPage'
import DashboardPage from '../pages/owner/DashboardPage'
import MediaPage from '../pages/owner/MediaPage'
import ServicesPage from '../pages/owner/ServicesPage'
import QueuePage from '../pages/owner/QueuePage'
import ReportsPage from '../pages/owner/ReportsPage'
import ReviewsPage from '../pages/owner/ReviewsPage'
import ShopSetupPage from '../pages/owner/ShopSetupPage'
import StaffAvailabilityPage from '../pages/owner/StaffAvailabilityPage'
import StaffPage from '../pages/owner/StaffPage'

// Owner pages (OWN) are added to the children array of the layout route.
// /owner is the dashboard (OWN-01).
// The profile and language page is shared with the customer side (CUS-04).
// The /owner/dev/components page exists only while running "npm run dev".
// C-06: the whole area is for logged-in shop owners only.
export const ownerRoutes: RouteObject[] = [
  {
    element: <RequireRole roles={['owner']} />,
    children: [
      {
        element: <OwnerLayout />,
        children: [
          { path: '/owner', element: <DashboardPage /> },
          { path: '/owner/bookings', element: <BookingsPage /> },
          { path: '/owner/queue', element: <QueuePage /> },
          { path: '/owner/shop', element: <ShopSetupPage /> },
          { path: '/owner/media', element: <MediaPage /> },
          { path: '/owner/services', element: <ServicesPage /> },
          { path: '/owner/staff', element: <StaffPage /> },
          { path: '/owner/staff/:staffId/availability', element: <StaffAvailabilityPage /> },
          { path: '/owner/reviews', element: <ReviewsPage /> },
          { path: '/owner/reports', element: <ReportsPage /> },
          { path: '/owner/profile', element: <ProfilePage /> },
          ...(import.meta.env.DEV
            ? [{ path: '/owner/dev/components', element: <ComponentsPreview /> }]
            : []),
        ],
      },
    ],
  },
]