import { useTranslation } from 'react-i18next'

// Temporary page so the router can be checked. Delete it when PUB-01 (Home) is added at "/".
export default function Placeholder() {
  const { t } = useTranslation()
  return <p>{t('appName')}</p>
}