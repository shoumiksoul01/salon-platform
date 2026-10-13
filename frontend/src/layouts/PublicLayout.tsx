import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'
import styles from './PublicLayout.module.css'

const CURRENT_YEAR = new Date().getFullYear()

function navLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? `${styles.link} ${styles.active}` : styles.link
}

// Layout for the public pages: header, page content, footer.
// The layout provides the page's <main>, so pages inside it must not render their own.
export default function PublicLayout() {
  const { t } = useTranslation('public')
  const [menuOpen, setMenuOpen] = useState(false)

  function closeMenu() {
    setMenuOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') closeMenu()
  }

  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skip}>
        {t('layout.skipToContent')}
      </a>

      <header className={styles.header} onKeyDown={handleKeyDown}>
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
            <ul className={styles.links}>
              <li>
                <NavLink to="/shops" className={navLinkClass} onClick={closeMenu}>
                  {t('layout.findShops')}
                </NavLink>
              </li>
              <li>
                <NavLink to="/for-shops" className={navLinkClass} onClick={closeMenu}>
                  {t('layout.forShops')}
                </NavLink>
              </li>
            </ul>

            <div className={styles.actions}>
              <LanguageSwitcher />
              <div className={styles.authLinks}>
                <Link to="/login" className={styles.outline} onClick={closeMenu}>
                  {t('layout.login')}
                </Link>
                <Link to="/register" className={styles.cta} onClick={closeMenu}>
                  {t('layout.register')}
                </Link>
              </div>
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