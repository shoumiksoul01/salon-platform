import { DEMO_SHOP_ID, bookingItems, bookings, staffMembers } from '../mocks/bookings'
import type { Booking, BookingStatus, CancelledBy, PaymentMethod, PaymentStatus } from '../mocks/bookings'
import { getMockMode, mockDelay } from './mock'

// true = use the fixtures in src/mocks/. Set to false in the wire-up commit for FR-04.
// Pages call the functions below and never import the fixtures.
const USE_MOCK = true

export type { BookingStatus, CancelledBy, PaymentMethod, PaymentStatus }

// What the owner can do to a booking (FR-04.2, FR-04.4, FR-05.4).
//   accept, reject    a booking that waits for the owner's answer
//   arrive            the customer is at the shop
//   start, complete   the service begins and ends
//   no_show           a confirmed customer who did not come (FR-05.4)
//   cancel            the shop cancels a confirmed booking
export type BookingAction = 'accept' | 'reject' | 'arrive' | 'start' | 'complete' | 'no_show' | 'cancel'

// A booking as the owner pages need it. `actions` says what is allowed right now. The server
// decides it (the mock works it out here), so the page never has to know the rules.
export interface OwnerBooking {
  id: string
  customer_name: string
  /** Earlier no-shows of this customer, for the warning in FR-05.4. */
  customer_no_shows: number
  staff_id: string | null
  staff_name: string | null
  service_names: string[]
  starts_at: string
  ends_at: string
  status: BookingStatus
  total_poisha: number
  paid_poisha: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  hold_expires_at: string | null
  cancelled_by: CancelledBy | null
  cancel_reason: string | null
  actions: BookingAction[]
}

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const DHAKA_OFFSET_MS = 6 * HOUR_MS

// Changes made by the page while the app is open. Reloading the page resets them.
// The customer pages keep their own copy in api/bookings.ts, so a change made here is
// not shown there until the real API is connected.
const changed = new Map<string, Booking>()

const current = (booking: Booking): Booking => changed.get(booking.id) ?? booking

function endOfTodayMs(now: number): number {
  const local = now + DHAKA_OFFSET_MS
  return Math.floor(local / DAY_MS) * DAY_MS + DAY_MS - 1 - DHAKA_OFFSET_MS
}

function allowedActions(booking: Booking, now: number): BookingAction[] {
  switch (booking.status) {
    case 'pending':
      // A booking that waits for its online payment is not the owner's to answer yet.
      return booking.hold_expires_at ? [] : ['accept', 'reject']
    case 'confirmed': {
      const start = Date.parse(booking.starts_at)
      const actions: BookingAction[] = []
      if (start <= endOfTodayMs(now)) actions.push('arrive')
      if (now >= start) actions.push('no_show')
      actions.push('cancel')
      return actions
    }
    case 'arrived':
      return ['start']
    case 'in_service':
      return ['complete']
    default:
      return []
  }
}

function toOwnerBooking(booking: Booking): OwnerBooking {
  return {
    id: booking.id,
    customer_name: booking.customer_name,
    customer_no_shows: bookings
      .map(current)
      .filter(
        (other) =>
          other.id !== booking.id && other.customer_id === booking.customer_id && other.status === 'no_show',
      ).length,
    staff_id: booking.staff_id,
    staff_name: staffMembers.find((member) => member.id === booking.staff_id)?.full_name ?? null,
    service_names: bookingItems.filter((item) => item.booking_id === booking.id).map((item) => item.service_name),
    starts_at: booking.starts_at,
    ends_at: booking.ends_at,
    status: booking.status,
    total_poisha: booking.total_poisha,
    paid_poisha: booking.paid_poisha,
    payment_method: booking.payment_method,
    payment_status: booking.payment_status,
    hold_expires_at: booking.hold_expires_at,
    cancelled_by: booking.cancelled_by,
    cancel_reason: booking.cancel_reason,
    actions: allowedActions(booking, Date.now()),
  }
}

function notWritten(): never {
  throw new Error('The real owner bookings API is not written yet')
}

// All bookings of the owner's shop, in no particular order. The page sorts and groups them.
export async function listOwnerBookings(): Promise<OwnerBooking[]> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const mode = getMockMode()
      if (mode === 'error') throw new Error('Mock error: could not load the bookings')
      if (mode === 'empty') return []
      return bookings
        .map(current)
        .filter((booking) => booking.shop_id === DEMO_SHOP_ID)
        .map(toOwnerBooking)
    })
  }
  return notWritten()
}

// Moves a booking one step. A reason is required to reject or cancel (the customer sees it).
// When the shop cancels, the customer gets back everything they paid.
export async function applyBookingAction(
  id: string,
  action: BookingAction,
  reason = '',
): Promise<OwnerBooking> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const booking = bookings.map(current).find((item) => item.id === id && item.shop_id === DEMO_SHOP_ID)
      if (!booking) throw new Error('booking_not_found')
      if (!allowedActions(booking, Date.now()).includes(action)) throw new Error('action_not_allowed')

      const next: Booking = { ...booking }
      switch (action) {
        case 'accept':
          next.status = 'confirmed'
          break
        case 'arrive':
          next.status = 'arrived'
          break
        case 'start':
          next.status = 'in_service'
          break
        case 'complete':
          next.status = 'completed'
          // Pay at the shop: the owner takes the money when the service ends.
          if (next.payment_method === 'pay_at_shop' && next.payment_status === 'pending') {
            next.payment_status = 'paid'
            next.paid_poisha = next.total_poisha
          }
          break
        case 'no_show':
          next.status = 'no_show'
          break
        case 'reject':
        case 'cancel':
          if (!reason.trim()) throw new Error('reason_required')
          next.status = 'cancelled'
          next.cancelled_by = 'shop'
          next.cancel_reason = reason.trim()
          if (next.paid_poisha > 0) next.payment_status = 'refunded'
          break
      }
      changed.set(next.id, next)
      return toOwnerBooking(next)
    })
  }
  return notWritten()
}
