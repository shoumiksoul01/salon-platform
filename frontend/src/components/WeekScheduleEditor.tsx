import { useTranslation } from 'react-i18next'
import { Button, Checkbox, Input, Select } from './ui'
import styles from './WeekScheduleEditor.module.css'

// UI-SM-06. Edits a weekly schedule: working hours per day, breaks, and blocked time.
// It is a controlled component: the page keeps the data in state and passes it in, and the
// editor calls the onChange functions with the new data. The same editor serves the staff
// schedule pages. Breaks and blocked time are optional: leave out `breaks` (or `timeOff`)
// and its onChange to hide that section.
//
// Fields match the fixtures in mocks/bookings.ts: day_of_week 0 = Sunday ... 6 = Saturday,
// times as 'HH:MM' in local shop time, blocked time as ISO UTC (shown and edited in Dhaka time).

export interface DayHours {
  day_of_week: number
  opens_at: string
  closes_at: string
  is_closed: boolean
}

export interface ScheduleBreak {
  id: string
  day_of_week: number | null // null = every working day
  starts_at: string
  ends_at: string
  label: string
}

export interface ScheduleTimeOff {
  id: string
  starts_at: string
  ends_at: string
  reason: string
}

interface WeekScheduleEditorProps<T extends DayHours> {
  hours: T[]
  onHoursChange: (hours: T[]) => void
  breaks?: ScheduleBreak[]
  onBreaksChange?: (breaks: ScheduleBreak[]) => void
  timeOff?: ScheduleTimeOff[]
  onTimeOffChange?: (timeOff: ScheduleTimeOff[]) => void
  disabled?: boolean
}

const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5] // Saturday first
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

// <input type="datetime-local"> works with 'YYYY-MM-DDTHH:mm'. We show Dhaka time whatever
// the time zone of the computer is, so these two functions convert from and to ISO UTC.
const toInput = (iso: string): string => new Date(Date.parse(iso) + DHAKA_OFFSET_MS).toISOString().slice(0, 16)
const fromInput = (value: string): string => new Date(Date.parse(`${value}:00.000Z`) - DHAKA_OFFSET_MS).toISOString()

// Tomorrow at 00:00 in Dhaka, as ISO UTC.
function tomorrowStart(): string {
  const local = new Date(Date.now() + DHAKA_OFFSET_MS)
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1) - DHAKA_OFFSET_MS).toISOString()
}

export default function WeekScheduleEditor<T extends DayHours>({
  hours,
  onHoursChange,
  breaks,
  onBreaksChange,
  timeOff,
  onTimeOffChange,
  disabled = false,
}: WeekScheduleEditorProps<T>) {
  const { t } = useTranslation('shared')

  function updateHour(day: number, change: Partial<DayHours>) {
    onHoursChange(hours.map((hour) => (hour.day_of_week === day ? { ...hour, ...change } : hour)))
  }

  function updateBreak(id: string, change: Partial<ScheduleBreak>) {
    if (!breaks || !onBreaksChange) return
    onBreaksChange(breaks.map((item) => (item.id === id ? { ...item, ...change } : item)))
  }

  function addBreak() {
    if (!breaks || !onBreaksChange) return
    onBreaksChange([
      ...breaks,
      {
        id: crypto.randomUUID(),
        day_of_week: null,
        starts_at: '13:00',
        ends_at: '13:45',
        label: t('schedule.defaultBreakLabel'),
      },
    ])
  }

  function removeBreak(id: string) {
    if (!breaks || !onBreaksChange) return
    onBreaksChange(breaks.filter((item) => item.id !== id))
  }

  function updateTimeOff(id: string, change: Partial<ScheduleTimeOff>) {
    if (!timeOff || !onTimeOffChange) return
    onTimeOffChange(timeOff.map((item) => (item.id === id ? { ...item, ...change } : item)))
  }

  function addTimeOff() {
    if (!timeOff || !onTimeOffChange) return
    const start = tomorrowStart()
    onTimeOffChange([
      ...timeOff,
      {
        id: crypto.randomUUID(),
        starts_at: start,
        ends_at: new Date(Date.parse(start) + DAY_MS).toISOString(),
        reason: t('schedule.defaultReason'),
      },
    ])
  }

  function removeTimeOff(id: string) {
    if (!timeOff || !onTimeOffChange) return
    onTimeOffChange(timeOff.filter((item) => item.id !== id))
  }

  return (
    <fieldset className={styles.fieldset} disabled={disabled}>
      <section>
        <h3 className={styles.title}>{t('schedule.hoursTitle')}</h3>
        <p className={styles.hint}>{t('schedule.hoursHint')}</p>
        {WEEK_ORDER.map((day) => {
          const hour = hours.find((item) => item.day_of_week === day)
          if (!hour) return null
          const name = t(`schedule.days.${day}`)
          const invalid = !hour.is_closed && hour.opens_at >= hour.closes_at
          return (
            <div key={day} className={`${styles.row} ${styles.hoursRow}`}>
              <span className={styles.day}>{name}</span>
              <div className={styles.wide}>
                <Checkbox
                  label={t('schedule.off')}
                  checked={hour.is_closed}
                  onChange={(e) => updateHour(day, { is_closed: e.target.checked })}
                />
              </div>
              <Input
                type="time"
                aria-label={`${name}: ${t('schedule.opens')}`}
                value={hour.opens_at}
                disabled={hour.is_closed}
                invalid={invalid}
                onChange={(e) => updateHour(day, { opens_at: e.target.value })}
              />
              <Input
                type="time"
                aria-label={`${name}: ${t('schedule.closes')}`}
                value={hour.closes_at}
                disabled={hour.is_closed}
                invalid={invalid}
                onChange={(e) => updateHour(day, { closes_at: e.target.value })}
              />
              {invalid && (
                <p className={styles.error} role="alert">
                  {t('schedule.hoursInvalid')}
                </p>
              )}
            </div>
          )
        })}
      </section>

      {breaks && onBreaksChange && (
        <section>
          <h3 className={styles.title}>{t('schedule.breaksTitle')}</h3>
          <p className={styles.hint}>{t('schedule.breaksHint')}</p>
          {breaks.length === 0 ? (
            <p className={styles.empty}>{t('schedule.noBreaks')}</p>
          ) : (
            <div className={styles.list}>
              {breaks.map((item) => {
                const invalid = item.starts_at >= item.ends_at
                return (
                  <div key={item.id} className={`${styles.row} ${styles.breakRow}`}>
                    <div className={`${styles.field} ${styles.wide}`}>
                      <span className={styles.itemLabel}>{t('schedule.breakLabel')}</span>
                      <Input
                        aria-label={t('schedule.breakLabel')}
                        value={item.label}
                        onChange={(e) => updateBreak(item.id, { label: e.target.value })}
                      />
                    </div>
                    <div className={`${styles.field} ${styles.wide}`}>
                      <span className={styles.itemLabel}>{t('schedule.breakDay')}</span>
                      <Select
                        aria-label={t('schedule.breakDay')}
                        value={item.day_of_week === null ? '' : String(item.day_of_week)}
                        onChange={(e) =>
                          updateBreak(item.id, {
                            day_of_week: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                      >
                        <option value="">{t('schedule.everyDay')}</option>
                        {WEEK_ORDER.map((day) => (
                          <option key={day} value={String(day)}>
                            {t(`schedule.days.${day}`)}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className={styles.field}>
                      <span className={styles.itemLabel}>{t('schedule.from')}</span>
                      <Input
                        type="time"
                        aria-label={t('schedule.from')}
                        value={item.starts_at}
                        invalid={invalid}
                        onChange={(e) => updateBreak(item.id, { starts_at: e.target.value })}
                      />
                    </div>
                    <div className={styles.field}>
                      <span className={styles.itemLabel}>{t('schedule.to')}</span>
                      <Input
                        type="time"
                        aria-label={t('schedule.to')}
                        value={item.ends_at}
                        invalid={invalid}
                        onChange={(e) => updateBreak(item.id, { ends_at: e.target.value })}
                      />
                    </div>
                    <Button variant="ghost" className={styles.wide} onClick={() => removeBreak(item.id)}>
                      {t('schedule.removeBreak')}
                    </Button>
                    {invalid && (
                      <p className={styles.error} role="alert">
                        {t('schedule.breakInvalid')}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <Button variant="secondary" onClick={addBreak}>
            {t('schedule.addBreak')}
          </Button>
        </section>
      )}

      {timeOff && onTimeOffChange && (
        <section>
          <h3 className={styles.title}>{t('schedule.timeOffTitle')}</h3>
          <p className={styles.hint}>{t('schedule.timeOffHint')}</p>
          {timeOff.length === 0 ? (
            <p className={styles.empty}>{t('schedule.noTimeOff')}</p>
          ) : (
            <div className={styles.list}>
              {timeOff.map((item) => {
                const invalid = Date.parse(item.ends_at) <= Date.parse(item.starts_at)
                return (
                  <div key={item.id} className={`${styles.row} ${styles.timeOffRow}`}>
                    <div className={`${styles.field} ${styles.wide}`}>
                      <span className={styles.itemLabel}>{t('schedule.reason')}</span>
                      <Input
                        aria-label={t('schedule.reason')}
                        value={item.reason}
                        onChange={(e) => updateTimeOff(item.id, { reason: e.target.value })}
                      />
                    </div>
                    <div className={`${styles.field} ${styles.wide}`}>
                      <span className={styles.itemLabel}>{t('schedule.from')}</span>
                      <Input
                        type="datetime-local"
                        aria-label={t('schedule.from')}
                        value={toInput(item.starts_at)}
                        invalid={invalid}
                        onChange={(e) => {
                          if (e.target.value) updateTimeOff(item.id, { starts_at: fromInput(e.target.value) })
                        }}
                      />
                    </div>
                    <div className={`${styles.field} ${styles.wide}`}>
                      <span className={styles.itemLabel}>{t('schedule.to')}</span>
                      <Input
                        type="datetime-local"
                        aria-label={t('schedule.to')}
                        value={toInput(item.ends_at)}
                        invalid={invalid}
                        onChange={(e) => {
                          if (e.target.value) updateTimeOff(item.id, { ends_at: fromInput(e.target.value) })
                        }}
                      />
                    </div>
                    <Button variant="ghost" className={styles.wide} onClick={() => removeTimeOff(item.id)}>
                      {t('schedule.removeTimeOff')}
                    </Button>
                    {invalid && (
                      <p className={styles.error} role="alert">
                        {t('schedule.timeOffInvalid')}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <Button variant="secondary" onClick={addTimeOff}>
            {t('schedule.addTimeOff')}
          </Button>
        </section>
      )}
    </fieldset>
  )
}
