import { DEMO_CUSTOMER_ID, notifications } from '../mocks/bookings'
import type { Notification as NotificationRow, NotificationType } from '../mocks/bookings'
import { getMockMode, mockDelay } from './mock'

// true = use the fixtures in src/mocks/. Set to false in the wire-up commit for C-08.
// Pages call the functions below and never import the fixtures.
const USE_MOCK = true

export type { NotificationType }
export type MyNotification = NotificationRow

// Ids the demo customer has read during this visit. It resets when the page is reloaded.
const readInMock = new Set<string>()

// The signed-in customer's notifications (CUS-03), newest first.
export async function listMyNotifications(): Promise<MyNotification[]> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const mode = getMockMode()
      if (mode === 'error') throw new Error('Mock error: could not load notifications')
      if (mode === 'empty') return []
      return notifications
        .filter((item) => item.user_id === DEMO_CUSTOMER_ID)
        .map((item) => ({ ...item, is_read: item.is_read || readInMock.has(item.id) }))
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    })
  }
  throw new Error('The real notifications API is not wired yet')
}

export async function markNotificationRead(id: string): Promise<void> {
  if (USE_MOCK) {
    return mockDelay(() => {
      readInMock.add(id)
    })
  }
  throw new Error('The real notifications API is not wired yet')
}

export async function markAllNotificationsRead(): Promise<void> {
  if (USE_MOCK) {
    return mockDelay(() => {
      notifications
        .filter((item) => item.user_id === DEMO_CUSTOMER_ID)
        .forEach((item) => readInMock.add(item.id))
    })
  }
  throw new Error('The real notifications API is not wired yet')
}