import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from './ui'
import StatusBadge from './StatusBadge'
import type { MyBooking } from '../api/bookings'
import { useBookingFormat } from '../hooks/useBookingFormat'
import styles from './BookingCard.module.css'

// One booking in the customer's list (CUS-01). It only shows what it is given.
// The action buttons (reschedule, cancel, confirm arrival, review) come from the page
// through `actions`.
interface BookingCardProps {
  booking: MyBooking
  actions?: ReactNode
}

export default function BookingCard({ booking, actions }: BookingCardProps) {
  const { t } = useTranslation('customer')
  const format = useBookingFormat()

  // One short message that explains what the customer should know or do.
  let note: string | null = null
  let needsAttention = false
  if (booking.status === 'pending' && booking.hold_expires_at) {
    note = t('bookings.notes.holdUntil', { time: format.time(booking.hold_expires_at) })
    needsAttention = true
  } else if (booking.status === 'pending') {
    note = t('bookings.notes.awaitingApproval')
  } else if (booking.can_confirm) {
    note = t('bookings.notes.confirmRequest')
    needsAttention = true
  } else if (booking.status === 'arrived') {
    note = t('bookings.notes.arrived')
  } else if (booking.status === 'cancelled') {
    note = booking.cancelled_by === 'shop' ? t('bookings.notes.cancelledByShop') : t('bookings.notes.cancelledByYou')
  } else if (booking.status === 'no_show') {
    note = t('bookings.notes.noShow')
  }

  // Until when the customer can still change or cancel for free, or that it is too late.
  const open = booking.status === 'pending' || booking.status === 'confirmed'
  const changeLine = booking.change_deadline
    ? t('bookings.freeUntil', { when: format.dateTime(booking.change_deadline) })
    : open && !booking.hold_expires_at
      ? t('bookings.tooLate')
      : null

  return (
    <Card as="article" className={styles.card}>
      <div className={styles.head}>
        <Link to={`/shops/${booking.shop_id}`} className={styles.shop}>
          {booking.shop_name}
        </Link>
        <StatusBadge kind="booking" status={booking.status} />
      </div>

      <p className={styles.when}>{format.range(booking.starts_at, booking.ends_at)}</p>
      <p className={styles.line}>{booking.service_names.join(', ')}</p>
      <p className={styles.line}>
        {booking.staff_name ? t('bookings.staffWith', { name: booking.staff_name }) : t('bookings.anyStaff')}
      </p>

      <div className={styles.payment}>
        <span>{t('bookings.total', { amount: format.money(booking.total_poisha) })}</span>
        {booking.paid_poisha > 0 && (
          <span>· {t('bookings.paid', { amount: format.money(booking.paid_poisha) })}</span>
        )}
        <span>· {t(`bookings.method.${booking.payment_method}`)}</span>
        <StatusBadge kind="payment" status={booking.payment_status} />
      </div>

      {booking.refunded_poisha > 0 && (
        <p className={styles.line}>{t('bookings.notes.refunded', { amount: format.money(booking.refunded_poisha) })}</p>
      )}

      {note && <p className={`${styles.note} ${needsAttention ? styles.attention : ''}`}>{note}</p>}
      {changeLine && <p className={styles.line}>{changeLine}</p>}
      {booking.status === 'completed' && booking.has_review && <p className={styles.line}>{t('bookings.reviewed')}</p>}

      {actions && <div className={styles.actions}>{actions}</div>}
    </Card>
  )
}
