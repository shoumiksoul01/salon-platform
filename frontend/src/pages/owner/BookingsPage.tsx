import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormField,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Tabs,
  useToast,
} from '../../components/ui'
import StatusBadge from '../../components/StatusBadge'
import { useAsync } from '../../hooks/useAsync'
import { useBookingFormat } from '../../hooks/useBookingFormat'
import { applyBookingAction, listOwnerBookings } from '../../api/ownerBookings'
import type { BookingAction, BookingStatus, OwnerBooking } from '../../api/ownerBookings'
import styles from './BookingsPage.module.css'

// OWN-06: owner bookings (FR-04.1, FR-04.2, FR-04.4, FR-05.4). UI-SM-21.
// Tabs: Today, Requests (bookings that wait for an answer), Upcoming, Past.
// The buttons on each card come from booking.actions, so the rules stay on the server side.

type TabId = 'today' | 'requests' | 'upcoming' | 'past'
type DialogAction = 'reject' | 'cancel' | 'no_show'

const TAB_IDS: TabId[] = ['today', 'requests', 'upcoming', 'past']
const ACTIVE_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'arrived', 'in_service']
const REASONS = ['staff', 'closed', 'slot', 'other'] as const
const PAGE_SIZE = 8
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000

// A Dhaka calendar day as 'YYYY-MM-DD'. These compare correctly as text.
const dhakaDay = (ms: number) => new Date(ms + DHAKA_OFFSET_MS).toISOString().slice(0, 10)
const startMs = (booking: OwnerBooking) => Date.parse(booking.starts_at)

function bucketOf(booking: OwnerBooking, now: number): 'today' | 'upcoming' | 'past' {
  const day = dhakaDay(startMs(booking))
  const today = dhakaDay(now)
  if (day === today) return 'today'
  if (day > today && ACTIVE_STATUSES.includes(booking.status)) return 'upcoming'
  return 'past'
}

const needsAnswer = (booking: OwnerBooking) => booking.actions.includes('accept')

function listFor(tab: TabId, all: OwnerBooking[], now: number): OwnerBooking[] {
  const soonest = (a: OwnerBooking, b: OwnerBooking) => startMs(a) - startMs(b)
  switch (tab) {
    case 'today':
      return all.filter((item) => bucketOf(item, now) === 'today').sort(soonest)
    case 'requests':
      return all.filter(needsAnswer).sort(soonest)
    case 'upcoming':
      return all.filter((item) => bucketOf(item, now) === 'upcoming').sort(soonest)
    case 'past':
      return all.filter((item) => bucketOf(item, now) === 'past').sort((a, b) => soonest(b, a))
  }
}

function useNumber() {
  const { i18n } = useTranslation()
  const format = new Intl.NumberFormat(i18n.language.startsWith('bn') ? 'bn-BD' : 'en-GB')
  return (value: number) => format.format(value)
}

function Loading({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={styles.loading}>
      {[1, 2, 3].map((n) => (
        <Card key={n}>
          <Skeleton width="40%" />
          <Skeleton width="60%" />
          <Skeleton width="30%" />
        </Card>
      ))}
    </div>
  )
}

interface ActionDialogProps {
  booking: OwnerBooking
  action: DialogAction
  onClose: () => void
  onDone: (updated: OwnerBooking, action: BookingAction) => void
}

// Reject and cancel ask for a reason. No-show asks for a confirmation.
function ActionDialog({ booking, action, onClose, onDone }: ActionDialogProps) {
  const { t } = useTranslation('ownerBookings')
  const toast = useToast()
  const format = useBookingFormat()
  const formatNumber = useNumber()
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  const needsReason = action !== 'no_show'

  async function handleConfirm() {
    if (needsReason && !reason) {
      setReasonError(t('dialog.reasonRequired'))
      return
    }
    setBusy(true)
    try {
      const updated = await applyBookingAction(booking.id, action, needsReason ? t(`reasons.${reason}`) : '')
      onDone(updated, action)
    } catch {
      toast.show({ message: t('toast.failed'), variant: 'danger' })
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t(`dialog.${action}.title`)}
      closeLabel={t('common:actions.close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('dialog.keep')}
          </Button>
          <Button variant="danger" onClick={handleConfirm} loading={busy}>
            {t(`dialog.${action}.confirm`)}
          </Button>
        </>
      }
    >
      <p className={styles.lead}>
        {booking.customer_name} · {format.dateTime(booking.starts_at)}
      </p>
      <p className={styles.muted}>{booking.service_names.join(', ')}</p>

      {action === 'no_show' ? (
        <>
          <p className={styles.note}>{t('dialog.no_show.text')}</p>
          {booking.customer_no_shows > 0 && (
            <p className={styles.note}>
              {t('dialog.no_show.earlier', { number: formatNumber(booking.customer_no_shows) })}
            </p>
          )}
        </>
      ) : (
        <>
          <p className={styles.note}>
            {booking.paid_poisha > 0
              ? t('dialog.refund', { amount: format.money(booking.paid_poisha) })
              : t('dialog.nothingPaid')}
          </p>
          <FormField label={t('dialog.reason')} error={reasonError} required>
            {(control) => (
              <Select
                {...control}
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value)
                  setReasonError(undefined)
                }}
              >
                <option value="">{t('dialog.reasonPlaceholder')}</option>
                {REASONS.map((code) => (
                  <option key={code} value={code}>
                    {t(`reasons.${code}`)}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        </>
      )}
    </Modal>
  )
}

interface CardProps {
  booking: OwnerBooking
  busy: boolean
  onAction: (booking: OwnerBooking, action: BookingAction) => void
}

function BookingItem({ booking, busy, onAction }: CardProps) {
  const { t } = useTranslation('ownerBookings')
  const format = useBookingFormat()
  const formatNumber = useNumber()
  const { t: tc } = useTranslation('customer')

  // One short line that explains the state of the booking.
  let note: string | null = null
  if (booking.status === 'pending' && booking.hold_expires_at) {
    note = t('notes.hold', { time: format.time(booking.hold_expires_at) })
  } else if (needsAnswer(booking)) {
    note = t('notes.needsAnswer')
  } else if (booking.status === 'cancelled') {
    const who = booking.cancelled_by === 'shop' ? t('notes.cancelledByShop') : t('notes.cancelledByCustomer')
    note = booking.cancel_reason ? `${who} ${t('notes.reason', { reason: booking.cancel_reason })}` : who
  } else if (booking.status === 'no_show') {
    note = t('notes.noShow')
  }

  const buttons: Record<BookingAction, { label: string; variant: 'primary' | 'secondary' | 'ghost' | 'danger' }> = {
    accept: { label: t('actions.accept'), variant: 'primary' },
    reject: { label: t('actions.reject'), variant: 'secondary' },
    arrive: { label: t('actions.arrive'), variant: 'primary' },
    start: { label: t('actions.start'), variant: 'primary' },
    complete: { label: t('actions.complete'), variant: 'primary' },
    no_show: { label: t('actions.no_show'), variant: 'secondary' },
    cancel: { label: t('actions.cancel'), variant: 'ghost' },
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
            <Badge variant="warning">{t('earlierNoShows', { number: formatNumber(booking.customer_no_shows) })}</Badge>
          </>
        )}
      </p>
      <p className={styles.muted}>{booking.service_names.join(', ')}</p>
      <p className={styles.muted}>
        {booking.staff_name ? t('staffWith', { name: booking.staff_name }) : t('anyStaff')}
      </p>

      <div className={styles.payment}>
        <span>{t('total', { amount: format.money(booking.total_poisha) })}</span>
        {booking.paid_poisha > 0 && <span>· {t('paid', { amount: format.money(booking.paid_poisha) })}</span>}
        <span>· {tc(`bookings.method.${booking.payment_method}`)}</span>
        <StatusBadge kind="payment" status={booking.payment_status} />
      </div>

      {note && <p className={styles.note}>{note}</p>}

      {booking.actions.length > 0 && (
        <div className={styles.actions}>
          {booking.actions.map((action) => (
            <Button
              key={action}
              variant={buttons[action].variant}
              disabled={busy}
              onClick={() => onAction(booking, action)}
              aria-label={`${buttons[action].label}: ${booking.customer_name}`}
            >
              {buttons[action].label}
            </Button>
          ))}
        </div>
      )}
    </Card>
  )
}

function Content({ initial }: { initial: OwnerBooking[] }) {
  const { t } = useTranslation('ownerBookings')
  const toast = useToast()
  const formatNumber = useNumber()
  const [list, setList] = useState(initial)
  const [now, setNow] = useState(() => Date.now())
  const [tab, setTab] = useState<TabId>('today')
  const [staffId, setStaffId] = useState('')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ booking: OwnerBooking; action: DialogAction } | null>(null)

  // The staff filter is built from the bookings, so every option has at least one booking.
  const staffOptions = new Map<string, string>()
  list.forEach((booking) => {
    if (booking.staff_id && booking.staff_name) staffOptions.set(booking.staff_id, booking.staff_name)
  })

  const filtered = staffId ? list.filter((booking) => booking.staff_id === staffId) : list
  const requestCount = listFor('requests', filtered, now).length

  function replace(updated: OwnerBooking) {
    setList((previous) => previous.map((item) => (item.id === updated.id ? updated : item)))
    setNow(Date.now())
  }

  async function runAction(booking: OwnerBooking, action: BookingAction) {
    if (action === 'reject' || action === 'cancel' || action === 'no_show') {
      setDialog({ booking, action })
      return
    }
    setBusyId(booking.id)
    try {
      const updated = await applyBookingAction(booking.id, action)
      replace(updated)
      toast.show({ message: t(`toast.${action}`), variant: 'success' })
    } catch {
      toast.show({ message: t('toast.failed'), variant: 'danger' })
    } finally {
      setBusyId(null)
    }
  }

  function handleDialogDone(updated: OwnerBooking, action: BookingAction) {
    replace(updated)
    setDialog(null)
    toast.show({ message: t(`toast.${action}`), variant: 'success' })
  }

  function panel(id: TabId) {
    const rows = listFor(id, filtered, now)
    if (rows.length === 0) {
      return <EmptyState title={t(`empty.${id}.title`)} description={t(`empty.${id}.text`)} />
    }
    const pageCount = Math.ceil(rows.length / PAGE_SIZE)
    const current = Math.min(page, pageCount) // a page can disappear when its last booking moves
    const shown = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)
    return (
      <div className={styles.panel}>
        <ul className={styles.list}>
          {shown.map((booking) => (
            <li key={booking.id}>
              <BookingItem booking={booking} busy={busyId === booking.id} onAction={runAction} />
            </li>
          ))}
        </ul>
        <Pagination
          page={current}
          pageCount={pageCount}
          onPageChange={setPage}
          labels={{
            nav: t('pagination.nav'),
            previous: t('pagination.previous'),
            next: t('pagination.next'),
            status: t('pagination.status', { page: formatNumber(current), total: formatNumber(pageCount) }),
          }}
        />
      </div>
    )
  }

  return (
    <>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{t('title')}</h1>
        {staffOptions.size > 1 && (
          <FormField label={t('staffFilter')}>
            {(control) => (
              <Select
                {...control}
                value={staffId}
                onChange={(event) => {
                  setStaffId(event.target.value)
                  setPage(1)
                }}
              >
                <option value="">{t('allStaff')}</option>
                {[...staffOptions].map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        )}
      </div>
      <p className={styles.muted}>{t('intro')}</p>

      <Tabs
        label={t('tabsLabel')}
        defaultTab={tab}
        onChange={(id) => {
          setTab(id as TabId)
          setPage(1)
        }}
        tabs={TAB_IDS.map((id) => ({
          id,
          label:
            id === 'requests' && requestCount > 0
              ? t('tabs.requestsCount', { number: formatNumber(requestCount) })
              : t(`tabs.${id}`),
          content: panel(id),
        }))}
      />

      {dialog && (
        <ActionDialog
          key={`${dialog.booking.id}-${dialog.action}`}
          booking={dialog.booking}
          action={dialog.action}
          onClose={() => setDialog(null)}
          onDone={handleDialogDone}
        />
      )}
    </>
  )
}

// The layout provides the one <main>, so this page renders a <div>.
export default function BookingsPage() {
  const { t } = useTranslation('ownerBookings')
  const { state, retry } = useAsync(listOwnerBookings)

  return (
    <div className={styles.page}>
      {state.status === 'loading' && <Loading label={t('loading')} />}
      {state.status === 'error' && (
        <EmptyState
          title={t('common:states.error')}
          action={<Button onClick={retry}>{t('common:actions.retry')}</Button>}
        />
      )}
      {state.status === 'ready' && <Content initial={state.data} />}
    </div>
  )
}
