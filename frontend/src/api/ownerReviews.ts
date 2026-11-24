import { DEMO_SHOP_ID } from '../mocks/bookings'
import { reviews as reviewFixtures } from '../mocks/shops'
import type { Review } from '../mocks/shops'
import { getMockMode, mockDelay } from './mock'

// true = use the fixtures in src/mocks/. Set to false in the wire-up commit for FR-08.2.
// Pages call the functions below and never import the fixtures.
const USE_MOCK = true

// A review of the owner's shop. owner_reply and owner_replied_at are null until the owner answers.
export type OwnerReview = Review

// Longest reply the owner can write (characters, after trimming).
export const REPLY_MAX = 500

export type ReviewReplyErrorCode = 'empty' | 'too_long' | 'not_found'

export class ReviewReplyError extends Error {
  code: ReviewReplyErrorCode

  constructor(code: ReviewReplyErrorCode) {
    super(`Review reply failed: ${code}`)
    this.name = 'ReviewReplyError'
    this.code = code
  }
}

const DAY_MS = 24 * 60 * 60 * 1000

// The shared fixtures have only three reviews for the demo shop, so the mock adds a few more
// (recent, one low rating) to make the filters and pages worth testing. Fixed ids, group 4.
const extra = (n: number, rating: number, name: string, comment: string, daysAgo: number): Review => ({
  id: `00000004-0000-4000-8000-${String(n).padStart(12, '0')}`,
  shop_id: DEMO_SHOP_ID,
  booking_id: `00000006-0000-4000-8000-${String(n).padStart(12, '0')}`,
  customer_id: `00000005-0000-4000-8000-${String(n).padStart(12, '0')}`,
  customer_name: name,
  rating,
  comment,
  owner_reply: null,
  owner_replied_at: null,
  created_at: new Date(Date.now() - daysAgo * DAY_MS).toISOString(),
})

const EXTRA_REVIEWS: Review[] = [
  extra(101, 2, 'Mahir Z.', 'I waited 25 minutes and nobody told me why. The haircut itself was fine.', 1),
  extra(102, 5, 'Rima S.', 'Loved my bridal makeup trial. Everyone was patient and kind.', 3),
  extra(103, 3, 'Shuvo B.', 'Okay service, a little pricey for what I got.', 6),
  extra(104, 5, 'Nabila K.', '', 9),
  extra(105, 4, 'Tuhin R.', 'Clean shop and a good beard trim. The music was a bit loud.', 12),
]

// The mock keeps changes in memory only, so they reset when the page is reloaded.
let mockReviews: Review[] | null = null

function store(): Review[] {
  if (!mockReviews) {
    mockReviews = [
      ...reviewFixtures.filter((review) => review.shop_id === DEMO_SHOP_ID),
      ...EXTRA_REVIEWS,
    ]
  }
  return mockReviews
}

const copy = (review: Review): Review => ({ ...review })

function notWritten(): never {
  throw new Error('The real reviews API is not written yet')
}

// All reviews of the owner's shop, newest first.
export async function listOwnerReviews(): Promise<OwnerReview[]> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const mode = getMockMode()
      if (mode === 'error') throw new Error('Mock error: could not load the reviews')
      if (mode === 'empty') return []
      return store()
        .map(copy)
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    })
  }
  return notWritten()
}

// Adds the owner's reply to a review, or changes the reply that is already there (FR-08.2).
// There is one reply per review. The text is trimmed and must be 1 to REPLY_MAX characters.
export async function saveReviewReply(id: string, reply: string): Promise<OwnerReview> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const text = reply.trim()
      if (text.length === 0) throw new ReviewReplyError('empty')
      if (text.length > REPLY_MAX) throw new ReviewReplyError('too_long')
      const review = store().find((item) => item.id === id)
      if (!review) throw new ReviewReplyError('not_found')
      review.owner_reply = text
      review.owner_replied_at = new Date().toISOString()
      return copy(review)
    })
  }
  return notWritten()
}
