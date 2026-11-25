import { useTranslation } from 'react-i18next'
import styles from './StaticPage.module.css'

// SHR-01: the About, Terms and Privacy pages. All three share one layout, and the text comes
// from locales/<language>/static.json. The layout provides the page's <main>, so this renders
// an <article>. The footer of the public layout links to these pages.

// The sections of each page, in order. Each key needs a heading and a body in static.json.
const SECTIONS = {
  about: ['what', 'customers', 'shops', 'approval'],
  terms: ['use', 'bookings', 'payments', 'noShows', 'reviews', 'shops', 'changes'],
  privacy: ['collect', 'use', 'sharing', 'choices', 'security', 'contact'],
} as const

export type StaticPageName = keyof typeof SECTIONS

export default function StaticPage({ page }: { page: StaticPageName }) {
  const { t } = useTranslation('static')
  const titleId = `static-${page}-title`
  const keys: readonly string[] = SECTIONS[page]

  return (
    <article className={styles.page} aria-labelledby={titleId}>
      <h1 id={titleId} className={styles.title}>
        {t(`${page}.title`)}
      </h1>
      <p className={styles.lead}>{t(`${page}.intro`)}</p>
      {page !== 'about' && <p className={styles.notice}>{t('demoNotice')}</p>}

      {keys.map((key) => (
        <section key={key} className={styles.section}>
          <h2 className={styles.heading}>{t(`${page}.sections.${key}.heading`)}</h2>
          <p className={styles.body}>{t(`${page}.sections.${key}.body`)}</p>
        </section>
      ))}
    </article>
  )
}
