import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Modal, useToast } from './ui'
import { confirmArrival } from '../api/bookings'
import type { MyBooking } from '../api/bookings'
import { useBookingFormat } from '../hooks/useBookingFormat'
import styles from './BookingDialogs.module.css'

// "Confirm I'm coming" (FR-05.2). Open it by passing a booking; pass null to close it.
interface DialogProps {
  booking: MyBooking | null
  onClose: () => void
  onDone: (updated: MyBooking) => void
}

function Form({ booking, onClose, onDone }: { booking: MyBooking; onClose: () => void; onDone: DialogProps['onDone'] }) {
  const { t } = useTranslation(['customer', 'common'])
  const toast = useToast()
  const format = useBookingFormat()
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    setBusy(true)
    try {
      const updated = await confirmArrival(booking.id)
      toast.show({ message: t('bookings.dialogs.confirm.done'), variant: 'success' })
      onDone(updated)
    } catch {
      toast.show({ message: t('bookings.dialogs.failed'), variant: 'danger' })
      setBusy(false)
    }
  }

  return (
    <>
      <p className={styles.lead}>
        {t('bookings.dialogs.confirm.text', { shop: booking.shop_name, when: format.dateTime(booking.starts_at) })}
      </p>
      <p className={styles.note}>{t('bookings.dialogs.confirm.note')}</p>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          {t('bookings.dialogs.notYet')}
        </Button>
        <Button onClick={handleConfirm} loading={busy}>
          {t('bookings.dialogs.confirm.yes')}
        </Button>
      </div>
    </>
  )
}

export default function ConfirmArrivalDialog({ booking, onClose, onDone }: DialogProps) {
  const { t } = useTranslation(['customer', 'common'])
  return (
    <Modal
      open={booking !== null}
      onClose={onClose}
      title={t('bookings.dialogs.confirm.title')}
      closeLabel={t('common:actions.close')}
    >
      {booking && <Form booking={booking} onClose={onClose} onDone={onDone} />}
    </Modal>
  )
}
