import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge, Button, EmptyState, Skeleton } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { listMyNotifications, markAllNotificationsRead, markNotificationRead } from '../../api/notifications'
import type { MyNotification } from '../../api/notifications'
import styles from './NotificationsPage.module.css'

// CUS-03: Notifications. The fixtures store a type and parameters only,
// so the text is built here with i18n (area "notifications").

const QUEUE_TYPES = ['queue_turn_near', 'queue_wait_changed']
const KNOWN_TYPES = [
  'queue_turn_near',
  'queue_wait_changed',
  'confirm_request',
  'booking_requested',
  'payment_received',
  'booking_confirmed',
  'refund_issued',
  'slot_released',
]

const dhakaDay = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(date)

function relativeTime(iso: string, locale: string): string {
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const minutes = Math.round((Date.parse(iso) - Date.now()) / 60000)
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour')
  return formatter.format(Math.round(minutes / 1440), 'day')
}

function Loading({ label }: { label: string }) {
  return (
    <ul className={styles.list} role="status" aria-busy="true" aria-label={label}>
      {[1, 2, 3, 4].map((n) => (
        <li key={n} className={styles.skeletonItem}>
          <Skeleton width="85%" height="1.25rem" />
          <Skeleton width="30%" />
        </li>
      ))}
    </ul>
  )
}

function Lists({ loaded }: { loaded: MyNotification[] }) {
  const { t, i18n } = useTranslation('notifications')
  const navigate = useNavigate()
  const locale = i18n.language.startsWith('bn') ? 'bn-BD' : 'en-GB'
  const number = new Intl.NumberFormat(locale)
  const money = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 })

  // Reading one notification changes only that row. We keep the changed list here,
  // so the badges and the counter update at once without loading everything again.
  const [items, setItems] = useState(loaded)
  const unread = items.filter((item) => !item.is_read).length

  const today = dhakaDay(new Date())
  const groups = [
    { key: 'today', list: items.filter((item) => dhakaDay(new Date(item.created_at)) === today) },
    { key: 'earlier', list: items.filter((item) => dhakaDay(new Date(item.created_at)) !== today) },
  ].filter((group) => group.list.length > 0)

  function textFor(item: MyNotification): string {
    const values: Record<string, string | number> = { ...item.params }
    if (typeof item.params.amount_poisha === 'number') values.amount = money.format(item.params.amount_poisha / 100)
    if (typeof item.params.position === 'number') values.position = number.format(item.params.position)
    if (typeof item.params.minutes === 'number') values.minutes = number.format(item.params.minutes)
    const key = KNOWN_TYPES.includes(item.type) ? item.type : 'other'
    return t(`text.${key}`, values)
  }

  function open(item: MyNotification) {
    if (!item.is_read) {
      setItems((previous) => previous.map((row) => (row.id === item.id ? { ...row, is_read: true } : row)))
      markNotificationRead(item.id).catch(() => undefined)
    }
    if (QUEUE_TYPES.includes(item.type)) navigate('/me/queue')
    else if (item.booking_id) navigate('/me/bookings')
  }

  function markAll() {
    setItems((previous) => previous.map((row) => ({ ...row, is_read: true })))
    markAllNotificationsRead().catch(() => undefined)
  }

  if (items.length === 0) {
    return <EmptyState title={t('emptyTitle')} description={t('emptyText')} />
  }

  return (
    <>
      <div className={styles.toolbar}>
        <p className={styles.status} role="status">
          {unread > 0 ? t('unread', { count: number.format(unread) }) : t('allRead')}
        </p>
        <Button variant="secondary" onClick={markAll} disabled={unread === 0}>
          {t('markAll')}
        </Button>
      </div>

      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`group-${group.key}`}>
          <h2 id={`group-${group.key}`} className={styles.groupTitle}>
            {t(group.key)}
          </h2>
          <ul className={styles.list}>
            {group.list.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={item.is_read ? styles.item : `${styles.item} ${styles.unread}`}
                  onClick={() => open(item)}
                >
                  <span className={styles.text}>{textFor(item)}</span>
                  <span className={styles.meta}>
                    {!item.is_read && <Badge variant="primary">{t('new')}</Badge>}
                    <time dateTime={item.created_at}>{relativeTime(item.created_at, locale)}</time>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}

export default function NotificationsPage() {
  const { t } = useTranslation(['notifications', 'common'])
  const { state, retry } = useAsync(listMyNotifications)

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('title')}</h1>

      {state.status === 'loading' && <Loading label={t('loading')} />}

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