import { adminDashboard } from '../mocks/adminDashboard'
import type { AdminDashboard } from '../mocks/adminDashboard'

export type { AdminDashboard, MonthlyStat } from '../mocks/adminDashboard'

const USE_MOCK = true
const DELAY_MS = 400

// Dev only: ?mock=empty or ?mock=error in the page address forces that state.
function devMockMode(): string | null {
  return import.meta.env.DEV ? new URLSearchParams(window.location.search).get('mock') : null
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  if (!USE_MOCK) {
    throw new Error('The admin dashboard API is not wired yet')
  }
  await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
  const mode = devMockMode()
  if (mode === 'error') {
    throw new Error('Mock error')
  }
  if (mode === 'empty') {
    return {
      total_shops: 0,
      pending_shops: 0,
      total_users: 0,
      total_bookings: 0,
      total_revenue_poisha: 0,
      monthly: [],
    }
  }
  return adminDashboard
}