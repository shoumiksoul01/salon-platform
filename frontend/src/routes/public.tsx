import type { RouteObject } from 'react-router-dom'
import PublicLayout from '../layouts/PublicLayout'
import HomePage from '../pages/public/HomePage'
import ShopsPage from '../pages/public/ShopsPage'
import ShopDetailsPage from '../pages/public/ShopDetailsPage'
import ForShopsPage from '../pages/public/ForShopsPage'
import RegisterPage from '../pages/public/RegisterPage'
import OtpPage from '../pages/public/OtpPage'
import BookServicesPage from '../pages/public/BookServicesPage'
import BookSlotPage from '../pages/public/BookSlotPage'
import KitPreview from '../pages/dev/KitPreview'
import LoginPage from '../pages/public/LoginPage'
import ResetPasswordPage from '../pages/public/ResetPasswordPage'

// Public pages (PUB, AUTH, BOOK, SHR) are added to the children array of the layout route.
// The /dev/kit page exists only while running "npm run dev".
export const publicRoutes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/shops', element: <ShopsPage /> },
      { path: '/shops/:shopId', element: <ShopDetailsPage /> },
      { path: '/for-shops', element: <ForShopsPage /> },
      { path: '/register', element: <RegisterPage /> },
            { path: '/verify', element: <OtpPage /> },
                  { path: '/book/:shopId', element: <BookServicesPage /> },
                        { path: '/book/:shopId/slot', element: <BookSlotPage /> },
                  { path: '/login', element: <LoginPage /> },
                        { path: '/reset-password', element: <ResetPasswordPage /> },
      ...(import.meta.env.DEV ? [{ path: '/dev/kit', element: <KitPreview /> }] : []),
    ],
  },
]