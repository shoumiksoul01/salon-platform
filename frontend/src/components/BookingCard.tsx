import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from './ui'
import StatusBadge from './StatusBadge'
import type { MyBooking } from '../api/bookings'
import styles from './BookingCard.module.css'

// One booking in the customer's list (CUS-01). It only shows what it is given.
// The action buttons (reschedule, cancel, confirm arrival, review) come from the page
// through `actions`, so this card stays the same when UI-SM-09 adds the dialogs.
interface BookingCardProps {
  booking: MyBooking
  actions?: ReactNode
}

const localeFor = (language: string) => (language.startsWith('bn') ? 'bn-BD' : 'en-GB')

export default function BookingCard({ booking, actions }: BookingCardProps) {
  const { t, i18n } = useTranslation('customer')
  const locale = localeFor(i18n.language)

  const dateFormat = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Dhaka',
  })
  const timeFormat = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Dhaka',
  })
  const taka = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
  const money = (poisha: number) => t('bookings.money', { amount: taka.format(poisha / 100) })

  const start = new Date(booking.starts_at)
  const end = new Date(booking.ends_at)

  // One short message that explains what the customer should know or do.
  let note: string | null = null
  let needsAttention = false
  if (booking.status === 'pending' && booking.hold_expires_at) {
    note = t('bookings.notes.holdUntil', { time: timeFormat.format(new Date(booking.hold_expires_at)) })
    needsAttention = true
  } else if (booking.status === 'pending') {
    note = t('bookings.notes.awaitingApproval')
  } else if (
    booking.status === 'confirmed' &&
    booking.confirmation_requested_at &&
    !booking.customer_confirmed_at
  ) {
    note = t('bookings.notes.confirmRequest')
    needsAttention = true
  } else if (booking.status === 'arrived') {
    note = t('bookings.notes.arrived')
  } else if (booking.status === 'cancelled') {
    note = booking.cancelled_by === 'shop' ? t('bookings.notes.cancelledByShop') : t('bookings.notes.cancelledByYou')
  } else if (booking.status === 'no_show') {
    note = t('bookings.notes.noShow')
  }

  return (
    <Card as="article" className={styles.card}>
      <div className={styles.head}>
        <Link to={`/shops/${booking.shop_id}`} className={styles.shop}>
          {booking.shop_name}
        </Link>
        <StatusBadge kind="booking" status={booking.status} />
      </div>

      <p className={styles.when}>
        {dateFormat.format(start)} · {timeFormat.format(start)} – {timeFormat.format(end)}
      </p>
      <p className={styles.line}>{booking.service_names.join(', ')}</p>
      <p className={styles.line}>
        {booking.staff_name ? t('bookings.staffWith', { name: booking.staff_name }) : t('bookings.anyStaff')}
      </p>

      <div className={styles.payment}>
        <span>{t('bookings.total', { amount: money(booking.total_poisha) })}</span>
        {booking.paid_poisha > 0 && <span>· {t('bookings.paid', { amount: money(booking.paid_poisha) })}</span>}
        <span>· {t(`bookings.method.${booking.payment_method}`)}</span>
        <StatusBadge kind="payment" status={booking.payment_status} />
      </div>

      {booking.refunded_poisha > 0 && (
        <p className={styles.line}>{t('bookings.notes.refunded', { amount: money(booking.refunded_poisha) })}</p>
      )}

      {note && <p className={`${styles.note} ${needsAttention ? styles.attention : ''}`}>{note}</p>}

      {actions && <div className={styles.actions}>{actions}</div>}
    </Card>
  )
}
