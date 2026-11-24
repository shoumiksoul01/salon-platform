import { DEMO_SHOP_ID, bookingItems, bookings } from '../mocks/bookings'
import type { BookingStatus } from '../mocks/bookings'
import { services, shops } from '../mocks/shops'
import { getMockMode, mockDelay } from './mock'

// true = use the fixtures in src/mocks/. Set to false in the wire-up commit for FR-09.2.
// Pages call the functions below and never import the fixtures.
const USE_MOCK = true

export type { BookingStatus }

// The longest period one report can cover, in days (the first and the last day both count).
export const MAX_RANGE_DAYS = 92

export type ReportErrorCode = 'invalid_range' | 'too_long' | 'future'

export class ReportError extends Error {
  code: ReportErrorCode

  constructor(code: ReportErrorCode) {
    super(`Report failed: ${code}`)
    this.name = 'ReportError'
    this.code = code
  }
}

// One day of the report. Only days that have at least one booking are listed.
// day is a Dhaka calendar day, 'YYYY-MM-DD'.
export interface ReportDay {
  day: string
  /** Every booking of the day, including the ones that are still open. */
  bookings: number
  completed: number
  cancelled: number
  no_show: number
  /** Total price of the day's finished bookings, after offers. */
  earnings_poisha: number
}

export interface ReportService {
  service_name: string
  /** In how many finished bookings the service was booked. */
  count: number
  /** Price of the service in those bookings, before offers. */
  amount_poisha: number
}

// The booking and earnings report of FR-09.2.
// Earnings = total price of finished (completed) bookings after offers, the same rule as the
// dashboard. Cancelled, missed and still open bookings are counted but earn nothing.
export interface BookingReport {
  shop_name: string
  /** First and last day of the report, Dhaka days, 'YYYY-MM-DD'. Both are included. */
  from: string
  to: string
  generated_at: string
  total_count: number
  completed_count: number
  cancelled_count: number
  no_show_count: number
  /** Pending, confirmed, arrived and in-service bookings (only possible for today). */
  open_count: number
  earnings_poisha: number
  /** Offer discounts given on the finished bookings. */
  discount_poisha: number
  days: ReportDay[]
  services: ReportService[]
}

export interface ReportFile {
  filename: string
  blob: Blob
}

const DAY_MS = 24 * 60 * 60 * 1000
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000
const OPEN: BookingStatus[] = ['pending', 'confirmed', 'arrived', 'in_service']

// A Dhaka calendar day as 'YYYY-MM-DD'. These compare correctly as text.
const dhakaDay = (value: string | number | Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date(value))

// What the report needs from one booking.
interface Row {
  day: string
  status: BookingStatus
  total_poisha: number
  discount_poisha: number
  items: { service_name: string; price_poisha: number }[]
}

// A small seeded random generator, so the made-up history is the same on every load.
function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// The fixtures only hold a few weeks of bookings, so the mock adds about three months of
// finished, cancelled and missed bookings (Fridays skipped) to make a report worth reading.
const HISTORY_DAYS = 100

function madeUpHistory(): Row[] {
  const menu = services.filter((service) => service.shop_id === DEMO_SHOP_ID && service.is_active)
  if (menu.length === 0) return []
  const local = new Date(Date.now() + DHAKA_OFFSET_MS)
  const todayStart = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - DHAKA_OFFSET_MS
  const rows: Row[] = []

  for (let back = 1; back <= HISTORY_DAYS; back += 1) {
    const noon = todayStart - back * DAY_MS + 12 * 60 * 60 * 1000
    if (new Date(noon + DHAKA_OFFSET_MS).getUTCDay() === 5) continue
    const random = seeded(back * 7919)
    const perDay = 2 + Math.floor(random() * 4)
    for (let n = 0; n < perDay; n += 1) {
      const first = menu[Math.floor(random() * menu.length)]
      const picked = [first]
      if (random() < 0.25) {
        const second = menu[Math.floor(random() * menu.length)]
        if (second.id !== first.id) picked.push(second)
      }
      const draw = random()
      const status: BookingStatus = draw < 0.8 ? 'completed' : draw < 0.92 ? 'cancelled' : 'no_show'
      const subtotal = picked.reduce((sum, service) => sum + service.price_poisha, 0)
      const discount = status === 'completed' && random() < 0.2 ? Math.round(subtotal / 10) : 0
      rows.push({
        day: dhakaDay(noon),
        status,
        total_poisha: subtotal - discount,
        discount_poisha: discount,
        items: picked.map((service) => ({ service_name: service.name, price_poisha: service.price_poisha })),
      })
    }
  }
  return rows
}

function allRows(): Row[] {
  const fixtureRows: Row[] = bookings
    .filter((booking) => booking.shop_id === DEMO_SHOP_ID)
    .map((booking) => ({
      day: dhakaDay(booking.starts_at),
      status: booking.status,
      total_poisha: booking.total_poisha,
      discount_poisha: booking.discount_poisha,
      items: bookingItems
        .filter((item) => item.booking_id === booking.id)
        .map((item) => ({ service_name: item.service_name, price_poisha: item.price_poisha })),
    }))
  return [...fixtureRows, ...madeUpHistory()]
}

const isDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))

// Days from `from` to `to`, both included.
const daysIn = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1

function build(from: string, to: string): BookingReport {
  const shopName = shops.find((shop) => shop.id === DEMO_SHOP_ID)?.name ?? ''
  const base: BookingReport = {
    shop_name: shopName,
    from,
    to,
    generated_at: new Date().toISOString(),
    total_count: 0,
    completed_count: 0,
    cancelled_count: 0,
    no_show_count: 0,
    open_count: 0,
    earnings_poisha: 0,
    discount_poisha: 0,
    days: [],
    services: [],
  }
  if (getMockMode() === 'empty') return base

  const inRange = allRows().filter((row) => row.day >= from && row.day <= to)
  const perDay = new Map<string, ReportDay>()
  const perService = new Map<string, ReportService>()

  for (const row of inRange) {
    base.total_count += 1
    const day = perDay.get(row.day) ?? {
      day: row.day,
      bookings: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
      earnings_poisha: 0,
    }
    day.bookings += 1

    if (row.status === 'completed') {
      base.completed_count += 1
      base.earnings_poisha += row.total_poisha
      base.discount_poisha += row.discount_poisha
      day.completed += 1
      day.earnings_poisha += row.total_poisha
      for (const item of row.items) {
        const line = perService.get(item.service_name) ?? {
          service_name: item.service_name,
          count: 0,
          amount_poisha: 0,
        }
        line.count += 1
        line.amount_poisha += item.price_poisha
        perService.set(item.service_name, line)
      }
    } else if (row.status === 'cancelled') {
      base.cancelled_count += 1
      day.cancelled += 1
    } else if (row.status === 'no_show') {
      base.no_show_count += 1
      day.no_show += 1
    } else if (OPEN.includes(row.status)) {
      base.open_count += 1
    }
    perDay.set(row.day, day)
  }

  base.days = [...perDay.values()].sort((a, b) => a.day.localeCompare(b.day))
  base.services = [...perService.values()].sort(
    (a, b) => b.amount_poisha - a.amount_poisha || a.service_name.localeCompare(b.service_name),
  )
  return base
}

function notWritten(): never {
  throw new Error('The real reports API is not written yet')
}

// Works out the report for a period. from and to are Dhaka days, 'YYYY-MM-DD', both included.
// Throws ReportError: invalid_range (missing, badly written or from after to), too_long
// (more than MAX_RANGE_DAYS days) or future (to is after today).
export async function generateReport(from: string, to: string): Promise<BookingReport> {
  if (USE_MOCK) {
    return mockDelay(() => {
      if (getMockMode() === 'error') throw new Error('Mock error: could not create the report')
      if (!isDay(from) || !isDay(to) || from > to) throw new ReportError('invalid_range')
      if (daysIn(from, to) > MAX_RANGE_DAYS) throw new ReportError('too_long')
      if (to > dhakaDay(Date.now())) throw new ReportError('future')
      return build(from, to)
    })
  }
  return notWritten()
}

// Cells that start with these characters can run as a formula when the file is opened in Excel,
// so the report puts an apostrophe in front of them. Quotes are doubled, as CSV requires.
function cell(value: string | number): string {
  const text = String(value)
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

const taka = (poisha: number) => (poisha / 100).toFixed(2)

// The report as CSV text. The words in the file are English, so it reads the same on every
// computer. Amounts are in taka with two decimals.
export function reportToCsv(report: BookingReport): string {
  const lines: Array<Array<string | number>> = [
    ['Booking and earnings report'],
    ['Shop', report.shop_name],
    ['From', report.from],
    ['To', report.to],
    ['Created at (UTC)', report.generated_at],
    [],
    ['Summary'],
    ['Bookings', report.total_count],
    ['Completed', report.completed_count],
    ['Cancelled', report.cancelled_count],
    ['No-shows', report.no_show_count],
    ['Still open', report.open_count],
    ['Earnings (BDT)', taka(report.earnings_poisha)],
    ['Offer discounts on finished bookings (BDT)', taka(report.discount_poisha)],
    [],
    ['By day'],
    ['Date', 'Bookings', 'Completed', 'Cancelled', 'No-shows', 'Earnings (BDT)'],
    ...report.days.map((day) => [
      day.day,
      day.bookings,
      day.completed,
      day.cancelled,
      day.no_show,
      taka(day.earnings_poisha),
    ]),
    [],
    ['By service (finished bookings)'],
    ['Service', 'Bookings', 'Amount before offers (BDT)'],
    ...report.services.map((line) => [line.service_name, line.count, taka(line.amount_poisha)]),
  ]
  return lines.map((line) => line.map(cell).join(',')).join('\r\n')
}

// The report as a file the owner can download. The real API will send the file itself.
// The byte order mark at the start makes Excel read the file as UTF-8.
export async function getReportFile(report: BookingReport): Promise<ReportFile> {
  if (USE_MOCK) {
    return {
      filename: `report-${report.from}-to-${report.to}.csv`,
      blob: new Blob([`\uFEFF${reportToCsv(report)}`], { type: 'text/csv;charset=utf-8' }),
    }
  }
  return notWritten()
}
