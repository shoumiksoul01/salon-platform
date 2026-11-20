import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BookingCard from '../../components/BookingCard'
import CancelBookingDialog from '../../components/CancelBookingDialog'
import ConfirmArrivalDialog from '../../components/ConfirmArrivalDialog'
import RescheduleBookingDialog from '../../components/RescheduleBookingDialog'
import ReviewDialog from '../../components/ReviewDialog'
import { Button, Card, EmptyState, Skeleton, Tabs } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { listMyBookings } from '../../api/bookings'
import type { BookingStatus, MyBooking } from '../../api/bookings'
import styles from './MyBookingsPage.module.css'

// CUS-01: My bookings (UI-SM-08 lists, UI-SM-09 dialogs).
const UPCOMING_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'arrived', 'in_service']

type DialogKind = 'confirm' | 'reschedule' | 'cancel' | 'review'

const byStart = (a: MyBooking, b: MyBooking) => Date.parse(a.starts_at) - Date.parse(b.starts_at)

// The server says what a customer can still do with each booking (can_* fields).
const canReview = (booking: MyBooking) => booking.status === 'completed' && !booking.has_review
const canViewQueue = (booking: MyBooking) => booking.status === 'arrived' || booking.status === 'in_service'
const hasActions = (booking: MyBooking) =>
  booking.can_confirm || booking.can_reschedule || booking.can_cancel || canReview(booking) || canViewQueue(booking)

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

function BookingActions({ booking, onOpen }: { booking: MyBooking; onOpen: (kind: DialogKind) => void }) {
  const { t } = useTranslation('customer')
  const navigate = useNavigate()
  return (
    <>
      {canViewQueue(booking) && <Button onClick={() => navigate('/me/queue')}>{t('bookings.actions.queue')}</Button>}
      {booking.can_confirm && <Button onClick={() => onOpen('confirm')}>{t('bookings.actions.confirm')}</Button>}
      {booking.can_reschedule && (
        <Button variant="secondary" onClick={() => onOpen('reschedule')}>
          {t('bookings.actions.reschedule')}
        </Button>
      )}
      {booking.can_cancel && (
        <Button variant="ghost" onClick={() => onOpen('cancel')}>
          {t('bookings.actions.cancel')}
        </Button>
      )}
      {canReview(booking) && (
        <Button variant="secondary" onClick={() => onOpen('review')}>
          {t('bookings.actions.review')}
        </Button>
      )}
    </>
  )
}

function BookingList({ children }: { children: ReactNode }) {
  return <ul className={styles.list}>{children}</ul>
}

function Lists({ loaded }: { loaded: MyBooking[] }) {
  const { t, i18n } = useTranslation('customer')
  const navigate = useNavigate()
  const number = new Intl.NumberFormat(i18n.language.startsWith('bn') ? 'bn-BD' : 'en-GB')

  // A dialog changes one booking. We keep the changed booking here, so the lists, the badges
  // and the buttons update at once without loading everything again.
  const [updates, setUpdates] = useState<Record<string, MyBooking>>({})
  const [active, setActive] = useState<{ kind: DialogKind; booking: MyBooking } | null>(null)

  const bookings = loaded.map((booking) => updates[booking.id] ?? booking)
  const upcoming = bookings.filter((b) => UPCOMING_STATUSES.includes(b.status)).sort(byStart)
  const past = bookings.filter((b) => !UPCOMING_STATUSES.includes(b.status)).sort((a, b) => byStart(b, a))

  const close = () => setActive(null)
  const done = (updated: MyBooking) => {
    setUpdates((previous) => ({ ...previous, [updated.id]: updated }))
    setActive(null)
  }
  const forDialog = (kind: DialogKind) => (active?.kind === kind ? active.booking : null)

  const renderList = (list: MyBooking[]) => (
    <BookingList>
      {list.map((booking) => (
        <li key={booking.id}>
          <BookingCard
            booking={booking}
            actions={
              hasActions(booking) ? (
                <BookingActions booking={booking} onOpen={(kind) => setActive({ kind, booking })} />
              ) : undefined
            }
          />
        </li>
      ))}
    </BookingList>
  )

  return (
    <>
      <Tabs
        label={t('bookings.tabsLabel')}
        tabs={[
          {
            id: 'upcoming',
            label: `${t('bookings.upcoming')} (${number.format(upcoming.length)})`,
            content:
              upcoming.length > 0 ? (
                renderList(upcoming)
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
                renderList(past)
              ) : (
                <EmptyState title={t('bookings.emptyPastTitle')} description={t('bookings.emptyPastText')} />
              ),
          },
        ]}
      />

      <ConfirmArrivalDialog booking={forDialog('confirm')} onClose={close} onDone={done} />
      <RescheduleBookingDialog booking={forDialog('reschedule')} onClose={close} onDone={done} />
      <CancelBookingDialog booking={forDialog('cancel')} onClose={close} onDone={done} />
      <ReviewDialog booking={forDialog('review')} onClose={close} onDone={done} />
    </>
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

      {state.status === 'ready' && <Lists loaded={state.data} />}
    </div>
  )
}
