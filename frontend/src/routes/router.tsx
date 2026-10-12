import { createBrowserRouter } from 'react-router-dom'
import Placeholder from './Placeholder'
import { publicRoutes } from './public'
import { adminRoutes } from './admin'
import { customerRoutes } from './customer'
import { ownerRoutes } from './owner'
import { staffRoutes } from './staff'

export const router = createBrowserRouter([
  { path: '/', element: <Placeholder /> },
  ...publicRoutes,
  ...adminRoutes,
  ...customerRoutes,
  ...ownerRoutes,
  ...staffRoutes,
])