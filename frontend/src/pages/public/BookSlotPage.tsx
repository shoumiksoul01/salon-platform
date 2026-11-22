import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Card } from '../../components/ui'
import { getSlotOptions } from '../../api/bookFlow'
import type { SlotOptions } from '../../api/bookFlow'
import { loadDraft, saveDraft } from '../../booking/bookingDraft'
import styles from './BookSlotPage.module.css'

type LoadState = 'loading' | 'error' | 'ready'
type DayPart = 'morning' | 'afternoon' | 'evening'

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000
const DAY_PARTS: DayPart[] = ['morning', 'afternoon', 'evening']
const MORNING_ENDS_AT = 12 // hours in Bangladesh time
const AFTERNOON_ENDS_AT = 17

// Which part of the day a start time falls in, by the hour in Bangladesh time.
function dayPartOf(startsAt: string): DayPart {
  const hour = new Date(new Date(startsAt).getTime() + DHAKA_OFFSET_MS).getUTCHours()
  if (hour < MORNING_ENDS_AT) return 'morning'
  if (hour < AFTERNOON_ENDS_AT) return 'afternoon'
  return 'evening'
}

// BOOK-02: pick a day and a start time (FR-03.2)
export default function BookSlotPage() {
  const { t, i18n } = useTranslation('book')
  const navigate = useNavigate()
  const { shopId = '' } = useParams()
  const draft = useMemo(() => loadDraft(shopId), [shopId])

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [data, setData] = useState<SlotOptions | null>(null)
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState('')
  const [error, setError] = useState('')
  const stripRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!draft || draft.service_ids.length === 0) return
    let cancelled = false
    getSlotOptions(shopId, draft.service_ids, draft.staff_id)
      .then((result) => {
        if (cancelled) return
        setData(result)
        setDate(result.days.find((day) => day.slots.length > 0)?.date ?? '')
        setLoadState('ready')
      })
      .catch(() => {
        if (!cancelled) setLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [shopId, draft, reloadKey])

  // Keep the chosen day visible when it changes (the "next free day" button can jump far along the strip).
  useEffect(() => {
    if (loadState !== 'ready') return
    stripRef.current
      ?.querySelector<HTMLElement>('[aria-pressed="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [date, loadState])

  // Nothing chosen in BOOK-01 yet (or the tab was reopened): start from the services page.
  if (!draft || draft.service_ids.length === 0) {
    return <Navigate to={`/book/${shopId}`} replace />
  }

  const locale = i18n.language === 'bn' ? 'bn-BD' : 'en-GB'
  const dayFormat = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Dhaka',
  })
  const timeFormat = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Dhaka',
  })
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

  function dayLabel(value: string) {
    return dayFormat.format(new Date(`${value}T12:00:00+06:00`))
  }

  function staffName(id: string | undefined) {
    return data?.staff.find((member) => member.id === id)?.full_name ?? ''
  }

  const partLabel: Record<DayPart, string> = {
    morning: t('slot.groups.morning'),
    afternoon: t('slot.groups.afternoon'),
    evening: t('slot.groups.evening'),
  }

  const currentDay = data?.days.find((day) => day.date === date)
  const daySlots = currentDay?.slots ?? []
  const chosenSlot = daySlots.find((item) => item.starts_at === slot)
  const hasAnyTime = data?.days.some((day) => day.slots.length > 0) ?? false
  // "Anyone available": show who will serve the customer at each time.
  const showStaff = data?.staff_name === null
  const assignedName = showStaff && chosenSlot ? staffName(chosenSlot.staff_ids[0]) : ''
  // ISO dates compare correctly as plain strings.
  const nextFreeDate = data?.days.find((day) => day.date > date && day.slots.length > 0)?.date
  const groups = DAY_PARTS.map((part) => ({
    part,
    slots: daySlots.filter((item) => dayPartOf(item.starts_at) === part),
  })).filter((group) => group.slots.length > 0)

  function retry() {
    setLoadState('loading')
    setReloadKey((key) => key + 1)
  }

  function pickDay(value: string) {
    setDate(value)
    setSlot('')
    setError('')
  }

  function handleContinue() {
    if (!chosenSlot || !draft) {
      setError(t('slot.errors.noTime'))
      return
    }
    saveDraft({
      ...draft,
      starts_at: chosenSlot.starts_at,
      assigned_staff_id: chosenSlot.staff_ids[0] ?? null,
    })
    navigate(`/book/${shopId}/review`)
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

  if (loadState === 'error' || !data) {
    return (
      <div className={styles.page}>
        <p className={styles.text} role="alert">
          {t('slot.loadError')}
        </p>
        <div>
          <Button variant="secondary" onClick={retry}>
            {t('common:actions.retry')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Link className={styles.back} to={`/book/${shopId}`}>
        {'\u2190 '}
        {t('slot.back')}
      </Link>
      <h1 className={styles.title}>{t('slot.title')}</h1>
      <p className={styles.text}>{data.shop_name}</p>

      {!hasAnyTime ? (
        <Card as="section" role="status">
          <p className={styles.text}>{t('slot.noneAtAll')}</p>
          <Link className={styles.link} to={`/book/${shopId}`}>
            {t('slot.changeChoice')}
          </Link>
        </Card>
      ) : (
        <div className={styles.layout}>
          <div className={styles.column}>
            <Card as="section">
              <h2 className={styles.sectionTitle}>{t('slot.dayTitle')}</h2>
              <ul className={styles.strip} ref={stripRef}>
                {data.days.map((day) => {
                  const empty = day.slots.length === 0
                  const on = day.date === date
                  return (
                    <li key={day.date}>
                      <button
                        type="button"
                        className={on ? `${styles.day} ${styles.dayOn}` : styles.day}
                        aria-pressed={on}
                        disabled={empty}
                        onClick={() => pickDay(day.date)}
                      >
                        {dayLabel(day.date)}
                      </button>
                    </li>
                  )
                })}
              </ul>
              {nextFreeDate && (
                <div className={styles.shortcut}>
                  <Button variant="secondary" onClick={() => pickDay(nextFreeDate)}>
                    {t('slot.nextFree', { day: dayLabel(nextFreeDate) })}
                  </Button>
                </div>
              )}
            </Card>

            <Card as="section">
              <h2 className={styles.sectionTitle}>{t('slot.timeTitle')}</h2>
              <p className={styles.hint}>
                {t('slot.tzNote')}
                {showStaff ? ` ${t('slot.staffHint')}` : ''}
              </p>
              {groups.length > 0 ? (
                groups.map((group) => (
                  <div key={group.part} className={styles.group}>
                    <h3 className={styles.groupTitle}>{partLabel[group.part]}</h3>
                    <ul className={styles.slots}>
                      {group.slots.map((item) => {
                        const on = item.starts_at === slot
                        const name = showStaff ? staffName(item.staff_ids[0]) : ''
                        return (
                          <li key={item.starts_at}>
                            <button
                              type="button"
                              className={on ? `${styles.slot} ${styles.slotOn}` : styles.slot}
                              aria-pressed={on}
                              onClick={() => {
                                setSlot(item.starts_at)
                                setError('')
                              }}
                            >
                              <span>{timeFormat.format(new Date(item.starts_at))}</span>
                              {name && <span className={styles.slotStaff}>{name}</span>}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))
              ) : (
                <p className={styles.text}>{t('slot.noDay')}</p>
              )}
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
            </Card>
          </div>

          <aside className={styles.summary} aria-label={t('slot.summaryTitle')}>
            <Card as="section">
              <h2 className={styles.sectionTitle}>{t('slot.summaryTitle')}</h2>
              <ul className={styles.items}>
                {data.services.map((service) => (
                  <li key={service.id} className={styles.item}>
                    <span>{service.name}</span>
                    <span>{money.format(service.price_poisha / 100)}</span>
                  </li>
                ))}
              </ul>
              <dl className={styles.totals}>
                <div className={styles.totalRow}>
                  <dt>{t('slot.staff')}</dt>
                  <dd>{assignedName || data.staff_name || t('anyStaff')}</dd>
                </div>
                <div className={styles.totalRow}>
                  <dt>{t('totalTime')}</dt>
                  <dd>{t('duration', { minutes: data.total_minutes })}</dd>
                </div>
                <div className={styles.totalRow}>
                  <dt>{t('totalPrice')}</dt>
                  <dd>{money.format(data.total_poisha / 100)}</dd>
                </div>
                <div className={styles.totalRow}>
                  <dt>{t('slot.when')}</dt>
                  <dd>{chosenSlot ? fullFormat.format(new Date(chosenSlot.starts_at)) : t('slot.notChosen')}</dd>
                </div>
              </dl>
              <Button onClick={handleContinue} fullWidth>
                {t('slot.continue')}
              </Button>
            </Card>
          </aside>
        </div>
      )}
    </div>
  )
}