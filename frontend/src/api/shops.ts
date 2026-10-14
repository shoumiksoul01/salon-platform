import {
  offers,
  services,
  shopWorkingHours,
  shops,
  type Offer,
  type Shop,
} from '../mocks/shops'
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

export type ShopSort = 'distance' | 'rating' | 'price'

// 0 or '' means "no filter". Money is in integer poisha.
export interface ShopFilters {
  q: string
  gender: Shop['gender_category'] | ''
  minRating: number
  maxDistanceKm: number
  maxFromPricePoisha: number
  hasOffer: boolean
  openNow: boolean
  sort: ShopSort
}

export interface ShopResult extends NearbyShop {
  from_price_poisha: number | null
  has_offer: boolean
  is_open_now: boolean
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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Day of week (0 = Sunday) and minutes since midnight, in Dhaka time.
function dhakaNow(): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return {
    day: WEEKDAYS.indexOf(get('weekday')),
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  }
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function isOpenNow(shopId: string, now: { day: number; minutes: number }): boolean {
  const row = shopWorkingHours.find(
    (item) => item.shop_id === shopId && item.day_of_week === now.day,
  )
  if (!row || row.is_closed || !row.opens_at || !row.closes_at) return false
  return now.minutes >= toMinutes(row.opens_at) && now.minutes < toMinutes(row.closes_at)
}

function sortResults(list: ShopResult[], sort: ShopSort): ShopResult[] {
  return [...list].sort((a, b) => {
    if (sort === 'rating') {
      return b.rating_average - a.rating_average || a.distance_km - b.distance_km
    }
    if (sort === 'price') {
      return (
        (a.from_price_poisha ?? Infinity) - (b.from_price_poisha ?? Infinity) ||
        a.distance_km - b.distance_km
      )
    }
    return a.distance_km - b.distance_km
  })
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

export async function searchShops(filters: ShopFilters): Promise<ShopResult[]> {
  if (!USE_MOCK) {
    const params = new URLSearchParams()
    if (filters.q) params.set('q', filters.q)
    if (filters.gender) params.set('gender', filters.gender)
    if (filters.minRating) params.set('min_rating', String(filters.minRating))
    if (filters.maxDistanceKm) params.set('max_distance_km', String(filters.maxDistanceKm))
    if (filters.maxFromPricePoisha) {
      params.set('max_from_price_poisha', String(filters.maxFromPricePoisha))
    }
    if (filters.hasOffer) params.set('has_offer', 'true')
    if (filters.openNow) params.set('open_now', 'true')
    params.set('sort', filters.sort)
    return getJson<ShopResult[]>(`/api/v1/shops?${params.toString()}`)
  }

  return mockDelay<ShopResult[]>(() => {
    const mode = getMockMode()
    if (mode === 'error') throw new Error('Mock error')
    if (mode === 'empty') return []

    const now = dhakaNow()
    const needle = filters.q.trim().toLowerCase()
    const activeServices = services.filter((service) => service.is_active)
    const offerShopIds = new Set(
      offers.filter((offer) => offer.is_active).map((offer) => offer.shop_id),
    )

    const results: ShopResult[] = []
    for (const shop of shops) {
      if (shop.status !== 'approved') continue

      const own = activeServices.filter((service) => service.shop_id === shop.id)
      const prices = own.map((service) => service.price_poisha)
      const result: ShopResult = {
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
        from_price_poisha: prices.length > 0 ? Math.min(...prices) : null,
        has_offer: offerShopIds.has(shop.id),
        is_open_now: isOpenNow(shop.id, now),
      }

      if (needle) {
        const haystack = [shop.name, shop.area, shop.city, ...own.map((service) => service.name)]
        if (!haystack.some((text) => text.toLowerCase().includes(needle))) continue
      }
      // A "women" filter also keeps unisex shops, and the same for "men".
      if (
        filters.gender &&
        shop.gender_category !== filters.gender &&
        shop.gender_category !== 'unisex'
      ) {
        continue
      }
      if (filters.minRating && shop.rating_average < filters.minRating) continue
      if (filters.maxDistanceKm && result.distance_km > filters.maxDistanceKm) continue
      if (
        filters.maxFromPricePoisha &&
        (result.from_price_poisha === null ||
          result.from_price_poisha > filters.maxFromPricePoisha)
      ) {
        continue
      }
      if (filters.hasOffer && !result.has_offer) continue
      if (filters.openNow && !result.is_open_now) continue

      results.push(result)
    }
    return sortResults(results, filters.sort)
  })
}