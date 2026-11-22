import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'
import styles from './OwnerLayout.module.css'

interface NavItem {
  to: string
  labelKey: string
  end?: boolean
  // true = also shown in the bottom bar on phones. Keep this to 4 items at most.
  inBottomBar?: boolean
}

// One list drives the desktop sidebar, the phone bottom bar and the "More" panel.
// When you build a new owner page, add one line here and one route in routes/owner.tsx.
const NAV_ITEMS: NavItem[] = [
  { to: '/owner', labelKey: 'ownerDashboard:nav', end: true, inBottomBar: true },
  { to: '/owner/shop', labelKey: 'layout.shop', inBottomBar: true },
  { to: '/owner/services', labelKey: 'ownerServices:nav', inBottomBar: true },
  { to: '/owner/profile', labelKey: 'layout.profile' },
]

function sideLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? `${styles.link} ${styles.active}` : styles.link
}

function bottomLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? `${styles.bottomItem} ${styles.bottomActive}` : styles.bottomItem
}

// Layout for the shop owner pages: top bar, sidebar (desktop), bottom bar (phone), page content.
// The layout provides the page's <main>, so pages inside it must not render their own.
export default function OwnerLayout() {
  const { t } = useTranslation('owner')
  const [moreOpen, setMoreOpen] = useState(false)

  function closeMore() {
    setMoreOpen(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') closeMore()
  }

  return (
    <div className={styles.shell} onKeyDown={handleKeyDown}>
      <a href="#main-content" className={styles.skip}>
        {t('layout.skipToContent')}
      </a>

      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Link to="/owner" className={styles.brand} onClick={closeMore}>
            {t('common:appName')}
            <span className={styles.panelLabel}>{t('layout.panelTitle')}</span>
          </Link>
        </div>
      </header>

      <div className={styles.body}>
        {/* Desktop: sidebar. Hidden on phones. */}
        <nav aria-label={t('layout.mainNav')} className={styles.sidebar}>
          <div className={styles.sidebarInner}>
            <ul className={styles.links}>
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className={sideLinkClass}>
                    {t(item.labelKey)}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className={styles.navFooter}>
              <LanguageSwitcher />
              <Link to="/" className={styles.siteLink}>
                {t('layout.viewSite')}
              </Link>
            </div>
          </div>
        </nav>

        <main id="main-content" tabIndex={-1} className={styles.main}>
          <Outlet />
        </main>
      </div>

      {/* Phone: "More" panel and bottom bar. Both are hidden from 1024px up. */}
      {moreOpen && (
        <div id="owner-more" className={styles.morePanel}>
          <ul className={styles.links}>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={sideLinkClass} onClick={closeMore}>
                  {t(item.labelKey)}
                </NavLink>
              </li>
            ))}
          </ul>
          <LanguageSwitcher />
          <Link to="/" className={styles.siteLink} onClick={closeMore}>
            {t('layout.viewSite')}
          </Link>
        </div>
      )}

      <nav aria-label={t('layout.quickNav')} className={styles.bottomBar}>
        {NAV_ITEMS.filter((item) => item.inBottomBar).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={bottomLinkClass}
            onClick={closeMore}
          >
            {t(item.labelKey)}
          </NavLink>
        ))}
        <button
          type="button"
          className={styles.bottomItem}
          aria-expanded={moreOpen}
          aria-controls="owner-more"
          onClick={() => setMoreOpen((open) => !open)}
        >
          {moreOpen ? t('layout.closeMore') : t('layout.more')}
        </button>
      </nav>
    </div>
  )
}