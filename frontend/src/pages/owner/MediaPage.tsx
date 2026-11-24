import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
  Modal,
  Skeleton,
  useToast,
} from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import {
  ALT_MAX,
  MAX_PHOTOS,
  MediaError,
  TOUR_URL_MAX,
  addShopImage,
  getOwnerMedia,
  moveImage,
  removeImage,
  saveTourUrl,
  updateImageAlt,
} from '../../api/ownerMedia'
import type { OwnerMedia, ShopImage } from '../../api/ownerMedia'
import styles from './MediaPage.module.css'

// OWN-04: owner photos and virtual tour (FR-01.4).
// Photos: add (JPG, PNG or WebP, 2 MB), edit the description, move earlier or later, remove.
// The first photo is the cover. The tour is one https link (or none).

const ADD_FORM_ID = 'media-add-form'
const ALT_FORM_ID = 'media-alt-form'

function useFormats() {
  const { i18n } = useTranslation('ownerMedia')
  const locale = i18n.language.startsWith('bn') ? 'bn-BD' : 'en-GB'
  const numberFormat = new Intl.NumberFormat(locale)
  return { number: (value: number) => numberFormat.format(value) }
}

function Loading({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={styles.loading}>
      {[1, 2].map((n) => (
        <Card key={n}>
          <Skeleton width="50%" />
          <Skeleton width="30%" />
        </Card>
      ))}
    </div>
  )
}

// Maps an error from the API to the translation key of its message.
function errorKey(error: unknown): string {
  return error instanceof MediaError ? `errors.${error.code}` : 'errors.failed'
}

interface AddDialogProps {
  onClose: () => void
  onDone: (media: OwnerMedia) => void
}

function AddPhotoDialog({ onClose, onDone }: AddDialogProps) {
  const { t } = useTranslation('ownerMedia')
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [alt, setAlt] = useState('')
  const [errors, setErrors] = useState<Partial<Record<'file' | 'alt', string>>>({})
  const [saving, setSaving] = useState(false)

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.currentTarget.files?.[0] ?? null)
    setErrors((previous) => ({ ...previous, file: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) {
      setErrors({ file: t('add.fileRequired') })
      return
    }
    if (alt.trim().length > ALT_MAX) {
      setErrors({ alt: t('errors.alt_too_long', { max: ALT_MAX }) })
      return
    }
    setErrors({})
    setSaving(true)
    try {
      const media = await addShopImage(file, alt)
      toast.show({ message: t('toast.added'), variant: 'success' })
      onDone(media)
    } catch (error) {
      setSaving(false)
      const key = errorKey(error)
      const message = t(key, { max: ALT_MAX, maxPhotos: MAX_PHOTOS })
      if (error instanceof MediaError && error.code === 'alt_too_long') {
        setErrors({ alt: message })
      } else if (error instanceof MediaError && error.code !== 'not_found') {
        setErrors({ file: message })
      } else {
        toast.show({ message, variant: 'danger' })
      }
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('add.title')}
      closeLabel={t('common:actions.close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" form={ADD_FORM_ID} loading={saving}>
            {t('add.submit')}
          </Button>
        </>
      }
    >
      <form id={ADD_FORM_ID} className={styles.form} onSubmit={handleSubmit} noValidate>
        <FormField
          label={t('add.file')}
          hint={t('add.fileHint', { max: 2 })}
          error={errors.file}
          required
        >
          {(control) => (
            <input
              id={control.id}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              aria-invalid={control.invalid || undefined}
              aria-describedby={control['aria-describedby']}
              className={styles.file}
              disabled={saving}
              onChange={handleFile}
            />
          )}
        </FormField>

        <FormField label={t('add.alt')} hint={t('add.altHint', { max: ALT_MAX })} error={errors.alt}>
          {(control) => (
            <Input
              {...control}
              value={alt}
              maxLength={ALT_MAX}
              autoComplete="off"
              onChange={(event) => setAlt(event.target.value)}
            />
          )}
        </FormField>
      </form>
    </Modal>
  )
}

interface AltDialogProps {
  image: ShopImage
  onClose: () => void
  onDone: (media: OwnerMedia) => void
}

function AltDialog({ image, onClose, onDone }: AltDialogProps) {
  const { t } = useTranslation('ownerMedia')
  const toast = useToast()
  const [alt, setAlt] = useState(image.alt_text)
  const [error, setError] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (alt.trim().length > ALT_MAX) {
      setError(t('errors.alt_too_long', { max: ALT_MAX }))
      return
    }
    setError(undefined)
    setSaving(true)
    try {
      const media = await updateImageAlt(image.id, alt)
      toast.show({ message: t('toast.altSaved'), variant: 'success' })
      onDone(media)
    } catch (caught) {
      setSaving(false)
      toast.show({ message: t(errorKey(caught), { max: ALT_MAX }), variant: 'danger' })
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('alt.title')}
      closeLabel={t('common:actions.close')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" form={ALT_FORM_ID} loading={saving}>
            {t('common:actions.save')}
          </Button>
        </>
      }
    >
      <form id={ALT_FORM_ID} className={styles.form} onSubmit={handleSubmit} noValidate>
        <img src={image.url} alt="" className={styles.photo} />
        <FormField label={t('add.alt')} hint={t('add.altHint', { max: ALT_MAX })} error={error}>
          {(control) => (
            <Input
              {...control}
              value={alt}
              maxLength={ALT_MAX}
              autoComplete="off"
              onChange={(event) => setAlt(event.target.value)}
            />
          )}
        </FormField>
      </form>
    </Modal>
  )
}

interface TourProps {
  tourUrl: string | null
  onSaved: (url: string | null) => void
}

function TourSection({ tourUrl, onSaved }: TourProps) {
  const { t } = useTranslation('ownerMedia')
  const toast = useToast()
  const [value, setValue] = useState(tourUrl ?? '')
  const [error, setError] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  const changed = value.trim() !== (tourUrl ?? '')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)
    setSaving(true)
    try {
      const saved = await saveTourUrl(value)
      setValue(saved ?? '')
      onSaved(saved)
      toast.show({ message: t(saved ? 'toast.tourSaved' : 'toast.tourRemoved'), variant: 'success' })
    } catch (caught) {
      if (caught instanceof MediaError && caught.code === 'bad_url') {
        setError(t('errors.bad_url', { urlMax: TOUR_URL_MAX }))
      } else {
        toast.show({ message: t('errors.failed'), variant: 'danger' })
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    try {
      await saveTourUrl('')
      setValue('')
      setError(undefined)
      onSaved(null)
      toast.show({ message: t('toast.tourRemoved'), variant: 'success' })
    } catch {
      toast.show({ message: t('errors.failed'), variant: 'danger' })
    } finally {
      setRemoving(false)
    }
  }

  return (
    <section className={styles.section} aria-labelledby="media-tour-heading">
      <h2 id="media-tour-heading" className={styles.subtitle}>
        {t('tour.title')}
      </h2>
      <p className={styles.muted}>{t('tour.intro')}</p>
      <Card>
        <form className={styles.tourForm} onSubmit={handleSubmit} noValidate>
          <FormField label={t('tour.label')} hint={t('tour.hint')} error={error}>
            {(control) => (
              <Input
                {...control}
                type="url"
                value={value}
                maxLength={TOUR_URL_MAX}
                inputMode="url"
                autoComplete="off"
                onChange={(event) => setValue(event.target.value)}
              />
            )}
          </FormField>
          {tourUrl && (
            <p className={styles.muted}>
              {t('tour.current')}{' '}
              <a href={tourUrl} target="_blank" rel="noopener noreferrer" className={styles.tourLink}>
                {t('tour.open')}
              </a>
            </p>
          )}
          <div className={styles.actions}>
            <Button type="submit" loading={saving} disabled={!changed || removing}>
              {t('common:actions.save')}
            </Button>
            {tourUrl && (
              <Button variant="ghost" onClick={handleRemove} loading={removing} disabled={saving}>
                {t('tour.remove')}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </section>
  )
}

type DialogState =
  | { kind: 'add' }
  | { kind: 'alt'; image: ShopImage }
  | { kind: 'remove'; image: ShopImage }
  | null

function Content({ initial }: { initial: OwnerMedia }) {
  const { t } = useTranslation('ownerMedia')
  const toast = useToast()
  const format = useFormats()
  const [images, setImages] = useState(initial.images)
  const [tourUrl, setTourUrl] = useState(initial.tour_url)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  const [note, setNote] = useState('')

  const full = images.length >= MAX_PHOTOS

  function handleChanged(media: OwnerMedia) {
    setImages(media.images)
    setDialog(null)
    setNote('')
  }

  async function handleMove(image: ShopImage, direction: -1 | 1) {
    setBusyId(image.id)
    try {
      const media = await moveImage(image.id, direction)
      setImages(media.images)
      const position = media.images.findIndex((item) => item.id === image.id) + 1
      setNote(t('photo.moved', { position: format.number(position) }))
    } catch (error) {
      toast.show({ message: t(errorKey(error)), variant: 'danger' })
    } finally {
      setBusyId(null)
    }
  }

  async function handleRemove(image: ShopImage) {
    setRemoving(true)
    try {
      const media = await removeImage(image.id)
      setImages(media.images)
      setDialog(null)
      setNote('')
      toast.show({ message: t('toast.removed'), variant: 'success' })
    } catch (error) {
      toast.show({ message: t(errorKey(error)), variant: 'danger' })
    } finally {
      setRemoving(false)
    }
  }

  return (
    <>
      <h1 className={styles.title}>{t('title')}</h1>

      <section className={styles.section} aria-labelledby="media-photos-heading">
        <div className={styles.head}>
          <div>
            <h2 id="media-photos-heading" className={styles.subtitle}>
              {t('photos.title')}
            </h2>
            <p className={styles.muted}>{t('photos.intro')}</p>
          </div>
          <Button onClick={() => setDialog({ kind: 'add' })} disabled={full}>
            {t('photos.add')}
          </Button>
        </div>

        <p className={styles.muted} role="status">
          {note ||
            t('photos.count', {
              number: format.number(images.length),
              max: format.number(MAX_PHOTOS),
            })}
        </p>
        {full && <p className={styles.muted}>{t('photos.full', { max: format.number(MAX_PHOTOS) })}</p>}

        {images.length === 0 ? (
          <EmptyState
            title={t('photos.emptyTitle')}
            description={t('photos.emptyText')}
            action={<Button onClick={() => setDialog({ kind: 'add' })}>{t('photos.add')}</Button>}
          />
        ) : (
          <ul className={styles.grid}>
            {images.map((image, index) => {
              const number = format.number(index + 1)
              const busy = busyId === image.id
              return (
                <li key={image.id}>
                  <Card>
                    <div className={styles.card}>
                      <img
                        src={image.url}
                        alt={image.alt_text || t('photo.altFallback', { number })}
                        className={styles.photo}
                      />
                      <div className={styles.meta}>
                        <span className={styles.muted}>{t('photo.position', { number })}</span>
                        {index === 0 && <Badge variant="neutral">{t('photo.cover')}</Badge>}
                      </div>
                      <p className={image.alt_text ? styles.alt : styles.muted}>
                        {image.alt_text || t('photo.noDescription')}
                      </p>
                      <div className={styles.actions}>
                        <Button
                          variant="secondary"
                          onClick={() => handleMove(image, -1)}
                          disabled={index === 0 || busyId !== null}
                          loading={busy}
                          aria-label={t('photo.earlierLabel', { number })}
                        >
                          {t('photo.earlier')}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => handleMove(image, 1)}
                          disabled={index === images.length - 1 || busyId !== null}
                          aria-label={t('photo.laterLabel', { number })}
                        >
                          {t('photo.later')}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => setDialog({ kind: 'alt', image })}
                          aria-label={t('photo.editLabel', { number })}
                        >
                          {t('photo.edit')}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setDialog({ kind: 'remove', image })}
                          aria-label={t('photo.removeLabel', { number })}
                        >
                          {t('photo.remove')}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <TourSection tourUrl={tourUrl} onSaved={setTourUrl} />

      {dialog?.kind === 'add' && (
        <AddPhotoDialog onClose={() => setDialog(null)} onDone={handleChanged} />
      )}
      {dialog?.kind === 'alt' && (
        <AltDialog
          key={dialog.image.id}
          image={dialog.image}
          onClose={() => setDialog(null)}
          onDone={handleChanged}
        />
      )}
      {dialog?.kind === 'remove' && (
        <Modal
          open
          onClose={() => setDialog(null)}
          title={t('remove.title')}
          closeLabel={t('common:actions.close')}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialog(null)} disabled={removing}>
                {t('common:actions.cancel')}
              </Button>
              <Button variant="danger" onClick={() => handleRemove(dialog.image)} loading={removing}>
                {t('remove.confirm')}
              </Button>
            </>
          }
        >
          <p>{t('remove.text')}</p>
        </Modal>
      )}
    </>
  )
}

// The layout provides the one <main>, so this page renders a <div>.
export default function MediaPage() {
  const { t } = useTranslation('ownerMedia')
  const { state, retry } = useAsync(getOwnerMedia)

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
