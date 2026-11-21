import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Card } from '../../components/ui'
import { getSlotOptions } from '../../api/bookFlow'
import type { SlotOptions } from '../../api/bookFlow'
import { loadDraft, saveDraft } from '../../booking/bookingDraft'
import styles from './BookSlotPage.module.css'

type LoadState = 'loading' | 'error' | 'ready'

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

  const currentDay = data?.days.find((day) => day.date === date)
  const chosenSlot = currentDay?.slots.find((item) => item.starts_at === slot)
  const hasAnyTime = data?.days.some((day) => day.slots.length > 0) ?? false

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
              <ul className={styles.strip}>
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
                        {dayFormat.format(new Date(`${day.date}T12:00:00+06:00`))}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </Card>

            <Card as="section">
              <h2 className={styles.sectionTitle}>{t('slot.timeTitle')}</h2>
              <p className={styles.hint}>{t('slot.tzNote')}</p>
              {currentDay && currentDay.slots.length > 0 ? (
                <ul className={styles.slots}>
                  {currentDay.slots.map((item) => {
                    const on = item.starts_at === slot
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
                          {timeFormat.format(new Date(item.starts_at))}
                        </button>
                      </li>
                    )
                  })}
                </ul>
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
                  <dd>{data.staff_name ?? t('anyStaff')}</dd>
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