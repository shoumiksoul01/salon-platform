import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { logoutAccount } from '../api/auth'
import { useAuth } from '../auth/useAuth'
import { Button } from './ui'

// Log out button for the account headers (customer, owner, staff).
// It shows only when someone is really logged in. onDone runs first, for example to close a menu.
// The text is the same "Log out" as in the public header (public.json, layout.logout).
export default function LogoutButton({ onDone }: { onDone?: () => void }) {
  const { t } = useTranslation('public')
  const navigate = useNavigate()
  const { status } = useAuth()

  if (status !== 'signedIn') return null

  async function handleClick() {
    onDone?.()
    await logoutAccount().catch(() => undefined)
    navigate('/')
  }

  return (
    <Button variant="secondary" onClick={handleClick}>
      {t('layout.logout', { defaultValue: 'Log out' })}
    </Button>
  )
}