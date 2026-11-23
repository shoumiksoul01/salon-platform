import { DEMO_SHOP_ID, bookingItems, bookings, queueEntries } from '../mocks/bookings'
import type { QueueEntry, QueueStatus } from '../mocks/bookings'
import { services as serviceFixtures } from '../mocks/shops'
import { getMockMode, mockDelay } from './mock'
import { applyBookingActionNow, ownerBookingsNow } from './ownerBookings'
import type { OwnerBooking } from './ownerBookings'
import { activeStaffCountNow } from './staff'

// true = use the fixtures in src/mocks/. Set to false in the wire-up commit for FR-06.1 and FR-06.2.
// Pages call the functions below and never import the fixtures.
const USE_MOCK = true

export type { QueueEntry, QueueStatus }

// The live queue of the owner's shop (OWN-07). `entries` holds the people being served first,
// then the people waiting in order. The waiting times are worked out by the server (FR-06.2),
// so the page only shows them.
export interface OwnerQueue {
  entries: QueueEntry[]
  finished_today: number
  /** Minutes a person who joins now would wait. 0 = a staff member is free. */
  new_customer_wait_minutes: number
  /** Today's confirmed bookings that can be checked in and are not in the queue yet. */
  expected: OwnerBooking[]
  updated_at: string
}

export interface WalkInInput {
  customer_name: string
  service_ids: string[]
  /** null = first available staff member. */
  staff_id: string | null
}

// start: the next person sits down. finish: the service is done. remove: the person leaves the queue.
export type QueueAction = 'start' | 'finish' | 'remove'

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000
const DEFAULT_SERVICE_MINUTES = 30

const dhakaDay = (ms: number) => new Date(ms + DHAKA_OFFSET_MS).toISOString().slice(0, 10)

// The mock keeps changes in memory only, so they reset when the page is reloaded.
let store: QueueEntry[] | null = null

function entries(): QueueEntry[] {
  if (!store) {
    store = queueEntries.filter((entry) => entry.shop_id === DEMO_SHOP_ID).map((entry) => ({ ...entry }))
    recalculate()
  }
  return store
}

const minutesFor = new Map(serviceFixtures.map((service) => [service.id, service.duration_minutes]))
const durationOf = (entry: QueueEntry) =>
  entry.service_ids.reduce((sum, id) => sum + (minutesFor.get(id) ?? DEFAULT_SERVICE_MINUTES), 0)
const roundUp5 = (minutes: number) => Math.ceil(minutes / 5) * 5

// FR-06.2. Every active staff member serves one person at a time. People being served keep
// their staff member busy for the full service time (the mock does not track the start time).
// Then each waiting person goes to the staff member who is free first.
// The wait is the time until that staff member is free, rounded up to 5 minutes.
function simulate(waiting: QueueEntry[], inService: QueueEntry[]) {
  const staffCount = Math.max(1, activeStaffCountNow())
  const free = Array.from({ length: staffCount }, () => 0)
  inService.slice(0, staffCount).forEach((entry, index) => {
    free[index] = durationOf(entry)
  })
  const waits = waiting.map((entry) => {
    const index = free.indexOf(Math.min(...free))
    const wait = free[index]
    free[index] = wait + durationOf(entry)
    return roundUp5(wait)
  })
  return { waits, next: roundUp5(Math.min(...free)) }
}

// Numbers the waiting people 1, 2, 3 ... in order and works out their waiting times.
function recalculate(): number {
  const list = store ?? []
  const inService = list.filter((entry) => entry.status === 'in_service')
  const waiting = list
    .filter((entry) => entry.status === 'waiting')
    .sort(
      (a, b) =>
        (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) ||
        Date.parse(a.joined_at) - Date.parse(b.joined_at),
    )
  const { waits, next } = simulate(waiting, inService)
  waiting.forEach((entry, index) => {
    entry.position = index + 1
    entry.estimated_wait_minutes = waits[index]
  })
  inService.forEach((entry) => {
    entry.position = null
    entry.estimated_wait_minutes = null
  })
  return next
}

function snapshot(): OwnerQueue {
  const list = entries()
  const newCustomerWait = recalculate()
  const inQueue = new Set(list.map((entry) => entry.booking_id).filter(Boolean))
  const today = dhakaDay(Date.now())

  return {
    entries: list
      .filter((entry) => entry.status === 'in_service' || entry.status === 'waiting')
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'in_service' ? -1 : 1
        return (a.position ?? 0) - (b.position ?? 0)
      })
      .map((entry) => ({ ...entry, service_ids: [...entry.service_ids] })),
    finished_today: list.filter((entry) => entry.status === 'completed').length,
    new_customer_wait_minutes: newCustomerWait,
    expected: ownerBookingsNow()
      .filter(
        (booking) =>
          booking.actions.includes('arrive') &&
          dhakaDay(Date.parse(booking.starts_at)) === today &&
          !inQueue.has(booking.id),
      )
      .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at)),
    updated_at: new Date().toISOString(),
  }
}

function notWritten(): never {
  throw new Error('The real queue API is not written yet')
}

// The queue as it is now. The page asks again every 10 seconds (task board: polling, realtime later).
export async function getOwnerQueue(): Promise<OwnerQueue> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const mode = getMockMode()
      if (mode === 'error') throw new Error('Mock error: could not load the queue')
      if (mode === 'empty') {
        return { entries: [], finished_today: 0, new_customer_wait_minutes: 0, expected: [], updated_at: new Date().toISOString() }
      }
      return snapshot()
    })
  }
  return notWritten()
}

// FR-06.1: add a customer who walked in. They join at the end of the queue.
export async function addWalkIn(input: WalkInInput): Promise<OwnerQueue> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const name = input.customer_name.trim()
      if (!name || input.service_ids.length === 0) throw new Error('invalid_walk_in')
      entries().push({
        id: crypto.randomUUID(),
        shop_id: DEMO_SHOP_ID,
        booking_id: null,
        customer_id: null,
        customer_name: name,
        service_ids: [...input.service_ids],
        staff_id: input.staff_id,
        status: 'waiting',
        is_walk_in: true,
        position: null,
        estimated_wait_minutes: null,
        joined_at: new Date().toISOString(),
      })
      return snapshot()
    })
  }
  return notWritten()
}

// FR-06.1: a booked customer is at the shop. The booking becomes "arrived" and the customer
// joins the queue, so the queue holds online and offline customers.
export async function checkInBooking(bookingId: string): Promise<OwnerQueue> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const raw = bookings.find((booking) => booking.id === bookingId)
      const updated = applyBookingActionNow(bookingId, 'arrive')
      entries().push({
        id: crypto.randomUUID(),
        shop_id: DEMO_SHOP_ID,
        booking_id: bookingId,
        customer_id: raw?.customer_id ?? null,
        customer_name: updated.customer_name,
        service_ids: bookingItems.filter((item) => item.booking_id === bookingId).map((item) => item.service_id),
        staff_id: updated.staff_id,
        status: 'waiting',
        is_walk_in: false,
        position: null,
        estimated_wait_minutes: null,
        joined_at: new Date().toISOString(),
      })
      return snapshot()
    })
  }
  return notWritten()
}

// Moves one person in the queue. For a booked customer the booking status follows
// (in service, completed). Leaving the queue does not change the booking.
export async function applyQueueAction(id: string, action: QueueAction): Promise<OwnerQueue> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const entry = entries().find((item) => item.id === id)
      if (!entry) throw new Error('entry_not_found')

      if (action === 'start' && entry.status === 'waiting') {
        entry.status = 'in_service'
        syncBooking(entry, 'start')
      } else if (action === 'finish' && entry.status === 'in_service') {
        entry.status = 'completed'
        syncBooking(entry, 'complete')
      } else if (action === 'remove' && entry.status === 'waiting') {
        entry.status = 'cancelled'
      } else {
        throw new Error('action_not_allowed')
      }
      return snapshot()
    })
  }
  return notWritten()
}

function syncBooking(entry: QueueEntry, action: 'start' | 'complete') {
  if (!entry.booking_id) return
  try {
    applyBookingActionNow(entry.booking_id, action)
  } catch {
    // The demo bookings do not always match the demo queue. The queue still moves.
  }
}
