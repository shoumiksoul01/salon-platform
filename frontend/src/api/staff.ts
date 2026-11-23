import {
  DEMO_SHOP_ID,
  bookings,
  staffBreaks,
  staffHours,
  staffMembers,
  staffServices,
  staffTimeOff,
} from '../mocks/bookings'
import type { Staff } from '../mocks/bookings'
import { getMockMode, mockDelay } from './mock'

// true = use the fixtures in src/mocks/. Set to false in the wire-up commit for FR-01.5.
// Pages call the functions below and never import the fixtures.
const USE_MOCK = true

export type { Staff }

// A staff member of the owner's shop, with the ids of the services they do and the
// number of bookings still to come. upcoming_count is a display field the real API joins.
export interface OwnerStaff extends Staff {
  service_ids: string[]
  upcoming_count: number
}

// What the owner types in the staff form.
export interface StaffInput {
  full_name: string
  phone: string
  role_title: string
  service_ids: string[]
}

export type StaffErrorCode = 'phone_taken' | 'failed'

export class StaffError extends Error {
  code: StaffErrorCode
  constructor(code: StaffErrorCode) {
    super(code)
    this.name = 'StaffError'
    this.code = code
  }
}

// Phone numbers are kept without spaces, hyphens and the +88 or 88 prefix.
export function normaliseStaffPhone(phone: string): string {
  return phone.replace(/[\s-]/g, '').replace(/^\+?88/, '')
}

// The mock keeps changes in memory only, so they reset when the page is reloaded.
let mockStaff: Staff[] | null = null
let mockLinks: { staff_id: string; service_id: string }[] | null = null

function store() {
  if (!mockStaff || !mockLinks) {
    mockStaff = staffMembers
      .filter((member) => member.shop_id === DEMO_SHOP_ID)
      .map((member) => ({ ...member, phone: normaliseStaffPhone(member.phone) }))
    const ids = new Set(mockStaff.map((member) => member.id))
    mockLinks = staffServices.filter((link) => ids.has(link.staff_id)).map((link) => ({ ...link }))
  }
  return { staff: mockStaff, links: mockLinks }
}

const UPCOMING = ['pending', 'confirmed']

function view(member: Staff): OwnerStaff {
  const now = Date.now()
  return {
    ...member,
    service_ids: store()
      .links.filter((link) => link.staff_id === member.id)
      .map((link) => link.service_id),
    upcoming_count: bookings.filter(
      (booking) =>
        booking.staff_id === member.id &&
        UPCOMING.includes(booking.status) &&
        Date.parse(booking.starts_at) > now,
    ).length,
  }
}

function setLinks(staffId: string, serviceIds: string[]) {
  const data = store()
  data.links.splice(0, data.links.length, ...data.links.filter((link) => link.staff_id !== staffId))
  serviceIds.forEach((serviceId) => data.links.push({ staff_id: staffId, service_id: serviceId }))
}

function checkPhone(phone: string, exceptId: string | null) {
  const taken = store().staff.some((member) => member.id !== exceptId && member.phone === phone)
  if (taken) throw new StaffError('phone_taken')
}

function notWritten(): never {
  throw new Error('The real staff API is not written yet')
}

// How many staff members can serve customers. The live queue uses it for the waiting time.
export function activeStaffCountNow(): number {
  return store().staff.filter((member) => member.is_active).length
}

// All staff of the owner's shop, active and inactive.
export async function listStaff(): Promise<OwnerStaff[]> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const mode = getMockMode()
      if (mode === 'error') throw new Error('Mock error: could not load the staff')
      if (mode === 'empty') return []
      return store().staff.map(view)
    })
  }
  return notWritten()
}

// The staff member can log in after setting a password with the Reset password page (AUTH-04).
export async function createStaff(input: StaffInput): Promise<OwnerStaff> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const phone = normaliseStaffPhone(input.phone)
      checkPhone(phone, null)
      const member: Staff = {
        id: crypto.randomUUID(),
        shop_id: DEMO_SHOP_ID,
        user_id: crypto.randomUUID(),
        full_name: input.full_name,
        phone,
        role_title: input.role_title,
        is_active: true,
      }
      store().staff.push(member)
      setLinks(member.id, input.service_ids)
      return view(member)
    })
  }
  return notWritten()
}

export async function updateStaff(id: string, input: StaffInput): Promise<OwnerStaff> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const member = store().staff.find((item) => item.id === id)
      if (!member) throw new StaffError('failed')
      const phone = normaliseStaffPhone(input.phone)
      checkPhone(phone, id)
      Object.assign(member, { full_name: input.full_name, phone, role_title: input.role_title })
      setLinks(id, input.service_ids)
      return view(member)
    })
  }
  return notWritten()
}

// A deactivated staff member cannot log in and gets no new bookings.
// Bookings they already have stay as they are.
export async function setStaffActive(id: string, isActive: boolean): Promise<OwnerStaff> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const member = store().staff.find((item) => item.id === id)
      if (!member) throw new StaffError('failed')
      member.is_active = isActive
      return view(member)
    })
  }
  return notWritten()
}

// ---------------------------------------------------------------------------
// Availability (UI-SM-20): weekly hours, breaks and blocked time of one staff member
// ---------------------------------------------------------------------------

// day_of_week: 0 = Sunday ... 6 = Saturday. Times are local shop time, "HH:MM".
// A break with day_of_week null repeats on every working day.
// Blocked time is ISO UTC.
export interface StaffSchedule {
  hours: { day_of_week: number; opens_at: string; closes_at: string; is_closed: boolean }[]
  breaks: { id: string; day_of_week: number | null; starts_at: string; ends_at: string; label: string }[]
  time_off: { id: string; starts_at: string; ends_at: string; reason: string }[]
}

export interface StaffAvailability {
  member: OwnerStaff
  schedule: StaffSchedule
}

// A new staff member starts with 10:00 to 20:00, closed on Friday.
const DEFAULT_HOURS: StaffSchedule['hours'] = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
  day_of_week: day,
  opens_at: '10:00',
  closes_at: '20:00',
  is_closed: day === 5,
}))

const mockSchedules = new Map<string, StaffSchedule>()

function cloneSchedule(schedule: StaffSchedule): StaffSchedule {
  return {
    hours: schedule.hours.map((item) => ({ ...item })),
    breaks: schedule.breaks.map((item) => ({ ...item })),
    time_off: schedule.time_off.map((item) => ({ ...item })),
  }
}

function scheduleOf(staffId: string): StaffSchedule {
  let schedule = mockSchedules.get(staffId)
  if (!schedule) {
    const hours = staffHours
      .filter((item) => item.staff_id === staffId)
      .map((item) => ({
        day_of_week: item.day_of_week,
        opens_at: item.opens_at,
        closes_at: item.closes_at,
        is_closed: item.is_closed,
      }))
    schedule = {
      hours: hours.length === 7 ? hours : DEFAULT_HOURS.map((item) => ({ ...item })),
      breaks: staffBreaks
        .filter((item) => item.staff_id === staffId)
        .map((item) => ({
          id: item.id,
          day_of_week: item.day_of_week,
          starts_at: item.starts_at,
          ends_at: item.ends_at,
          label: item.label,
        })),
      time_off: staffTimeOff
        .filter((item) => item.staff_id === staffId)
        .map((item) => ({
          id: item.id,
          starts_at: item.starts_at,
          ends_at: item.ends_at,
          reason: item.reason,
        })),
    }
    mockSchedules.set(staffId, schedule)
  }
  return schedule
}

// The staff member and their schedule, or null when this shop has no such staff member.
export async function getStaffAvailability(staffId: string): Promise<StaffAvailability | null> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const mode = getMockMode()
      if (mode === 'error') throw new Error('Mock error: could not load the availability')
      if (mode === 'empty') return null
      const member = store().staff.find((item) => item.id === staffId)
      if (!member) return null
      return { member: view(member), schedule: cloneSchedule(scheduleOf(staffId)) }
    })
  }
  return notWritten()
}

// Saves the whole schedule. It applies to new bookings. Bookings already made are not moved.
export async function saveStaffSchedule(staffId: string, schedule: StaffSchedule): Promise<StaffSchedule> {
  if (USE_MOCK) {
    return mockDelay(() => {
      if (!store().staff.some((item) => item.id === staffId)) throw new StaffError('failed')
      mockSchedules.set(staffId, cloneSchedule(schedule))
      return cloneSchedule(schedule)
    })
  }
  return notWritten()
}
