import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Card, FormField, Input } from '../../components/ui'
import { getReviewOptions } from '../../api/bookFlow'
import type { ReviewOptions } from '../../api/bookFlow'
import { loadDraft } from '../../booking/bookingDraft'
import styles from './BookReviewPage.module.css'

type LoadState = 'loading' | 'error' | 'notFound' | 'ready'

interface FieldErrors {
  name?: string
  phone?: string
  notes?: string
}

// Bangladesh mobile numbers: 01 + operator digit 3 to 9 + 8 digits, with an optional +88 or 88.
const PHONE_PATTERN = /^(?:\+?88)?01[3-9]\d{8}$/
const NOTES_MAX = 300

// BOOK-03, part 1: review the booking and give contact details (FR-03.3).
export default function BookReviewPage() {
  const { t, i18n } = useTranslation('book')
  const { shopId = '' } = useParams()
  const draft = useMemo(() => loadDraft(shopId), [shopId])

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [data, setData] = useState<ReviewOptions | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [detailsOk, setDetailsOk] = useState(false)

  useEffect(() => {
    if (!draft || draft.service_ids.length === 0 || !draft.starts_at) return
    let cancelled = false
    getReviewOptions(shopId, draft.service_ids, draft.starts_at, draft.assigned_staff_id ?? null)
      .then((result) => {
        if (cancelled) return
        setData(result)
        setLoadState(result ? 'ready' : 'notFound')
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
  // No time chosen in BOOK-02 yet: go back to the time page.
  if (!draft.starts_at) {
    return <Navigate to={`/book/${shopId}/slot`} replace />
  }

  const locale = i18n.language === 'bn' ? 'bn-BD' : 'en-GB'
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

  function retry() {
    setLoadState('loading')
    setReloadKey((key) => key + 1)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: FieldErrors = {}
    if (name.trim().length < 2) next.name = t('review.errors.nameRequired')
    if (!PHONE_PATTERN.test(phone.replace(/[\s-]/g, ''))) next.phone = t('review.errors.phoneInvalid')
    if (notes.length > NOTES_MAX) next.notes = t('review.errors.notesTooLong')
    setErrors(next)
    if (Object.keys(next).length > 0) {
      setDetailsOk(false)
      return
    }
    // UI-SK-25: the payment step replaces this message.
    setDetailsOk(true)
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

  if (loadState === 'notFound') {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>{t('notFound.title')}</h1>
        <p className={styles.text}>{t('notFound.body')}</p>
        <Link className={styles.link} to="/shops">
          {t('notFound.action')}
        </Link>
      </div>
    )
  }

  if (loadState === 'error' || !data) {
    return (
      <div className={styles.page}>
        <p className={styles.text} role="alert">
          {t('review.loadError')}
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
      <Link className={styles.back} to={`/book/${shopId}/slot`}>
        {'\u2190 '}
        {t('review.back')}
      </Link>
      <h1 className={styles.title}>{t('review.title')}</h1>
      <p className={styles.text}>
        {data.shop_name}
        {data.shop_address ? `, ${data.shop_address}` : ''}
      </p>

      <form className={styles.layout} onSubmit={handleSubmit} noValidate>
        <div className={styles.column}>
          <Card as="section">
            <h2 className={styles.sectionTitle}>{t('review.detailsTitle')}</h2>
            <div className={styles.fields}>
              <FormField label={t('review.name')} error={errors.name}>
                {(control) => (
                  <Input
                    {...control}
                    value={name}
                    autoComplete="name"
                    onChange={(event) => setName(event.target.value)}
                  />
                )}
              </FormField>
              <FormField label={t('review.phone')} error={errors.phone}>
                {(control) => (
                  <Input
                    {...control}
                    value={phone}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    onChange={(event) => setPhone(event.target.value)}
                  />
                )}
              </FormField>
              <FormField label={t('review.notes')} error={errors.notes}>
                {(control) => (
                  <textarea
                    {...control}
                    className={styles.textarea}
                    rows={4}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                )}
              </FormField>
            </div>
            {data.requires_booking_approval && (
              <p className={styles.note}>{t('review.approvalNote')}</p>
            )}
          </Card>
        </div>

        <aside className={styles.summary} aria-label={t('review.summaryTitle')}>
          <Card as="section">
            <h2 className={styles.sectionTitle}>{t('review.summaryTitle')}</h2>
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
                <dt>{t('slot.when')}</dt>
                <dd>{fullFormat.format(new Date(data.starts_at))}</dd>
              </div>
              <div className={styles.totalRow}>
                <dt>{t('totalTime')}</dt>
                <dd>{t('duration', { minutes: data.total_minutes })}</dd>
              </div>
              <div className={styles.totalRow}>
                <dt>{t('review.subtotal')}</dt>
                <dd>{money.format(data.subtotal_poisha / 100)}</dd>
              </div>
              {data.offer && (
                <div className={styles.totalRow}>
                  <dt>{t('review.offerLine', { title: data.offer.title })}</dt>
                  <dd className={styles.discount}>
                    {'\u2212'}
                    {money.format(data.offer.discount_poisha / 100)}
                  </dd>
                </div>
              )}
              <div className={`${styles.totalRow} ${styles.grand}`}>
                <dt>{t('review.total')}</dt>
                <dd>{money.format(data.total_poisha / 100)}</dd>
              </div>
            </dl>
            <Button type="submit" fullWidth>
              {t('review.continue')}
            </Button>
            {detailsOk && (
              <p className={styles.ok} role="status">
                {t('review.detailsOk')}
              </p>
            )}
          </Card>
        </aside>
      </form>
    </div>
  )
}