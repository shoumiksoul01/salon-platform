import { DEMO_SHOP_ID, bookingItems, bookings, queueEntries, staffMembers } from '../mocks/bookings'
import type { Booking, BookingStatus } from '../mocks/bookings'
import { shops } from '../mocks/shops'
import { getMockMode, mockDelay } from './mock'

// true = use the fixtures in src/mocks/. Set to false in the wire-up commit for FR-09.1.
// Pages call the functions below and never import the fixtures.
const USE_MOCK = true

export type { BookingStatus }

// One booking in the owner's lists (today and coming up).
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

export interface PopularService {
  service_name: string
  /** How many times the service was booked in the last 30 days. */
  count: number
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
  /** Pending and confirmed bookings from tomorrow to 7 days ahead, soonest first. */
  upcoming_bookings: DashboardBooking[]
  /** The most booked services of the last 30 days, most booked first (at most 5). */
  popular_services: PopularService[]
}

const NOT_FINISHED: BookingStatus[] = ['pending', 'confirmed', 'arrived', 'in_service']
const UPCOMING: BookingStatus[] = ['pending', 'confirmed']
const NOT_COUNTED: BookingStatus[] = ['cancelled', 'no_show']
const DAY_MS = 24 * 60 * 60 * 1000

// The shop works in Bangladesh time, so "today" is the day in Dhaka ("YYYY-MM-DD", easy to compare).
const dhakaDay = (value: string | Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date(value))

const byStart = (a: Booking, b: Booking) => Date.parse(a.starts_at) - Date.parse(b.starts_at)

function toRow(booking: Booking): DashboardBooking {
  return {
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
  }
}

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
          upcoming_bookings: [],
          popular_services: [],
        }
      }

      const shopBookings = bookings.filter((booking) => booking.shop_id === DEMO_SHOP_ID)
      const today = dhakaDay(new Date())
      const weekAhead = dhakaDay(new Date(Date.now() + 7 * DAY_MS))
      const monthAgo = dhakaDay(new Date(Date.now() - 30 * DAY_MS))

      const todays = shopBookings
        .filter((booking) => dhakaDay(booking.starts_at) === today && booking.status !== 'cancelled')
        .sort(byStart)

      const upcoming = shopBookings
        .filter((booking) => {
          const day = dhakaDay(booking.starts_at)
          return day > today && day <= weekAhead && UPCOMING.includes(booking.status)
        })
        .sort(byStart)

      // Popular services: count the services of every booking in the last 30 days.
      const countedIds = new Set(
        shopBookings
          .filter((booking) => {
            const day = dhakaDay(booking.starts_at)
            return day >= monthAgo && day <= today && !NOT_COUNTED.includes(booking.status)
          })
          .map((booking) => booking.id),
      )
      const tally = new Map<string, number>()
      for (const item of bookingItems) {
        if (countedIds.has(item.booking_id)) {
          tally.set(item.service_name, (tally.get(item.service_name) ?? 0) + 1)
        }
      }
      const popular_services = [...tally.entries()]
        .map(([service_name, count]) => ({ service_name, count }))
        .sort((a, b) => b.count - a.count || a.service_name.localeCompare(b.service_name))
        .slice(0, 5)

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
        today_bookings: todays.map(toRow),
        upcoming_bookings: upcoming.map(toRow),
        popular_services,
      }
    })
  }
  throw new Error('The real dashboard API is not wired yet')
}