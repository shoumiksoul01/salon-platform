import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Card } from './ui'
import StatusBadge from './StatusBadge'
import type { QueueEntry } from '../mocks/bookings'
import styles from './QueueEntryCard.module.css'

// UI-SM-07. One person in the live queue. Used by the owner and staff queue pages
// (with action buttons) and by the customer queue page (read only, with isYou).
// The card only shows what it is given: the page looks up the service names and the staff name
// and passes the action buttons in, so the card never imports data.
//
// Put the cards inside a <ul> of your own if you want a list.
interface QueueEntryCardProps {
  entry: Pick<
    QueueEntry,
    'customer_name' | 'status' | 'is_walk_in' | 'position' | 'estimated_wait_minutes' | 'joined_at'
  >
  serviceNames: string[]
  staffName?: string | null
  /** True for the signed-in customer's own entry. */
  isYou?: boolean
  /** Buttons for the owner and staff pages, for example start, finish and remove. */
  actions?: ReactNode
}

export default function QueueEntryCard({
  entry,
  serviceNames,
  staffName,
  isYou = false,
  actions,
}: QueueEntryCardProps) {
  const { t, i18n } = useTranslation('shared')

  const joined = new Intl.DateTimeFormat(i18n.language === 'bn' ? 'bn-BD' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Dhaka',
  }).format(new Date(entry.joined_at))

  const waiting = entry.status === 'waiting'
  const classes = [styles.card, isYou ? styles.you : ''].filter(Boolean).join(' ')

  return (
    <Card as="article" className={classes}>
      {waiting && entry.position !== null && (
        <span className={styles.position} aria-label={t('queueCard.positionLabel', { position: entry.position })}>
          {entry.position}
        </span>
      )}

      <div className={styles.body}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{entry.customer_name}</span>
          {entry.is_walk_in && <Badge variant="neutral">{t('queueCard.walkIn')}</Badge>}
          {isYou && <Badge variant="primary">{t('queueCard.you')}</Badge>}
        </div>
        <p className={styles.line}>{serviceNames.join(', ')}</p>
        <p className={styles.line}>
          {staffName ? t('queueCard.staffWith', { name: staffName }) : t('queueCard.anyStaff')}
        </p>
        <p className={styles.line}>
          {waiting && entry.position === 1 && `${t('queueCard.next')} · `}
          {waiting && entry.estimated_wait_minutes !== null
            ? `${t('queueCard.wait', { minutes: entry.estimated_wait_minutes })} · `
            : ''}
          {t('queueCard.joinedAt', { time: joined })}
        </p>
      </div>

      <div className={styles.side}>
        <StatusBadge kind="queue" status={entry.status} />
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </Card>
  )
}
