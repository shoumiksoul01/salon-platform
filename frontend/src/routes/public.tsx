import type { RouteObject } from 'react-router-dom'
import PublicLayout from '../layouts/PublicLayout'
import HomePage from '../pages/public/HomePage'
import ShopsPage from '../pages/public/ShopsPage'
import KitPreview from '../pages/dev/KitPreview'

// Public pages (PUB, AUTH, BOOK, SHR) are added to the children array of the layout route.
// The /dev/kit page exists only while running "npm run dev".
export const publicRoutes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/shops', element: <ShopsPage /> },
      ...(import.meta.env.DEV ? [{ path: '/dev/kit', element: <KitPreview /> }] : []),
    ],
  },
]