// Platform-wide numbers for the admin dashboard (FR-10.4). Money is in poisha.

export interface MonthlyStat {
  /** First day of the month as YYYY-MM, in UTC. */
  month: string
  bookings: number
  revenue_poisha: number
}

export interface AdminDashboard {
  total_shops: number
  pending_shops: number
  total_users: number
  total_bookings: number
  total_revenue_poisha: number
  monthly: MonthlyStat[]
}

export const adminDashboard: AdminDashboard = {
  total_shops: 42,
  pending_shops: 5,
  total_users: 1286,
  total_bookings: 3910,
  total_revenue_poisha: 512340000,
  monthly: [
    { month: '2026-06', bookings: 142, revenue_poisha: 18640000 },
    { month: '2026-07', bookings: 168, revenue_poisha: 22150000 },
    { month: '2026-08', bookings: 197, revenue_poisha: 26030000 },
    { month: '2026-09', bookings: 231, revenue_poisha: 31480000 },
    { month: '2026-10', bookings: 264, revenue_poisha: 35900000 },
    { month: '2026-11', bookings: 289, revenue_poisha: 40210000 },
  ],
}