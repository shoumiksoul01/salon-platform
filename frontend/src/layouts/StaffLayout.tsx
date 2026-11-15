import { Link, NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'
import styles from './StaffLayout.module.css'

interface NavItem {
  to: string
  labelKey: string
  end?: boolean
}

// One list drives the phone bottom bar and the desktop top bar.
// When you build a staff page, add one line here and one route in routes/staff.tsx:
//   { to: '/staff', labelKey: 'layout.today', end: true }
//   { to: '/staff/queue', labelKey: 'layout.queue' }
// Keep it to 4 items at most, because the buttons are big and share one row on a phone.
const NAV_ITEMS: NavItem[] = [{ to: '/staff/profile', labelKey: 'layout.profile' }]

function topLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? `${styles.link} ${styles.active}` : styles.link
}

function bottomLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? `${styles.bottomItem} ${styles.bottomActive}` : styles.bottomItem
}

// Layout for the staff pages. Phone first: big buttons in a bottom bar, and the language
// buttons always visible in the header, because many staff prefer Bengali.
// The layout provides the page's <main>, so pages inside it must not render their own.
export default function StaffLayout() {
  const { t } = useTranslation('staff')

  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skip}>
        {t('layout.skipToContent')}
      </a>

      <header className={styles.header}>
        <div className={styles.bar}>
          <Link to="/staff" className={styles.brand}>
            {t('common:appName')}
            <span className={styles.panelLabel}>{t('layout.panelTitle')}</span>
          </Link>

          <div className={styles.headerRight}>
            {/* Tablet and desktop: links in the header. Hidden on phones. */}
            <nav aria-label={t('layout.mainNav')} className={styles.topNav}>
              <ul className={styles.links}>
                {NAV_ITEMS.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} end={item.end} className={topLinkClass}>
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

      {/* Phone: big buttons in a bottom bar. Hidden from 768px up. */}
      <nav aria-label={t('layout.quickNav')} className={styles.bottomBar}>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={bottomLinkClass}>
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
