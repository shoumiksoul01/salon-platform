// Mock fixtures for staff, bookings, payments, queue entries and notifications (UI-SM-01).
// Shaped like the draft schema and built on the shared fixtures in ./shops:
// same shop, service and offer ids, same names (day_of_week, status, ...),
// snake_case fields, UUID ids, UTC ISO timestamps, money as integer poisha.
// Status values follow docs/api-conventions.md.
// Pages never import this file. They call functions in src/api/, which switch
// between these mocks and the real API with USE_MOCK.
//
// Dates are worked out from the day the app is opened, in Bangladesh time
// (UTC+6), so "today" always has bookings and a queue for the demo.

import { offerServices, offers, reviews, services, shops } from './shops'

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'arrived'
  | 'in_service'
  | 'completed'
  | 'cancelled'
  | 'no_show'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type PaymentMethod = 'bkash' | 'nagad' | 'card' | 'pay_at_shop'
export type QueueStatus = 'waiting' | 'in_service' | 'completed' | 'cancelled'
export type CancelledBy = 'customer' | 'shop'

export type NotificationType =
  | 'booking_requested'
  | 'booking_confirmed'
  | 'booking_rejected'
  | 'booking_cancelled'
  | 'booking_rescheduled'
  | 'booking_assigned'
  | 'confirm_request'
  | 'slot_released'
  | 'payment_received'
  | 'refund_issued'
  | 'queue_turn_near'
  | 'queue_wait_changed'
  | 'review_received'

export interface Staff {
  id: string
  shop_id: string
  user_id: string
  full_name: string
  phone: string
  role_title: string
  is_active: boolean
}

export interface StaffService {
  staff_id: string
  service_id: string
}

// day_of_week: 0 = Sunday ... 6 = Saturday. Times are local shop time, "HH:MM".
export interface StaffHours {
  staff_id: string
  day_of_week: number
  starts_at: string
  ends_at: string
  is_off: boolean
}

// day_of_week null = every working day.
export interface StaffBreak {
  id: string
  staff_id: string
  day_of_week: number | null
  starts_at: string
  ends_at: string
  label: string
}

// Holiday or emergency block, in UTC.
export interface StaffTimeOff {
  id: string
  staff_id: string
  starts_at: string
  ends_at: string
  reason: string
}

// customer_name is a display field that the real API will join from users.
// hold_expires_at is only set while the booking waits for its online payment.
// confirmation_requested_at and customer_confirmed_at belong to FR-05.
export interface Booking {
  id: string
  shop_id: string
  customer_id: string
  customer_name: string
  staff_id: string | null
  offer_id: string | null
  starts_at: string
  ends_at: string
  status: BookingStatus
  subtotal_poisha: number
  discount_poisha: number
  total_poisha: number
  paid_poisha: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  hold_expires_at: string | null
  confirmation_requested_at: string | null
  customer_confirmed_at: string | null
  cancelled_by: CancelledBy | null
  cancel_reason: string | null
  created_at: string
}

// service_name is a display field that the real API will join from services.
export interface BookingItem {
  id: string
  booking_id: string
  service_id: string
  service_name: string
  price_poisha: number
  duration_minutes: number
}

export interface Payment {
  id: string
  booking_id: string
  method: PaymentMethod
  status: PaymentStatus
  amount_poisha: number
  refunded_poisha: number
  transaction_ref: string | null
  paid_at: string | null
  created_at: string
}

// booking_id is null and customer_id is null for a walk-in who has no account.
// position is the place among waiting entries (1 = next), null when not waiting.
export interface QueueEntry {
  id: string
  shop_id: string
  booking_id: string | null
  customer_id: string | null
  customer_name: string
  service_ids: string[]
  staff_id: string | null
  status: QueueStatus
  is_walk_in: boolean
  position: number | null
  estimated_wait_minutes: number | null
  joined_at: string
}

// The text is not stored. The page builds it from type and params with i18n.
export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  params: Record<string, string | number>
  booking_id: string | null
  is_read: boolean
  created_at: string
}

// Readable fixed UUIDs: the first group says what kind of row it is.
// Groups 1 to 6 are the ones used in ./shops. Do not reuse them.
const uid = (group: number, n: number): string =>
  `${String(group).padStart(8, '0')}-0000-4000-8000-${String(n).padStart(12, '0')}`
const SHOP = 1
const SERVICE = 2
const OFFER = 3
const USER = 5
const BOOKING = 6
const STAFF = 7
const BOOKING_ITEM = 8
const PAYMENT = 9
const QUEUE = 10
const NOTIFICATION = 11
const STAFF_BREAK = 12
const TIME_OFF = 13

// The customer, owner and staff member that the demo pages are signed in as.
// DEMO_CUSTOMER_ID is the id in mocks/profile.ts (Nusrat Jahan).
export const DEMO_CUSTOMER_ID = '3f2b8c1e-5d4a-4e7b-9c21-8a7d6e5f4b3a'
export const DEMO_CUSTOMER_NAME = 'Nusrat Jahan'
export const DEMO_OWNER_ID = uid(USER, 1) // owner of Rupa Beauty Lounge
export const DEMO_SHOP_ID = uid(SHOP, 1)
export const DEMO_STAFF_ID = uid(STAFF, 1)
export const DEMO_STAFF_USER_ID = uid(USER, 201)

// ---------------------------------------------------------------------------
// Time helpers (Bangladesh time is UTC+6, no daylight saving)
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000

const startOfTodayMs = ((): number => {
  const local = new Date(Date.now() + DHAKA_OFFSET_MS)
  return (
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) -
    DHAKA_OFFSET_MS
  )
})()

// at(0, '14:30') = today 14:30 in Dhaka. at(-3, ...) = three days ago.
const atMs = (dayOffset: number, time: string): number => {
  const [h, m] = time.split(':').map(Number)
  return startOfTodayMs + dayOffset * DAY_MS + (h * 60 + m) * 60 * 1000
}
const at = (dayOffset: number, time: string): string =>
  new Date(atMs(dayOffset, time)).toISOString()
const minutesAgo = (minutes: number): string =>
  new Date(Date.now() - minutes * 60 * 1000).toISOString()
const plusMinutes = (iso: string, minutes: number): string =>
  new Date(Date.parse(iso) + minutes * 60 * 1000).toISOString()

// ---------------------------------------------------------------------------
// Staff, their services, weekly hours, breaks and time off
// ---------------------------------------------------------------------------

const staffMember = (
  n: number,
  shop: number,
  fullName: string,
  roleTitle: string,
): Staff => ({
  id: uid(STAFF, n),
  shop_id: uid(SHOP, shop),
  user_id: uid(USER, 200 + n),
  full_name: fullName,
  phone: `01800-0000${String(n).padStart(2, '0')}`,
  role_title: roleTitle,
  is_active: true,
})

export const staffMembers: Staff[] = [
  staffMember(1, 1, 'Shirin Akter', 'Senior stylist'),
  staffMember(2, 1, 'Mitu Rani', 'Beautician'),
  staffMember(3, 1, 'Lipi Khatun', 'Makeup artist'),
  staffMember(4, 2, 'Sohel Rana', 'Barber'),
  staffMember(5, 2, 'Jewel Mia', 'Barber'),
  staffMember(6, 3, 'Nasrin Begum', 'Stylist'),
  staffMember(7, 3, 'Rokeya Sultana', 'Beautician'),
  staffMember(8, 4, 'Kamal Hossain', 'Barber'),
  staffMember(9, 4, 'Babul Mia', 'Barber'),
  staffMember(10, 5, 'Sumaiya Islam', 'Stylist'),
  staffMember(11, 5, 'Tuhin Ahmed', 'Stylist'),
  staffMember(12, 6, 'Poly Das', 'Beautician'),
  staffMember(13, 6, 'Jui Akter', 'Makeup artist'),
]

// [staff number, service numbers from ./shops]
const staffServiceMap: [number, number[]][] = [
  [1, [1, 4]],
  [2, [2, 4]],
  [3, [3, 1]],
  [4, [5, 6, 7, 8]],
  [5, [5, 6, 8]],
  [6, [9, 10, 11]],
  [7, [10, 11, 12]],
  [8, [13, 14, 15, 16]],
  [9, [13, 14, 15]],
  [10, [17, 18, 19, 20]],
  [11, [17, 19, 20]],
  [12, [21, 22, 24]],
  [13, [23, 24]],
]

export const staffServices: StaffService[] = staffServiceMap.flatMap(
  ([staff, serviceNumbers]) =>
    serviceNumbers.map((service) => ({
      staff_id: uid(STAFF, staff),
      service_id: uid(SERVICE, service),
    })),
)

const weekHours = (
  staff: number,
  startsAt: string,
  endsAt: string,
  offDays: number[],
): StaffHours[] =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    staff_id: uid(STAFF, staff),
    day_of_week: day,
    starts_at: startsAt,
    ends_at: endsAt,
    is_off: offDays.includes(day),
  }))

export const staffHours: StaffHours[] = [
  ...weekHours(1, '10:00', '20:00', [5]),
  ...weekHours(2, '10:00', '20:00', [5, 4]),
  ...weekHours(3, '11:00', '19:00', [5]),
  ...weekHours(4, '10:00', '22:00', []),
  ...weekHours(5, '12:00', '22:00', [2]),
  ...weekHours(6, '09:30', '19:30', [5]),
  ...weekHours(7, '09:30', '17:30', [5]),
  ...weekHours(8, '11:00', '23:00', []),
  ...weekHours(9, '11:00', '23:00', [0]),
  ...weekHours(10, '10:00', '21:00', [5]),
  ...weekHours(11, '10:00', '21:00', [5, 6]),
  ...weekHours(12, '10:00', '20:00', [5]),
  ...weekHours(13, '10:00', '20:00', [5]),
]

const lunchBreak = (staff: number, from: string, to: string): StaffBreak => ({
  id: uid(STAFF_BREAK, staff),
  staff_id: uid(STAFF, staff),
  day_of_week: null,
  starts_at: from,
  ends_at: to,
  label: 'Lunch',
})

export const staffBreaks: StaffBreak[] = [
  lunchBreak(1, '14:00', '14:45'),
  lunchBreak(2, '13:30', '14:15'),
  lunchBreak(3, '14:30', '15:15'),
  lunchBreak(4, '15:00', '15:45'),
  lunchBreak(5, '16:00', '16:45'),
  lunchBreak(6, '13:30', '14:15'),
  lunchBreak(7, '13:00', '13:45'),
  lunchBreak(8, '15:00', '15:45'),
  lunchBreak(9, '16:00', '16:45'),
  lunchBreak(10, '14:00', '14:45'),
  lunchBreak(11, '14:30', '15:15'),
  lunchBreak(12, '13:30', '14:15'),
  lunchBreak(13, '14:30', '15:15'),
]

export const staffTimeOff: StaffTimeOff[] = [
  {
    id: uid(TIME_OFF, 1),
    staff_id: uid(STAFF, 2),
    starts_at: at(4, '00:00'),
    ends_at: at(5, '00:00'),
    reason: 'Family event',
  },
  {
    id: uid(TIME_OFF, 2),
    staff_id: uid(STAFF, 3),
    starts_at: at(9, '00:00'),
    ends_at: at(12, '00:00'),
    reason: 'Holiday',
  },
  {
    id: uid(TIME_OFF, 3),
    staff_id: uid(STAFF, 6),
    starts_at: at(2, '12:00'),
    ends_at: at(2, '17:30'),
    reason: 'Emergency',
  },
]

// ---------------------------------------------------------------------------
// Bookings, their items and payments
// ---------------------------------------------------------------------------

const serviceByNumber = (n: number) => {
  const found = services.find((s) => s.id === uid(SERVICE, n))
  if (!found) throw new Error(`Missing service fixture ${n}`)
  return found
}

// Offer discount: a percentage or fixed offer applies to the booked services
// it is linked to; a combo applies only when every linked service is booked.
const offerDiscount = (offerNumber: number, serviceNumbers: number[]): number => {
  const offer = offers.find((o) => o.id === uid(OFFER, offerNumber))
  if (!offer) return 0
  const linked = offerServices
    .filter((link) => link.offer_id === offer.id)
    .map((link) => link.service_id)
  const booked = serviceNumbers.map((n) => uid(SERVICE, n))
  const matching = linked.filter((id) => booked.includes(id))
  if (offer.offer_type === 'combo') {
    return matching.length === linked.length ? (offer.discount_poisha ?? 0) : 0
  }
  if (matching.length === 0) return 0
  if (offer.offer_type === 'percentage') {
    const base = matching.reduce(
      (sum, id) => sum + (services.find((s) => s.id === id)?.price_poisha ?? 0),
      0,
    )
    return Math.round((base * (offer.discount_percent ?? 0)) / 100)
  }
  return offer.discount_poisha ?? 0
}

interface BookingInput {
  n: number
  shop: number
  customerId: string
  customerName: string
  staff: number | null
  services: number[]
  startsAt: string
  status: BookingStatus
  method: PaymentMethod
  payment: PaymentStatus
  // Share of the total paid online: 30 = deposit, 100 = full. Ignored for pay_at_shop.
  paidPercent?: number
  offer?: number
  createdAt?: string
  holdExpiresAt?: string | null
  confirmationRequestedAt?: string | null
  customerConfirmedAt?: string | null
  cancelledBy?: CancelledBy | null
  cancelReason?: string | null
}

const bookingRows: Booking[] = []
const bookingItemRows: BookingItem[] = []
const paymentRows: Payment[] = []

const addBooking = (input: BookingInput): void => {
  const picked = input.services.map(serviceByNumber)
  const subtotal = picked.reduce((sum, s) => sum + s.price_poisha, 0)
  const duration = picked.reduce((sum, s) => sum + s.duration_minutes, 0)
  const discount = input.offer ? offerDiscount(input.offer, input.services) : 0
  const total = subtotal - discount
  const id = uid(BOOKING, input.n)
  const createdAt = input.createdAt ?? plusMinutes(input.startsAt, -2 * 24 * 60)

  const online = input.method !== 'pay_at_shop'
  const percent = input.paidPercent ?? 100
  const amount = online ? Math.round((total * percent) / 100) : total
  const hasPayment =
    online || input.payment === 'paid' || input.payment === 'refunded'
  const paid = input.payment === 'paid' ? amount : 0

  bookingRows.push({
    id,
    shop_id: uid(SHOP, input.shop),
    customer_id: input.customerId,
    customer_name: input.customerName,
    staff_id: input.staff ? uid(STAFF, input.staff) : null,
    offer_id: input.offer && discount > 0 ? uid(OFFER, input.offer) : null,
    starts_at: input.startsAt,
    ends_at: plusMinutes(input.startsAt, duration),
    status: input.status,
    subtotal_poisha: subtotal,
    discount_poisha: discount,
    total_poisha: total,
    paid_poisha: paid,
    payment_method: input.method,
    payment_status: input.payment,
    hold_expires_at: input.holdExpiresAt ?? null,
    confirmation_requested_at: input.confirmationRequestedAt ?? null,
    customer_confirmed_at: input.customerConfirmedAt ?? null,
    cancelled_by: input.cancelledBy ?? null,
    cancel_reason: input.cancelReason ?? null,
    created_at: createdAt,
  })

  picked.forEach((s, index) => {
    bookingItemRows.push({
      id: uid(BOOKING_ITEM, input.n * 10 + index + 1),
      booking_id: id,
      service_id: s.id,
      service_name: s.name,
      price_poisha: s.price_poisha,
      duration_minutes: s.duration_minutes,
    })
  })

  if (hasPayment) {
    const settled = input.payment === 'paid' || input.payment === 'refunded'
    paymentRows.push({
      id: uid(PAYMENT, input.n),
      booking_id: id,
      method: input.method,
      status: input.payment,
      amount_poisha: amount,
      refunded_poisha: input.payment === 'refunded' ? amount : 0,
      transaction_ref: online && settled ? `TXN${String(700000 + input.n)}` : null,
      paid_at: settled ? plusMinutes(createdAt, 3) : null,
      created_at: createdAt,
    })
  }
}

// Customers who are not the demo customer.
const customer = (n: number) => uid(USER, 300 + n)

// 1. One completed booking for every review in ./shops, so booking_id of each
//    review points at a real booking (same customer, same shop).
const METHODS: PaymentMethod[] = ['bkash', 'nagad', 'card', 'pay_at_shop']
reviews.forEach((review, index) => {
  const shopNumber = shops.findIndex((s) => s.id === review.shop_id) + 1
  const shopServices = services.filter((s) => s.shop_id === review.shop_id)
  const serviceNumber = Number(
    shopServices[index % shopServices.length].id.slice(-12),
  )
  const shopStaff = staffMembers.filter((s) => s.shop_id === review.shop_id)
  const staffNumber = Number(shopStaff[index % shopStaff.length].id.slice(-12))
  const allowed = shops[shopNumber - 1].allowed_payment_modes
  const method =
    allowed.length === 1 && allowed[0] === 'pay_at_shop'
      ? 'pay_at_shop'
      : METHODS[index % 3]
  addBooking({
    n: Number(review.booking_id.slice(-12)),
    shop: shopNumber,
    customerId: review.customer_id,
    customerName: review.customer_name,
    staff: staffNumber,
    services: [serviceNumber],
    startsAt: plusMinutes(review.created_at, -3 * 60),
    status: 'completed',
    method,
    payment: 'paid',
    customerConfirmedAt: plusMinutes(review.created_at, -26 * 60),
  })
})

// 2. The demo customer (Nusrat Jahan), for CUS-01 My bookings.
addBooking({
  n: 101,
  shop: 1,
  customerId: DEMO_CUSTOMER_ID,
  customerName: DEMO_CUSTOMER_NAME,
  staff: 1,
  services: [1, 2],
  startsAt: at(1, '15:00'),
  status: 'confirmed',
  method: 'bkash',
  payment: 'paid',
  paidPercent: 30,
  createdAt: minutesAgo(3 * 24 * 60),
})
addBooking({
  n: 102,
  shop: 3,
  customerId: DEMO_CUSTOMER_ID,
  customerName: DEMO_CUSTOMER_NAME,
  staff: 7,
  services: [10],
  startsAt: at(3, '12:00'),
  status: 'pending', // Nilima Salon requires booking approval
  method: 'pay_at_shop',
  payment: 'pending',
  offer: 3,
  createdAt: minutesAgo(5 * 60),
})
addBooking({
  n: 103,
  shop: 1,
  customerId: DEMO_CUSTOMER_ID,
  customerName: DEMO_CUSTOMER_NAME,
  staff: 3,
  services: [3],
  startsAt: at(2, '11:00'),
  status: 'confirmed',
  method: 'card',
  payment: 'paid',
  paidPercent: 30,
  offer: 1,
  createdAt: minutesAgo(6 * 24 * 60),
  confirmationRequestedAt: minutesAgo(90), // waiting for "I am coming"
})
addBooking({
  n: 104,
  shop: 6,
  customerId: DEMO_CUSTOMER_ID,
  customerName: DEMO_CUSTOMER_NAME,
  staff: 12,
  services: [21],
  startsAt: at(-7, '13:00'),
  status: 'completed', // no review yet, so the review button shows
  method: 'card',
  payment: 'paid',
  paidPercent: 100,
  customerConfirmedAt: at(-8, '18:00'),
})
addBooking({
  n: 105,
  shop: 2,
  customerId: DEMO_CUSTOMER_ID,
  customerName: DEMO_CUSTOMER_NAME,
  staff: 4,
  services: [5, 6],
  startsAt: at(-5, '17:00'),
  status: 'cancelled',
  method: 'nagad',
  payment: 'refunded',
  paidPercent: 100,
  cancelledBy: 'customer',
  cancelReason: 'Change of plan',
})
addBooking({
  n: 106,
  shop: 1,
  customerId: DEMO_CUSTOMER_ID,
  customerName: DEMO_CUSTOMER_NAME,
  staff: 2,
  services: [4],
  startsAt: at(-14, '16:00'),
  status: 'no_show',
  method: 'pay_at_shop',
  payment: 'pending',
  customerConfirmedAt: at(-15, '19:00'),
})
addBooking({
  n: 107,
  shop: 1,
  customerId: DEMO_CUSTOMER_ID,
  customerName: DEMO_CUSTOMER_NAME,
  staff: 1,
  services: [1],
  startsAt: at(0, '13:15'),
  status: 'arrived', // in today's live queue (CUS-02)
  method: 'pay_at_shop',
  payment: 'pending',
  createdAt: minutesAgo(2 * 24 * 60),
  customerConfirmedAt: minutesAgo(5 * 60),
})
addBooking({
  n: 108,
  shop: 4,
  customerId: DEMO_CUSTOMER_ID,
  customerName: DEMO_CUSTOMER_NAME,
  staff: 8,
  services: [13],
  startsAt: at(1, '19:00'),
  status: 'pending',
  method: 'bkash',
  payment: 'pending', // payment hold running out
  paidPercent: 30,
  createdAt: minutesAgo(4),
  holdExpiresAt: minutesAgo(-11),
})

// 3. Today at Rupa Beauty Lounge (shop 1), for the owner and staff pages.
addBooking({
  n: 110,
  shop: 1,
  customerId: customer(10),
  customerName: 'Sharmin Akter',
  staff: 1,
  services: [1],
  startsAt: at(0, '10:30'),
  status: 'completed',
  method: 'bkash',
  payment: 'paid',
  paidPercent: 100,
  customerConfirmedAt: minutesAgo(26 * 60),
})
addBooking({
  n: 111,
  shop: 1,
  customerId: customer(11),
  customerName: 'Mehjabin Rahman',
  staff: 2,
  services: [2],
  startsAt: at(0, '11:30'),
  status: 'in_service',
  method: 'nagad',
  payment: 'paid',
  paidPercent: 30,
  customerConfirmedAt: minutesAgo(20 * 60),
})
addBooking({
  n: 112,
  shop: 1,
  customerId: customer(12),
  customerName: 'Tasnim Hossain',
  staff: 1,
  services: [4],
  startsAt: at(0, '12:30'),
  status: 'arrived',
  method: 'card',
  payment: 'paid',
  paidPercent: 30,
  customerConfirmedAt: minutesAgo(19 * 60),
})
addBooking({
  n: 113,
  shop: 1,
  customerId: customer(13),
  customerName: 'Afrin Sultana',
  staff: 3,
  services: [3],
  startsAt: at(0, '14:30'),
  status: 'confirmed',
  method: 'bkash',
  payment: 'paid',
  paidPercent: 30,
  offer: 1,
  confirmationRequestedAt: minutesAgo(60),
})
addBooking({
  n: 114,
  shop: 1,
  customerId: customer(14),
  customerName: 'Rumana Islam',
  staff: 1,
  services: [1, 4],
  startsAt: at(0, '16:00'),
  status: 'confirmed',
  method: 'pay_at_shop',
  payment: 'pending',
})
addBooking({
  n: 115,
  shop: 1,
  customerId: customer(15),
  customerName: 'Jannatul Ferdous',
  staff: 2,
  services: [2],
  startsAt: at(0, '17:30'),
  status: 'cancelled',
  method: 'nagad',
  payment: 'refunded',
  paidPercent: 30,
  cancelledBy: 'customer',
  cancelReason: 'Sick',
})
addBooking({
  n: 116,
  shop: 1,
  customerId: customer(16),
  customerName: 'Priya Sen',
  staff: 1,
  services: [1],
  startsAt: at(1, '10:00'),
  status: 'confirmed',
  method: 'card',
  payment: 'paid',
  paidPercent: 100,
})
addBooking({
  n: 117,
  shop: 1,
  customerId: customer(17),
  customerName: 'Samira Khan',
  staff: 2,
  services: [2, 4],
  startsAt: at(1, '12:00'),
  status: 'pending',
  method: 'pay_at_shop',
  payment: 'pending',
})
addBooking({
  n: 118,
  shop: 1,
  customerId: customer(18),
  customerName: 'Lubna Yasmin',
  staff: 3,
  services: [1],
  startsAt: at(-1, '15:00'),
  status: 'no_show',
  method: 'pay_at_shop',
  payment: 'pending',
})
addBooking({
  n: 119,
  shop: 1,
  customerId: customer(19),
  customerName: 'Nabila Chowdhury',
  staff: 1,
  services: [2],
  startsAt: at(-1, '11:00'),
  status: 'completed',
  method: 'bkash',
  payment: 'paid',
  paidPercent: 100,
})

// 4. A few bookings at other shops, so those owners have something to see.
addBooking({
  n: 120,
  shop: 2,
  customerId: customer(20),
  customerName: 'Rakib Hasan',
  staff: 4,
  services: [5, 6],
  startsAt: at(0, '18:00'),
  status: 'confirmed',
  method: 'pay_at_shop',
  payment: 'pending',
  offer: 2,
})
addBooking({
  n: 121,
  shop: 3,
  customerId: customer(21),
  customerName: 'Shilpi Das',
  staff: 6,
  services: [9],
  startsAt: at(1, '11:00'),
  status: 'pending',
  method: 'bkash',
  payment: 'paid',
  paidPercent: 30,
})

export const bookings: Booking[] = bookingRows
export const bookingItems: BookingItem[] = bookingItemRows
export const payments: Payment[] = paymentRows

// ---------------------------------------------------------------------------
// Live queue (today, Rupa Beauty Lounge)
// ---------------------------------------------------------------------------

const queueEntry = (
  n: number,
  entry: Omit<QueueEntry, 'id' | 'shop_id'> & { shop?: number },
): QueueEntry => {
  const { shop, ...rest } = entry
  return { id: uid(QUEUE, n), shop_id: uid(SHOP, shop ?? 1), ...rest }
}

export const queueEntries: QueueEntry[] = [
  queueEntry(1, {
    booking_id: uid(BOOKING, 111),
    customer_id: customer(11),
    customer_name: 'Mehjabin Rahman',
    service_ids: [uid(SERVICE, 2)],
    staff_id: uid(STAFF, 2),
    status: 'in_service',
    is_walk_in: false,
    position: null,
    estimated_wait_minutes: null,
    joined_at: minutesAgo(50),
  }),
  queueEntry(2, {
    booking_id: uid(BOOKING, 112),
    customer_id: customer(12),
    customer_name: 'Tasnim Hossain',
    service_ids: [uid(SERVICE, 4)],
    staff_id: uid(STAFF, 1),
    status: 'waiting',
    is_walk_in: false,
    position: 1,
    estimated_wait_minutes: 10,
    joined_at: minutesAgo(25),
  }),
  queueEntry(3, {
    booking_id: uid(BOOKING, 107),
    customer_id: DEMO_CUSTOMER_ID,
    customer_name: DEMO_CUSTOMER_NAME,
    service_ids: [uid(SERVICE, 1)],
    staff_id: uid(STAFF, 1),
    status: 'waiting',
    is_walk_in: false,
    position: 2,
    estimated_wait_minutes: 35,
    joined_at: minutesAgo(15),
  }),
  queueEntry(4, {
    booking_id: null,
    customer_id: null,
    customer_name: 'Rina (walk-in)',
    service_ids: [uid(SERVICE, 2)],
    staff_id: null,
    status: 'waiting',
    is_walk_in: true,
    position: 3,
    estimated_wait_minutes: 60,
    joined_at: minutesAgo(8),
  }),
  queueEntry(5, {
    booking_id: uid(BOOKING, 110),
    customer_id: customer(10),
    customer_name: 'Sharmin Akter',
    service_ids: [uid(SERVICE, 1)],
    staff_id: uid(STAFF, 1),
    status: 'completed',
    is_walk_in: false,
    position: null,
    estimated_wait_minutes: null,
    joined_at: minutesAgo(190),
  }),
  queueEntry(6, {
    booking_id: null,
    customer_id: null,
    customer_name: 'Beauty (walk-in)',
    service_ids: [uid(SERVICE, 4)],
    staff_id: uid(STAFF, 2),
    status: 'cancelled',
    is_walk_in: true,
    position: null,
    estimated_wait_minutes: null,
    joined_at: minutesAgo(120),
  }),
]

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

const notification = (
  n: number,
  userId: string,
  type: NotificationType,
  params: Record<string, string | number>,
  bookingNumber: number | null,
  isRead: boolean,
  minutes: number,
): Notification => ({
  id: uid(NOTIFICATION, n),
  user_id: userId,
  type,
  params,
  booking_id: bookingNumber ? uid(BOOKING, bookingNumber) : null,
  is_read: isRead,
  created_at: minutesAgo(minutes),
})

export const notifications: Notification[] = [
  // Demo customer (CUS-03)
  notification(1, DEMO_CUSTOMER_ID, 'queue_turn_near', { shop_name: 'Rupa Beauty Lounge', position: 2 }, 107, false, 3),
  notification(2, DEMO_CUSTOMER_ID, 'queue_wait_changed', { shop_name: 'Rupa Beauty Lounge', minutes: 35 }, 107, false, 12),
  notification(3, DEMO_CUSTOMER_ID, 'confirm_request', { shop_name: 'Rupa Beauty Lounge', service_name: 'Bridal makeup' }, 103, false, 90),
  notification(4, DEMO_CUSTOMER_ID, 'booking_requested', { shop_name: 'Nilima Salon', service_name: 'Hair spa' }, 102, true, 5 * 60),
  notification(5, DEMO_CUSTOMER_ID, 'payment_received', { shop_name: 'Rupa Beauty Lounge', amount_poisha: 69000 }, 101, true, 3 * 24 * 60),
  notification(6, DEMO_CUSTOMER_ID, 'booking_confirmed', { shop_name: 'Rupa Beauty Lounge', service_name: 'Haircut and styling' }, 101, true, 3 * 24 * 60 - 2),
  notification(7, DEMO_CUSTOMER_ID, 'refund_issued', { shop_name: 'Urban Cuts', amount_poisha: 80000 }, 105, true, 5 * 24 * 60),
  notification(8, DEMO_CUSTOMER_ID, 'slot_released', { shop_name: 'Rupa Beauty Lounge' }, 106, true, 15 * 24 * 60),

  // Demo owner (Rupa Beauty Lounge): bell menu in the owner layout
  notification(11, DEMO_OWNER_ID, 'booking_cancelled', { customer_name: 'Jannatul Ferdous', service_name: 'Facial' }, 115, false, 40),
  notification(12, DEMO_OWNER_ID, 'booking_requested', { customer_name: 'Samira Khan', service_name: 'Facial, Manicure' }, 117, false, 95),
  notification(13, DEMO_OWNER_ID, 'review_received', { customer_name: 'Sadia R.', rating: 5 }, null, true, 2 * 24 * 60),
  notification(14, DEMO_OWNER_ID, 'slot_released', { customer_name: 'Lubna Yasmin' }, 118, true, 26 * 60),

  // Demo staff member (Shirin Akter): bell menu in the staff layout
  notification(21, DEMO_STAFF_USER_ID, 'booking_assigned', { customer_name: 'Rumana Islam', service_name: 'Haircut and styling, Manicure' }, 114, false, 30),
  notification(22, DEMO_STAFF_USER_ID, 'booking_assigned', { customer_name: 'Priya Sen', service_name: 'Haircut and styling' }, 116, true, 6 * 60),
  notification(23, DEMO_STAFF_USER_ID, 'queue_wait_changed', { shop_name: 'Rupa Beauty Lounge', minutes: 10 }, null, true, 24 * 60),
]