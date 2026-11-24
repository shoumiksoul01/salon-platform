import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, EmptyState, Modal, Skeleton, Tabs, useToast } from '../../components/ui'
import StatusBadge from '../../components/StatusBadge'
import { useAsync } from '../../hooks/useAsync'
import { useBookingFormat } from '../../hooks/useBookingFormat'
import { applyStaffAction, getStaffDay } from '../../api/staffBookings'
import type { BookingAction, OwnerBooking, StaffDay } from '../../api/staffBookings'
import styles from './TodayPage.module.css'

// STF-01: the staff member's bookings for today and the next 7 days (FR-04.1), with the
// status buttons (FR-04.4). The buttons come from booking.actions, so the rules stay on the
// server side. Staff can mark arrived, start, finish and no-show. Phone first.

const OPEN_STATUSES = ['pending', 'confirmed', 'arrived', 'in_service']

function useNumber() {
  const { i18n } = useTranslation('staffToday')
  const numberFormat = new Intl.NumberFormat(i18n.language.startsWith('bn') ? 'bn-BD' : 'en-GB')
  return (value: number) => numberFormat.format(value)
}

function Loading({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={styles.loading}>
      {[1, 2, 3].map((n) => (
        <Card key={n}>
          <Skeleton width="50%" />
          <Skeleton width="30%" />
        </Card>
      ))}
    </div>
  )
}

interface NoShowProps {
  booking: OwnerBooking
  onClose: () => void
  onDone: (updated: OwnerBooking) => void
}

function NoShowDialog({ booking, onClose, onDone }: NoShowProps) {
  const { t } = useTranslation('staffToday')
  const toast = useToast()
  const format = useBookingFormat()
  const formatNumber = useNumber()
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    setBusy(true)
    try {
      onDone(await applyStaffAction(booking.id, 'no_show'))
    } catch {
      toast.show({ message: t('toast.failed'), variant: 'danger' })
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('dialog.title')}
      closeLabel={t('common:actions.close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('dialog.keep')}
          </Button>
          <Button variant="danger" onClick={handleConfirm} loading={busy}>
            {t('dialog.confirm')}
          </Button>
        </>
      }
    >
      <p className={styles.lead}>
        {booking.customer_name} · {format.time(booking.starts_at)}
      </p>
      <p className={styles.muted}>{booking.service_names.join(', ')}</p>
      <p className={styles.note}>{t('dialog.text')}</p>
      {booking.customer_no_shows > 0 && (
        <p className={styles.note}>
          {t('dialog.earlier', { number: formatNumber(booking.customer_no_shows) })}
        </p>
      )}
    </Modal>
  )
}

interface ItemProps {
  booking: OwnerBooking
  busy: boolean
  onAction: (booking: OwnerBooking, action: BookingAction) => void
}

function BookingItem({ booking, busy, onAction }: ItemProps) {
  const { t } = useTranslation('staffToday')
  const { t: tc } = useTranslation('customer')
  const format = useBookingFormat()
  const formatNumber = useNumber()

  // One short line that explains the state of the booking.
  let note: string | null = null
  if (booking.status === 'pending' && booking.hold_expires_at) {
    note = t('notes.hold', { time: format.time(booking.hold_expires_at) })
  } else if (booking.status === 'pending') {
    note = t('notes.pending')
  } else if (booking.status === 'no_show') {
    note = t('notes.noShow')
  }

  const collect =
    booking.payment_method === 'pay_at_shop' &&
    booking.payment_status === 'pending' &&
    ['confirmed', 'arrived', 'in_service'].includes(booking.status)

  const labels: Record<string, { label: string; variant: 'primary' | 'secondary' }> = {
    arrive: { label: t('actions.arrive'), variant: 'primary' },
    start: { label: t('actions.start'), variant: 'primary' },
    complete: { label: t('actions.complete'), variant: 'primary' },
    no_show: { label: t('actions.no_show'), variant: 'secondary' },
  }

  return (
    <Card as="article">
      <div className={styles.head}>
        <p className={styles.when}>{format.range(booking.starts_at, booking.ends_at)}</p>
        <StatusBadge kind="booking" status={booking.status} />
      </div>

      <p className={styles.customer}>
        {booking.customer_name}
        {booking.customer_no_shows > 0 && (
          <>
            {' '}
            <Badge variant="warning">
              {t('earlierNoShows', { number: formatNumber(booking.customer_no_shows) })}
            </Badge>
          </>
        )}
      </p>
      <p className={styles.muted}>{booking.service_names.join(', ')}</p>

      <div className={styles.payment}>
        <span>{t('total', { amount: format.money(booking.total_poisha) })}</span>
        {booking.paid_poisha > 0 && <span>· {t('paid', { amount: format.money(booking.paid_poisha) })}</span>}
        <span>· {tc(`bookings.method.${booking.payment_method}`)}</span>
        <StatusBadge kind="payment" status={booking.payment_status} />
      </div>

      {collect && <p className={styles.note}>{t('collect', { amount: format.money(booking.total_poisha) })}</p>}
      {note && <p className={styles.note}>{note}</p>}

      {booking.actions.length > 0 && (
        <div className={styles.actions}>
          {booking.actions.map((action) => (
            <Button
              key={action}
              variant={labels[action].variant}
              fullWidth
              disabled={busy}
              loading={busy && action !== 'no_show'}
              onClick={() => onAction(booking, action)}
              aria-label={`${labels[action].label}: ${booking.customer_name}`}
            >
              {labels[action].label}
            </Button>
          ))}
        </div>
      )}
    </Card>
  )
}

function Content({ initial, onRefresh }: { initial: StaffDay; onRefresh: () => void }) {
  const { t } = useTranslation('staffToday')
  const toast = useToast()
  const format = useBookingFormat()
  const formatNumber = useNumber()
  const [today, setToday] = useState(initial.today)
  const [upcoming] = useState(initial.upcoming)
  const [todayMs] = useState(() => Date.now())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<OwnerBooking | null>(null)

  const leftCount = today.filter((booking) => OPEN_STATUSES.includes(booking.status)).length
  const doneCount = today.filter((booking) => booking.status === 'completed').length

  function replace(updated: OwnerBooking) {
    setToday((previous) => previous.map((item) => (item.id === updated.id ? updated : item)))
  }

  async function runAction(booking: OwnerBooking, action: BookingAction) {
    if (action === 'no_show') {
      setDialog(booking)
      return
    }
    setBusyId(booking.id)
    try {
      replace(await applyStaffAction(booking.id, action))
      toast.show({ message: t(`toast.${action}`), variant: 'success' })
    } catch {
      toast.show({ message: t('toast.failed'), variant: 'danger' })
    } finally {
      setBusyId(null)
    }
  }

  function handleDialogDone(updated: OwnerBooking) {
    replace(updated)
    setDialog(null)
    toast.show({ message: t('toast.no_show'), variant: 'success' })
  }

  function list(rows: OwnerBooking[], empty: 'today' | 'upcoming') {
    if (rows.length === 0) {
      return <EmptyState title={t(`empty.${empty}.title`)} description={t(`empty.${empty}.text`)} />
    }
    return (
      <ul className={styles.list}>
        {rows.map((booking) => (
          <li key={booking.id}>
            <BookingItem booking={booking} busy={busyId === booking.id} onAction={runAction} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <>
      <div className={styles.titleRow}>
        <div>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.muted}>
            {initial.staff_name
              ? t('staffLine', { name: initial.staff_name, date: format.date(new Date(todayMs).toISOString()) })
              : format.date(new Date(todayMs).toISOString())}
          </p>
        </div>
        <Button variant="secondary" onClick={onRefresh}>
          {t('refresh')}
        </Button>
      </div>
      <p className={styles.muted}>{t('intro')}</p>
      <p className={styles.summary} role="status">
        {t('summary', { left: formatNumber(leftCount), done: formatNumber(doneCount) })}
      </p>

      <Tabs
        label={t('tabs.label')}
        tabs={[
          { id: 'today', label: t('tabs.today'), content: <div className={styles.panel}>{list(today, 'today')}</div> },
          {
            id: 'upcoming',
            label: t('tabs.upcoming', { number: formatNumber(upcoming.length) }),
            content: (
              <div className={styles.panel}>
                <p className={styles.muted}>{t('upcomingNote')}</p>
                {list(upcoming, 'upcoming')}
              </div>
            ),
          },
        ]}
      />

      {dialog && (
        <NoShowDialog
          key={dialog.id}
          booking={dialog}
          onClose={() => setDialog(null)}
          onDone={handleDialogDone}
        />
      )}
    </>
  )
}

// The layout provides the one <main>, so this page renders a <div>.
export default function TodayPage() {
  const { t } = useTranslation('staffToday')
  const { state, retry } = useAsync(getStaffDay)

  return (
    <div className={styles.page}>
      {state.status === 'loading' && <Loading label={t('loading')} />}
      {state.status === 'error' && (
        <EmptyState
          title={t('common:states.error')}
          action={<Button onClick={retry}>{t('common:actions.retry')}</Button>}
        />
      )}
      {state.status === 'ready' && <Content initial={state.data} onRefresh={retry} />}
    </div>
  )
}
