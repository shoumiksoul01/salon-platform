import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, Skeleton, useToast } from '../../components/ui'
import WeekScheduleEditor from '../../components/WeekScheduleEditor'
import { useAsync } from '../../hooks/useAsync'
import { getStaffAvailability, saveStaffSchedule } from '../../api/staff'
import type { StaffAvailability, StaffSchedule } from '../../api/staff'
import styles from './StaffAvailabilityPage.module.css'

// OWN-05: staff and availability (FR-01.5). UI-SM-20: the working hours, breaks and
// blocked time of one staff member, at /owner/staff/:staffId/availability.

type ScheduleProblem = 'fix' | 'noWorkingDay' | 'breakName' | 'reason' | null

// The editor marks bad rows as the owner types. This runs when the owner saves.
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

function Loading({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={styles.loading}>
      <Skeleton width="40%" />
      <Card>
        <Skeleton width="60%" />
        <Skeleton width="50%" />
        <Skeleton width="55%" />
      </Card>
    </div>
  )
}

function Content({ data }: { data: StaffAvailability }) {
  const { t } = useTranslation('ownerStaff')
  const toast = useToast()
  const { member } = data
  const [saved, setSaved] = useState(data.schedule)
  const [draft, setDraft] = useState(data.schedule)
  const [problem, setProblem] = useState<ScheduleProblem>(null)
  const [saving, setSaving] = useState(false)

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)

  function change(update: Partial<StaffSchedule>) {
    setDraft((previous) => ({ ...previous, ...update }))
    setProblem(null)
  }

  async function handleSave() {
    const found = findProblem(draft)
    setProblem(found)
    if (found) return

    setSaving(true)
    try {
      const result = await saveStaffSchedule(member.id, draft)
      setSaved(result)
      setDraft(result)
      toast.show({ message: t('availability.toast.saved'), variant: 'success' })
    } catch {
      toast.show({ message: t('toast.saveFailed'), variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  function handleDiscard() {
    setDraft(saved)
    setProblem(null)
  }

  return (
    <>
      <Link className={styles.back} to="/owner/staff">
        {t('availability.back')}
      </Link>
      <div className={styles.head}>
        <h1 className={styles.title}>{t('availability.title', { name: member.full_name })}</h1>
        <div className={styles.badges}>
          <Badge variant="neutral">{member.role_title}</Badge>
          {!member.is_active && <Badge variant="warning">{t('inactive')}</Badge>}
        </div>
      </div>
      <p className={styles.muted}>{t('availability.intro')}</p>
      {!member.is_active && <p className={styles.muted}>{t('availability.inactiveNote')}</p>}

      <Card>
        <WeekScheduleEditor
          hours={draft.hours}
          onHoursChange={(hours) => change({ hours })}
          breaks={draft.breaks}
          onBreaksChange={(breaks) => change({ breaks })}
          timeOff={draft.time_off}
          onTimeOffChange={(timeOff) => change({ time_off: timeOff })}
          disabled={saving}
        />
      </Card>

      <p className={styles.muted}>{t('availability.note')}</p>

      {problem && (
        <p className={styles.error} role="alert">
          {t(`availability.problem.${problem}`)}
        </p>
      )}
      <div className={styles.actions}>
        <Button onClick={handleSave} loading={saving} disabled={!dirty}>
          {t('availability.save')}
        </Button>
        {dirty && (
          <Button variant="secondary" onClick={handleDiscard} disabled={saving}>
            {t('availability.discard')}
          </Button>
        )}
        {dirty && (
          <span className={styles.muted} role="status">
            {t('availability.unsaved')}
          </span>
        )}
      </div>
    </>
  )
}

// The layout provides the one <main>, so this page renders a <div>.
export default function StaffAvailabilityPage() {
  const { t } = useTranslation('ownerStaff')
  const { staffId = '' } = useParams()
  const load = useCallback(() => getStaffAvailability(staffId), [staffId])
  const { state, retry } = useAsync(load)

  return (
    <div className={styles.page}>
      {state.status === 'loading' && <Loading label={t('availability.loading')} />}
      {state.status === 'error' && (
        <EmptyState
          title={t('common:states.error')}
          action={<Button onClick={retry}>{t('common:actions.retry')}</Button>}
        />
      )}
      {state.status === 'ready' && state.data === null && (
        <EmptyState
          title={t('availability.notFoundTitle')}
          description={t('availability.notFoundText')}
          action={
            <Link className={styles.back} to="/owner/staff">
              {t('availability.back')}
            </Link>
          }
        />
      )}
      {state.status === 'ready' && state.data !== null && (
        <Content key={state.data.member.id} data={state.data} />
      )}
    </div>
  )
}
