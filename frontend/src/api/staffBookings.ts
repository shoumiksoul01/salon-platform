import { DEMO_SHOP_ID, staffMembers } from '../mocks/bookings'
import { applyBookingActionNow, ownerBookingsNow } from './ownerBookings'
import type { BookingAction, OwnerBooking } from './ownerBookings'
import { getMockMode, mockDelay } from './mock'

// true = use the fixtures in src/mocks/. Set to false in the wire-up commit for FR-04.1 and FR-04.4.
// Pages call the functions below and never import the fixtures.
const USE_MOCK = true

export type { BookingAction, OwnerBooking }

// A staff member can only move a booking through the service (FR-04.4). Accepting, rejecting and
// cancelling stay with the owner. The rules themselves live in api/ownerBookings.ts (the
// `actions` of each booking), so this file only hides the actions that are not the staff's.
export const STAFF_ACTIONS: BookingAction[] = ['arrive', 'start', 'complete', 'no_show']

export interface StaffDay {
  staff_name: string
  /** Today's bookings of this staff member, soonest first (cancelled ones are left out). */
  today: OwnerBooking[]
  /** Pending and confirmed bookings of the next 7 days, soonest first. */
  upcoming: OwnerBooking[]
}

const DAY_MS = 24 * 60 * 60 * 1000
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000

// A Dhaka calendar day as 'YYYY-MM-DD'. These compare correctly as text.
const dhakaDay = (ms: number) => new Date(ms + DHAKA_OFFSET_MS).toISOString().slice(0, 10)

// There is no staff login yet (the real API will know the signed-in staff member). The mock
// uses the staff member of the demo shop who has the most bookings today, so the page always
// has something to show, and keeps that choice until the page is reloaded. The staff queue
// page (api/staffQueue.ts) uses the same staff member.
let demoStaffId: string | null = null

export function currentStaffId(): string {
  if (demoStaffId) return demoStaffId
  const today = dhakaDay(Date.now())
  const counts = new Map<string, number>()
  ownerBookingsNow().forEach((booking) => {
    if (booking.staff_id && dhakaDay(Date.parse(booking.starts_at)) === today) {
      counts.set(booking.staff_id, (counts.get(booking.staff_id) ?? 0) + 1)
    }
  })
  const shopStaff = staffMembers.filter((member) => member.shop_id === DEMO_SHOP_ID)
  let best = shopStaff[0]?.id ?? ''
  let bestCount = -1
  shopStaff.forEach((member) => {
    const count = counts.get(member.id) ?? 0
    if (count > bestCount) {
      best = member.id
      bestCount = count
    }
  })
  demoStaffId = best
  return best
}

const forStaff = (booking: OwnerBooking): OwnerBooking => ({
  ...booking,
  actions: booking.actions.filter((action) => STAFF_ACTIONS.includes(action)),
})

function notWritten(): never {
  throw new Error('The real staff bookings API is not written yet')
}

// The signed-in staff member's own bookings for today and the next 7 days.
export async function getStaffDay(): Promise<StaffDay> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const mode = getMockMode()
      if (mode === 'error') throw new Error('Mock error: could not load the bookings')

      const staffId = currentStaffId()
      const staff_name = staffMembers.find((member) => member.id === staffId)?.full_name ?? ''
      if (mode === 'empty') return { staff_name, today: [], upcoming: [] }

      const now = Date.now()
      const today = dhakaDay(now)
      const lastDay = dhakaDay(now + 7 * DAY_MS)
      const soonest = (a: OwnerBooking, b: OwnerBooking) => Date.parse(a.starts_at) - Date.parse(b.starts_at)
      const mine = ownerBookingsNow().filter((booking) => booking.staff_id === staffId)

      return {
        staff_name,
        today: mine
          .filter((booking) => dhakaDay(Date.parse(booking.starts_at)) === today && booking.status !== 'cancelled')
          .map(forStaff)
          .sort(soonest),
        upcoming: mine
          .filter((booking) => {
            const day = dhakaDay(Date.parse(booking.starts_at))
            return day > today && day <= lastDay && ['pending', 'confirmed'].includes(booking.status)
          })
          .map(forStaff)
          .sort(soonest),
      }
    })
  }
  return notWritten()
}

// Moves one of the staff member's own bookings one step (arrive, start, complete or no-show).
// Completing a pay-at-shop booking marks it as paid, the same as for the owner.
export async function applyStaffAction(id: string, action: BookingAction): Promise<OwnerBooking> {
  if (USE_MOCK) {
    return mockDelay(() => {
      if (!STAFF_ACTIONS.includes(action)) throw new Error('action_not_allowed')
      const own = ownerBookingsNow().find((booking) => booking.id === id)
      if (!own || own.staff_id !== currentStaffId()) throw new Error('booking_not_found')
      return forStaff(applyBookingActionNow(id, action))
    })
  }
  return notWritten()
}
