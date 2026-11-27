// Reported reviews, complaints and the audit log (FR-10.2). Shaped like the draft schema.
// Names, rating, comment and booking amounts are display fields the real API will join.
import { bookings } from './bookings'
import { reviews, shops } from './shops'

export type ReportStatus = 'open' | 'dismissed' | 'review_hidden'
export type ComplaintType = 'dispute' | 'refund'
export type ComplaintStatus = 'open' | 'in_review' | 'resolved' | 'rejected'
export type AuditEntity = 'shop' | 'review_report' | 'complaint'
export type AuditAction =
  | 'shop_approved'
  | 'shop_rejected'
  | 'shop_suspended'
  | 'report_dismissed'
  | 'review_hidden'
  | 'complaint_in_review'
  | 'complaint_resolved'
  | 'complaint_rejected'

export interface ReviewReport {
  id: string
  review_id: string
  reported_by: string
  reason: string
  status: ReportStatus
  handled_by: string | null
  handled_at: string | null
  created_at: string
  reporter_name: string
  customer_name: string
  shop_name: string
  rating: number
  comment: string
}

export interface Complaint {
  id: string
  booking_id: string
  customer_id: string
  complaint_type: ComplaintType
  description: string
  status: ComplaintStatus
  resolution: string | null
  handled_by: string | null
  handled_at: string | null
  created_at: string
  customer_name: string
  shop_name: string
  booking_starts_at: string
  total_poisha: number
  paid_poisha: number
}

export interface AuditLog {
  id: string
  actor_id: string
  actor_name: string
  action: AuditAction
  entity_type: AuditEntity
  entity_id: string
  details: { target: string; note: string }
  created_at: string
}

export interface Moderation {
  reports: ReviewReport[]
  complaints: Complaint[]
  audit: AuditLog[]
}

const uid = (group: number, n: number): string =>
  `${String(group).padStart(8, '0')}-0000-4000-8000-${String(n).padStart(12, '0')}`

export const DEMO_ADMIN = { id: uid(5, 900), name: 'Platform Admin' }

const daysAgo = (days: number): string =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

const shopName = (shopId: string): string => shops.find((shop) => shop.id === shopId)?.name ?? ''

const report = (
  n: number,
  reviewIndex: number,
  reporterName: string,
  reason: string,
  age: number,
  status: ReportStatus = 'open',
): ReviewReport => {
  const review = reviews[reviewIndex]
  return {
    id: uid(14, n),
    review_id: review.id,
    reported_by: uid(5, 400 + n),
    reason,
    status,
    handled_by: status === 'open' ? null : DEMO_ADMIN.id,
    handled_at: status === 'open' ? null : daysAgo(age - 1),
    created_at: daysAgo(age),
    reporter_name: reporterName,
    customer_name: review.customer_name,
    shop_name: shopName(review.shop_id),
    rating: review.rating,
    comment: review.comment,
  }
}

const complaint = (
  n: number,
  bookingNumber: number,
  type: ComplaintType,
  description: string,
  age: number,
  status: ComplaintStatus = 'open',
  resolution: string | null = null,
): Complaint => {
  const booking = bookings.find((item) => item.id === uid(6, bookingNumber))
  if (!booking) throw new Error(`Missing booking fixture ${bookingNumber}`)
  const handled = status !== 'open'
  return {
    id: uid(15, n),
    booking_id: booking.id,
    customer_id: booking.customer_id,
    complaint_type: type,
    description,
    status,
    resolution,
    handled_by: handled ? DEMO_ADMIN.id : null,
    handled_at: handled ? daysAgo(age / 2) : null,
    created_at: daysAgo(age),
    customer_name: booking.customer_name,
    shop_name: shopName(booking.shop_id),
    booking_starts_at: booking.starts_at,
    total_poisha: booking.total_poisha,
    paid_poisha: booking.paid_poisha,
  }
}

export const moderation: Moderation = {
  reports: [
    report(1, 7, 'Nasrin Begum', 'The review is unfair. The full service time was given.', 4),
    report(2, 14, 'Poly Das', 'The comment about price is misleading.', 2),
    report(3, 1, 'Shirin Akter', 'The waiting time in the review is wrong.', 9, 'dismissed'),
  ],
  complaints: [
    complaint(1, 105, 'refund', 'My booking shows refunded but I have not received the money.', 3),
    complaint(2, 106, 'dispute', 'I was marked as a no-show although I went to the shop.', 13, 'in_review'),
    complaint(
      3,
      119,
      'dispute',
      'I was charged for a service I did not choose.',
      0.5,
      'resolved',
      'The shop confirmed the bill matches the booking.',
    ),
  ],
  audit: [
    {
      id: uid(16, 1),
      actor_id: DEMO_ADMIN.id,
      actor_name: DEMO_ADMIN.name,
      action: 'report_dismissed',
      entity_type: 'review_report',
      entity_id: uid(14, 3),
      details: { target: shopName(reviews[1].shop_id), note: '' },
      created_at: daysAgo(8),
    },
  ],
}