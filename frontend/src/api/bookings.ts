import { DEMO_CUSTOMER_ID, bookingItems, bookings, payments, staffMembers } from '../mocks/bookings'
import type { Booking, BookingStatus, CancelledBy, PaymentMethod, PaymentStatus } from '../mocks/bookings'
import { reviews, shops } from '../mocks/shops'
import { getMockMode, mockDelay } from './mock'

// true = use the fixtures in src/mocks/. Set to false in the wire-up commit for FR-04.1.
// Pages call the functions below and never import the fixtures.
const USE_MOCK = true

export type { BookingStatus, CancelledBy, PaymentMethod, PaymentStatus }

// A booking as the customer pages need it. shop_name, staff_name, service_names,
// refunded_poisha and has_review are joined here; the real API will join them.
export interface MyBooking {
  id: string
  shop_id: string
  shop_name: string
  staff_name: string | null
  service_names: string[]
  starts_at: string
  ends_at: string
  status: BookingStatus
  total_poisha: number
  paid_poisha: number
  refunded_poisha: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  hold_expires_at: string | null
  confirmation_requested_at: string | null
  customer_confirmed_at: string | null
  cancelled_by: CancelledBy | null
  has_review: boolean
}

function toMyBooking(booking: Booking): MyBooking {
  return {
    id: booking.id,
    shop_id: booking.shop_id,
    shop_name: shops.find((shop) => shop.id === booking.shop_id)?.name ?? '',
    staff_name: staffMembers.find((member) => member.id === booking.staff_id)?.full_name ?? null,
    service_names: bookingItems
      .filter((item) => item.booking_id === booking.id)
      .map((item) => item.service_name),
    starts_at: booking.starts_at,
    ends_at: booking.ends_at,
    status: booking.status,
    total_poisha: booking.total_poisha,
    paid_poisha: booking.paid_poisha,
    refunded_poisha: payments
      .filter((payment) => payment.booking_id === booking.id)
      .reduce((sum, payment) => sum + payment.refunded_poisha, 0),
    payment_method: booking.payment_method,
    payment_status: booking.payment_status,
    hold_expires_at: booking.hold_expires_at,
    confirmation_requested_at: booking.confirmation_requested_at,
    customer_confirmed_at: booking.customer_confirmed_at,
    cancelled_by: booking.cancelled_by,
    has_review: reviews.some((review) => review.booking_id === booking.id),
  }
}

// All bookings of the signed-in customer, in no particular order.
export async function listMyBookings(): Promise<MyBooking[]> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const mode = getMockMode()
      if (mode === 'error') throw new Error('Mock error: could not load bookings')
      if (mode === 'empty') return []
      return bookings.filter((booking) => booking.customer_id === DEMO_CUSTOMER_ID).map(toMyBooking)
    })
  }
  throw new Error('The real bookings API is not wired yet')
}
