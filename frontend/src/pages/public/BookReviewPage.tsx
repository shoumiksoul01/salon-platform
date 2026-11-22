import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Card, FormField, Input } from '../../components/ui'
import { getReviewOptions } from '../../api/bookFlow'
import type { ReviewOptions } from '../../api/bookFlow'
import { DEPOSIT_PERCENT, CheckoutError, amountDueNow, confirmBooking } from '../../api/checkout'
import type { CheckoutErrorCode, OnlineMethod, PaymentMode } from '../../api/checkout'
import { clearDraft, loadDraft } from '../../booking/bookingDraft'
import styles from './BookReviewPage.module.css'

type LoadState = 'loading' | 'error' | 'notFound' | 'ready'

interface FieldErrors {
  name?: string
  phone?: string
  notes?: string
  mode?: string
  method?: string
}

// Bangladesh mobile numbers: 01 + operator digit 3 to 9 + 8 digits, with an optional +88 or 88.
const PHONE_PATTERN = /^(?:\+?88)?01[3-9]\d{8}$/
const NOTES_MAX = 300
const MODE_ORDER: PaymentMode[] = ['deposit', 'full', 'pay_at_shop']
const METHODS: OnlineMethod[] = ['bkash', 'nagad', 'card']

// BOOK-03: review the booking, choose how to pay and confirm (FR-03.3 and FR-07.1).
export default function BookReviewPage() {
  const { t, i18n } = useTranslation('book')
  const navigate = useNavigate()
  const { shopId = '' } = useParams()
  const draft = useMemo(() => loadDraft(shopId), [shopId])

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [data, setData] = useState<ReviewOptions | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [mode, setMode] = useState<PaymentMode | ''>('')
  const [method, setMethod] = useState<OnlineMethod | ''>('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<CheckoutErrorCode | ''>('')

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

  // The payment modes this shop allows, in a fixed order. A shop with none set falls back to pay at shop.
  const allowedModes = MODE_ORDER.filter((item) => data.allowed_payment_modes.includes(item))
  const modes: PaymentMode[] = allowedModes.length > 0 ? allowedModes : ['pay_at_shop']
  // With only one mode there is nothing to choose, so it is selected for the customer.
  const activeMode: PaymentMode | '' = modes.length === 1 ? modes[0] : mode
  const payingOnline = activeMode === 'deposit' || activeMode === 'full'
  const dueNow = activeMode ? amountDueNow(activeMode, data.total_poisha) : 0
  const dueAtShop = data.total_poisha - dueNow

  const modeLabel: Record<PaymentMode, string> = {
    deposit: t('review.modes.deposit'),
    full: t('review.modes.full'),
    pay_at_shop: t('review.modes.pay_at_shop'),
  }
  const modeHint: Record<PaymentMode, string> = {
    deposit: t('review.modeHints.deposit', {
      amount: money.format(amountDueNow('deposit', data.total_poisha) / 100),
      percent: DEPOSIT_PERCENT,
    }),
    full: t('review.modeHints.full', { amount: money.format(data.total_poisha / 100) }),
    pay_at_shop: t('review.modeHints.pay_at_shop', { amount: money.format(data.total_poisha / 100) }),
  }
  const methodLabel: Record<OnlineMethod, string> = {
    bkash: t('review.methods.bkash'),
    nagad: t('review.methods.nagad'),
    card: t('review.methods.card'),
  }
  const submitMessage: Record<CheckoutErrorCode, string> = {
    slot_taken: t('review.errors.slotTaken'),
    payment_failed: t('review.errors.paymentFailed'),
    failed: t('review.errors.failed'),
  }

  function clearError(key: keyof FieldErrors) {
    setErrors((previous) => ({ ...previous, [key]: undefined }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting || !draft?.starts_at) return

    const next: FieldErrors = {}
    if (name.trim().length < 2) next.name = t('review.errors.nameRequired')
    if (!PHONE_PATTERN.test(phone.replace(/[\s-]/g, ''))) next.phone = t('review.errors.phoneInvalid')
    if (notes.length > NOTES_MAX) next.notes = t('review.errors.notesTooLong')
    if (!activeMode) next.mode = t('review.errors.modeRequired')
    else if (payingOnline && !method) next.method = t('review.errors.methodRequired')
    setErrors(next)
    setSubmitError('')
    if (Object.keys(next).length > 0 || !activeMode) return

    setSubmitting(true)
    confirmBooking({
      shop_id: shopId,
      service_ids: draft.service_ids,
      staff_id: draft.assigned_staff_id ?? null,
      starts_at: draft.starts_at,
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      notes: notes.trim(),
      payment_mode: activeMode,
      payment_method: payingOnline && method ? method : 'pay_at_shop',
    })
      .then((receipt) => {
        clearDraft()
        navigate(`/booking/${receipt.booking_id}/receipt`)
      })
      .catch((caught: unknown) => {
        setSubmitError(caught instanceof CheckoutError ? caught.code : 'failed')
        setSubmitting(false)
      })
  }

  const confirmLabel = payingOnline
    ? t('review.payAndConfirm', { amount: money.format(dueNow / 100) })
    : t('review.confirm')

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

          <Card as="section">
            <h2 className={styles.sectionTitle}>{t('review.paymentTitle')}</h2>
            <fieldset
              className={styles.fieldset}
              aria-describedby={errors.mode ? 'mode-error' : undefined}
            >
              <legend className={styles.legend}>{t('review.modeLegend')}</legend>
              <div className={styles.options}>
                {modes.map((item) => (
                  <label
                    key={item}
                    className={activeMode === item ? `${styles.option} ${styles.optionOn}` : styles.option}
                  >
                    <input
                      type="radio"
                      name="payment-mode"
                      value={item}
                      checked={activeMode === item}
                      onChange={() => {
                        setMode(item)
                        clearError('mode')
                      }}
                    />
                    <span className={styles.optionText}>
                      <span className={styles.optionTitle}>{modeLabel[item]}</span>
                      <span className={styles.optionHint}>{modeHint[item]}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            {errors.mode && (
              <p id="mode-error" className={styles.error} role="alert">
                {errors.mode}
              </p>
            )}

            {payingOnline && (
              <>
                <fieldset
                  className={`${styles.fieldset} ${styles.methodSet}`}
                  aria-describedby={errors.method ? 'method-error' : undefined}
                >
                  <legend className={styles.legend}>{t('review.methodLegend')}</legend>
                  <div className={styles.methods}>
                    {METHODS.map((item) => (
                      <label
                        key={item}
                        className={
                          method === item
                            ? `${styles.option} ${styles.methodOption} ${styles.optionOn}`
                            : `${styles.option} ${styles.methodOption}`
                        }
                      >
                        <input
                          type="radio"
                          name="payment-method"
                          value={item}
                          checked={method === item}
                          onChange={() => {
                            setMethod(item)
                            clearError('method')
                          }}
                        />
                        <span className={styles.optionTitle}>{methodLabel[item]}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                {errors.method && (
                  <p id="method-error" className={styles.error} role="alert">
                    {errors.method}
                  </p>
                )}
                <p className={styles.note}>{t('review.payNote')}</p>
              </>
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
              {activeMode && dueNow > 0 && (
                <div className={styles.totalRow}>
                  <dt>{t('review.payNow')}</dt>
                  <dd>{money.format(dueNow / 100)}</dd>
                </div>
              )}
              {activeMode && dueAtShop > 0 && (
                <div className={styles.totalRow}>
                  <dt>{t('review.payAtShop')}</dt>
                  <dd>{money.format(dueAtShop / 100)}</dd>
                </div>
              )}
            </dl>
            <Button type="submit" fullWidth loading={submitting}>
              {confirmLabel}
            </Button>
            {submitError && (
              <div className={styles.errorBox} role="alert">
                <p className={styles.errorText}>{submitMessage[submitError]}</p>
                {submitError === 'slot_taken' && (
                  <Link className={styles.link} to={`/book/${shopId}/slot`}>
                    {t('review.pickAnotherTime')}
                  </Link>
                )}
              </div>
            )}
          </Card>
        </aside>
      </form>
    </div>
  )
}