import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BookingCard from '../../components/BookingCard'
import { Button, Card, EmptyState, Skeleton, Tabs } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { listMyBookings } from '../../api/bookings'
import type { BookingStatus, MyBooking } from '../../api/bookings'
import styles from './MyBookingsPage.module.css'

// CUS-01: My bookings (UI-SM-08). This commit shows the two lists. The action buttons
// (reschedule, cancel, confirm arrival, review) are added in UI-SM-09.
const UPCOMING_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'arrived', 'in_service']

const byStart = (a: MyBooking, b: MyBooking) => Date.parse(a.starts_at) - Date.parse(b.starts_at)

function Loading({ label }: { label: string }) {
  return (
    <div className={styles.list} role="status" aria-busy="true" aria-label={label}>
      {[1, 2, 3].map((n) => (
        <Card key={n} className={styles.skeletonCard}>
          <Skeleton width="60%" height="1.25rem" />
          <Skeleton width="40%" />
          <Skeleton width="80%" />
        </Card>
      ))}
    </div>
  )
}

function BookingList({ bookings }: { bookings: MyBooking[] }) {
  return (
    <ul className={styles.list}>
      {bookings.map((booking) => (
        <li key={booking.id}>
          <BookingCard booking={booking} />
        </li>
      ))}
    </ul>
  )
}

function Lists({ bookings }: { bookings: MyBooking[] }) {
  const { t, i18n } = useTranslation('customer')
  const navigate = useNavigate()
  const number = new Intl.NumberFormat(i18n.language.startsWith('bn') ? 'bn-BD' : 'en-GB')

  // Upcoming: soonest first. Past: most recent first.
  const upcoming = bookings.filter((b) => UPCOMING_STATUSES.includes(b.status)).sort(byStart)
  const past = bookings.filter((b) => !UPCOMING_STATUSES.includes(b.status)).sort((a, b) => byStart(b, a))

  return (
    <Tabs
      label={t('bookings.tabsLabel')}
      tabs={[
        {
          id: 'upcoming',
          label: `${t('bookings.upcoming')} (${number.format(upcoming.length)})`,
          content:
            upcoming.length > 0 ? (
              <BookingList bookings={upcoming} />
            ) : (
              <EmptyState
                title={t('bookings.emptyUpcomingTitle')}
                description={t('bookings.emptyUpcomingText')}
                action={<Button onClick={() => navigate('/shops')}>{t('bookings.findShops')}</Button>}
              />
            ),
        },
        {
          id: 'past',
          label: `${t('bookings.past')} (${number.format(past.length)})`,
          content:
            past.length > 0 ? (
              <BookingList bookings={past} />
            ) : (
              <EmptyState title={t('bookings.emptyPastTitle')} description={t('bookings.emptyPastText')} />
            ),
        },
      ]}
    />
  )
}

export default function MyBookingsPage() {
  const { t } = useTranslation(['customer', 'common'])
  const { state, retry } = useAsync(listMyBookings)

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('bookings.title')}</h1>

      {state.status === 'loading' && <Loading label={t('bookings.loading')} />}

      {state.status === 'error' && (
        <>
          <p className={styles.status} role="alert">
            {t('common:states.error')}
          </p>
          <div>
            <Button variant="secondary" onClick={retry}>
              {t('common:actions.retry')}
            </Button>
          </div>
        </>
      )}

      {state.status === 'ready' && <Lists bookings={state.data} />}
    </div>
  )
}
