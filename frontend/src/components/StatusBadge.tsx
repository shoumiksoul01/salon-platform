import { useTranslation } from 'react-i18next'
import { Badge } from './ui'
import type { BadgeVariant } from './ui'
import type { BookingStatus, PaymentStatus, QueueStatus } from '../mocks/bookings'

// UI-SM-05. One coloured label for every status a page can show.
// Pass the kind and the status value from the data, for example:
//   <StatusBadge kind="booking" status="confirmed" />
// The text comes from the `shared` translation area (status.<kind>.<status>), and the colour
// is only a hint: the words always carry the meaning.
type StatusBadgeProps =
  | { kind: 'booking'; status: BookingStatus }
  | { kind: 'queue'; status: QueueStatus }
  | { kind: 'payment'; status: PaymentStatus }

const BOOKING_VARIANT: Record<BookingStatus, BadgeVariant> = {
  pending: 'warning',
  confirmed: 'info',
  arrived: 'primary',
  in_service: 'primary',
  completed: 'success',
  cancelled: 'neutral',
  no_show: 'danger',
}

const QUEUE_VARIANT: Record<QueueStatus, BadgeVariant> = {
  waiting: 'warning',
  in_service: 'primary',
  completed: 'success',
  cancelled: 'neutral',
}

const PAYMENT_VARIANT: Record<PaymentStatus, BadgeVariant> = {
  pending: 'warning',
  paid: 'success',
  failed: 'danger',
  refunded: 'neutral',
}

function variantFor(props: StatusBadgeProps): BadgeVariant {
  switch (props.kind) {
    case 'booking':
      return BOOKING_VARIANT[props.status]
    case 'queue':
      return QUEUE_VARIANT[props.status]
    case 'payment':
      return PAYMENT_VARIANT[props.status]
  }
}

export default function StatusBadge(props: StatusBadgeProps) {
  const { t } = useTranslation('shared')
  return <Badge variant={variantFor(props)}>{t(`status.${props.kind}.${props.status}`)}</Badge>
}
