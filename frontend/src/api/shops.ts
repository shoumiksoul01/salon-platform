import { offers, shops, type Offer, type Shop } from '../mocks/shops'
import { getMockMode, mockDelay } from './mock'

// true = use the fixtures in src/mocks/. The owner of this feature sets it to
// false in the wire-up commit. Pages call the functions below and never
// import the fixtures.
const USE_MOCK = true

// Until the browser location is used, "nearby" is measured from central Dhaka.
const DEFAULT_POINT = { latitude: 23.8103, longitude: 90.4125 }

export interface NearbyShop extends Shop {
  distance_km: number
}

export interface FeaturedOffer extends Offer {
  shop_name: string
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return (await response.json()) as T
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(a))
}

export async function listNearbyShops(limit = 6): Promise<NearbyShop[]> {
  if (!USE_MOCK) return getJson<NearbyShop[]>(`/api/v1/shops/nearby?limit=${limit}`)

  return mockDelay<NearbyShop[]>(() => {
    const mode = getMockMode()
    if (mode === 'error') throw new Error('Mock error')
    if (mode === 'empty') return []
    return shops
      .filter((shop) => shop.status === 'approved')
      .map((shop) => ({
        ...shop,
        distance_km:
          Math.round(
            distanceKm(
              DEFAULT_POINT.latitude,
              DEFAULT_POINT.longitude,
              shop.latitude,
              shop.longitude,
            ) * 10,
          ) / 10,
      }))
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, limit)
  })
}

export async function listFeaturedOffers(limit = 4): Promise<FeaturedOffer[]> {
  if (!USE_MOCK) return getJson<FeaturedOffer[]>(`/api/v1/offers/featured?limit=${limit}`)

  return mockDelay<FeaturedOffer[]>(() => {
    const mode = getMockMode()
    if (mode === 'error') throw new Error('Mock error')
    if (mode === 'empty') return []
    const approved = new Map(
      shops.filter((shop) => shop.status === 'approved').map((shop) => [shop.id, shop.name]),
    )
    return offers
      .filter((offer) => offer.is_active && approved.has(offer.shop_id))
      .map((offer) => ({ ...offer, shop_name: approved.get(offer.shop_id) ?? '' }))
      .slice(0, limit)
  })
}