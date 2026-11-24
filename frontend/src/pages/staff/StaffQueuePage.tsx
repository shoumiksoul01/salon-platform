import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, EmptyState, Skeleton, StatTile, Tabs, useToast } from '../../components/ui'
import QueueEntryCard from '../../components/QueueEntryCard'
import WeekScheduleEditor from '../../components/WeekScheduleEditor'
import { useAsync } from '../../hooks/useAsync'
import { getStaffAvailability, saveStaffSchedule } from '../../api/staff'
import type { StaffAvailability, StaffSchedule } from '../../api/staff'
import { applyStaffQueueAction, getStaffQueue } from '../../api/staffQueue'
import type { StaffQueue, StaffQueueAction, StaffQueueEntry } from '../../api/staffQueue'
import styles from './StaffQueuePage.module.css'

// STF-02: the staff member's own queue (FR-06.1, FR-06.3) and working hours (FR-01.5).
// Tab 1: who they are serving and who is waiting for them (or for any staff member), with Start
// and Finish. The page asks again every 10 seconds. Walk-ins, check-in and removing people stay
// with the owner. Tab 2: their own hours, breaks and blocked time, with the same rules as the
// owner's availability page. The tab state lives here, so switching tabs loses nothing.

const REFRESH_MS = 10_000

type ScheduleProblem = 'fix' | 'noWorkingDay' | 'breakName' | 'reason' | null

// The editor marks bad rows as the person types. This runs when they save.
function findProblem(schedule: StaffSchedule): ScheduleProblem {
  const badHours = schedule.hours.some((item) => !item.is_closed && item.opens_at >= item.closes_at)
  const badBreak = schedule.breaks.some((item) => item.starts_at >= item.ends_at)
  const badTimeOff = schedule.time_off.some((item) => Date.parse(item.ends_at) <= Date.parse(item.starts_at))
  if (badHours || badBreak || badTimeOff) return 'fix'
  if (schedule.hours.every((item) => item.is_closed)) return 'noWorkingDay'
  if (schedule.breaks.some((item) => item.label.trim() === '')) return 'breakName'
  if (schedule.time_off.some((item) => item.reason.trim() === '')) return 'reason'
  return null
}

interface PageData {
  queue: StaffQueue
  availability: StaffAvailability | null
}

// Declared outside the component, so useAsync gets a stable function.
async function loadPage(): Promise<PageData> {
  const queue = await getStaffQueue()
  const availability = await getStaffAvailability(queue.staff_id)
  return { queue, availability }
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
        {[1, 2].map((n) => (
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

function Content({ initial }: { initial: PageData }) {
  const { t, i18n } = useTranslation('staffQueue')
  const toast = useToast()
  const formatNumber = useNumber()

  // Queue
  const [queue, setQueue] = useState(initial.queue)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshFailed, setRefreshFailed] = useState(false)

  // Hours
  const [saved, setSaved] = useState<StaffSchedule | null>(initial.availability?.schedule ?? null)
  const [draft, setDraft] = useState<StaffSchedule | null>(initial.availability?.schedule ?? null)
  const [problem, setProblem] = useState<ScheduleProblem>(null)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      setQueue(await getStaffQueue())
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

  const serving = queue.entries.filter((entry) => entry.status === 'in_service')
  const waiting = queue.entries.filter((entry) => entry.status === 'waiting')

  const timeFormat = new Intl.DateTimeFormat(i18n.language.startsWith('bn') ? 'bn-BD' : 'en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Dhaka',
  })

  async function handleAction(entry: StaffQueueEntry, action: StaffQueueAction) {
    setBusyId(entry.id)
    try {
      setQueue(await applyStaffQueueAction(entry.id, action))
      toast.show({ message: t(`toast.${action}`, { name: entry.customer_name }), variant: 'success' })
    } catch {
      toast.show({ message: t('toast.failed'), variant: 'danger' })
    } finally {
      setBusyId(null)
    }
  }

  function entryActions(entry: StaffQueueEntry) {
    const busy = busyId === entry.id
    if (entry.status === 'in_service') {
      return (
        <Button fullWidth loading={busy} onClick={() => handleAction(entry, 'finish')}>
          {t('actions.finish')}
        </Button>
      )
    }
    // One person at a time: Start is off while this staff member is serving someone.
    return (
      <Button
        fullWidth
        loading={busy}
        disabled={serving.length > 0 || busyId !== null}
        onClick={() => handleAction(entry, 'start')}
      >
        {t('actions.start')}
      </Button>
    )
  }

  function changeSchedule(update: Partial<StaffSchedule>) {
    setDraft((previous) => (previous ? { ...previous, ...update } : previous))
    setProblem(null)
  }

  async function handleSave() {
    if (!draft || !initial.availability) return
    const found = findProblem(draft)
    setProblem(found)
    if (found) return

    setSaving(true)
    try {
      const result = await saveStaffSchedule(initial.availability.member.id, draft)
      setSaved(result)
      setDraft(result)
      toast.show({ message: t('hours.toast.saved'), variant: 'success' })
    } catch {
      toast.show({ message: t('hours.toast.failed'), variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  function handleDiscard() {
    setDraft(saved)
    setProblem(null)
  }

  const queuePanel = (
    <div className={styles.panel}>
      <div className={styles.tiles}>
        <StatTile label={t('tiles.serving')} value={formatNumber(serving.length)} />
        <StatTile label={t('tiles.waiting')} value={formatNumber(waiting.length)} />
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
        <EmptyState title={t('emptyTitle')} description={t('emptyText')} />
      ) : (
        <>
          {serving.length > 0 && (
            <section aria-labelledby="staff-serving-heading" className={styles.section}>
              <h2 id="staff-serving-heading" className={styles.heading}>
                {t('servingTitle')}
              </h2>
              <ul className={styles.list}>
                {serving.map((entry) => (
                  <li key={entry.id}>
                    <QueueEntryCard
                      entry={entry}
                      serviceNames={entry.service_names}
                      staffName={entry.staff_id ? queue.staff_name : null}
                      actions={entryActions(entry)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="staff-waiting-heading" className={styles.section}>
            <h2 id="staff-waiting-heading" className={styles.heading}>
              {t('waitingTitle')}
            </h2>
            {waiting.length === 0 ? (
              <p className={styles.muted}>{t('nobodyWaiting')}</p>
            ) : (
              <>
                {serving.length > 0 && <p className={styles.muted}>{t('finishFirst')}</p>}
                <ul className={styles.list}>
                  {waiting.map((entry) => (
                    <li key={entry.id}>
                      <QueueEntryCard
                        entry={entry}
                        serviceNames={entry.service_names}
                        staffName={entry.staff_id ? queue.staff_name : null}
                        actions={entryActions(entry)}
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}
    </div>
  )

  const hoursPanel = (
    <div className={styles.panel}>
      {draft === null ? (
        <EmptyState title={t('hours.notFoundTitle')} description={t('hours.notFoundText')} />
      ) : (
        <>
          <p className={styles.muted}>{t('hours.intro')}</p>
          <Card>
            <WeekScheduleEditor
              hours={draft.hours}
              onHoursChange={(hours) => changeSchedule({ hours })}
              breaks={draft.breaks}
              onBreaksChange={(breaks) => changeSchedule({ breaks })}
              timeOff={draft.time_off}
              onTimeOffChange={(timeOff) => changeSchedule({ time_off: timeOff })}
              disabled={saving}
            />
          </Card>
          <p className={styles.muted}>{t('hours.note')}</p>
          {problem && (
            <p className={styles.error} role="alert">
              {t(`hours.problem.${problem}`)}
            </p>
          )}
          <div className={styles.actions}>
            <Button onClick={handleSave} loading={saving} disabled={!dirty}>
              {t('hours.save')}
            </Button>
            {dirty && (
              <Button variant="secondary" onClick={handleDiscard} disabled={saving}>
                {t('hours.discard')}
              </Button>
            )}
            {dirty && (
              <span className={styles.muted} role="status">
                {t('hours.unsaved')}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )

  return (
    <>
      <div>
        <h1 className={styles.title}>{t('title')}</h1>
        {queue.staff_name && <p className={styles.muted}>{t('staffLine', { name: queue.staff_name })}</p>}
      </div>

      <Tabs
        label={t('tabs.label')}
        tabs={[
          { id: 'queue', label: t('tabs.queue'), content: queuePanel },
          { id: 'hours', label: t('tabs.hours'), content: hoursPanel },
        ]}
      />
    </>
  )
}

// The layout provides the one <main>, so this page renders a <div>.
export default function StaffQueuePage() {
  const { t } = useTranslation('staffQueue')
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
