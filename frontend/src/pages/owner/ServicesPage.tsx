import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
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
  Skeleton,
  Tabs,
  useToast,
} from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { listOffers } from '../../api/offers'
import type { OwnerOffer } from '../../api/offers'
import {
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_SERVICE_IMAGES,
  createService,
  listServices,
  setServiceActive,
  updateService,
  uploadServiceImage,
} from '../../api/services'
import type { GenderCategory, Service, ServiceInput } from '../../api/services'
import OffersPanel from './OffersPanel'
import styles from './ServicesPage.module.css'

// OWN-03: owner services and offers (FR-01.2, FR-01.3).
// UI-SM-17: the services list, the add and edit dialog, activate and deactivate.
// UI-SM-18: the offers tab (OffersPanel.tsx). Both tabs share the state kept in Content.

const GENDERS: GenderCategory[] = ['women', 'men', 'unisex']
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/
const PRICE_MAX_TAKA = 1_000_000
const MINUTES_MIN = 5
const MINUTES_MAX = 480
const NAME_MIN = 2
const NAME_MAX = 80
const FORM_ID = 'service-form'

// Bengali digits are turned into 0-9, so an owner can type either way.
const toAsciiDigits = (value: string) =>
  value.replace(/[\u09E6-\u09EF]/g, (digit) => String(digit.charCodeAt(0) - 0x09e6)).trim()

function useFormats() {
  const { t, i18n } = useTranslation('ownerServices')
  const locale = i18n.language.startsWith('bn') ? 'bn-BD' : 'en-GB'
  const numberFormat = new Intl.NumberFormat(locale)
  const moneyFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 })
  return {
    number: (value: number) => numberFormat.format(value),
    money: (poisha: number) => `৳${moneyFormat.format(poisha / 100)}`,
    duration: (minutes: number) => {
      if (minutes < 60) return t('duration.minutes', { minutes: numberFormat.format(minutes) })
      const hours = Math.floor(minutes / 60)
      const rest = minutes % 60
      return rest === 0
        ? t('duration.hours', { hours: numberFormat.format(hours) })
        : t('duration.hoursMinutes', {
            hours: numberFormat.format(hours),
            minutes: numberFormat.format(rest),
          })
    },
  }
}

function Loading({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={styles.loading}>
      {[1, 2, 3].map((n) => (
        <Card key={n}>
          <Skeleton width="50%" />
          <Skeleton width="30%" />
        </Card>
      ))}
    </div>
  )
}

interface DialogProps {
  /** The service being edited, or null to add a new one. */
  service: Service | null
  onClose: () => void
  onSaved: (service: Service, isNew: boolean) => void
}

function ServiceDialog({ service, onClose, onSaved }: DialogProps) {
  const { t } = useTranslation('ownerServices')
  const toast = useToast()
  const [name, setName] = useState(service?.name ?? '')
  const [price, setPrice] = useState(service ? String(service.price_poisha / 100) : '')
  const [minutes, setMinutes] = useState(service ? String(service.duration_minutes) : '')
  const [gender, setGender] = useState<GenderCategory>(service?.gender_category ?? 'unisex')
  const [images, setImages] = useState<string[]>(service?.image_urls ?? [])
  const [errors, setErrors] = useState<Partial<Record<'name' | 'price' | 'minutes' | 'images', string>>>({})
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    input.value = '' // lets the owner pick the same file again later

    if (images.length >= MAX_SERVICE_IMAGES) {
      setErrors((previous) => ({ ...previous, images: t('form.imagesMax', { max: MAX_SERVICE_IMAGES }) }))
      return
    }
    if (!IMAGE_TYPES.includes(file.type)) {
      setErrors((previous) => ({ ...previous, images: t('form.imageType') }))
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrors((previous) => ({ ...previous, images: t('form.imageTooBig') }))
      return
    }

    setErrors((previous) => ({ ...previous, images: undefined }))
    setUploading(true)
    try {
      const url = await uploadServiceImage(file)
      setImages((previous) => [...previous, url])
    } catch {
      toast.show({ message: t('form.uploadFailed'), variant: 'danger' })
    } finally {
      setUploading(false)
    }
  }

  function removeImage(index: number) {
    setImages((previous) => previous.filter((_, position) => position !== index))
    setErrors((previous) => ({ ...previous, images: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const cleanName = name.trim()
    const cleanPrice = toAsciiDigits(price)
    const cleanMinutes = toAsciiDigits(minutes)
    const found: typeof errors = {}

    if (cleanName.length < NAME_MIN || cleanName.length > NAME_MAX) {
      found.name = t('form.nameInvalid', { min: NAME_MIN, max: NAME_MAX })
    }
    if (!PRICE_PATTERN.test(cleanPrice) || Number(cleanPrice) <= 0 || Number(cleanPrice) > PRICE_MAX_TAKA) {
      found.price = t('form.priceInvalid')
    }
    const minutesNumber = Number(cleanMinutes)
    if (
      !/^\d+$/.test(cleanMinutes) ||
      minutesNumber < MINUTES_MIN ||
      minutesNumber > MINUTES_MAX
    ) {
      found.minutes = t('form.minutesInvalid', { min: MINUTES_MIN, max: MINUTES_MAX })
    }
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const input: ServiceInput = {
      name: cleanName,
      price_poisha: Math.round(Number(cleanPrice) * 100),
      duration_minutes: minutesNumber,
      gender_category: gender,
      image_urls: images,
    }

    setSaving(true)
    try {
      const saved = service ? await updateService(service.id, input) : await createService(input)
      toast.show({ message: t(service ? 'toast.updated' : 'toast.created'), variant: 'success' })
      onSaved(saved, service === null)
    } catch {
      toast.show({ message: t('toast.saveFailed'), variant: 'danger' })
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t(service ? 'form.editTitle' : 'form.addTitle')}
      closeLabel={t('common:actions.close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" form={FORM_ID} loading={saving} disabled={uploading}>
            {t('common:actions.save')}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className={styles.form} onSubmit={handleSubmit} noValidate>
        <FormField label={t('form.name')} error={errors.name} required>
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

        <div className={styles.two}>
          <FormField label={t('form.price')} hint={t('form.priceHint')} error={errors.price} required>
            {(control) => (
              <Input
                {...control}
                value={price}
                inputMode="decimal"
                autoComplete="off"
                onChange={(event) => setPrice(event.target.value)}
              />
            )}
          </FormField>
          <FormField label={t('form.minutes')} hint={t('form.minutesHint')} error={errors.minutes} required>
            {(control) => (
              <Input
                {...control}
                value={minutes}
                inputMode="numeric"
                autoComplete="off"
                onChange={(event) => setMinutes(event.target.value)}
              />
            )}
          </FormField>
        </div>

        <FormField label={t('form.gender')} required>
          {(control) => (
            <Select
              {...control}
              value={gender}
              onChange={(event) => setGender(event.target.value as GenderCategory)}
            >
              {GENDERS.map((value) => (
                <option key={value} value={value}>
                  {t(`shops:gender.${value}`)}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField
          label={t('form.images')}
          hint={t('form.imagesHint', { max: MAX_SERVICE_IMAGES })}
          error={errors.images}
        >
          {(control) => (
            <input
              id={control.id}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              aria-invalid={control.invalid || undefined}
              aria-describedby={control['aria-describedby']}
              className={styles.file}
              disabled={uploading || saving}
              onChange={handleFile}
            />
          )}
        </FormField>
        {uploading && (
          <p role="status" className={styles.muted}>
            {t('form.uploading')}
          </p>
        )}
        {images.length > 0 && (
          <ul className={styles.images}>
            {images.map((url, index) => (
              <li key={url.slice(-40) + index} className={styles.imageItem}>
                <img src={url} alt={t('form.imageAlt', { number: index + 1 })} className={styles.thumb} />
                <Button variant="ghost" onClick={() => removeImage(index)} disabled={saving}>
                  {t('form.removeImage')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </form>
    </Modal>
  )
}

type DialogState = { service: Service | null } | null

interface PageData {
  services: Service[]
  offers: OwnerOffer[]
}

// Declared outside the component, so useAsync gets a stable function.
async function loadPage(): Promise<PageData> {
  const [services, offers] = await Promise.all([listServices(), listOffers()])
  return { services, offers }
}

function Content({ initial }: { initial: PageData }) {
  const { t } = useTranslation('ownerServices')
  const toast = useToast()
  const format = useFormats()
  const [list, setList] = useState(initial.services)
  const [offers, setOffers] = useState(initial.offers)
  const [showInactive, setShowInactive] = useState(true)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const activeCount = list.filter((service) => service.is_active).length
  const inactiveCount = list.length - activeCount
  const shown = showInactive ? list : list.filter((service) => service.is_active)

  function handleSaved(saved: Service, isNew: boolean) {
    setList((previous) =>
      isNew ? [saved, ...previous] : previous.map((item) => (item.id === saved.id ? saved : item)),
    )
    setDialog(null)
  }

  async function toggleActive(service: Service) {
    setBusyId(service.id)
    try {
      const saved = await setServiceActive(service.id, !service.is_active)
      setList((previous) => previous.map((item) => (item.id === saved.id ? saved : item)))
      toast.show({
        message: t(saved.is_active ? 'toast.activated' : 'toast.deactivated', { name: saved.name }),
        variant: 'success',
      })
    } catch {
      toast.show({ message: t('toast.saveFailed'), variant: 'danger' })
    } finally {
      setBusyId(null)
    }
  }

  const servicesPanel = (
    <div className={styles.panel}>
      <div className={styles.head}>
        <p className={styles.muted}>{t('intro')}</p>
        <Button onClick={() => setDialog({ service: null })}>{t('add')}</Button>
      </div>
      {list.length === 0 ? (
        <EmptyState
          title={t('emptyTitle')}
          description={t('emptyText')}
          action={<Button onClick={() => setDialog({ service: null })}>{t('add')}</Button>}
        />
      ) : (
        <>
          <div className={styles.toolbar}>
            <p className={styles.muted} role="status">
              {t('counts', { active: format.number(activeCount), inactive: format.number(inactiveCount) })}
            </p>
            {inactiveCount > 0 && (
              <Checkbox
                label={t('showInactive')}
                checked={showInactive}
                onChange={(event) => setShowInactive(event.target.checked)}
              />
            )}
          </div>

          {shown.length === 0 ? (
            <EmptyState title={t('noneShownTitle')} description={t('noneShownText')} />
          ) : (
            <ul className={styles.list}>
              {shown.map((service) => (
                <li key={service.id}>
                  <Card className={service.is_active ? '' : styles.inactive}>
                    <div className={styles.row}>
                      {service.image_urls[0] ? (
                        <img src={service.image_urls[0]} alt="" className={styles.thumb} />
                      ) : (
                        <span className={styles.thumbEmpty}>{t('noPicture')}</span>
                      )}
                      <div className={styles.details}>
                        <p className={styles.name}>{service.name}</p>
                        <div className={styles.badges}>
                          <Badge variant="neutral">{t(`shops:gender.${service.gender_category}`)}</Badge>
                          {!service.is_active && <Badge variant="warning">{t('inactive')}</Badge>}
                        </div>
                        <p className={styles.muted}>
                          <span className={styles.price}>{format.money(service.price_poisha)}</span>
                          {' · '}
                          {format.duration(service.duration_minutes)}
                          {service.image_urls.length > 0 &&
                            ` · ${t('pictures', { number: format.number(service.image_urls.length) })}`}
                        </p>
                      </div>
                      <div className={styles.actions}>
                        <Button
                          variant="secondary"
                          onClick={() => setDialog({ service })}
                          aria-label={t('editLabel', { name: service.name })}
                        >
                          {t('edit')}
                        </Button>
                        <Button
                          variant={service.is_active ? 'ghost' : 'secondary'}
                          loading={busyId === service.id}
                          onClick={() => toggleActive(service)}
                          aria-label={t(service.is_active ? 'deactivateLabel' : 'activateLabel', {
                            name: service.name,
                          })}
                        >
                          {t(service.is_active ? 'deactivate' : 'activate')}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.muted}>{t('deactivateNote')}</p>
        </>
      )}

    </div>
  )

  return (
    <>
      <h1 className={styles.title}>{t('title')}</h1>
      <Tabs
        label={t('tabs.label')}
        tabs={[
          { id: 'services', label: t('tabs.services'), content: servicesPanel },
          {
            id: 'offers',
            label: t('tabs.offers'),
            content: <OffersPanel offers={offers} services={list} onOffersChange={setOffers} />,
          },
        ]}
      />

      {dialog && (
        <ServiceDialog
          key={dialog.service?.id ?? 'new'}
          service={dialog.service}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}

// The layout provides the one <main>, so this page renders a <div>.
export default function ServicesPage() {
  const { t } = useTranslation('ownerServices')
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
