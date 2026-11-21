import {
  DEMO_CUSTOMER_ID,
  bookingItems,
  bookings,
  payments,
  staffBreaks,
  staffHours,
  staffMembers,
  staffTimeOff,
} from '../mocks/bookings'
import type { Booking, BookingStatus, CancelledBy, PaymentMethod, PaymentStatus } from '../mocks/bookings'
import { reviews, shopWorkingHours, shops } from '../mocks/shops'
import { getMockMode, mockDelay } from './mock'

// true = use the fixtures in src/mocks/. Set to false in the wire-up commit for FR-04.1.
// Pages call the functions below and never import the fixtures.
const USE_MOCK = true

export type { BookingStatus, CancelledBy, PaymentMethod, PaymentStatus }

// Free changes and full refunds are possible until this many hours before the start.
// It is an open per-shop setting (context file, section A2, point d), so for now it is
// the same for every shop. The mock uses it to decide what a customer may still do.
export const CHANGE_WINDOW_HOURS = 4

// A booking as the customer pages need it. The fields after has_review are decided by the
// server (the mock works them out here), so the page never has to know the rules.
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
  can_reschedule: boolean
  can_cancel: boolean
  can_confirm: boolean
  /** Money the customer gets back if they cancel now. */
  refund_on_cancel_poisha: number
  /** Last moment for free changes (ISO UTC), or null when changes are no longer possible. */
  change_deadline: string | null
}

// A day that still has free times for a booking that is being moved.
export interface RescheduleOption {
  date: string // YYYY-MM-DD in Dhaka
  slots: string[] // start times, ISO UTC
}

const HOUR_MS = 60 * 60 * 1000
const MINUTE_MS = 60 * 1000
const DAY_MS = 24 * HOUR_MS
const DHAKA_OFFSET_MS = 6 * HOUR_MS
const SLOT_STEP_MINUTES = 30
const RESCHEDULE_DAYS = 14
const ACTIVE_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'arrived', 'in_service']

// Changes made by the pages while the app is open. Reloading the page resets them.
const changed = new Map<string, Booking>()
const extraRefunds = new Map<string, number>()
const reviewed = new Set<string>(reviews.map((review) => review.booking_id))
const newReviews = new Map<string, { rating: number; comment: string }>()

const current = (booking: Booking): Booking => changed.get(booking.id) ?? booking
const minutesOf = (time: string): number => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
const dhakaDate = (ms: number): string => new Date(ms + DHAKA_OFFSET_MS).toISOString().slice(0, 10)

function toMyBooking(booking: Booking): MyBooking {
  const open = booking.status === 'pending' || booking.status === 'confirmed'
  const canChange = open && Date.parse(booking.starts_at) - Date.now() > CHANGE_WINDOW_HOURS * HOUR_MS

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
    refunded_poisha:
      payments
        .filter((payment) => payment.booking_id === booking.id)
        .reduce((sum, payment) => sum + payment.refunded_poisha, 0) + (extraRefunds.get(booking.id) ?? 0),
    payment_method: booking.payment_method,
    payment_status: booking.payment_status,
    hold_expires_at: booking.hold_expires_at,
    confirmation_requested_at: booking.confirmation_requested_at,
    customer_confirmed_at: booking.customer_confirmed_at,
    cancelled_by: booking.cancelled_by,
    has_review: reviewed.has(booking.id),
    can_reschedule: canChange && booking.hold_expires_at === null,
    can_cancel: canChange,
    can_confirm:
      booking.status === 'confirmed' &&
      booking.confirmation_requested_at !== null &&
      booking.customer_confirmed_at === null,
    refund_on_cancel_poisha: canChange ? booking.paid_poisha : 0,
    change_deadline: canChange
      ? new Date(Date.parse(booking.starts_at) - CHANGE_WINDOW_HOURS * HOUR_MS).toISOString()
      : null,
  }
}

function findMine(id: string): Booking {
  const found = bookings.map(current).find((booking) => booking.id === id && booking.customer_id === DEMO_CUSTOMER_ID)
  if (!found) throw new Error('booking_not_found')
  return found
}

function save(booking: Booking): MyBooking {
  changed.set(booking.id, booking)
  return toMyBooking(booking)
}

// Free start times for `booking` on one Dhaka day: inside the shop and staff hours, outside
// the staff member's breaks, time off and other bookings, and far enough from now.
function slotsOn(booking: Booking, date: string): string[] {
  const midnight = Date.parse(`${date}T00:00:00.000Z`)
  const dayStart = midnight - DHAKA_OFFSET_MS
  const dayOfWeek = new Date(midnight).getUTCDay()

  const staffRow = staffHours.find((row) => row.staff_id === booking.staff_id && row.day_of_week === dayOfWeek)
  const shopRow = shopWorkingHours.find((row) => row.shop_id === booking.shop_id && row.day_of_week === dayOfWeek)
  if (!staffRow || staffRow.is_closed || !shopRow || shopRow.is_closed) return []

  const opens = Math.max(minutesOf(staffRow.opens_at), minutesOf(shopRow.opens_at))
  const closes = Math.min(minutesOf(staffRow.closes_at), minutesOf(shopRow.closes_at))
  const duration = (Date.parse(booking.ends_at) - Date.parse(booking.starts_at)) / MINUTE_MS

  const busy: [number, number][] = [
    ...staffBreaks
      .filter((row) => row.staff_id === booking.staff_id && (row.day_of_week === null || row.day_of_week === dayOfWeek))
      .map((row): [number, number] => [
        dayStart + minutesOf(row.starts_at) * MINUTE_MS,
        dayStart + minutesOf(row.ends_at) * MINUTE_MS,
      ]),
    ...staffTimeOff
      .filter((row) => row.staff_id === booking.staff_id)
      .map((row): [number, number] => [Date.parse(row.starts_at), Date.parse(row.ends_at)]),
    ...bookings
      .map(current)
      .filter((other) => other.id !== booking.id && other.staff_id === booking.staff_id && ACTIVE_STATUSES.includes(other.status))
      .map((other): [number, number] => [Date.parse(other.starts_at), Date.parse(other.ends_at)]),
  ]

  const earliest = Date.now() + CHANGE_WINDOW_HOURS * HOUR_MS
  const slots: string[] = []
  for (let minute = opens; minute + duration <= closes; minute += SLOT_STEP_MINUTES) {
    const start = dayStart + minute * MINUTE_MS
    const end = start + duration * MINUTE_MS
    if (start <= earliest) continue
    if (busy.some(([from, to]) => start < to && from < end)) continue
    slots.push(new Date(start).toISOString())
  }
  return slots
}

// All bookings of the signed-in customer, in no particular order.
export async function listMyBookings(): Promise<MyBooking[]> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const mode = getMockMode()
      if (mode === 'error') throw new Error('Mock error: could not load bookings')
      if (mode === 'empty') return []
      return bookings
        .map(current)
        .filter((booking) => booking.customer_id === DEMO_CUSTOMER_ID)
        .map(toMyBooking)
    })
  }
  throw new Error('The real bookings API is not wired yet')
}

// The days in the next two weeks that have free times for moving this booking.
// BOOK-02 (the slot grid for a new booking) can use the same calculation: only the length
// of the booking and the staff member change.
export async function listRescheduleOptions(id: string): Promise<RescheduleOption[]> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const booking = findMine(id)
      const options: RescheduleOption[] = []
      for (let offset = 0; offset < RESCHEDULE_DAYS; offset++) {
        const date = dhakaDate(Date.now() + offset * DAY_MS)
        const slots = slotsOn(booking, date)
        if (slots.length > 0) options.push({ date, slots })
      }
      return options
    })
  }
  throw new Error('The real bookings API is not wired yet')
}

// Moves a booking to a new start time (same services, same staff member).
// Throws Error('slot_taken') when the time is no longer free and Error('not_allowed') when
// the booking can no longer be changed.
export async function rescheduleBooking(id: string, startsAt: string): Promise<MyBooking> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const booking = findMine(id)
      if (!toMyBooking(booking).can_reschedule) throw new Error('not_allowed')
      if (!slotsOn(booking, dhakaDate(Date.parse(startsAt))).includes(startsAt)) throw new Error('slot_taken')
      const length = Date.parse(booking.ends_at) - Date.parse(booking.starts_at)
      return save({
        ...booking,
        starts_at: startsAt,
        ends_at: new Date(Date.parse(startsAt) + length).toISOString(),
        // A moved booking needs a new "I am coming" confirmation.
        confirmation_requested_at: null,
        customer_confirmed_at: null,
      })
    })
  }
  throw new Error('The real bookings API is not wired yet')
}

// Cancels a booking. Money paid online is refunded in full while changes are still free.
// reason is a code such as 'plans', 'time', 'sick' or 'other' (or an empty text).
export async function cancelBooking(id: string, reason: string): Promise<MyBooking> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const booking = findMine(id)
      const view = toMyBooking(booking)
      if (!view.can_cancel) throw new Error('not_allowed')
      const refund = view.refund_on_cancel_poisha
      if (refund > 0) extraRefunds.set(id, (extraRefunds.get(id) ?? 0) + refund)
      return save({
        ...booking,
        status: 'cancelled',
        cancelled_by: 'customer',
        cancel_reason: reason || null,
        hold_expires_at: null,
        paid_poisha: refund > 0 ? 0 : booking.paid_poisha,
        payment_status: refund > 0 ? 'refunded' : booking.payment_status,
      })
    })
  }
  throw new Error('The real bookings API is not wired yet')
}

// The customer answers the "are you coming?" request (FR-05.2).
export async function confirmArrival(id: string): Promise<MyBooking> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const booking = findMine(id)
      if (!toMyBooking(booking).can_confirm) throw new Error('not_allowed')
      return save({ ...booking, customer_confirmed_at: new Date().toISOString() })
    })
  }
  throw new Error('The real bookings API is not wired yet')
}

// A review for a completed booking. rating is 1 to 5.
export async function submitReview(id: string, rating: number, comment: string): Promise<MyBooking> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const booking = findMine(id)
      if (booking.status !== 'completed' || reviewed.has(id)) throw new Error('not_allowed')
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('invalid_rating')
      reviewed.add(id)
      newReviews.set(id, { rating, comment })
      return toMyBooking(booking)
    })
  }
  throw new Error('The real bookings API is not wired yet')
}

// Free start times for a NEW booking (BOOK-02): one staff member, one Dhaka day (YYYY-MM-DD)
// and the total length of the chosen services. It uses the same rules as moving a booking.
// Start times are ISO UTC. Added by Shoumik for the slot grid.
export function freeSlotsForNewBooking(
  shopId: string,
  staffId: string,
  durationMinutes: number,
  date: string,
): string[] {
  if (!USE_MOCK) throw new Error('The real slots API is not wired yet')
  const probe = {
    id: '',
    shop_id: shopId,
    staff_id: staffId,
    starts_at: '1970-01-01T00:00:00.000Z',
    ends_at: new Date(durationMinutes * MINUTE_MS).toISOString(),
  } as Booking
  return slotsOn(probe, date)
}