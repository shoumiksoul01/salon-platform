import { useState } from 'react'
import type { Dispatch, FormEvent, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  FormField,
  Input,
  Modal,
  Select,
  useToast,
} from '../../components/ui'
import { createOffer, endOffer, updateOffer } from '../../api/offers'
import type { OfferInput, OfferType, OwnerOffer } from '../../api/offers'
import type { Service } from '../../api/services'
import styles from './OffersPanel.module.css'

// OWN-03: the offers tab (FR-01.3). UI-SM-18.
// Create, edit or end a discount or combo offer with a validity period.
// The state lives in ServicesPage, so the list survives a switch between the two tabs.

const TYPES: OfferType[] = ['percentage', 'fixed', 'combo']
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/
const PERCENT_MAX = 90
const TITLE_MIN = 2
const TITLE_MAX = 80
const FORM_ID = 'offer-form'

type OfferStatus = 'running' | 'scheduled' | 'ended'

// Bengali digits are turned into 0-9, so an owner can type either way.
const toAsciiDigits = (value: string) =>
  value.replace(/[\u09E6-\u09EF]/g, (digit) => String(digit.charCodeAt(0) - 0x09e6)).trim()

// The shop works in Bangladesh time (UTC+6, no daylight saving).
const dhakaDay = (value: string | Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date(value))
const startOfDay = (day: string) => new Date(`${day}T00:00:00+06:00`).toISOString()
const endOfDay = (day: string) => new Date(`${day}T23:59:59+06:00`).toISOString()

function statusOf(offer: OwnerOffer, now: number): OfferStatus {
  if (!offer.is_active || Date.parse(offer.ends_at) < now) return 'ended'
  if (Date.parse(offer.starts_at) > now) return 'scheduled'
  return 'running'
}

const STATUS_RANK: Record<OfferStatus, number> = { running: 0, scheduled: 1, ended: 2 }
const STATUS_VARIANT = { running: 'success', scheduled: 'info', ended: 'neutral' } as const

function useFormats() {
  const { i18n } = useTranslation()
  const locale = i18n.language.startsWith('bn') ? 'bn-BD' : 'en-GB'
  const numberFormat = new Intl.NumberFormat(locale)
  const moneyFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 })
  const dateFormat = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Dhaka',
  })
  return {
    number: (value: number) => numberFormat.format(value),
    money: (poisha: number) => `৳${moneyFormat.format(poisha / 100)}`,
    date: (iso: string) => dateFormat.format(new Date(iso)),
  }
}

interface DialogProps {
  /** The offer being edited, or null to create a new one. */
  offer: OwnerOffer | null
  services: Service[]
  onClose: () => void
  onSaved: (offer: OwnerOffer, isNew: boolean) => void
}

function OfferDialog({ offer, services, onClose, onSaved }: DialogProps) {
  const { t } = useTranslation('ownerOffers')
  const toast = useToast()
  const format = useFormats()
  const [title, setTitle] = useState(offer?.title ?? '')
  const [type, setType] = useState<OfferType>(offer?.offer_type ?? 'percentage')
  const [discount, setDiscount] = useState(() => {
    if (!offer) return ''
    return offer.offer_type === 'percentage'
      ? String(offer.discount_percent ?? '')
      : String((offer.discount_poisha ?? 0) / 100)
  })
  const [startDay, setStartDay] = useState(() => dhakaDay(offer ? offer.starts_at : new Date()))
  const [endDay, setEndDay] = useState(() => (offer ? dhakaDay(offer.ends_at) : ''))
  const [serviceIds, setServiceIds] = useState<string[]>(offer?.service_ids ?? [])
  const [errors, setErrors] = useState<
    Partial<Record<'title' | 'discount' | 'startDay' | 'endDay' | 'services', string>>
  >({})
  const [saving, setSaving] = useState(false)

  // Active services can be picked. A service that is already in this offer stays in the list.
  const choices = services.filter((service) => service.is_active || serviceIds.includes(service.id))

  function toggleService(id: string, checked: boolean) {
    setServiceIds((previous) => (checked ? [...previous, id] : previous.filter((item) => item !== id)))
    setErrors((previous) => ({ ...previous, services: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const cleanTitle = title.trim()
    const cleanDiscount = toAsciiDigits(discount)
    const found: typeof errors = {}
    const picked = services.filter((service) => serviceIds.includes(service.id))

    if (cleanTitle.length < TITLE_MIN || cleanTitle.length > TITLE_MAX) {
      found.title = t('form.titleInvalid', { min: TITLE_MIN, max: TITLE_MAX })
    }

    let discountPercent: number | null = null
    let discountPoisha: number | null = null
    if (type === 'percentage') {
      const value = Number(cleanDiscount)
      if (!/^\d+$/.test(cleanDiscount) || value < 1 || value > PERCENT_MAX) {
        found.discount = t('form.percentInvalid', { max: PERCENT_MAX })
      } else {
        discountPercent = value
      }
    } else if (!PRICE_PATTERN.test(cleanDiscount) || Number(cleanDiscount) <= 0) {
      found.discount = t('form.amountInvalid')
    } else {
      discountPoisha = Math.round(Number(cleanDiscount) * 100)
    }

    if (picked.length === 0) {
      found.services = t('form.servicesRequired')
    } else if (type === 'combo' && picked.length < 2) {
      found.services = t('form.comboNeedsTwo')
    } else if (discountPoisha !== null) {
      // The discount must stay below the price it is taken from.
      const limit =
        type === 'combo'
          ? picked.reduce((sum, service) => sum + service.price_poisha, 0)
          : Math.min(...picked.map((service) => service.price_poisha))
      if (discountPoisha >= limit) {
        found.discount = t(type === 'combo' ? 'form.comboTooBig' : 'form.fixedTooBig', {
          limit: format.money(limit),
        })
      }
    }

    if (!startDay) found.startDay = t('form.dateRequired')
    if (!endDay) {
      found.endDay = t('form.dateRequired')
    } else if (startDay && endDay < startDay) {
      found.endDay = t('form.endBeforeStart')
    } else if (endDay < dhakaDay(new Date()) && endDay !== (offer ? dhakaDay(offer.ends_at) : null)) {
      found.endDay = t('form.endInPast')
    }

    setErrors(found)
    if (Object.keys(found).length > 0) return

    const input: OfferInput = {
      title: cleanTitle,
      offer_type: type,
      discount_percent: discountPercent,
      discount_poisha: discountPoisha,
      starts_at: startOfDay(startDay),
      ends_at: endOfDay(endDay),
      service_ids: serviceIds,
    }

    setSaving(true)
    try {
      const saved = offer ? await updateOffer(offer.id, input) : await createOffer(input)
      toast.show({ message: t(offer ? 'toast.updated' : 'toast.created'), variant: 'success' })
      onSaved(saved, offer === null)
    } catch {
      toast.show({ message: t('toast.saveFailed'), variant: 'danger' })
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t(offer ? 'form.editTitle' : 'form.addTitle')}
      closeLabel={t('common:actions.close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID} loading={saving}>
            {t('common:actions.save')}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className={styles.form} onSubmit={handleSubmit} noValidate>
        <FormField label={t('form.title')} error={errors.title} required>
          {(control) => (
            <Input
              {...control}
              value={title}
              maxLength={TITLE_MAX}
              autoComplete="off"
              onChange={(event) => setTitle(event.target.value)}
            />
          )}
        </FormField>

        <FormField label={t('form.type')} hint={t(`form.typeHint.${type}`)} required>
          {(control) => (
            <Select {...control} value={type} onChange={(event) => setType(event.target.value as OfferType)}>
              {TYPES.map((value) => (
                <option key={value} value={value}>
                  {t(`type.${value}`)}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField
          label={t(type === 'percentage' ? 'form.percent' : 'form.amount')}
          hint={t(type === 'percentage' ? 'form.percentHint' : 'form.amountHint', { max: PERCENT_MAX })}
          error={errors.discount}
          required
        >
          {(control) => (
            <Input
              {...control}
              value={discount}
              inputMode="decimal"
              autoComplete="off"
              onChange={(event) => setDiscount(event.target.value)}
            />
          )}
        </FormField>

        <div className={styles.two}>
          <FormField label={t('form.startDay')} error={errors.startDay} required>
            {(control) => (
              <Input
                {...control}
                type="date"
                value={startDay}
                onChange={(event) => setStartDay(event.target.value)}
              />
            )}
          </FormField>
          <FormField label={t('form.endDay')} hint={t('form.endDayHint')} error={errors.endDay} required>
            {(control) => (
              <Input
                {...control}
                type="date"
                value={endDay}
                min={startDay || undefined}
                onChange={(event) => setEndDay(event.target.value)}
              />
            )}
          </FormField>
        </div>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>
            {t('form.services')}
            <span aria-hidden="true"> *</span>
          </legend>
          {choices.length === 0 ? (
            <p className={styles.muted}>{t('form.noServices')}</p>
          ) : (
            <div className={styles.checks}>
              {choices.map((service) => (
                <Checkbox
                  key={service.id}
                  label={
                    <>
                      {service.name}
                      <span className={styles.muted}>
                        {' · '}
                        {format.money(service.price_poisha)}
                        {!service.is_active && ` · ${t('form.inactive')}`}
                      </span>
                    </>
                  }
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
      </form>
    </Modal>
  )
}

interface PanelProps {
  offers: OwnerOffer[]
  /** All services of the shop, from the Services tab. */
  services: Service[]
  onOffersChange: Dispatch<SetStateAction<OwnerOffer[]>>
}

export default function OffersPanel({ offers, services, onOffersChange }: PanelProps) {
  const { t } = useTranslation('ownerOffers')
  const toast = useToast()
  const format = useFormats()
  const [now, setNow] = useState(() => Date.now())
  const [dialog, setDialog] = useState<{ offer: OwnerOffer | null } | null>(null)
  const [ending, setEnding] = useState<OwnerOffer | null>(null)
  const [endingBusy, setEndingBusy] = useState(false)

  const serviceNames = new Map(services.map((service) => [service.id, service.name]))
  const sorted = [...offers].sort((a, b) => {
    const rank = STATUS_RANK[statusOf(a, now)] - STATUS_RANK[statusOf(b, now)]
    if (rank !== 0) return rank
    return statusOf(a, now) === 'ended'
      ? Date.parse(b.ends_at) - Date.parse(a.ends_at)
      : Date.parse(a.ends_at) - Date.parse(b.ends_at)
  })
  const hasActiveService = services.some((service) => service.is_active)

  function openAdd() {
    setDialog({ offer: null })
  }

  function handleSaved(saved: OwnerOffer, isNew: boolean) {
    onOffersChange((previous) =>
      isNew ? [saved, ...previous] : previous.map((item) => (item.id === saved.id ? saved : item)),
    )
    setNow(Date.now())
    setDialog(null)
  }

  async function confirmEnd() {
    if (!ending) return
    setEndingBusy(true)
    try {
      const saved = await endOffer(ending.id)
      onOffersChange((previous) => previous.map((item) => (item.id === saved.id ? saved : item)))
      setNow(Date.now())
      toast.show({ message: t('toast.ended', { title: saved.title }), variant: 'success' })
      setEnding(null)
    } catch {
      toast.show({ message: t('toast.saveFailed'), variant: 'danger' })
    } finally {
      setEndingBusy(false)
    }
  }

  function discountText(offer: OwnerOffer) {
    return offer.offer_type === 'percentage'
      ? t('discount.percent', { value: format.number(offer.discount_percent ?? 0) })
      : t('discount.amount', { value: format.money(offer.discount_poisha ?? 0) })
  }

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <p className={styles.muted}>{t('intro')}</p>
        <Button onClick={openAdd} disabled={!hasActiveService}>
          {t('add')}
        </Button>
      </div>

      {!hasActiveService && <p className={styles.muted}>{t('needServices')}</p>}

      {offers.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyText')} />
      ) : (
        <ul className={styles.list}>
          {sorted.map((offer) => {
            const status = statusOf(offer, now)
            return (
              <li key={offer.id}>
                <Card className={status === 'ended' ? styles.ended : ''}>
                  <div className={styles.row}>
                    <div className={styles.details}>
                      <p className={styles.name}>{offer.title}</p>
                      <div className={styles.badges}>
                        <Badge variant={STATUS_VARIANT[status]}>{t(`status.${status}`)}</Badge>
                        <Badge variant="neutral">{t(`type.${offer.offer_type}`)}</Badge>
                      </div>
                      <p className={styles.discount}>{discountText(offer)}</p>
                      <p className={styles.muted}>
                        {t('period', { from: format.date(offer.starts_at), to: format.date(offer.ends_at) })}
                      </p>
                      <p className={styles.muted}>
                        {t('appliesTo', {
                          names: offer.service_ids
                            .map((id) => serviceNames.get(id))
                            .filter(Boolean)
                            .join(', '),
                        })}
                      </p>
                    </div>
                    <div className={styles.actions}>
                      <Button
                        variant="secondary"
                        onClick={() => setDialog({ offer })}
                        aria-label={t('editLabel', { title: offer.title })}
                      >
                        {t('edit')}
                      </Button>
                      {status !== 'ended' && (
                        <Button
                          variant="ghost"
                          onClick={() => setEnding(offer)}
                          aria-label={t('endLabel', { title: offer.title })}
                        >
                          {t('end')}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
      <p className={styles.muted}>{t('endNote')}</p>

      {dialog && (
        <OfferDialog
          key={dialog.offer?.id ?? 'new'}
          offer={dialog.offer}
          services={services}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      )}

      <Modal
        open={ending !== null}
        onClose={() => setEnding(null)}
        title={t('endDialog.title')}
        closeLabel={t('common:actions.close')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEnding(null)} disabled={endingBusy}>
              {t('common:actions.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmEnd} loading={endingBusy}>
              {t('endDialog.confirm')}
            </Button>
          </>
        }
      >
        <p>{t('endDialog.text', { title: ending?.title ?? '' })}</p>
      </Modal>
    </div>
  )
}
