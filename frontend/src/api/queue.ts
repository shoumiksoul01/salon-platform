import { DEMO_CUSTOMER_ID, queueEntries, staffMembers } from '../mocks/bookings'
import type { QueueEntry, QueueStatus } from '../mocks/bookings'
import { services, shops } from '../mocks/shops'
import { getMockMode, mockDelay } from './mock'

// true = use the fixtures in src/mocks/. Set to false in the wire-up commit for FR-06.3.
// Pages call the functions below and never import the fixtures.
const USE_MOCK = true

export type { QueueStatus }

// What a customer may see of another person in the queue: no name and no services.
export interface QueueRow {
  id: string
  is_you: boolean
  is_walk_in: boolean
  status: QueueStatus
  position: number | null
  estimated_wait_minutes: number | null
  joined_at: string
}

// The queue the signed-in customer is standing in, as the customer page needs it (CUS-02).
export interface MyQueue {
  shop_id: string
  shop_name: string
  booking_id: string | null
  /** The customer's own status: waiting for the turn, or being served now. */
  status: 'waiting' | 'in_service'
  /** 1 = next. Null once the customer is being served. */
  position: number | null
  /** People waiting before the customer. */
  people_ahead: number
  /** People being served right now. */
  in_service_count: number
  estimated_wait_minutes: number | null
  staff_name: string | null
  service_names: string[]
  /** Everybody in the line: being served first, then waiting in order. */
  rows: QueueRow[]
  updated_at: string
}

// The mock makes the queue move so the page can be shown live: every 2nd call the person who is
// being served finishes and the next one starts. Reload the page to start again. The real
// API returns the true queue and this simulation goes away.
const CALLS_PER_STEP = 2
const MAX_STEPS = 2
let calls = 0

function advance(entries: QueueEntry[], steps: number): QueueEntry[] {
  const list = entries.map((entry) => ({ ...entry }))
  for (let step = 0; step < steps; step++) {
    const serving = list.find((entry) => entry.status === 'in_service')
    if (serving) {
      serving.status = 'completed'
      serving.position = null
      serving.estimated_wait_minutes = null
    }
    const waiting = list
      .filter((entry) => entry.status === 'waiting')
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    waiting.forEach((entry, index) => {
      if (index === 0) {
        entry.status = 'in_service'
        entry.position = null
        entry.estimated_wait_minutes = null
      } else {
        entry.position = index
        entry.estimated_wait_minutes = Math.max(5, (entry.estimated_wait_minutes ?? 0) - 20)
      }
    })
  }
  return list
}

// The queue of the shop where the customer has checked in, or null when the customer is
// not standing in any queue. The page asks again every 10 seconds (task board: polling
// every 10 to 15 seconds, realtime later).
export async function getMyQueue(): Promise<MyQueue | null> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const mode = getMockMode()
      if (mode === 'error') throw new Error('Mock error: could not load the queue')
      if (mode === 'empty') return null

      const steps = Math.min(MAX_STEPS, Math.floor(calls / CALLS_PER_STEP))
      calls += 1

      const mine = queueEntries.find(
        (entry) =>
          entry.customer_id === DEMO_CUSTOMER_ID && (entry.status === 'waiting' || entry.status === 'in_service'),
      )
      if (!mine) return null

      const shopEntries = advance(
        queueEntries.filter((entry) => entry.shop_id === mine.shop_id),
        steps,
      )
      const me = shopEntries.find((entry) => entry.id === mine.id)
      if (!me || (me.status !== 'waiting' && me.status !== 'in_service')) return null

      const rows: QueueRow[] = shopEntries
        .filter((entry) => entry.status === 'in_service' || entry.status === 'waiting')
        .sort((a, b) => {
          if (a.status !== b.status) return a.status === 'in_service' ? -1 : 1
          return (a.position ?? 0) - (b.position ?? 0)
        })
        .map((entry) => ({
          id: entry.id,
          is_you: entry.id === me.id,
          is_walk_in: entry.is_walk_in,
          status: entry.status,
          position: entry.position,
          estimated_wait_minutes: entry.estimated_wait_minutes,
          joined_at: entry.joined_at,
        }))

      return {
        shop_id: me.shop_id,
        shop_name: shops.find((shop) => shop.id === me.shop_id)?.name ?? '',
        booking_id: me.booking_id,
        status: me.status === 'in_service' ? 'in_service' : 'waiting',
        position: me.position,
        people_ahead: me.position === null ? 0 : me.position - 1,
        in_service_count: shopEntries.filter((entry) => entry.status === 'in_service').length,
        estimated_wait_minutes: me.estimated_wait_minutes,
        staff_name: staffMembers.find((member) => member.id === me.staff_id)?.full_name ?? null,
        service_names: me.service_ids.map((id) => services.find((service) => service.id === id)?.name ?? ''),
        rows,
        updated_at: new Date().toISOString(),
      }
    })
  }
  throw new Error('The real queue API is not wired yet')
}
