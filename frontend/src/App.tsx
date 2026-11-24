import { RouterProvider } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ToastProvider } from './components/ui'
import { AuthProvider } from './auth/AuthProvider'
import { router } from './routes/router'

export default function App() {
  const { t } = useTranslation()

  return (
    <ToastProvider dismissLabel={t('actions.dismiss')}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>
  )
}