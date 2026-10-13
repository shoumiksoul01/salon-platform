import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'
import styles from './AdminLayout.module.css'

function navLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? `${styles.link} ${styles.active}` : styles.link
}

// Layout for the admin pages: top bar, sidebar navigation, page content.
// The layout provides the page's <main>, so pages inside it must not render their own.
export default function AdminLayout() {
  const { t } = useTranslation('admin')
  const [menuOpen, setMenuOpen] = useState(false)

  function closeMenu() {
    setMenuOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') closeMenu()
  }

  return (
    <div className={styles.shell} onKeyDown={handleKeyDown}>
      <a href="#main-content" className={styles.skip}>
        {t('layout.skipToContent')}
      </a>

      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Link to="/admin" className={styles.brand} onClick={closeMenu}>
            {t('common:appName')}
            <span className={styles.panelLabel}>{t('layout.panelTitle')}</span>
          </Link>

          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={menuOpen}
            aria-controls="admin-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? t('layout.closeMenu') : t('layout.openMenu')}
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <nav
          id="admin-nav"
          aria-label={t('layout.mainNav')}
          className={menuOpen ? `${styles.nav} ${styles.navOpen}` : styles.nav}
        >
          <div className={styles.navInner}>
            <ul className={styles.links}>
              <li>
                <NavLink to="/admin" end className={navLinkClass} onClick={closeMenu}>
                  {t('layout.dashboard')}
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/shops" className={navLinkClass} onClick={closeMenu}>
                  {t('layout.shops')}
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/moderation" className={navLinkClass} onClick={closeMenu}>
                  {t('layout.moderation')}
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/plans" className={navLinkClass} onClick={closeMenu}>
                  {t('layout.plans')}
                </NavLink>
              </li>
            </ul>

            <div className={styles.navFooter}>
              <LanguageSwitcher />
              <Link to="/" className={styles.siteLink} onClick={closeMenu}>
                {t('layout.viewSite')}
              </Link>
            </div>
          </div>
        </nav>

        <main id="main-content" tabIndex={-1} className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}