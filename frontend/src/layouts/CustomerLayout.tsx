import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'
import styles from './CustomerLayout.module.css'

interface NavItem {
  to: string
  labelKey: string
  end?: boolean
  // true = shown in the bottom bar on phones. Keep this to 4 items at most.
  inBottomBar?: boolean
  // true = not shown in the desktop header, because the brand already links to it.
  phoneOnly?: boolean
}

// One list drives the desktop header, the phone bottom bar and the "More" panel.
// When you build a new customer page (bookings, queue, notifications), add one line here
// and one route in routes/customer.tsx.
const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'layout.home', end: true, inBottomBar: true, phoneOnly: true },
  { to: '/shops', labelKey: 'layout.findShops', inBottomBar: true },
  { to: '/me/bookings', labelKey: 'layout.myBookings', inBottomBar: true },
  { to: '/me/profile', labelKey: 'layout.profile', inBottomBar: true },
]

function headerLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? `${styles.link} ${styles.active}` : styles.link
}

function bottomLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? `${styles.bottomItem} ${styles.bottomActive}` : styles.bottomItem
}

// Layout for the customer account pages: header (desktop), bottom bar (phone), page content.
// The layout provides the page's <main>, so pages inside it must not render their own.
export default function CustomerLayout() {
  const { t } = useTranslation('customer')
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

      <header className={styles.header}>
        <div className={styles.bar}>
          <Link to="/" className={styles.brand} onClick={closeMore}>
            {t('common:appName')}
          </Link>

          {/* Desktop: links and language buttons in the header. Hidden on phones. */}
          <div className={styles.desktopRight}>
            <nav aria-label={t('layout.mainNav')}>
              <ul className={styles.links}>
                {NAV_ITEMS.filter((item) => !item.phoneOnly).map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} end={item.end} className={headerLinkClass}>
                      {t(item.labelKey)}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>

      {/* Phone: "More" panel and bottom bar. Both are hidden from 1024px up. */}
      {moreOpen && (
        <div id="customer-more" className={styles.morePanel}>
          <ul className={styles.links}>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={headerLinkClass} onClick={closeMore}>
                  {t(item.labelKey)}
                </NavLink>
              </li>
            ))}
          </ul>
          <LanguageSwitcher />
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
          aria-controls="customer-more"
          onClick={() => setMoreOpen((open) => !open)}
        >
          {moreOpen ? t('layout.closeMore') : t('layout.more')}
        </button>
      </nav>
    </div>
  )
}
