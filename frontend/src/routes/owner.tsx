import type { RouteObject } from 'react-router-dom'
import OwnerLayout from '../layouts/OwnerLayout'
import ProfilePage from '../pages/customer/ProfilePage'
import ComponentsPreview from '../pages/dev/ComponentsPreview'
import DashboardPage from '../pages/owner/DashboardPage'
import ServicesPage from '../pages/owner/ServicesPage'
import ShopSetupPage from '../pages/owner/ShopSetupPage'
import StaffPage from '../pages/owner/StaffPage'

// Owner pages (OWN) are added to the children array of the layout route.
// /owner is the dashboard (OWN-01).
// The profile and language page is shared with the customer side (CUS-04).
// The /owner/dev/components page exists only while running "npm run dev".
export const ownerRoutes: RouteObject[] = [
  {
    element: <OwnerLayout />,
    children: [
      { path: '/owner', element: <DashboardPage /> },
      { path: '/owner/shop', element: <ShopSetupPage /> },
      { path: '/owner/services', element: <ServicesPage /> },
      { path: '/owner/staff', element: <StaffPage /> },
      { path: '/owner/profile', element: <ProfilePage /> },
      ...(import.meta.env.DEV
        ? [{ path: '/owner/dev/components', element: <ComponentsPreview /> }]
        : []),
    ],
  },
]