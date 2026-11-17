import { Navigate } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import OwnerLayout from '../layouts/OwnerLayout'
import ProfilePage from '../pages/customer/ProfilePage'
import ComponentsPreview from '../pages/dev/ComponentsPreview'
import ShopSetupPage from '../pages/owner/ShopSetupPage'

// Owner pages (OWN) are added to the children array of the layout route.
// /owner has no dashboard yet (OWN-01), so it sends the owner to the shop setup page.
// The profile and language page is shared with the customer side (CUS-04).
// The /owner/dev/components page exists only while running "npm run dev".
export const ownerRoutes: RouteObject[] = [
  {
    element: <OwnerLayout />,
    children: [
      { path: '/owner', element: <Navigate to="/owner/shop" replace /> },
      { path: '/owner/shop', element: <ShopSetupPage /> },
      { path: '/owner/profile', element: <ProfilePage /> },
      ...(import.meta.env.DEV
        ? [{ path: '/owner/dev/components', element: <ComponentsPreview /> }]
        : []),
    ],
  },
]
