import { useEffect, useState } from 'react'
import type { ChangeEvent, SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, Checkbox, FormField, Input, Modal, Select, useToast } from '../../components/ui'
import type { BadgeVariant } from '../../components/ui'
import MapPicker from '../../components/MapPicker'
import type { MapPoint } from '../../components/MapPicker'
import {
  deleteDocument,
  getMyShop,
  saveMyShop,
  submitForApproval,
  uploadDocument,
} from '../../api/shop'
import type { ApprovalStatus, GenderCategory, ShopDocument, WorkingHour } from '../../api/shop'
import styles from './ShopSetupPage.module.css'

type LoadState = 'loading' | 'error' | 'ready'

interface FormErrors {
  name?: string
  address?: string
  phone?: string
  hours?: string
  location?: string
  licence?: string
}

const PHONE_PATTERN = /^(?:\+?88)?01[3-9]\d{8}$/
const GENDERS: GenderCategory[] = ['gents', 'ladies', 'unisex']
const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5] // Saturday first
const MAX_FILE_BYTES = 5 * 1024 * 1024
const FILE_TYPES: string[] = ['application/pdf', 'image/jpeg', 'image/png']

const STATUS_VARIANT: Record<ApprovalStatus, BadgeVariant> = {
  draft: 'neutral',
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  suspended: 'danger',
}

// OWN-02: shop setup and documents (FR-01.1)
export default function ShopSetupPage() {
  const { t, i18n } = useTranslation(['owner', 'common'])
  const toast = useToast()

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [area, setArea] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState<GenderCategory>('unisex')
  const [hours, setHours] = useState<WorkingHour[]>([])
  const [point, setPoint] = useState<MapPoint | null>(null)
  const [focusKey, setFocusKey] = useState(0)
  const [status, setStatus] = useState<ApprovalStatus>('draft')
  const [reason, setReason] = useState<string | null>(null)
  const [documents, setDocuments] = useState<ShopDocument[]>([])
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    getMyShop()
      .then((shop) => {
        if (cancelled) return
        setName(shop.name)
        setDescription(shop.description)
        setAddress(shop.address)
        setArea(shop.area)
        setPhone(shop.phone)
        setGender(shop.gender_category)
        setHours(shop.working_hours)
        setPoint(
          shop.latitude !== null && shop.longitude !== null
            ? { lat: shop.latitude, lng: shop.longitude }
            : null,
        )
        setStatus(shop.approval_status)
        setReason(shop.approval_reason)
        setDocuments(shop.documents)
        setLoadState('ready')
      })
      .catch(() => {
        if (!cancelled) setLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  // The form cannot be edited while the shop is under review or suspended.
  const locked = status === 'pending' || status === 'suspended'
  const canSubmit = status === 'draft' || status === 'rejected'
  const hasLicence = documents.some((doc) => doc.doc_type === 'trade_licence')
  const checklist = [
    { key: 'details', done: Boolean(name.trim() && address.trim() && PHONE_PATTERN.test(phone.trim())) },
    { key: 'pin', done: point !== null },
    { key: 'licence', done: hasLicence },
  ]
  const dateFormatter = new Intl.DateTimeFormat(i18n.language === 'bn' ? 'bn-BD' : 'en-GB', {
    dateStyle: 'medium',
  })

  function retry() {
    setLoadState('loading')
    setReloadKey((key) => key + 1)
  }

  function updateHour(weekday: number, change: Partial<WorkingHour>) {
    setHours((previous) =>
      previous.map((hour) => (hour.weekday === weekday ? { ...hour, ...change } : hour)),
    )
  }

  function locateMe() {
    if (!navigator.geolocation) {
      toast.show({ message: t('shop.locationUnavailable'), variant: 'warning' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPoint({ lat: position.coords.latitude, lng: position.coords.longitude })
        setFocusKey((key) => key + 1)
      },
      () => toast.show({ message: t('shop.locationDenied'), variant: 'warning' }),
    )
  }

  function validate(forSubmit: boolean): FormErrors {
    const found: FormErrors = {}

    if (!name.trim()) found.name = t('shop.nameRequired')
    if (!address.trim()) found.address = t('shop.addressRequired')
    if (!phone.trim()) found.phone = t('shop.phoneRequired')
    else if (!PHONE_PATTERN.test(phone.trim())) found.phone = t('shop.phoneInvalid')

    const openDays = hours.filter((hour) => !hour.is_closed)
    if (openDays.length === 0) {
      found.hours = t('shop.hoursNoDay')
    } else if (openDays.some((hour) => !hour.opens_at || !hour.closes_at || hour.opens_at >= hour.closes_at)) {
      found.hours = t('shop.hoursInvalid')
    }

    // The pin and the licence are only required when the owner submits for approval.
    if (forSubmit && !point) found.location = t('shop.locationRequired')
    if (forSubmit && !hasLicence) found.licence = t('shop.licenceRequired')
    return found
  }

  async function persist() {
    const saved = await saveMyShop({
      name: name.trim(),
      description: description.trim(),
      address: address.trim(),
      area: area.trim(),
      phone: phone.trim(),
      gender_category: gender,
      latitude: point ? point.lat : null,
      longitude: point ? point.lng : null,
      working_hours: hours,
    })
    setStatus(saved.approval_status)
    setReason(saved.approval_reason)
  }

  async function handleSave(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validate(false)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      await persist()
      toast.show({ message: t('shop.saved'), variant: 'success' })
    } catch {
      toast.show({ message: t('shop.saveFailed'), variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  function requestSubmit() {
    const found = validate(true)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setConfirmOpen(true)
  }

  async function confirmSubmit() {
    setSubmitting(true)
    try {
      await persist()
      const submitted = await submitForApproval()
      setStatus(submitted.approval_status)
      setReason(submitted.approval_reason)
      setConfirmOpen(false)
      toast.show({ message: t('shop.submitted'), variant: 'success' })
    } catch {
      toast.show({ message: t('shop.submitFailed'), variant: 'danger' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return
    input.value = '' // lets the owner pick the same file again later

    if (!FILE_TYPES.includes(file.type)) {
      setErrors((previous) => ({ ...previous, licence: t('shop.fileType') }))
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setErrors((previous) => ({ ...previous, licence: t('shop.fileTooBig') }))
      return
    }

    setErrors((previous) => ({ ...previous, licence: undefined }))
    setUploading(true)
    try {
      const document = await uploadDocument(file)
      setDocuments((previous) => [...previous, document])
      toast.show({ message: t('shop.uploaded'), variant: 'success' })
    } catch {
      toast.show({ message: t('shop.uploadFailed'), variant: 'danger' })
    } finally {
      setUploading(false)
    }
  }

  async function removeDocument(id: string) {
    try {
      await deleteDocument(id)
      setDocuments((previous) => previous.filter((doc) => doc.id !== id))
      toast.show({ message: t('shop.removed'), variant: 'info' })
    } catch {
      toast.show({ message: t('shop.removeFailed'), variant: 'danger' })
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t('shop.title')}</h1>

      {loadState === 'loading' && (
        <p className={styles.status} role="status">
          {t('common:states.loading')}
        </p>
      )}

      {loadState === 'error' && (
        <>
          <p className={styles.status} role="alert">
            {t('common:states.error')}
          </p>
          <div>
            <Button variant="secondary" onClick={retry}>
              {t('common:actions.retry')}
            </Button>
          </div>
        </>
      )}

      {loadState === 'ready' && (
        <>
          <Card as="section" role="status">
            <div className={styles.bannerHead}>
              <Badge variant={STATUS_VARIANT[status]}>{t(`shop.status.${status}.label`)}</Badge>
              <h2 className={styles.bannerTitle}>{t(`shop.status.${status}.title`)}</h2>
            </div>
            <p className={styles.text}>{t(`shop.status.${status}.body`)}</p>
            {reason && (status === 'rejected' || status === 'suspended') && (
              <p className={styles.reason}>
                <strong>{t('shop.reasonLabel')}</strong> {reason}
              </p>
            )}
            {canSubmit && (
              <>
                <h3 className={styles.checklistTitle}>{t('shop.checklistTitle')}</h3>
                <ul className={styles.checklist}>
                  {checklist.map((item) => (
                    <li key={item.key} className={item.done ? styles.done : styles.todo}>
                      <span aria-hidden="true">{item.done ? '✓' : '○'}</span> {t(`shop.check.${item.key}`)}
                      <span className={styles.srOnly}>
                        {' '}
                        {item.done ? t('shop.check.done') : t('shop.check.todo')}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          <form className={styles.form} onSubmit={handleSave} noValidate>
            <fieldset className={styles.fieldset} disabled={locked}>
              <Card as="section">
                <h2 className={styles.sectionTitle}>{t('shop.detailsTitle')}</h2>
                <div className={styles.stack}>
                  <FormField label={t('shop.name')} error={errors.name} required>
                    {(control) => (
                      <Input
                        {...control}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="organization"
                      />
                    )}
                  </FormField>

                  <FormField label={t('shop.description')} hint={t('shop.descriptionHint')}>
                    {(control) => (
                      <textarea
                        id={control.id}
                        aria-describedby={control['aria-describedby']}
                        className={styles.textarea}
                        rows={4}
                        maxLength={500}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    )}
                  </FormField>

                  <FormField label={t('shop.address')} error={errors.address} required>
                    {(control) => (
                      <Input
                        {...control}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        autoComplete="street-address"
                      />
                    )}
                  </FormField>

                  <FormField label={t('shop.area')} hint={t('shop.areaHint')}>
                    {(control) => (
                      <Input {...control} value={area} onChange={(e) => setArea(e.target.value)} />
                    )}
                  </FormField>

                  <FormField label={t('shop.phone')} error={errors.phone} required>
                    {(control) => (
                      <Input
                        {...control}
                        type="tel"
                        inputMode="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        autoComplete="tel"
                      />
                    )}
                  </FormField>

                  <FormField label={t('shop.genderLabel')} required>
                    {(control) => (
                      <Select
                        {...control}
                        value={gender}
                        onChange={(e) => setGender(e.target.value as GenderCategory)}
                      >
                        {GENDERS.map((value) => (
                          <option key={value} value={value}>
                            {t(`shop.gender.${value}`)}
                          </option>
                        ))}
                      </Select>
                    )}
                  </FormField>
                </div>
              </Card>

              <Card as="section">
                <h2 className={styles.sectionTitle}>{t('shop.hoursTitle')}</h2>
                <p className={styles.hint}>{t('shop.hoursHint')}</p>
                {WEEK_ORDER.map((weekday) => {
                  const hour = hours.find((item) => item.weekday === weekday)
                  if (!hour) return null
                  const day = t(`shop.days.${weekday}`)
                  return (
                    <div key={weekday} className={styles.hourRow}>
                      <span className={styles.day}>{day}</span>
                      <div className={styles.closedBox}>
                        <Checkbox
                          label={t('shop.closed')}
                          checked={hour.is_closed}
                          onChange={(e) => updateHour(weekday, { is_closed: e.target.checked })}
                        />
                      </div>
                      <Input
                        type="time"
                        aria-label={`${day}: ${t('shop.opens')}`}
                        value={hour.opens_at}
                        disabled={hour.is_closed}
                        onChange={(e) => updateHour(weekday, { opens_at: e.target.value })}
                      />
                      <Input
                        type="time"
                        aria-label={`${day}: ${t('shop.closes')}`}
                        value={hour.closes_at}
                        disabled={hour.is_closed}
                        onChange={(e) => updateHour(weekday, { closes_at: e.target.value })}
                      />
                    </div>
                  )
                })}
                {errors.hours && (
                  <p className={styles.error} role="alert">
                    {errors.hours}
                  </p>
                )}
              </Card>

              <Card as="section">
                <h2 className={styles.sectionTitle}>{t('shop.locationTitle')}</h2>
                <p className={styles.hint}>{t('shop.locationHint')}</p>
                <MapPicker
                  value={point}
                  onChange={setPoint}
                  label={t('shop.mapLabel')}
                  disabled={locked}
                  focusKey={focusKey}
                />
                <div className={styles.locationRow}>
                  <p className={styles.coords}>
                    {point
                      ? t('shop.coordinates', { lat: point.lat.toFixed(5), lng: point.lng.toFixed(5) })
                      : t('shop.noPin')}
                  </p>
                  <Button variant="secondary" onClick={locateMe}>
                    {t('shop.useMyLocation')}
                  </Button>
                </div>
                {errors.location && (
                  <p className={styles.error} role="alert">
                    {errors.location}
                  </p>
                )}
              </Card>

              <Card as="section">
                <h2 className={styles.sectionTitle}>{t('shop.documentsTitle')}</h2>
                <p className={styles.hint}>{t('shop.documentsHint')}</p>
                <FormField label={t('shop.tradeLicence')} error={errors.licence} required>
                  {(control) => (
                    <input
                      id={control.id}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      required={control.required}
                      aria-invalid={control.invalid || undefined}
                      aria-describedby={control['aria-describedby']}
                      className={styles.file}
                      disabled={uploading}
                      onChange={handleFile}
                    />
                  )}
                </FormField>
                {uploading && (
                  <p className={styles.status} role="status">
                    {t('common:states.loading')}
                  </p>
                )}
                {documents.length === 0 ? (
                  <p className={styles.status}>{t('shop.noDocuments')}</p>
                ) : (
                  <ul className={styles.docList}>
                    {documents.map((doc) => (
                      <li key={doc.id} className={styles.docItem}>
                        <div>
                          <span className={styles.docName}>{doc.file_name}</span>
                          <span className={styles.docMeta}>
                            {dateFormatter.format(new Date(doc.uploaded_at))}
                          </span>
                        </div>
                        <Button variant="ghost" onClick={() => removeDocument(doc.id)}>
                          {t('shop.remove')}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <div className={styles.actions}>
                <Button type="submit" variant="secondary" loading={saving}>
                  {t('shop.save')}
                </Button>
                {canSubmit && (
                  <Button onClick={requestSubmit}>{t('shop.submit')}</Button>
                )}
              </div>
            </fieldset>
          </form>

          <Modal
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            title={t('shop.submitTitle')}
            closeLabel={t('common:actions.close')}
            footer={
              <>
                <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
                  {t('common:actions.cancel')}
                </Button>
                <Button onClick={confirmSubmit} loading={submitting}>
                  {t('shop.submitConfirm')}
                </Button>
              </>
            }
          >
            <p className={styles.text}>{t('shop.submitBody')}</p>
          </Modal>
        </>
      )}
    </div>
  )
}
