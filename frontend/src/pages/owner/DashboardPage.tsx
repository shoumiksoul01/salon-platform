import { useTranslation } from 'react-i18next'
import StatusBadge from '../../components/StatusBadge'
import { Button, Card, EmptyState, Skeleton, StatTile } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { getOwnerDashboard } from '../../api/dashboard'
import type { OwnerDashboard } from '../../api/dashboard'
import styles from './DashboardPage.module.css'

// OWN-01: owner dashboard (FR-09.1). UI-SM-13: the numbers and today's bookings.

function Loading({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={styles.loading}>
      <div className={styles.tiles}>
        {[1, 2, 3, 4].map((n) => (
          <Card key={n}>
            <Skeleton width="60%" />
            <Skeleton width="40%" height="1.5rem" />
          </Card>
        ))}
      </div>
      <Skeleton width="100%" height="4rem" />
      <Skeleton width="100%" height="4rem" />
    </div>
  )
}

function Content({ data }: { data: OwnerDashboard }) {
  const { t, i18n } = useTranslation('ownerDashboard')
  const locale = i18n.language.startsWith('bn') ? 'bn-BD' : 'en-GB'
  const number = new Intl.NumberFormat(locale)
  const money = (poisha: number) =>
    `৳${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(poisha / 100)}`
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' })
  const dateLabel = new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'Asia/Dhaka' }).format(new Date())

  return (
    <>
      <p className={styles.subtitle}>{t('subtitle', { shop: data.shop_name, date: dateLabel })}</p>

      <div className={styles.tiles}>
        <StatTile label={t('tiles.today')} value={number.format(data.today_count)} />
        <StatTile label={t('tiles.left')} value={number.format(data.today_left_count)} />
        <StatTile
          label={t('tiles.earnings')}
          value={money(data.today_earnings_poisha)}
          hint={t('tiles.earningsHint')}
        />
        <StatTile
          label={t('tiles.queue')}
          value={number.format(data.waiting_count)}
          hint={t('tiles.queueHint')}
        />
      </div>

      <section aria-labelledby="today-list-title" className={styles.section}>
        <h2 id="today-list-title" className={styles.sectionTitle}>
          {t('todayTitle')}
        </h2>

        {data.today_bookings.length === 0 ? (
          <EmptyState title={t('emptyTitle')} description={t('emptyText')} />
        ) : (
          <ul className={styles.list}>
            {data.today_bookings.map((booking) => (
              <li key={booking.id}>
                <Card>
                  <div className={styles.row}>
                    <time className={styles.time} dateTime={booking.starts_at}>
                      {time.format(new Date(booking.starts_at))}
                    </time>
                    <div className={styles.details}>
                      <p className={styles.customer}>{booking.customer_name}</p>
                      <p className={styles.muted}>{booking.service_names.join(', ')}</p>
                      <p className={styles.muted}>
                        {booking.staff_name ? t('staffWith', { name: booking.staff_name }) : t('anyStaff')}
                      </p>
                    </div>
                    <div className={styles.side}>
                      <StatusBadge kind="booking" status={booking.status} />
                      <span className={styles.total}>{money(booking.total_poisha)}</span>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation(['ownerDashboard', 'common'])
  const { state, retry } = useAsync(getOwnerDashboard)

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('title')}</h1>

      {state.status === 'loading' && <Loading label={t('loading')} />}

      {state.status === 'error' && (
        <>
          <p className={styles.muted} role="alert">
            {t('common:states.error')}
          </p>
          <div>
            <Button variant="secondary" onClick={retry}>
              {t('common:actions.retry')}
            </Button>
          </div>
        </>
      )}

      {state.status === 'ready' && <Content data={state.data} />}
    </div>
  )
}