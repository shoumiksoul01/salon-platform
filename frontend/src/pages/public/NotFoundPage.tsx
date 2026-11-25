import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ProfileRole } from '../../api/auth'
import { useAuth } from '../../auth/useAuth'
import styles from './StaticPage.module.css'

// SHR-01: shown for every address that has no page (the "*" route of the public layout).
// A signed-in person gets a button to their own home page, everyone else to the Home page.
const ACCOUNT_HOME: Partial<Record<ProfileRole, string>> = {
  customer: '/me',
  owner: '/owner',
  staff: '/staff',
}

export default function NotFoundPage() {
  const { t } = useTranslation('static')
  const { pathname } = useLocation()
  const { user } = useAuth()
  const accountHome = user ? ACCOUNT_HOME[user.role] : undefined

  return (
    <section className={`${styles.page} ${styles.centered}`} aria-labelledby="not-found-title">
      <p className={styles.code} aria-hidden="true">
        404
      </p>
      <h1 id="not-found-title" className={styles.title}>
        {t('notFound.title')}
      </h1>
      <p className={styles.lead}>{t('notFound.text')}</p>
      <p className={styles.muted}>
        {t('notFound.address')} <code className={styles.path}>{pathname}</code>
      </p>
      <div className={styles.actions}>
        <Link to={accountHome ?? '/'} className={styles.primary}>
          {t(accountHome ? 'notFound.homeAccount' : 'notFound.homeGuest')}
        </Link>
        <Link to="/shops" className={styles.secondary}>
          {t('notFound.shops')}
        </Link>
      </div>
    </section>
  )
}
