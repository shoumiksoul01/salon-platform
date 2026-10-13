// Mock fixtures for shops, services, offers and reviews (UI-SK-07).
// Shaped like the draft schema: snake_case fields, UUID ids, UTC ISO timestamps,
// money as integer poisha in fields ending _poisha (100 poisha = 1 taka).
// Pages never import this file. They call functions in src/api/, which switch
// between these mocks and the real API with USE_MOCK.

export type GenderCategory = 'men' | 'women' | 'unisex'
export type ShopStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type PaymentMode = 'deposit' | 'full' | 'pay_at_shop'
export type OfferType = 'percentage' | 'fixed' | 'combo'

export interface Shop {
  id: string
  owner_id: string
  name: string
  description: string
  address: string
  area: string
  city: string
  latitude: number
  longitude: number
  phone: string
  gender_category: GenderCategory
  status: ShopStatus
  requires_booking_approval: boolean
  allowed_payment_modes: PaymentMode[]
  cover_image_url: string | null
  rating_average: number
  review_count: number
  created_at: string
}

// day_of_week: 0 = Sunday ... 6 = Saturday. Times are local shop time, "HH:MM".
export interface ShopWorkingHours {
  shop_id: string
  day_of_week: number
  opens_at: string
  closes_at: string
  is_closed: boolean
}

export interface Service {
  id: string
  shop_id: string
  name: string
  price_poisha: number
  duration_minutes: number
  gender_category: GenderCategory
  image_urls: string[]
  is_active: boolean
}

export interface Offer {
  id: string
  shop_id: string
  title: string
  offer_type: OfferType
  discount_percent: number | null
  discount_poisha: number | null
  starts_at: string
  ends_at: string
  is_active: boolean
}

export interface OfferService {
  offer_id: string
  service_id: string
}

// customer_name is a display field that the real API will join from users.
export interface Review {
  id: string
  shop_id: string
  booking_id: string
  customer_id: string
  customer_name: string
  rating: number
  comment: string
  owner_reply: string | null
  owner_replied_at: string | null
  created_at: string
}

// Readable fixed UUIDs: the first group says what kind of row it is.
const uid = (group: number, n: number): string =>
  `${String(group).padStart(8, '0')}-0000-4000-8000-${String(n).padStart(12, '0')}`
const SHOP = 1
const SERVICE = 2
const OFFER = 3
const REVIEW = 4
const USER = 5
const BOOKING = 6

const PAY_ALL: PaymentMode[] = ['deposit', 'full', 'pay_at_shop']

const hours = (
  shop: number,
  opens: string,
  closes: string,
  closedDays: number[],
): ShopWorkingHours[] =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    shop_id: uid(SHOP, shop),
    day_of_week: day,
    opens_at: opens,
    closes_at: closes,
    is_closed: closedDays.includes(day),
  }))

const service = (
  n: number,
  shop: number,
  name: string,
  priceTaka: number,
  durationMinutes: number,
  gender: GenderCategory,
): Service => ({
  id: uid(SERVICE, n),
  shop_id: uid(SHOP, shop),
  name,
  price_poisha: priceTaka * 100,
  duration_minutes: durationMinutes,
  gender_category: gender,
  image_urls: [],
  is_active: true,
})

const review = (
  n: number,
  shop: number,
  rating: number,
  customerName: string,
  comment: string,
  createdAt: string,
  ownerReply: string | null = null,
): Review => ({
  id: uid(REVIEW, n),
  shop_id: uid(SHOP, shop),
  booking_id: uid(BOOKING, n),
  customer_id: uid(USER, 100 + n),
  customer_name: customerName,
  rating,
  comment,
  owner_reply: ownerReply,
  owner_replied_at: ownerReply
    ? new Date(Date.parse(createdAt) + 24 * 60 * 60 * 1000).toISOString()
    : null,
  created_at: createdAt,
})

export const shopWorkingHours: ShopWorkingHours[] = [
  ...hours(1, '10:00', '20:00', [5]),
  ...hours(2, '10:00', '22:00', []),
  ...hours(3, '09:30', '19:30', [5]),
  ...hours(4, '11:00', '23:00', []),
  ...hours(5, '10:00', '21:00', [5]),
  ...hours(6, '10:00', '20:00', [5]),
  ...hours(7, '10:00', '19:00', [5]),
]

export const services: Service[] = [
  service(1, 1, 'Haircut and styling', 800, 45, 'women'),
  service(2, 1, 'Facial', 1500, 60, 'women'),
  service(3, 1, 'Bridal makeup', 8000, 180, 'women'),
  service(4, 1, 'Manicure', 600, 40, 'women'),

  service(5, 2, "Men's haircut", 500, 30, 'men'),
  service(6, 2, 'Beard trim', 300, 20, 'men'),
  service(7, 2, 'Hair colour', 1800, 90, 'men'),
  service(8, 2, 'Head massage', 400, 20, 'men'),

  service(9, 3, 'Haircut', 600, 40, 'women'),
  service(10, 3, 'Hair spa', 1800, 75, 'women'),
  service(11, 3, 'Threading', 150, 15, 'women'),
  service(12, 3, 'Pedicure', 800, 50, 'women'),

  service(13, 4, 'Classic cut', 450, 30, 'men'),
  service(14, 4, 'Shave', 350, 25, 'men'),
  service(15, 4, 'Cut and beard combo', 700, 50, 'men'),
  service(16, 4, 'Facial', 1000, 45, 'men'),

  service(17, 5, 'Haircut', 500, 35, 'unisex'),
  service(18, 5, 'Rebonding', 5000, 180, 'unisex'),
  service(19, 5, 'Keratin treatment', 6000, 150, 'unisex'),
  service(20, 5, 'Hair colour', 2500, 120, 'unisex'),

  service(21, 6, 'Facial', 1800, 60, 'women'),
  service(22, 6, 'Full arms waxing', 700, 30, 'women'),
  service(23, 6, 'Bridal makeup', 12000, 240, 'women'),
  service(24, 6, 'Haircut', 900, 45, 'women'),
]

export const offers: Offer[] = [
  {
    id: uid(OFFER, 1),
    shop_id: uid(SHOP, 1),
    title: 'Bridal makeup 15% off',
    offer_type: 'percentage',
    discount_percent: 15,
    discount_poisha: null,
    starts_at: '2026-10-01T00:00:00.000Z',
    ends_at: '2026-12-31T17:59:59.000Z',
    is_active: true,
  },
  {
    id: uid(OFFER, 2),
    shop_id: uid(SHOP, 2),
    title: 'Cut and beard combo, save 100 taka',
    offer_type: 'combo',
    discount_percent: null,
    discount_poisha: 10000,
    starts_at: '2026-10-01T00:00:00.000Z',
    ends_at: '2026-11-30T17:59:59.000Z',
    is_active: true,
  },
  {
    id: uid(OFFER, 3),
    shop_id: uid(SHOP, 3),
    title: 'Hair spa 20% off',
    offer_type: 'percentage',
    discount_percent: 20,
    discount_poisha: null,
    starts_at: '2026-10-10T00:00:00.000Z',
    ends_at: '2026-11-15T17:59:59.000Z',
    is_active: true,
  },
  {
    id: uid(OFFER, 4),
    shop_id: uid(SHOP, 4),
    title: 'Shave special, 50 taka off',
    offer_type: 'fixed',
    discount_percent: null,
    discount_poisha: 5000,
    starts_at: '2026-10-01T00:00:00.000Z',
    ends_at: '2026-10-31T17:59:59.000Z',
    is_active: true,
  },
  {
    id: uid(OFFER, 5),
    shop_id: uid(SHOP, 6),
    title: 'Facial and haircut combo, save 300 taka',
    offer_type: 'combo',
    discount_percent: null,
    discount_poisha: 30000,
    starts_at: '2026-10-05T00:00:00.000Z',
    ends_at: '2026-12-15T17:59:59.000Z',
    is_active: true,
  },
]

export const offerServices: OfferService[] = [
  { offer_id: uid(OFFER, 1), service_id: uid(SERVICE, 3) },
  { offer_id: uid(OFFER, 2), service_id: uid(SERVICE, 5) },
  { offer_id: uid(OFFER, 2), service_id: uid(SERVICE, 6) },
  { offer_id: uid(OFFER, 3), service_id: uid(SERVICE, 10) },
  { offer_id: uid(OFFER, 4), service_id: uid(SERVICE, 14) },
  { offer_id: uid(OFFER, 5), service_id: uid(SERVICE, 21) },
  { offer_id: uid(OFFER, 5), service_id: uid(SERVICE, 24) },
]

export const reviews: Review[] = [
  review(1, 1, 5, 'Nusrat J.', 'Lovely staff and a very clean place. My facial was perfect.', '2026-09-12T10:30:00.000Z'),
  review(2, 1, 4, 'Mim A.', 'Good haircut, but I waited ten minutes past my slot.', '2026-09-20T12:00:00.000Z', 'Thank you Mim, we are working on starting on time.'),
  review(3, 1, 5, 'Sadia R.', 'Great bridal trial. They listened to everything I wanted.', '2026-10-02T08:15:00.000Z'),
  review(4, 2, 5, 'Tanvir H.', 'Best fade I have had in Gulshan.', '2026-09-15T14:00:00.000Z'),
  review(5, 2, 4, 'Rafi K.', 'Quick and neat. The shop was busy on Friday evening.', '2026-09-28T16:45:00.000Z'),
  review(6, 2, 5, 'Arif S.', 'Friendly barber, fair price.', '2026-10-05T11:20:00.000Z'),
  review(7, 3, 4, 'Farhana B.', 'Nice pedicure and a calm place.', '2026-09-18T09:40:00.000Z'),
  review(8, 3, 3, 'Lamia S.', 'The hair spa was fine but felt a bit rushed.', '2026-09-30T13:10:00.000Z', 'Sorry to hear that, Lamia. We will keep the full time for every spa.'),
  review(9, 3, 5, 'Puja D.', 'Very polite staff and good threading.', '2026-10-08T07:50:00.000Z'),
  review(10, 4, 5, 'Imran M.', 'Proper hot towel shave. Will come again.', '2026-09-22T15:30:00.000Z'),
  review(11, 4, 4, 'Nayeem T.', 'Good cut. Parking nearby is hard.', '2026-10-03T17:05:00.000Z'),
  review(12, 5, 5, 'Tania P.', 'My keratin treatment looks amazing after a month.', '2026-09-10T12:25:00.000Z'),
  review(13, 5, 4, 'Joy C.', 'Good haircut for a fair price.', '2026-10-01T10:10:00.000Z'),
  review(14, 6, 5, 'Ritu D.', 'The facial was relaxing and the staff were careful.', '2026-09-25T13:35:00.000Z'),
  review(15, 6, 4, 'Anika F.', 'Nice place, a little expensive.', '2026-10-09T09:00:00.000Z', 'Thank you Anika, the combo offer helps with the price.'),
]

const baseShops: Omit<Shop, 'rating_average' | 'review_count'>[] = [
  {
    id: uid(SHOP, 1),
    owner_id: uid(USER, 1),
    name: 'Rupa Beauty Lounge',
    description: 'A calm ladies parlour for haircuts, facials and bridal makeup.',
    address: 'House 12, Road 5, Dhanmondi',
    area: 'Dhanmondi',
    city: 'Dhaka',
    latitude: 23.7461,
    longitude: 90.3742,
    phone: '01700-000001',
    gender_category: 'women',
    status: 'approved',
    requires_booking_approval: false,
    allowed_payment_modes: PAY_ALL,
    cover_image_url: null,
    created_at: '2026-08-20T06:00:00.000Z',
  },
  {
    id: uid(SHOP, 2),
    owner_id: uid(USER, 2),
    name: 'Urban Cuts',
    description: "Modern men's grooming: fades, beard styling and colour.",
    address: 'Road 41, Gulshan 2',
    area: 'Gulshan',
    city: 'Dhaka',
    latitude: 23.7925,
    longitude: 90.4078,
    phone: '01700-000002',
    gender_category: 'men',
    status: 'approved',
    requires_booking_approval: false,
    allowed_payment_modes: ['full', 'pay_at_shop'],
    cover_image_url: null,
    created_at: '2026-08-22T06:00:00.000Z',
  },
  {
    id: uid(SHOP, 3),
    owner_id: uid(USER, 3),
    name: 'Nilima Salon',
    description: 'Family-run ladies salon known for hair spa and pedicure.',
    address: 'Section 10, Block C, Mirpur',
    area: 'Mirpur',
    city: 'Dhaka',
    latitude: 23.8042,
    longitude: 90.3667,
    phone: '01700-000003',
    gender_category: 'women',
    status: 'approved',
    requires_booking_approval: true,
    allowed_payment_modes: ['deposit', 'pay_at_shop'],
    cover_image_url: null,
    created_at: '2026-08-25T06:00:00.000Z',
  },
  {
    id: uid(SHOP, 4),
    owner_id: uid(USER, 4),
    name: 'The Barber Room',
    description: 'Classic cuts and hot towel shaves in a relaxed room.',
    address: 'Sector 7, Uttara',
    area: 'Uttara',
    city: 'Dhaka',
    latitude: 23.8759,
    longitude: 90.3795,
    phone: '01700-000004',
    gender_category: 'men',
    status: 'approved',
    requires_booking_approval: false,
    allowed_payment_modes: PAY_ALL,
    cover_image_url: null,
    created_at: '2026-09-01T06:00:00.000Z',
  },
  {
    id: uid(SHOP, 5),
    owner_id: uid(USER, 5),
    name: 'Shona Beauty Studio',
    description: 'Unisex studio for hair treatments, colour and styling.',
    address: 'Town Hall Road, Mohammadpur',
    area: 'Mohammadpur',
    city: 'Dhaka',
    latitude: 23.7662,
    longitude: 90.3589,
    phone: '01700-000005',
    gender_category: 'unisex',
    status: 'approved',
    requires_booking_approval: false,
    allowed_payment_modes: ['deposit', 'full'],
    cover_image_url: null,
    created_at: '2026-09-03T06:00:00.000Z',
  },
  {
    id: uid(SHOP, 6),
    owner_id: uid(USER, 6),
    name: 'Glow Parlour',
    description: 'Facials, waxing and bridal packages in Banani.',
    address: 'Road 11, Banani',
    area: 'Banani',
    city: 'Dhaka',
    latitude: 23.7937,
    longitude: 90.4066,
    phone: '01700-000006',
    gender_category: 'women',
    status: 'approved',
    requires_booking_approval: false,
    allowed_payment_modes: PAY_ALL,
    cover_image_url: null,
    created_at: '2026-09-08T06:00:00.000Z',
  },
  {
    id: uid(SHOP, 7),
    owner_id: uid(USER, 7),
    name: 'New Look Studio',
    description: 'A new unisex studio waiting for approval.',
    address: 'Kazipara, Mirpur',
    area: 'Mirpur',
    city: 'Dhaka',
    latitude: 23.7972,
    longitude: 90.3731,
    phone: '01700-000007',
    gender_category: 'unisex',
    status: 'pending',
    requires_booking_approval: false,
    allowed_payment_modes: ['pay_at_shop'],
    cover_image_url: null,
    created_at: '2026-10-12T06:00:00.000Z',
  },
]

// rating_average and review_count are worked out from the reviews above,
// so the numbers on a shop card always match its review list.
const reviewStats = (shopId: string) => {
  const own = reviews.filter((r) => r.shop_id === shopId)
  const total = own.reduce((sum, r) => sum + r.rating, 0)
  return {
    rating_average: own.length ? Math.round((total / own.length) * 10) / 10 : 0,
    review_count: own.length,
  }
}

export const shops: Shop[] = baseShops.map((shop) => ({
  ...shop,
  ...reviewStats(shop.id),
}))