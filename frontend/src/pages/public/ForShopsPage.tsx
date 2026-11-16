import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../../components/ui'
import styles from './ForShopsPage.module.css'

// Both buttons lead to the owner's shop setup page. Point them at '/register'
// in UI-SK-17, once the Register page exists.
const SETUP_PATH = '/register?role=owner'

const BENEFITS = ['showcase', 'bookings', 'staff', 'queue', 'noShows', 'payments'] as const
const STEPS = ['profile', 'documents', 'review', 'live'] as const
const CHECKLIST = ['licence', 'address', 'hours', 'photos', 'services'] as const

export default function ForShopsPage() {
  const { t, i18n } = useTranslation('forShops')
  const numbers = new Intl.NumberFormat(i18n.language.startsWith('bn') ? 'bn-BD' : 'en-GB')

  return (
    <>
      <section className={styles.hero} aria-labelledby="for-shops-title">
        <div className={styles.container}>
          <h1 id="for-shops-title" className={styles.title}>
            {t('hero.title')}
          </h1>
          <p className={styles.subtitle}>{t('hero.subtitle')}</p>
          <Link className={styles.cta} to={SETUP_PATH}>
            {t('hero.cta')}
          </Link>
          <p className={styles.hint}>{t('hero.hint')}</p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="benefits-title">
        <div className={styles.container}>
          <h2 id="benefits-title" className={styles.sectionTitle}>
            {t('benefits.title')}
          </h2>
          <p className={styles.sectionSubtitle}>{t('benefits.subtitle')}</p>
          <ul className={styles.grid}>
            {BENEFITS.map((key) => (
              <li key={key}>
                <Card>
                  <h3 className={styles.cardTitle}>{t(`benefits.${key}.title`)}</h3>
                  <p className={styles.cardBody}>{t(`benefits.${key}.body`)}</p>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`${styles.section} ${styles.alt}`} aria-labelledby="steps-title">
        <div className={styles.container}>
          <h2 id="steps-title" className={styles.sectionTitle}>
            {t('steps.title')}
          </h2>
          <p className={styles.sectionSubtitle}>{t('steps.subtitle')}</p>
          <ol className={styles.steps}>
            {STEPS.map((key, index) => (
              <li key={key} className={styles.step}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {numbers.format(index + 1)}
                </span>
                <div>
                  <h3 className={styles.stepTitle}>{t(`steps.${key}.title`)}</h3>
                  <p className={styles.stepBody}>{t(`steps.${key}.body`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="checklist-title">
        <div className={styles.container}>
          <Card>
            <h2 id="checklist-title" className={styles.sectionTitle}>
              {t('checklist.title')}
            </h2>
            <ul className={styles.checklist}>
              {CHECKLIST.map((key) => (
                <li key={key}>{t(`checklist.${key}`)}</li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <section className={styles.band} aria-labelledby="cta-title">
        <div className={styles.container}>
          <h2 id="cta-title" className={styles.sectionTitle}>
            {t('cta.title')}
          </h2>
          <p className={styles.sectionSubtitle}>{t('cta.body')}</p>
          <Link className={styles.cta} to={SETUP_PATH}>
            {t('cta.button')}
          </Link>
        </div>
      </section>
    </>
  )
}
