import { RouterProvider } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ToastProvider } from './components/ui'
import { router } from './routes/router'

export default function App() {
  const { t } = useTranslation()

  return (
    <ToastProvider dismissLabel={t('actions.dismiss')}>
      <RouterProvider router={router} />
    </ToastProvider>
  )
}