import { useState } from 'react'
import { Button, Card } from '../../components/ui'
import QueueEntryCard from '../../components/QueueEntryCard'
import StatusBadge from '../../components/StatusBadge'
import WeekScheduleEditor from '../../components/WeekScheduleEditor'
import type { ScheduleBreak, ScheduleTimeOff } from '../../components/WeekScheduleEditor'
import { services } from '../../mocks/shops'
import {
  DEMO_CUSTOMER_ID,
  DEMO_SHOP_ID,
  DEMO_STAFF_ID,
  queueEntries,
  staffBreaks,
  staffHours,
  staffMembers,
  staffTimeOff,
} from '../../mocks/bookings'
import type { BookingStatus, PaymentStatus, QueueStatus } from '../../mocks/bookings'
import styles from './ComponentsPreview.module.css'

// Dev only (route /owner/dev/components, see routes/owner.tsx). It shows the shared components
// from UI-SM-05, 06 and 07 with the fixtures, so you can try them before a real page uses them.
// Switch the language in the menu to check the Bengali text too.
const BOOKING_STATUSES: BookingStatus[] = [
  'pending',
  'confirmed',
  'arrived',
  'in_service',
  'completed',
  'cancelled',
  'no_show',
]
const QUEUE_STATUSES: QueueStatus[] = ['waiting', 'in_service', 'completed', 'cancelled']
const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'paid', 'failed', 'refunded']

const shopQueue = queueEntries.filter((entry) => entry.shop_id === DEMO_SHOP_ID)

function serviceNamesOf(ids: string[]): string[] {
  return ids.map((id) => services.find((service) => service.id === id)?.name ?? '')
}

function staffNameOf(id: string | null): string | null {
  return staffMembers.find((member) => member.id === id)?.full_name ?? null
}

export default function ComponentsPreview() {
  const [hours, setHours] = useState(() => staffHours.filter((row) => row.staff_id === DEMO_STAFF_ID))
  const [breaks, setBreaks] = useState<ScheduleBreak[]>(() =>
    staffBreaks.filter((row) => row.staff_id === DEMO_STAFF_ID),
  )
  const [timeOff, setTimeOff] = useState<ScheduleTimeOff[]>(() =>
    staffTimeOff.filter((row) => row.staff_id === DEMO_STAFF_ID),
  )
  const [disabled, setDisabled] = useState(false)

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Shared components (dev only)</h1>

      <section>
        <h2 className={styles.sectionTitle}>StatusBadge (UI-SM-05)</h2>
        <div className={styles.group}>
          <span className={styles.groupLabel}>Booking</span>
          {BOOKING_STATUSES.map((status) => (
            <StatusBadge key={status} kind="booking" status={status} />
          ))}
        </div>
        <div className={styles.group}>
          <span className={styles.groupLabel}>Queue</span>
          {QUEUE_STATUSES.map((status) => (
            <StatusBadge key={status} kind="queue" status={status} />
          ))}
        </div>
        <div className={styles.group}>
          <span className={styles.groupLabel}>Payment</span>
          {PAYMENT_STATUSES.map((status) => (
            <StatusBadge key={status} kind="payment" status={status} />
          ))}
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>QueueEntryCard (UI-SM-07)</h2>
        <p className={styles.note}>
          Today&apos;s queue at Rupa Beauty Lounge. The demo customer&apos;s own entry is marked.
        </p>
        <ul className={styles.list}>
          {shopQueue.map((entry) => (
            <li key={entry.id} style={{ listStyle: 'none' }}>
              <QueueEntryCard
                entry={entry}
                serviceNames={serviceNamesOf(entry.service_ids)}
                staffName={staffNameOf(entry.staff_id)}
                isYou={entry.customer_id === DEMO_CUSTOMER_ID}
                actions={
                  entry.status === 'waiting' ? (
                    <Button variant="secondary">Start</Button>
                  ) : entry.status === 'in_service' ? (
                    <Button>Finish</Button>
                  ) : undefined
                }
              />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>WeekScheduleEditor (UI-SM-06)</h2>
        <p className={styles.note}>Shirin Akter, the demo staff member. Change something and look at the data below.</p>
        <div className={styles.toolbar}>
          <Button variant="secondary" onClick={() => setDisabled((value) => !value)}>
            {disabled ? 'Enable the editor' : 'Disable the editor'}
          </Button>
        </div>
        <Card>
          <WeekScheduleEditor
            hours={hours}
            onHoursChange={setHours}
            breaks={breaks}
            onBreaksChange={setBreaks}
            timeOff={timeOff}
            onTimeOffChange={setTimeOff}
            disabled={disabled}
          />
        </Card>
        <pre className={styles.json}>{JSON.stringify({ hours, breaks, timeOff }, null, 2)}</pre>
      </section>
    </div>
  )
}
