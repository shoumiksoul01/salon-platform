import type { RouteObject } from 'react-router-dom'
import ProfilePage from '../pages/customer/ProfilePage'

// Customer layout routes (CUS pages) are added here.
// When the customer layout is added (UI-SM-02), these routes move inside it.
export const customerRoutes: RouteObject[] = [{ path: '/me/profile', element: <ProfilePage /> }]
