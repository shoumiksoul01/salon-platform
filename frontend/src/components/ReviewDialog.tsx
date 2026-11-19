import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, FormField, Modal, useToast } from './ui'
import { submitReview } from '../api/bookings'
import type { MyBooking } from '../api/bookings'
import styles from './BookingDialogs.module.css'

// Review a finished visit (FR-08.1). Open it by passing a booking; pass null to close it.
// The stars are real radio buttons, so the keyboard and screen readers work without extra code.
interface DialogProps {
  booking: MyBooking | null
  onClose: () => void
  onDone: (updated: MyBooking) => void
}

const STARS = [1, 2, 3, 4, 5]

function Form({ booking, onClose, onDone }: { booking: MyBooking; onClose: () => void; onDone: DialogProps['onDone'] }) {
  const { t } = useTranslation(['customer', 'common'])
  const toast = useToast()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit() {
    if (rating === 0) {
      setError(t('bookings.dialogs.review.ratingRequired'))
      return
    }
    setError(null)
    setBusy(true)
    try {
      const updated = await submitReview(booking.id, rating, comment.trim())
      toast.show({ message: t('bookings.dialogs.review.done'), variant: 'success' })
      onDone(updated)
    } catch {
      toast.show({ message: t('bookings.dialogs.failed'), variant: 'danger' })
      setBusy(false)
    }
  }

  return (
    <>
      <p className={styles.lead}>{booking.shop_name}</p>
      <p className={styles.line}>{booking.service_names.join(', ')}</p>

      <div className={styles.stack}>
        <fieldset className={styles.stars}>
          <legend className={styles.starsLegend}>{t('bookings.dialogs.review.ratingLabel')}</legend>
          {STARS.map((n) => (
            <label key={n} className={`${styles.star} ${n <= rating ? styles.starOn : ''}`}>
              <input
                type="radio"
                name="rating"
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                className={styles.srOnly}
              />
              <span aria-hidden="true">★</span>
              <span className={styles.srOnly}>{t('bookings.dialogs.review.stars', { rating: n })}</span>
            </label>
          ))}
        </fieldset>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <FormField label={t('bookings.dialogs.review.commentLabel')} hint={t('bookings.dialogs.review.commentHint')}>
          {(control) => (
            <textarea
              id={control.id}
              aria-describedby={control['aria-describedby']}
              className={styles.textarea}
              rows={4}
              maxLength={500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          )}
        </FormField>
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          {t('common:actions.cancel')}
        </Button>
        <Button onClick={handleSubmit} loading={busy}>
          {t('bookings.dialogs.review.submit')}
        </Button>
      </div>
    </>
  )
}

export default function ReviewDialog({ booking, onClose, onDone }: DialogProps) {
  const { t } = useTranslation(['customer', 'common'])
  return (
    <Modal
      open={booking !== null}
      onClose={onClose}
      title={t('bookings.dialogs.review.title')}
      closeLabel={t('common:actions.close')}
    >
      {booking && <Form booking={booking} onClose={onClose} onDone={onDone} />}
    </Modal>
  )
}
