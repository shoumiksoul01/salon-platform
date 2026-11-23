import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Card,
  Checkbox,
  EmptyState,
  FormField,
  Input,
  Modal,
  Select,
  Skeleton,
  StatTile,
  useToast,
} from '../../components/ui'
import QueueEntryCard from '../../components/QueueEntryCard'
import { useAsync } from '../../hooks/useAsync'
import { useBookingFormat } from '../../hooks/useBookingFormat'
import { addWalkIn, applyQueueAction, checkInBooking, getOwnerQueue } from '../../api/ownerQueue'
import type { OwnerQueue, QueueAction, QueueEntry } from '../../api/ownerQueue'
import { listServices } from '../../api/services'
import type { Service } from '../../api/services'
import { listStaff } from '../../api/staff'
import type { OwnerStaff } from '../../api/staff'
import styles from './QueuePage.module.css'

// OWN-07: live queue (FR-06.1, FR-06.2). UI-SM-22.
// Shows who is being served and who is waiting, adds walk-ins, checks booked customers in,
// and moves people along. The waiting times come from the server. The page asks again every
// 10 seconds, as the customer queue page does.

const REFRESH_MS = 10_000
const NAME_MIN = 2
const NAME_MAX = 60
const FORM_ID = 'walk-in-form'

interface PageData {
  queue: OwnerQueue
  services: Service[]
  staff: OwnerStaff[]
}

// Declared outside the component, so useAsync gets a stable function.
async function loadPage(): Promise<PageData> {
  const [queue, services, staff] = await Promise.all([getOwnerQueue(), listServices(), listStaff()])
  return { queue, services, staff }
}

function useNumber() {
  const { i18n } = useTranslation()
  const format = new Intl.NumberFormat(i18n.language.startsWith('bn') ? 'bn-BD' : 'en-GB')
  return (value: number) => format.format(value)
}

function Loading({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={styles.loading}>
      <div className={styles.tiles}>
        {[1, 2, 3, 4].map((n) => (
          <Card key={n}>
            <Skeleton width="60%" />
            <Skeleton width="40%" />
          </Card>
        ))}
      </div>
      {[1, 2].map((n) => (
        <Card key={n}>
          <Skeleton width="50%" />
          <Skeleton width="30%" />
        </Card>
      ))}
    </div>
  )
}

interface WalkInDialogProps {
  services: Service[]
  staff: OwnerStaff[]
  onClose: () => void
  onDone: (queue: OwnerQueue, name: string) => void
}

function WalkInDialog({ services, staff, onClose, onDone }: WalkInDialogProps) {
  const { t } = useTranslation('ownerQueue')
  const toast = useToast()
  const [name, setName] = useState('')
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [staffId, setStaffId] = useState('')
  const [errors, setErrors] = useState<Partial<Record<'name' | 'services', string>>>({})
  const [busy, setBusy] = useState(false)

  const choices = services.filter((service) => service.is_active)
  // Only staff who do every chosen service can be picked.
  const staffChoices = staff.filter(
    (member) => member.is_active && serviceIds.every((id) => member.service_ids.includes(id)),
  )
  const validStaffId = staffChoices.some((member) => member.id === staffId) ? staffId : ''

  function toggleService(id: string, checked: boolean) {
    setServiceIds((previous) => (checked ? [...previous, id] : previous.filter((item) => item !== id)))
    setErrors((previous) => ({ ...previous, services: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanName = name.trim()
    const found: typeof errors = {}
    if (cleanName.length < NAME_MIN || cleanName.length > NAME_MAX) {
      found.name = t('walkIn.nameInvalid', { min: NAME_MIN, max: NAME_MAX })
    }
    if (serviceIds.length === 0) found.services = t('walkIn.servicesRequired')
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setBusy(true)
    try {
      const queue = await addWalkIn({
        customer_name: cleanName,
        service_ids: serviceIds,
        staff_id: validStaffId || null,
      })
      onDone(queue, cleanName)
    } catch {
      toast.show({ message: t('toast.failed'), variant: 'danger' })
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('walkIn.title')}
      closeLabel={t('common:actions.close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID} loading={busy}>
            {t('walkIn.submit')}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className={styles.form} onSubmit={handleSubmit} noValidate>
        <FormField label={t('walkIn.name')} error={errors.name} required>
          {(control) => (
            <Input
              {...control}
              value={name}
              maxLength={NAME_MAX}
              autoComplete="off"
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </FormField>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>
            {t('walkIn.services')}
            <span aria-hidden="true"> *</span>
          </legend>
          {choices.length === 0 ? (
            <p className={styles.muted}>{t('walkIn.noServices')}</p>
          ) : (
            <div className={styles.checks}>
              {choices.map((service) => (
                <Checkbox
                  key={service.id}
                  label={service.name}
                  checked={serviceIds.includes(service.id)}
                  onChange={(event) => toggleService(service.id, event.target.checked)}
                />
              ))}
            </div>
          )}
          {errors.services && (
            <p className={styles.error} role="alert">
              {errors.services}
            </p>
          )}
        </fieldset>

        <FormField label={t('walkIn.staff')} hint={t('walkIn.staffHint')}>
          {(control) => (
            <Select {...control} value={validStaffId} onChange={(event) => setStaffId(event.target.value)}>
              <option value="">{t('anyStaff')}</option>
              {staffChoices.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </form>
    </Modal>
  )
}

function Content({ initial }: { initial: PageData }) {
  const { t, i18n } = useTranslation('ownerQueue')
  const toast = useToast()
  const format = useBookingFormat()
  const formatNumber = useNumber()
  const [queue, setQueue] = useState(initial.queue)
  const { services, staff } = initial
  const [refreshing, setRefreshing] = useState(false)
  const [refreshFailed, setRefreshFailed] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [walkInOpen, setWalkInOpen] = useState(false)
  const [removing, setRemoving] = useState<QueueEntry | null>(null)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      setQueue(await getOwnerQueue())
      setRefreshFailed(false)
    } catch {
      setRefreshFailed(true)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh()
    }, REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [refresh])

  const serviceNames = new Map(services.map((service) => [service.id, service.name]))
  const staffNames = new Map(staff.map((member) => [member.id, member.full_name]))
  const namesOf = (entry: QueueEntry) =>
    entry.service_ids.map((id) => serviceNames.get(id)).filter((name): name is string => Boolean(name))
  const staffOf = (id: string | null) => (id ? (staffNames.get(id) ?? null) : null)

  const serving = queue.entries.filter((entry) => entry.status === 'in_service')
  const waiting = queue.entries.filter((entry) => entry.status === 'waiting')

  const timeFormat = new Intl.DateTimeFormat(i18n.language.startsWith('bn') ? 'bn-BD' : 'en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Dhaka',
  })

  async function run(id: string, work: () => Promise<OwnerQueue>, message: string) {
    setBusyId(id)
    try {
      setQueue(await work())
      toast.show({ message, variant: 'success' })
      return true
    } catch {
      toast.show({ message: t('toast.failed'), variant: 'danger' })
      return false
    } finally {
      setBusyId(null)
    }
  }

  function handleAction(entry: QueueEntry, action: QueueAction) {
    if (action === 'remove') {
      setRemoving(entry)
      return
    }
    void run(entry.id, () => applyQueueAction(entry.id, action), t(`toast.${action}`, { name: entry.customer_name }))
  }

  async function confirmRemove() {
    if (!removing) return
    const entry = removing
    const done = await run(
      entry.id,
      () => applyQueueAction(entry.id, 'remove'),
      t('toast.remove', { name: entry.customer_name }),
    )
    if (done) setRemoving(null)
  }

  function handleWalkInDone(updated: OwnerQueue, name: string) {
    setQueue(updated)
    setWalkInOpen(false)
    toast.show({ message: t('toast.walkIn', { name }), variant: 'success' })
  }

  function entryActions(entry: QueueEntry) {
    const busy = busyId === entry.id
    if (entry.status === 'in_service') {
      return (
        <Button loading={busy} onClick={() => handleAction(entry, 'finish')}>
          {t('actions.finish')}
        </Button>
      )
    }
    return (
      <>
        <Button loading={busy} onClick={() => handleAction(entry, 'start')}>
          {t('actions.start')}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => handleAction(entry, 'remove')}>
          {t('actions.remove')}
        </Button>
      </>
    )
  }

  return (
    <>
      <div className={styles.head}>
        <h1 className={styles.title}>{t('title')}</h1>
        <Button onClick={() => setWalkInOpen(true)}>{t('addWalkIn')}</Button>
      </div>
      <p className={styles.muted}>{t('intro')}</p>

      <div className={styles.tiles}>
        <StatTile label={t('tiles.waiting')} value={formatNumber(waiting.length)} />
        <StatTile label={t('tiles.serving')} value={formatNumber(serving.length)} />
        <StatTile label={t('tiles.finished')} value={formatNumber(queue.finished_today)} />
        <StatTile
          label={t('tiles.newWait')}
          value={
            queue.new_customer_wait_minutes === 0
              ? t('tiles.noWait')
              : t('tiles.minutes', { minutes: formatNumber(queue.new_customer_wait_minutes) })
          }
          hint={t('tiles.newWaitHint')}
        />
      </div>

      <div className={styles.refreshRow}>
        <div>
          <p className={styles.small}>{t('updatedAt', { time: timeFormat.format(new Date(queue.updated_at)) })}</p>
          <p className={styles.small}>{t('autoRefresh')}</p>
          {refreshFailed && (
            <p className={styles.small} role="status">
              {t('refreshFailed')}
            </p>
          )}
        </div>
        <Button variant="secondary" onClick={() => void refresh()} loading={refreshing}>
          {t('refresh')}
        </Button>
      </div>

      {queue.entries.length === 0 ? (
        <EmptyState
          title={t('emptyTitle')}
          description={t('emptyText')}
          action={<Button onClick={() => setWalkInOpen(true)}>{t('addWalkIn')}</Button>}
        />
      ) : (
        <>
          {serving.length > 0 && (
            <section aria-labelledby="serving-heading" className={styles.section}>
              <h2 id="serving-heading" className={styles.heading}>
                {t('servingTitle')}
              </h2>
              <ul className={styles.list}>
                {serving.map((entry) => (
                  <li key={entry.id}>
                    <QueueEntryCard
                      entry={entry}
                      serviceNames={namesOf(entry)}
                      staffName={staffOf(entry.staff_id)}
                      actions={entryActions(entry)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="waiting-heading" className={styles.section}>
            <h2 id="waiting-heading" className={styles.heading}>
              {t('waitingTitle')}
            </h2>
            {waiting.length === 0 ? (
              <p className={styles.muted}>{t('nobodyWaiting')}</p>
            ) : (
              <ul className={styles.list}>
                {waiting.map((entry) => (
                  <li key={entry.id}>
                    <QueueEntryCard
                      entry={entry}
                      serviceNames={namesOf(entry)}
                      staffName={staffOf(entry.staff_id)}
                      actions={entryActions(entry)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <section aria-labelledby="expected-heading" className={styles.section}>
        <h2 id="expected-heading" className={styles.heading}>
          {t('expectedTitle')}
        </h2>
        <p className={styles.muted}>{t('expectedHint')}</p>
        {queue.expected.length === 0 ? (
          <p className={styles.muted}>{t('expectedEmpty')}</p>
        ) : (
          <ul className={styles.list}>
            {queue.expected.map((booking) => (
              <li key={booking.id}>
                <Card as="article">
                  <div className={styles.expectedRow}>
                    <div>
                      <p className={styles.name}>{booking.customer_name}</p>
                      <p className={styles.muted}>
                        {format.time(booking.starts_at)} · {booking.service_names.join(', ')}
                      </p>
                      <p className={styles.muted}>
                        {booking.staff_name ? t('staffWith', { name: booking.staff_name }) : t('anyStaff')}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      loading={busyId === booking.id}
                      onClick={() =>
                        void run(
                          booking.id,
                          () => checkInBooking(booking.id),
                          t('toast.checkedIn', { name: booking.customer_name }),
                        )
                      }
                      aria-label={t('checkInLabel', { name: booking.customer_name })}
                    >
                      {t('checkIn')}
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {walkInOpen && (
        <WalkInDialog
          services={services}
          staff={staff}
          onClose={() => setWalkInOpen(false)}
          onDone={handleWalkInDone}
        />
      )}

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={t('removeDialog.title')}
        closeLabel={t('common:actions.close')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)} disabled={busyId !== null}>
              {t('removeDialog.keep')}
            </Button>
            <Button variant="danger" onClick={() => void confirmRemove()} loading={busyId !== null}>
              {t('removeDialog.confirm')}
            </Button>
          </>
        }
      >
        <p>{t('removeDialog.text', { name: removing?.customer_name ?? '' })}</p>
      </Modal>
    </>
  )
}

// The layout provides the one <main>, so this page renders a <div>.
export default function QueuePage() {
  const { t } = useTranslation('ownerQueue')
  const { state, retry } = useAsync(loadPage)

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
