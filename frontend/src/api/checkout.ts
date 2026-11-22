import type { BookingStatus, PaymentMethod, PaymentStatus } from '../mocks/bookings'
import type { PaymentMode } from '../mocks/shops'
import { getReviewOptions } from './bookFlow'
import { mockDelay } from './mock'

export type { BookingStatus, PaymentMethod, PaymentMode, PaymentStatus }

// Mock or real data. Flip to false in the wire-up commit for the booking flow (FR-03.3 and FR-07.1).
const USE_MOCK = true

// The share of the total that a customer pays now when they choose a deposit.
export const DEPOSIT_PERCENT = 30

// Mock rules (used only while USE_MOCK is true), by the customer's mobile number:
// this number makes an online payment fail, and this one makes the time "just taken".
const MOCK_PAYMENT_FAILS_PHONE = '01700000001'
const MOCK_SLOT_TAKEN_PHONE = '01700000002'

// The ways to pay online. Pay at shop needs no method.
export type OnlineMethod = Exclude<PaymentMethod, 'pay_at_shop'>

function depositPoisha(totalPoisha: number): number {
  return Math.round((totalPoisha * DEPOSIT_PERCENT) / 100)
}

// How much the customer pays now for each payment mode (integer poisha).
export function amountDueNow(mode: PaymentMode, totalPoisha: number): number {
  if (mode === 'full') return totalPoisha
  if (mode === 'deposit') return depositPoisha(totalPoisha)
  return 0
}

export interface ConfirmBookingInput {
  shop_id: string
  service_ids: string[]
  staff_id: string | null // the person assigned in BOOK-02
  starts_at: string // ISO UTC
  customer_name: string
  customer_phone: string
  notes: string
  payment_mode: PaymentMode
  payment_method: PaymentMethod // 'pay_at_shop' when the mode is pay_at_shop
}

// Everything BOOK-04 (the receipt) shows. The real API returns the same shape for a booking.
export interface BookingReceipt {
  booking_id: string
  shop_id: string
  shop_name: string
  shop_address: string
  customer_name: string
  customer_phone: string
  services: { id: string; name: string; price_poisha: number }[]
  staff_name: string | null
  starts_at: string
  total_minutes: number
  subtotal_poisha: number
  discount_poisha: number
  offer_title: string | null
  total_poisha: number
  paid_poisha: number
  due_at_shop_poisha: number
  payment_mode: PaymentMode
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  status: BookingStatus
  created_at: string
}

export type CheckoutErrorCode = 'slot_taken' | 'payment_failed' | 'failed'

export class CheckoutError extends Error {
  code: CheckoutErrorCode
  constructor(code: CheckoutErrorCode) {
    super(code)
    this.name = 'CheckoutError'
    this.code = code
  }
}

// Bookings made in this tab while the mock is on. Memory only: nothing personal is stored in the browser.
const receipts = new Map<string, BookingReceipt>()

// Creates the booking and takes the payment (FR-03.3 and FR-07.1).
// Throws CheckoutError: slot_taken (409 in the real API), payment_failed, or failed.
export async function confirmBooking(input: ConfirmBookingInput): Promise<BookingReceipt> {
  if (!USE_MOCK) throw new Error('The real booking API is not wired yet')

  // The real server prices the booking itself from the ids, so the mock does the same.
  const review = await getReviewOptions(
    input.shop_id,
    input.service_ids,
    input.starts_at,
    input.staff_id,
  )

  return mockDelay(() => {
    if (!review) throw new CheckoutError('failed')

    const phone = input.customer_phone.replace(/\D/g, '').slice(-11)
    const online = input.payment_mode !== 'pay_at_shop'
    if (phone === MOCK_SLOT_TAKEN_PHONE) throw new CheckoutError('slot_taken')
    if (online && phone === MOCK_PAYMENT_FAILS_PHONE) throw new CheckoutError('payment_failed')

    const paid = online ? amountDueNow(input.payment_mode, review.total_poisha) : 0
    const receipt: BookingReceipt = {
      booking_id: crypto.randomUUID(),
      shop_id: review.shop_id,
      shop_name: review.shop_name,
      shop_address: review.shop_address,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      services: review.services.map(({ id, name, price_poisha }) => ({ id, name, price_poisha })),
      staff_name: review.staff_name,
      starts_at: review.starts_at,
      total_minutes: review.total_minutes,
      subtotal_poisha: review.subtotal_poisha,
      discount_poisha: review.offer?.discount_poisha ?? 0,
      offer_title: review.offer?.title ?? null,
      total_poisha: review.total_poisha,
      paid_poisha: paid,
      due_at_shop_poisha: review.total_poisha - paid,
      payment_mode: input.payment_mode,
      payment_method: online ? input.payment_method : 'pay_at_shop',
      payment_status: online ? 'paid' : 'pending',
      status: review.requires_booking_approval ? 'pending' : 'confirmed',
      created_at: new Date().toISOString(),
    }
    receipts.set(receipt.booking_id, receipt)
    return receipt
  })
}

// One booking made in this tab, for the receipt page (BOOK-04). null = not found.
export async function getBookingReceipt(bookingId: string): Promise<BookingReceipt | null> {
  if (!USE_MOCK) throw new Error('The real receipt API is not wired yet')
  return mockDelay(() => receipts.get(bookingId) ?? null)
}