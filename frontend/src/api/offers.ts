import { DEMO_SHOP_ID } from '../mocks/bookings'
import { offerServices as offerServiceFixtures, offers as offerFixtures } from '../mocks/shops'
import type { Offer, OfferType } from '../mocks/shops'
import { getMockMode, mockDelay } from './mock'

// true = use the fixtures in src/mocks/. Set to false in the wire-up commit for FR-01.3.
// Pages call the functions below and never import the fixtures.
const USE_MOCK = true

export type { Offer, OfferType }

// An offer of the owner's shop with the ids of the services it covers.
export interface OwnerOffer extends Offer {
  service_ids: string[]
}

// What the owner types in the offer form.
// percentage: discount_percent is set. fixed and combo: discount_poisha is set (poisha, 100 = 1 taka).
// starts_at and ends_at are UTC ISO timestamps (the page turns Dhaka dates into them).
export interface OfferInput {
  title: string
  offer_type: OfferType
  discount_percent: number | null
  discount_poisha: number | null
  starts_at: string
  ends_at: string
  service_ids: string[]
}

// The mock keeps changes in memory only, so they reset when the page is reloaded.
let mockOffers: OwnerOffer[] | null = null

function store(): OwnerOffer[] {
  if (!mockOffers) {
    mockOffers = offerFixtures
      .filter((offer) => offer.shop_id === DEMO_SHOP_ID)
      .map((offer) => ({
        ...offer,
        service_ids: offerServiceFixtures
          .filter((link) => link.offer_id === offer.id)
          .map((link) => link.service_id),
      }))
  }
  return mockOffers
}

const copy = (offer: OwnerOffer): OwnerOffer => ({ ...offer, service_ids: [...offer.service_ids] })

function notWritten(): never {
  throw new Error('The real offers API is not written yet')
}

// All offers of the owner's shop: running, scheduled and ended.
export async function listOffers(): Promise<OwnerOffer[]> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const mode = getMockMode()
      if (mode === 'error') throw new Error('Mock error: could not load the offers')
      if (mode === 'empty') return []
      return store().map(copy)
    })
  }
  return notWritten()
}

export async function createOffer(input: OfferInput): Promise<OwnerOffer> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const offer: OwnerOffer = {
        id: crypto.randomUUID(),
        shop_id: DEMO_SHOP_ID,
        ...input,
        service_ids: [...input.service_ids],
        is_active: true,
      }
      store().push(offer)
      return copy(offer)
    })
  }
  return notWritten()
}

export async function updateOffer(id: string, input: OfferInput): Promise<OwnerOffer> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const offer = store().find((item) => item.id === id)
      if (!offer) throw new Error('Offer not found')
      Object.assign(offer, input, { service_ids: [...input.service_ids] })
      return copy(offer)
    })
  }
  return notWritten()
}

// Ends an offer now: its end time becomes the current time. Old bookings keep the discount.
export async function endOffer(id: string): Promise<OwnerOffer> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const offer = store().find((item) => item.id === id)
      if (!offer) throw new Error('Offer not found')
      offer.ends_at = new Date().toISOString()
      return copy(offer)
    })
  }
  return notWritten()
}
