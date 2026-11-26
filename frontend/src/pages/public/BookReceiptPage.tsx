import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card } from '../../components/ui'
import { getBookingReceipt } from '../../api/checkout'
import type { BookingReceipt } from '../../api/checkout'
import styles from './BookReceiptPage.module.css'

type LoadState = 'loading' | 'error' | 'notFound' | 'ready'
type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger'

function bookingVariant(status: string): BadgeVariant {
  if (status === 'confirmed' || status === 'completed') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'cancelled' || status === 'no_show') return 'danger'
  return 'neutral'
}

function paymentVariant(status: string): BadgeVariant {
  if (status === 'paid') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'failed') return 'danger'
  return 'neutral'
}

// BOOK-04: the receipt shown after a booking is made (FR-07.2).
export default function BookReceiptPage() {
  const { t, i18n } = useTranslation('receipt')
  const navigate = useNavigate()
  const { bookingId = '' } = useParams()

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null)

  useEffect(() => {
    let cancelled = false
    getBookingReceipt(bookingId)
      .then((result) => {
        if (cancelled) return
        setReceipt(result)
        setLoadState(result ? 'ready' : 'notFound')
      })
      .catch(() => {
        if (!cancelled) setLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [bookingId, reloadKey])

  function retry() {
    setLoadState('loading')
    setReloadKey((key) => key + 1)
  }

  if (loadState === 'loading') {
    return (
      <div className={styles.page}>
        <p className={styles.text} role="status">
          {t('common:states.loading')}
        </p>
      </div>
    )
  }

  if (loadState === 'notFound') {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>{t('notFound.title')}</h1>
        <p className={styles.text}>{t('notFound.body')}</p>
        <div className={styles.actions}>
          <Button onClick={() => navigate('/me/bookings')}>{t('myBookings')}</Button>
          <Link className={styles.link} to="/shops">
            {t('notFound.action')}
          </Link>
        </div>
      </div>
    )
  }

  if (loadState === 'error' || !receipt) {
    return (
      <div className={styles.page}>
        <p className={styles.text} role="alert">
          {t('loadError')}
        </p>
        <div>
          <Button variant="secondary" onClick={retry}>
            {t('common:actions.retry')}
          </Button>
        </div>
      </div>
    )
  }

  const locale = i18n.language === 'bn' ? 'bn-BD' : 'en-GB'
  const fullFormat = new Intl.DateTimeFormat(locale, {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Dhaka',
  })
  const money = new Intl.NumberFormat(locale === 'bn-BD' ? 'bn-BD' : 'en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
  })

  const isPending = receipt.status === 'pending'
  const reference = receipt.booking_id.slice(0, 8).toUpperCase()

  return (
    <div className={styles.page}>
      <div
        className={isPending ? `${styles.banner} ${styles.bannerPending}` : styles.banner}
        role="status"
      >
        <h1 className={styles.title}>{isPending ? t('titlePending') : t('titleConfirmed')}</h1>
        <p className={styles.bannerText}>{isPending ? t('leadPending') : t('leadConfirmed')}</p>
        <p className={styles.reference}>
          <span>{t('reference')}</span>
          <strong dir="ltr">{reference}</strong>
        </p>
      </div>

      <Card as="section">
        <h2 className={styles.sectionTitle}>{receipt.shop_name}</h2>
        {receipt.shop_address && <p className={styles.text}>{receipt.shop_address}</p>}
        <dl className={styles.rows}>
          <div className={styles.row}>
            <dt>{t('when')}</dt>
            <dd>{fullFormat.format(new Date(receipt.starts_at))}</dd>
          </div>
          <div className={styles.row}>
            <dt>{t('staff')}</dt>
            <dd>{receipt.staff_name ?? t('anyStaff')}</dd>
          </div>
          <div className={styles.row}>
            <dt>{t('totalTime')}</dt>
            <dd>{t('duration', { minutes: receipt.total_minutes })}</dd>
          </div>
          <div className={styles.row}>
            <dt>{t('customer')}</dt>
            <dd>{receipt.customer_name}</dd>
          </div>
          <div className={styles.row}>
            <dt>{t('phone')}</dt>
            <dd dir="ltr">{receipt.customer_phone}</dd>
          </div>
          <div className={styles.row}>
            <dt>{t('bookingStatus')}</dt>
            <dd>
              <Badge variant={bookingVariant(receipt.status)}>{t(`status.${receipt.status}`)}</Badge>
            </dd>
          </div>
        </dl>
      </Card>

      <Card as="section">
        <h2 className={styles.sectionTitle}>{t('servicesTitle')}</h2>
        <ul className={styles.items}>
          {receipt.services.map((service) => (
            <li key={service.id} className={styles.item}>
              <span>{service.name}</span>
              <span>{money.format(service.price_poisha / 100)}</span>
            </li>
          ))}
        </ul>
        <dl className={`${styles.rows} ${styles.totals}`}>
          <div className={styles.row}>
            <dt>{t('subtotal')}</dt>
            <dd>{money.format(receipt.subtotal_poisha / 100)}</dd>
          </div>
          {receipt.offer_title && receipt.discount_poisha > 0 && (
            <div className={styles.row}>
              <dt>{t('offerLine', { title: receipt.offer_title })}</dt>
              <dd className={styles.discount}>
                {'\u2212'}
                {money.format(receipt.discount_poisha / 100)}
              </dd>
            </div>
          )}
          <div className={`${styles.row} ${styles.grand}`}>
            <dt>{t('total')}</dt>
            <dd>{money.format(receipt.total_poisha / 100)}</dd>
          </div>
        </dl>
      </Card>

      <Card as="section">
        <h2 className={styles.sectionTitle}>{t('paymentTitle')}</h2>
        <dl className={styles.rows}>
          <div className={styles.row}>
            <dt>{t('method')}</dt>
            <dd>{t(`methods.${receipt.payment_method}`)}</dd>
          </div>
          <div className={styles.row}>
            <dt>{t('paymentStatus')}</dt>
            <dd>
              <Badge variant={paymentVariant(receipt.payment_status)}>
                {t(`paymentStates.${receipt.payment_status}`)}
              </Badge>
            </dd>
          </div>
          {receipt.paid_poisha > 0 && (
            <div className={styles.row}>
              <dt>{t('paidNow')}</dt>
              <dd>{money.format(receipt.paid_poisha / 100)}</dd>
            </div>
          )}
          {receipt.due_at_shop_poisha > 0 && (
            <div className={styles.row}>
              <dt>{t('dueAtShop')}</dt>
              <dd>{money.format(receipt.due_at_shop_poisha / 100)}</dd>
            </div>
          )}
        </dl>
        {receipt.due_at_shop_poisha > 0 && (
          <p className={styles.note}>
            {t('dueNote', { amount: money.format(receipt.due_at_shop_poisha / 100) })}
          </p>
        )}
        {receipt.paid_poisha > 0 && <p className={styles.note}>{t('testNote')}</p>}
      </Card>

      <div className={styles.actions}>
        <Button onClick={() => navigate('/me/bookings')}>{t('myBookings')}</Button>
        <Button variant="secondary" onClick={() => window.print()}>
          {t('print')}
        </Button>
        <Link className={styles.link} to="/shops">
          {t('findShops')}
        </Link>
      </div>
    </div>
  )
}