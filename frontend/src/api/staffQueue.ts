import { staffMembers } from '../mocks/bookings'
import { services as serviceFixtures } from '../mocks/shops'
import { applyQueueAction, getOwnerQueue } from './ownerQueue'
import type { OwnerQueue, QueueEntry } from './ownerQueue'
import { currentStaffId } from './staffBookings'

// true = use the fixtures in src/mocks/. Set to false in the wire-up commit for FR-06.1 and FR-06.3.
// Pages call the functions below and never import the fixtures.
const USE_MOCK = true

export type { QueueEntry }

// A person in the queue with the names of their services, so the page needs no lookup.
export interface StaffQueueEntry extends QueueEntry {
  service_names: string[]
}

// The queue as the signed-in staff member sees it (STF-02). The waiting times and positions are
// the shop's, worked out by the server (FR-06.2). `entries` holds the people this staff member is
// serving first, then the people waiting for them or for any staff member, in queue order.
export interface StaffQueue {
  staff_id: string
  staff_name: string
  entries: StaffQueueEntry[]
  updated_at: string
}

// start: the next person sits down. finish: the service is done. Removing someone from the
// queue stays with the owner.
export type StaffQueueAction = 'start' | 'finish'

// The mock does not give a walk-in "any staff" person to anyone when they are started, so the
// ids this staff member started are remembered, and those people stay in their list.
const startedByMe = new Set<string>()

const serviceNames = new Map(serviceFixtures.map((service) => [service.id, service.name]))

function notWritten(): never {
  throw new Error('The real staff queue API is not written yet')
}

function forStaff(queue: OwnerQueue): StaffQueue {
  const staffId = currentStaffId()
  return {
    staff_id: staffId,
    staff_name: staffMembers.find((member) => member.id === staffId)?.full_name ?? '',
    entries: queue.entries
      .filter((entry) =>
        entry.status === 'in_service'
          ? entry.staff_id === staffId || startedByMe.has(entry.id)
          : entry.status === 'waiting' && (entry.staff_id === staffId || entry.staff_id === null),
      )
      .map((entry) => ({
        ...entry,
        service_names: entry.service_ids
          .map((id) => serviceNames.get(id))
          .filter((name): name is string => Boolean(name)),
      })),
    updated_at: queue.updated_at,
  }
}

// The queue as it is now. The page asks again every 10 seconds (polling, realtime later).
export async function getStaffQueue(): Promise<StaffQueue> {
  if (USE_MOCK) return forStaff(await getOwnerQueue())
  return notWritten()
}

// Starts or finishes one person. For a booked customer the booking status follows
// (in service, completed), the same as on the owner queue page.
export async function applyStaffQueueAction(id: string, action: StaffQueueAction): Promise<StaffQueue> {
  if (USE_MOCK) {
    if (action === 'start') startedByMe.add(id)
    try {
      return forStaff(await applyQueueAction(id, action))
    } catch (error) {
      if (action === 'start') startedByMe.delete(id)
      throw error
    }
  }
  return notWritten()
}
