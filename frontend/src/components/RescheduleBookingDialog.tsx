import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, FormField, Modal, Select, Skeleton, useToast } from './ui'
import { listRescheduleOptions, rescheduleBooking } from '../api/bookings'
import type { MyBooking, RescheduleOption } from '../api/bookings'
import { useBookingFormat } from '../hooks/useBookingFormat'
import styles from './BookingDialogs.module.css'

// Move a booking to another free time (FR-04.3). Open it by passing a booking; pass null to close it.
// The days and times come from the server, which knows the staff member's hours, breaks and bookings.
interface DialogProps {
  booking: MyBooking | null
  onClose: () => void
  onDone: (updated: MyBooking) => void
}

function Form({ booking, onClose, onDone }: { booking: MyBooking; onClose: () => void; onDone: DialogProps['onDone'] }) {
  const { t } = useTranslation(['customer', 'common'])
  const toast = useToast()
  const format = useBookingFormat()

  // null = loading, 'error' = could not load
  const [options, setOptions] = useState<RescheduleOption[] | 'error' | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [chosenDay, setChosenDay] = useState<string | null>(null)
  const [slot, setSlot] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    listRescheduleOptions(booking.id)
      .then((result) => {
        if (active) setOptions(result)
      })
      .catch(() => {
        if (active) setOptions('error')
      })
    return () => {
      active = false
    }
  }, [booking.id, attempt])

  function reload() {
    setOptions(null)
    setSlot(null)
    setAttempt((value) => value + 1)
  }

  async function handleMove() {
    if (!slot) return
    setBusy(true)
    setMessage(null)
    try {
      const updated = await rescheduleBooking(booking.id, slot)
      toast.show({
        message: t('bookings.dialogs.reschedule.done', { when: format.dateTime(slot) }),
        variant: 'success',
      })
      onDone(updated)
    } catch (error) {
      if (error instanceof Error && error.message === 'slot_taken') {
        setMessage(t('bookings.dialogs.reschedule.slotTaken'))
        reload()
      } else {
        toast.show({ message: t('bookings.dialogs.failed'), variant: 'danger' })
      }
      setBusy(false)
    }
  }

  const days = Array.isArray(options) ? options : []
  const selectedDay = chosenDay ?? days[0]?.date ?? null
  const slots = days.find((day) => day.date === selectedDay)?.slots ?? []

  return (
    <>
      <p className={styles.lead}>
        {booking.shop_name} · {format.dateTime(booking.starts_at)}
      </p>
      <p className={styles.line}>{t('bookings.dialogs.reschedule.intro')}</p>

      {options === null && (
        <div role="status" aria-busy="true" aria-label={t('bookings.dialogs.reschedule.loading')}>
          <Skeleton width="50%" height="2.5rem" />
        </div>
      )}

      {options === 'error' && (
        <>
          <p className={styles.error} role="alert">
            {t('common:states.error')}
          </p>
          <Button variant="secondary" onClick={reload}>
            {t('common:actions.retry')}
          </Button>
        </>
      )}

      {Array.isArray(options) && options.length === 0 && (
        <p className={styles.note}>{t('bookings.dialogs.reschedule.noSlots')}</p>
      )}

      {Array.isArray(options) && options.length > 0 && (
        <div className={styles.stack}>
          <FormField label={t('bookings.dialogs.reschedule.dayLabel')}>
            {(control) => (
              <Select
                {...control}
                value={selectedDay ?? ''}
                onChange={(e) => {
                  setChosenDay(e.target.value)
                  setSlot(null)
                }}
              >
                {options.map((day) => (
                  <option key={day.date} value={day.date}>
                    {format.day(day.date)}
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          <div role="group" aria-labelledby="reschedule-times-label">
            <p id="reschedule-times-label" className={styles.slotsLabel}>
              {t('bookings.dialogs.reschedule.timesLabel')}
            </p>
            <div className={styles.slots}>
              {slots.map((start) => (
                <Button
                  key={start}
                  variant={slot === start ? 'primary' : 'secondary'}
                  aria-pressed={slot === start}
                  onClick={() => setSlot(start)}
                >
                  {format.time(start)}
                </Button>
              ))}
            </div>
          </div>

          {slot && (
            <p className={styles.note}>
              {t('bookings.dialogs.reschedule.newTime', {
                when: format.dateTime(slot),
              })}
              {booking.status === 'confirmed' && ` ${t('bookings.dialogs.reschedule.reconfirm')}`}
            </p>
          )}
        </div>
      )}

      {message && (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          {t('bookings.dialogs.keepTime')}
        </Button>
        <Button onClick={handleMove} loading={busy} disabled={!slot}>
          {t('bookings.dialogs.reschedule.confirm')}
        </Button>
      </div>
    </>
  )
}

export default function RescheduleBookingDialog({ booking, onClose, onDone }: DialogProps) {
  const { t } = useTranslation(['customer', 'common'])
  return (
    <Modal
      open={booking !== null}
      onClose={onClose}
      title={t('bookings.dialogs.reschedule.title')}
      closeLabel={t('common:actions.close')}
    >
      {booking && <Form booking={booking} onClose={onClose} onDone={onDone} />}
    </Modal>
  )
}
