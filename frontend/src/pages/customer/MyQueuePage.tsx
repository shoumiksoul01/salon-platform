import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import QueueEntryCard from '../../components/QueueEntryCard'
import { Button, Card, EmptyState, Skeleton } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { getMyQueue } from '../../api/queue'
import type { MyQueue } from '../../api/queue'
import styles from './MyQueuePage.module.css'

// CUS-02: the customer's place in the live queue (UI-SM-10).
// The page asks again every 10 seconds (the task board says: polling every 10 to 15 seconds,
// realtime later). Other customers are shown without their names and services.
const REFRESH_MS = 10_000

const localeFor = (language: string) => (language.startsWith('bn') ? 'bn-BD' : 'en-GB')

function Loading({ label }: { label: string }) {
  return (
    <div className={styles.list} role="status" aria-busy="true" aria-label={label}>
      <Card className={styles.skeletonCard}>
        <Skeleton width="40%" />
        <Skeleton width="30%" height="3rem" />
        <Skeleton width="70%" />
      </Card>
      {[1, 2, 3].map((n) => (
        <Card key={n} className={styles.skeletonCard}>
          <Skeleton width="50%" />
          <Skeleton width="30%" />
        </Card>
      ))}
    </div>
  )
}

function Hero({ queue }: { queue: MyQueue }) {
  const { t, i18n } = useTranslation('customer')
  const number = new Intl.NumberFormat(localeFor(i18n.language))

  const yourTurn = queue.status === 'in_service'
  const isNext = queue.status === 'waiting' && queue.position === 1
  const classes = [styles.hero, yourTurn ? styles.turn : isNext ? styles.next : ''].filter(Boolean).join(' ')

  const shopLine = [
    queue.shop_name,
    queue.service_names.join(', '),
    queue.staff_name ? t('queue.staffWith', { name: queue.staff_name }) : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Card as="section" className={classes}>
      <p className={styles.shopLine}>{shopLine}</p>

      {/* aria-live: a screen reader announces it when the place or the turn changes. */}
      <div aria-live="polite">
        {yourTurn ? (
          <>
            <h2 className={styles.heading}>{t('queue.yourTurn')}</h2>
            <p className={styles.lead}>
              {queue.staff_name ? t('queue.goTo', { name: queue.staff_name }) : t('queue.goToDesk')}
            </p>
          </>
        ) : (
          <div className={styles.placeRow}>
            <span className={styles.bigNumber} aria-hidden="true">
              {number.format(queue.position ?? 0)}
            </span>
            <div>
              <h2 className={styles.heading}>{t('queue.yourPlace')}</h2>
              <p className={styles.lead}>
                {isNext
                  ? t('queue.youAreNext')
                  : t('queue.summary', {
                      position: number.format(queue.position ?? 0),
                      ahead: number.format(queue.people_ahead),
                    })}
              </p>
            </div>
          </div>
        )}
      </div>

      {!yourTurn && (
        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>{t('queue.ahead')}</dt>
            <dd className={styles.statValue}>{number.format(queue.people_ahead)}</dd>
          </div>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>{t('queue.beingServed')}</dt>
            <dd className={styles.statValue}>{number.format(queue.in_service_count)}</dd>
          </div>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>{t('queue.wait')}</dt>
            <dd className={styles.statValue}>
              {queue.estimated_wait_minutes !== null
                ? t('queue.about', { minutes: number.format(queue.estimated_wait_minutes) })
                : '–'}
            </dd>
          </div>
        </dl>
      )}
    </Card>
  )
}

function QueueView({
  queue,
  refreshing,
  refreshFailed,
  onRefresh,
}: {
  queue: MyQueue
  refreshing: boolean
  refreshFailed: boolean
  onRefresh: () => void
}) {
  const { t, i18n } = useTranslation('customer')
  const timeFormat = new Intl.DateTimeFormat(localeFor(i18n.language), {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Dhaka',
  })

  return (
    <>
      <Hero queue={queue} />

      <div className={styles.refreshRow}>
        <div>
          <p className={styles.small}>{t('queue.updatedAt', { time: timeFormat.format(new Date(queue.updated_at)) })}</p>
          <p className={styles.small}>{t('queue.autoRefresh')}</p>
          {refreshFailed && (
            <p className={styles.small} role="status">
              {t('queue.refreshFailed')}
            </p>
          )}
        </div>
        <Button variant="secondary" onClick={onRefresh} loading={refreshing}>
          {t('queue.refresh')}
        </Button>
      </div>

      <section>
        <h2 className={styles.sectionTitle}>{t('queue.listTitle', { shop: queue.shop_name })}</h2>
        <ul className={styles.list}>
          {queue.rows.map((row) => (
            <li key={row.id}>
              <QueueEntryCard
                entry={{
                  customer_name: row.is_you ? t('queue.yourBooking') : t('queue.someone'),
                  status: row.status,
                  is_walk_in: row.is_walk_in,
                  position: row.position,
                  estimated_wait_minutes: row.estimated_wait_minutes,
                  joined_at: row.joined_at,
                }}
                serviceNames={[]}
                isYou={row.is_you}
                hideDetails
              />
            </li>
          ))}
        </ul>
        <p className={styles.small}>{t('queue.privacy')}</p>
      </section>
    </>
  )
}

export default function MyQueuePage() {
  const { t } = useTranslation(['customer', 'common'])
  const navigate = useNavigate()
  const { state, retry } = useAsync(getMyQueue)

  // The first answer comes from useAsync. Later answers (every 10 seconds, or the Update
  // button) are kept here. { queue: null } means "no longer in a queue".
  const [fresh, setFresh] = useState<{ queue: MyQueue | null } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshFailed, setRefreshFailed] = useState(false)

  const refresh = useCallback(() => {
    setRefreshing(true)
    getMyQueue()
      .then((queue) => {
        setFresh({ queue })
        setRefreshFailed(false)
      })
      .catch(() => setRefreshFailed(true))
      .finally(() => setRefreshing(false))
  }, [])

  const ready = state.status === 'ready'
  useEffect(() => {
    if (!ready) return
    const timer = window.setInterval(() => {
      if (!document.hidden) refresh()
    }, REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [ready, refresh])

  function handleRetry() {
    setFresh(null)
    retry()
  }

  const queue = state.status === 'ready' ? (fresh ? fresh.queue : state.data) : null

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('queue.title')}</h1>

      {state.status === 'loading' && <Loading label={t('queue.loading')} />}

      {state.status === 'error' && (
        <>
          <p className={styles.status} role="alert">
            {t('common:states.error')}
          </p>
          <div>
            <Button variant="secondary" onClick={handleRetry}>
              {t('common:actions.retry')}
            </Button>
          </div>
        </>
      )}

      {state.status === 'ready' && queue === null && (
        <EmptyState
          title={t('queue.notInQueueTitle')}
          description={t('queue.notInQueueText')}
          action={<Button onClick={() => navigate('/me/bookings')}>{t('queue.myBookings')}</Button>}
        />
      )}

      {state.status === 'ready' && queue !== null && (
        <QueueView queue={queue} refreshing={refreshing} refreshFailed={refreshFailed} onRefresh={refresh} />
      )}
    </div>
  )
}
