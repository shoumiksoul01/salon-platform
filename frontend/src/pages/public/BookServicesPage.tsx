import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card } from '../../components/ui'
import { getBookingOptions } from '../../api/bookFlow'
import type { BookingOptions } from '../../api/bookFlow'
import { loadDraft, saveDraft } from '../../booking/bookingDraft'
import styles from './BookServicesPage.module.css'

type LoadState = 'loading' | 'error' | 'missing' | 'ready'

// BOOK-01: choose services and staff (FR-03.1)
export default function BookServicesPage() {
  const { t, i18n } = useTranslation('book')
  const navigate = useNavigate()
  const { shopId = '' } = useParams()

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [options, setOptions] = useState<BookingOptions | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [staffId, setStaffId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getBookingOptions(shopId)
      .then((result) => {
        if (cancelled) return
        if (!result) {
          setLoadState('missing')
          return
        }
        setOptions(result)
        const draft = loadDraft(shopId)
        if (draft) {
          const known = new Set(result.services.map((service) => service.id))
          setSelected(draft.service_ids.filter((id) => known.has(id)))
          setStaffId(draft.staff_id)
        }
        setLoadState('ready')
      })
      .catch(() => {
        if (!cancelled) setLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [shopId, reloadKey])

  const services = options?.services ?? []
  const chosen = services.filter((service) => selected.includes(service.id))
  const totalMinutes = chosen.reduce((sum, service) => sum + service.duration_minutes, 0)
  const totalPoisha = chosen.reduce((sum, service) => sum + service.price_poisha, 0)

  // Only staff who do every chosen service can take the booking.
  const availableStaff = useMemo(
    () =>
      options ? options.staff.filter((member) => selected.every((id) => member.service_ids.includes(id))) : [],
    [options, selected],
  )
  const effectiveStaffId =
    staffId !== null && availableStaff.some((member) => member.id === staffId) ? staffId : null
  const noStaffFits = selected.length > 0 && availableStaff.length === 0

  const money = new Intl.NumberFormat(i18n.language === 'bn' ? 'bn-BD' : 'en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
  })

  function retry() {
    setLoadState('loading')
    setReloadKey((key) => key + 1)
  }

  function toggle(id: string) {
    setSelected((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id],
    )
    setError('')
  }

  function handleContinue() {
    if (selected.length === 0) {
      setError(t('errors.noService'))
      return
    }
    saveDraft({
      shop_id: shopId,
      service_ids: services.filter((service) => selected.includes(service.id)).map((service) => service.id),
      staff_id: effectiveStaffId,
    })
    navigate(`/book/${shopId}/slot`)
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

  if (loadState === 'error') {
    return (
      <div className={styles.page}>
        <p className={styles.text} role="alert">
          {t('loadError')}
        </p>
        <div>
          <Button variant="secondary" onClick={retry}>
            {t('common:actions.retry')}
          </Button>
        </div>
      </div>
    )
  }

  if (loadState === 'missing' || !options) {
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

  return (
    <div className={styles.page}>
      <Link className={styles.back} to={`/shops/${shopId}`}>
        {'\u2190 '}
        {t('back')}
      </Link>
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.text}>{options.shop.name}</p>

      <div className={styles.layout}>
        <div className={styles.column}>
          <Card as="section">
            <h2 className={styles.sectionTitle}>{t('servicesTitle')}</h2>
            <p className={styles.hint}>{t('servicesHint')}</p>
            <ul className={styles.list}>
              {services.map((service) => {
                const on = selected.includes(service.id)
                const hasOffer = options.offers.some(
                  (offer) => offer.is_active && offer.service_ids.includes(service.id),
                )
                return (
                  <li key={service.id}>
                    <label className={on ? `${styles.choice} ${styles.choiceOn}` : styles.choice}>
                      <input
                        type="checkbox"
                        className={styles.control}
                        checked={on}
                        onChange={() => toggle(service.id)}
                      />
                      <span className={styles.choiceMain}>
                        <span className={styles.choiceName}>{service.name}</span>
                        <span className={styles.choiceMeta}>
                          {t('duration', { minutes: service.duration_minutes })}
                        </span>
                      </span>
                      {hasOffer && <Badge variant="success">{t('offerBadge')}</Badge>}
                      <span className={styles.price}>{money.format(service.price_poisha / 100)}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
          </Card>

          <Card as="section">
            <h2 className={styles.sectionTitle}>{t('staffTitle')}</h2>
            <p className={styles.hint}>{t('staffHint')}</p>
            {selected.length === 0 && <p className={styles.text}>{t('staffFirst')}</p>}
            {noStaffFits && (
              <p className={styles.error} role="alert">
                {t('noStaff')}
              </p>
            )}
            {selected.length > 0 && !noStaffFits && (
              <ul className={styles.list}>
                <li>
                  <label
                    className={effectiveStaffId === null ? `${styles.choice} ${styles.choiceOn}` : styles.choice}
                  >
                    <input
                      type="radio"
                      name="staff"
                      className={styles.control}
                      checked={effectiveStaffId === null}
                      onChange={() => setStaffId(null)}
                    />
                    <span className={styles.choiceMain}>
                      <span className={styles.choiceName}>{t('anyStaff')}</span>
                      <span className={styles.choiceMeta}>{t('anyStaffHint')}</span>
                    </span>
                  </label>
                </li>
                {availableStaff.map((member) => (
                  <li key={member.id}>
                    <label
                      className={
                        effectiveStaffId === member.id ? `${styles.choice} ${styles.choiceOn}` : styles.choice
                      }
                    >
                      <input
                        type="radio"
                        name="staff"
                        className={styles.control}
                        checked={effectiveStaffId === member.id}
                        onChange={() => setStaffId(member.id)}
                      />
                      <span className={styles.choiceMain}>
                        <span className={styles.choiceName}>{member.full_name}</span>
                        <span className={styles.choiceMeta}>{member.role_title}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className={styles.summary} aria-label={t('summaryTitle')}>
          <Card as="section">
            <h2 className={styles.sectionTitle}>{t('summaryTitle')}</h2>
            <dl className={styles.totals}>
              <div className={styles.totalRow}>
                <dt>{t('selected')}</dt>
                <dd>{selected.length}</dd>
              </div>
              <div className={styles.totalRow}>
                <dt>{t('totalTime')}</dt>
                <dd>{t('duration', { minutes: totalMinutes })}</dd>
              </div>
              <div className={styles.totalRow}>
                <dt>{t('totalPrice')}</dt>
                <dd>{money.format(totalPoisha / 100)}</dd>
              </div>
            </dl>
            <p className={styles.hint}>{t('priceNote')}</p>
            <Button onClick={handleContinue} disabled={noStaffFits} fullWidth>
              {t('continue')}
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  )
}