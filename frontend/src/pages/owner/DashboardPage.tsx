import { useTranslation } from 'react-i18next'
import StatusBadge from '../../components/StatusBadge'
import { Button, Card, EmptyState, Skeleton, StatTile } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { getOwnerDashboard } from '../../api/dashboard'
import type { DashboardBooking, OwnerDashboard } from '../../api/dashboard'
import styles from './DashboardPage.module.css'

// OWN-01: owner dashboard (FR-09.1). UI-SM-13: the numbers and today's bookings.
// UI-SM-14: upcoming appointments and popular services.

const UPCOMING_SHOWN = 5

function useFormats() {
  const { i18n } = useTranslation()
  const locale = i18n.language.startsWith('bn') ? 'bn-BD' : 'en-GB'
  const numberFormat = new Intl.NumberFormat(locale)
  const moneyFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 })
  return {
    number: (value: number) => numberFormat.format(value),
    money: (poisha: number) => `৳${moneyFormat.format(poisha / 100)}`,
    time: (iso: string) =>
      new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' }).format(
        new Date(iso),
      ),
    day: (iso: string) =>
      new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'Asia/Dhaka',
      }).format(new Date(iso)),
    today: () => new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'Asia/Dhaka' }).format(new Date()),
  }
}

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

function BookingRow({ booking, showDay }: { booking: DashboardBooking; showDay?: boolean }) {
  const { t } = useTranslation('ownerDashboard')
  const format = useFormats()
  return (
    <Card>
      <div className={styles.row}>
        <time className={styles.time} dateTime={booking.starts_at}>
          {showDay && <span className={styles.day}>{format.day(booking.starts_at)}</span>}
          {format.time(booking.starts_at)}
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
          <span className={styles.total}>{format.money(booking.total_poisha)}</span>
        </div>
      </div>
    </Card>
  )
}

function Content({ data }: { data: OwnerDashboard }) {
  const { t } = useTranslation('ownerDashboard')
  const format = useFormats()

  const shownUpcoming = data.upcoming_bookings.slice(0, UPCOMING_SHOWN)
  const moreUpcoming = data.upcoming_bookings.length - shownUpcoming.length
  const topCount = Math.max(1, ...data.popular_services.map((service) => service.count))

  return (
    <>
      <p className={styles.subtitle}>{t('subtitle', { shop: data.shop_name, date: format.today() })}</p>

      <div className={styles.tiles}>
        <StatTile label={t('tiles.today')} value={format.number(data.today_count)} />
        <StatTile label={t('tiles.left')} value={format.number(data.today_left_count)} />
        <StatTile
          label={t('tiles.earnings')}
          value={format.money(data.today_earnings_poisha)}
          hint={t('tiles.earningsHint')}
        />
        <StatTile
          label={t('tiles.queue')}
          value={format.number(data.waiting_count)}
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
                <BookingRow booking={booking} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="upcoming-title" className={styles.section}>
        <h2 id="upcoming-title" className={styles.sectionTitle}>
          {t('upcomingTitle')}
        </h2>
        {shownUpcoming.length === 0 ? (
          <EmptyState title={t('upcomingEmptyTitle')} description={t('upcomingEmptyText')} />
        ) : (
          <>
            <ul className={styles.list}>
              {shownUpcoming.map((booking) => (
                <li key={booking.id}>
                  <BookingRow booking={booking} showDay />
                </li>
              ))}
            </ul>
            {moreUpcoming > 0 && <p className={styles.muted}>{t('upcomingMore', { count: format.number(moreUpcoming) })}</p>}
          </>
        )}
      </section>

      <section aria-labelledby="popular-title" className={styles.section}>
        <h2 id="popular-title" className={styles.sectionTitle}>
          {t('popularTitle')}
        </h2>
        <p className={styles.muted}>{t('popularHint')}</p>
        {data.popular_services.length === 0 ? (
          <EmptyState title={t('popularEmptyTitle')} description={t('popularEmptyText')} />
        ) : (
          <Card>
            <ol className={styles.popularList}>
              {data.popular_services.map((service) => (
                <li key={service.service_name} className={styles.popularItem}>
                  <div className={styles.popularTop}>
                    <span className={styles.popularName}>{service.service_name}</span>
                    <span className={styles.muted}>{t('popularCount', { count: format.number(service.count) })}</span>
                  </div>
                  <span className={styles.barTrack} aria-hidden="true">
                    <span className={styles.bar} style={{ width: `${(service.count / topCount) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ol>
          </Card>
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