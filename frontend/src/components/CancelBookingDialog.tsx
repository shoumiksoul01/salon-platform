import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, FormField, Modal, Select, useToast } from './ui'
import { cancelBooking } from '../api/bookings'
import type { MyBooking } from '../api/bookings'
import { useBookingFormat } from '../hooks/useBookingFormat'
import styles from './BookingDialogs.module.css'

// Cancel a booking (FR-04.3). Open it by passing a booking; pass null to close it.
// The refund text comes from the booking itself (refund_on_cancel_poisha), so the rules
// stay on the server side.
interface DialogProps {
  booking: MyBooking | null
  onClose: () => void
  onDone: (updated: MyBooking) => void
}

const REASONS = ['plans', 'time', 'sick', 'other'] as const

function Form({ booking, onClose, onDone }: { booking: MyBooking; onClose: () => void; onDone: DialogProps['onDone'] }) {
  const { t } = useTranslation(['customer', 'common'])
  const toast = useToast()
  const format = useBookingFormat()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const refund = booking.refund_on_cancel_poisha

  async function handleCancel() {
    setBusy(true)
    try {
      const updated = await cancelBooking(booking.id, reason)
      toast.show({
        message:
          refund > 0
            ? t('bookings.dialogs.cancel.doneRefund', { amount: format.money(refund) })
            : t('bookings.dialogs.cancel.done'),
        variant: 'success',
      })
      onDone(updated)
    } catch {
      toast.show({ message: t('bookings.dialogs.failed'), variant: 'danger' })
      setBusy(false)
    }
  }

  return (
    <>
      <p className={styles.lead}>
        {booking.shop_name} · {format.dateTime(booking.starts_at)}
      </p>
      <p className={styles.line}>{booking.service_names.join(', ')}</p>
      <p className={styles.note}>
        {refund > 0
          ? t('bookings.dialogs.cancel.refund', {
              amount: format.money(refund),
              method: t(`bookings.method.${booking.payment_method}`),
            })
          : t('bookings.dialogs.cancel.nothingPaid')}
      </p>

      <div className={styles.stack}>
        <FormField label={t('bookings.dialogs.cancel.reasonLabel')}>
          {(control) => (
            <Select {...control} value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">{t('bookings.dialogs.cancel.reasonPlaceholder')}</option>
              {REASONS.map((code) => (
                <option key={code} value={code}>
                  {t(`bookings.dialogs.cancel.reasons.${code}`)}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          {t('bookings.dialogs.keep')}
        </Button>
        <Button variant="danger" onClick={handleCancel} loading={busy}>
          {t('bookings.dialogs.cancel.confirm')}
        </Button>
      </div>
    </>
  )
}

export default function CancelBookingDialog({ booking, onClose, onDone }: DialogProps) {
  const { t } = useTranslation(['customer', 'common'])
  return (
    <Modal
      open={booking !== null}
      onClose={onClose}
      title={t('bookings.dialogs.cancel.title')}
      closeLabel={t('common:actions.close')}
    >
      {booking && <Form booking={booking} onClose={onClose} onDone={onDone} />}
    </Modal>
  )
}
