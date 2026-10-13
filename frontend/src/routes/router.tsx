import { createBrowserRouter } from 'react-router-dom'
import { publicRoutes } from './public'
import { adminRoutes } from './admin'
import { customerRoutes } from './customer'
import { ownerRoutes } from './owner'
import { staffRoutes } from './staff'

export const router = createBrowserRouter([
  ...publicRoutes,
  ...adminRoutes,
  ...customerRoutes,
  ...ownerRoutes,
  ...staffRoutes,
])