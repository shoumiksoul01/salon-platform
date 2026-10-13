import type { RouteObject } from 'react-router-dom'
import ShopSetupPage from '../pages/owner/ShopSetupPage'

// Owner layout routes (OWN pages) are added here.
// When the owner layout is added (UI-SM-03), these routes move inside it.
export const ownerRoutes: RouteObject[] = [{ path: '/owner/shop', element: <ShopSetupPage /> }]
