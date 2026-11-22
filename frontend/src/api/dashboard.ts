import { DEMO_SHOP_ID, bookingItems, bookings, queueEntries, staffMembers } from '../mocks/bookings'
import type { BookingStatus } from '../mocks/bookings'
import { shops } from '../mocks/shops'
import { getMockMode, mockDelay } from './mock'

// true = use the fixtures in src/mocks/. Set to false in the wire-up commit for FR-09.1.
// Pages call the functions below and never import the fixtures.
const USE_MOCK = true

export type { BookingStatus }

// One booking in the owner's list for today.
export interface DashboardBooking {
  id: string
  starts_at: string
  ends_at: string
  customer_name: string
  staff_name: string | null
  service_names: string[]
  status: BookingStatus
  total_poisha: number
}

// What the owner dashboard shows (OWN-01, FR-09.1).
export interface OwnerDashboard {
  shop_name: string
  /** Bookings that start today, cancelled ones left out. */
  today_count: number
  /** Today's bookings that are not finished yet (waiting, confirmed, arrived or in service). */
  today_left_count: number
  /** Total price of today's finished bookings. */
  today_earnings_poisha: number
  /** People waiting in the live queue right now. */
  waiting_count: number
  /** Today's bookings in time order, cancelled ones left out. */
  today_bookings: DashboardBooking[]
}

const NOT_FINISHED: BookingStatus[] = ['pending', 'confirmed', 'arrived', 'in_service']

// The shop works in Bangladesh time, so "today" is the day in Dhaka.
const dhakaDay = (value: string | Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date(value))

export async function getOwnerDashboard(): Promise<OwnerDashboard> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const mode = getMockMode()
      if (mode === 'error') throw new Error('Mock error: could not load the dashboard')

      const shopName = shops.find((shop) => shop.id === DEMO_SHOP_ID)?.name ?? ''
      if (mode === 'empty') {
        return {
          shop_name: shopName,
          today_count: 0,
          today_left_count: 0,
          today_earnings_poisha: 0,
          waiting_count: 0,
          today_bookings: [],
        }
      }

      const today = dhakaDay(new Date())
      const todays = bookings
        .filter((booking) => booking.shop_id === DEMO_SHOP_ID && dhakaDay(booking.starts_at) === today)
        .filter((booking) => booking.status !== 'cancelled')
        .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))

      const today_bookings: DashboardBooking[] = todays.map((booking) => ({
        id: booking.id,
        starts_at: booking.starts_at,
        ends_at: booking.ends_at,
        customer_name: booking.customer_name,
        staff_name: staffMembers.find((member) => member.id === booking.staff_id)?.full_name ?? null,
        service_names: bookingItems
          .filter((item) => item.booking_id === booking.id)
          .map((item) => item.service_name),
        status: booking.status,
        total_poisha: booking.total_poisha,
      }))

      return {
        shop_name: shopName,
        today_count: todays.length,
        today_left_count: todays.filter((booking) => NOT_FINISHED.includes(booking.status)).length,
        today_earnings_poisha: todays
          .filter((booking) => booking.status === 'completed')
          .reduce((sum, booking) => sum + booking.total_poisha, 0),
        waiting_count: queueEntries.filter(
          (entry) => entry.shop_id === DEMO_SHOP_ID && entry.status === 'waiting',
        ).length,
        today_bookings,
      }
    })
  }
  throw new Error('The real dashboard API is not wired yet')
}