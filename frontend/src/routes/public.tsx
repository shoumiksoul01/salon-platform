import type { RouteObject } from 'react-router-dom'
import KitPreview from '../pages/dev/KitPreview'

// Public layout routes (PUB, AUTH, BOOK, SHR pages) are added here.
// The /dev/kit page exists only while running "npm run dev".
export const publicRoutes: RouteObject[] = [
  ...(import.meta.env.DEV ? [{ path: '/dev/kit', element: <KitPreview /> }] : []),
]