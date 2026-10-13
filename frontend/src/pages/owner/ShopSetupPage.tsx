import { useEffect, useState } from 'react'
import type { SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, Checkbox, FormField, Input, Select, useToast } from '../../components/ui'
import MapPicker from '../../components/MapPicker'
import type { MapPoint } from '../../components/MapPicker'
import { getMyShop, saveMyShop } from '../../api/shop'
import type { ApprovalStatus, GenderCategory, WorkingHour } from '../../api/shop'
import styles from './ShopSetupPage.module.css'

type LoadState = 'loading' | 'error' | 'ready'

interface FormErrors {
  name?: string
  address?: string
  phone?: string
  hours?: string
  location?: string
}

const PHONE_PATTERN = /^(?:\+?88)?01[3-9]\d{8}$/
const GENDERS: GenderCategory[] = ['gents', 'ladies', 'unisex']
const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5] // Saturday first

// OWN-02: shop setup and documents (FR-01.1)
export default function ShopSetupPage() {
  const { t } = useTranslation(['owner', 'common'])
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
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)

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

  return (
    <main className={styles.page}>
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

              <div className={styles.actions}>
                <Button type="submit" variant="secondary" loading={saving}>
                  {t('shop.save')}
                </Button>
              </div>
            </fieldset>
          </form>
        </>
      )}
    </main>
  )
}
