import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { Button } from '../components/ui'
import { logoutAccount } from '../api/auth'
import type { ProfileRole } from '../api/auth'
import { useAuth } from '../auth/useAuth'
import styles from './PublicLayout.module.css'

const CURRENT_YEAR = new Date().getFullYear()

// Where the name in the header leads. Admin pages do not exist yet.
const ACCOUNT_HOME: Partial<Record<ProfileRole, string>> = {
  customer: '/me',
  owner: '/owner',
  staff: '/staff',
}

// Layout for the public pages: header, page content, footer.
// The layout provides the page's <main>, so pages inside it must not render their own.
export default function PublicLayout() {
  const { t } = useTranslation('public')
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { status, user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  // On the Home page the header sits on top of the hero video.
  const overHero = pathname === '/'
  const headerClass = [
    styles.header,
    overHero ? styles.headerOverHero : '',
    overHero && menuOpen ? styles.headerOpen : '',
  ]
    .filter(Boolean)
    .join(' ')

  function closeMenu() {
    setMenuOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') closeMenu()
  }

  async function handleLogout() {
    closeMenu()
    await logoutAccount().catch(() => undefined)
    navigate('/')
  }

  const firstName = user ? user.full_name.trim().split(/\s+/)[0] || user.email : ''
  const accountHome = user ? ACCOUNT_HOME[user.role] : undefined

  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skip}>
        {t('layout.skipToContent')}
      </a>

      <header className={headerClass} onKeyDown={handleKeyDown}>
        <div className={styles.bar}>
          <Link to="/" className={styles.brand} onClick={closeMenu}>
            {t('common:appName')}
          </Link>

          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={menuOpen}
            aria-controls="public-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? t('layout.closeMenu') : t('layout.openMenu')}
          </button>

          <nav
            id="public-nav"
            aria-label={t('layout.mainNav')}
            className={menuOpen ? `${styles.nav} ${styles.navOpen}` : styles.nav}
          >
            <div className={styles.actions}>
              <LanguageSwitcher />
              <div className={styles.authLinks}>
                {status === 'signedIn' && user ? (
                  <>
                    {accountHome ? (
                      <Link to={accountHome} className={styles.authLink} onClick={closeMenu}>
                        {firstName}
                      </Link>
                    ) : (
                      <span className={styles.authLink}>{firstName}</span>
                    )}
                    <Button variant="secondary" onClick={handleLogout}>
                      {t('layout.logout')}
                    </Button>
                  </>
                ) : status === 'signedOut' ? (
                  <>
                    <Link to="/login" className={styles.authLink} onClick={closeMenu}>
                      {t('layout.login')}
                    </Link>
                    <span className={styles.slash} aria-hidden="true">
                      /
                    </span>
                    <Link to="/register" className={styles.authLink} onClick={closeMenu}>
                      {t('header:signUp')}
                    </Link>
                  </>
                ) : null}
              </div>
              <Link to="/for-shops" className={styles.cta} onClick={closeMenu}>
                {t('header:listBusiness')}
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div>
              <p className={styles.footerBrand}>{t('common:appName')}</p>
              <p className={styles.tagline}>{t('layout.tagline')}</p>
            </div>
            <nav aria-label={t('layout.footerNav')}>
              <ul className={styles.footerLinks}>
                <li>
                  <Link to="/shops" className={styles.footerLink}>
                    {t('layout.findShops')}
                  </Link>
                </li>
                <li>
                  <Link to="/for-shops" className={styles.footerLink}>
                    {t('layout.forShops')}
                  </Link>
                </li>
                <li>
                  <Link to="/about" className={styles.footerLink}>
                    {t('layout.about')}
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className={styles.footerLink}>
                    {t('layout.terms')}
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className={styles.footerLink}>
                    {t('layout.privacy')}
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
          <p className={styles.copyright}>{t('layout.rights', { year: CURRENT_YEAR })}</p>
        </div>
      </footer>
    </div>
  )
}