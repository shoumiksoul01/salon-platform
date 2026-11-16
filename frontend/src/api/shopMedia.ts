import { shopImages, shopTours, type ShopImage } from '../mocks/shopMedia'
import { getMockMode, mockDelay } from './mock'

// true = use the fixtures in src/mocks/. The owner of this feature sets it to
// false in the wire-up commit. Pages call the functions below and never
// import the fixtures.
const USE_MOCK = true

export interface ShopMedia {
  images: ShopImage[]
  tour_url: string | null
}

export async function getShopMedia(shopId: string): Promise<ShopMedia> {
  if (!USE_MOCK) {
    const response = await fetch(`/api/v1/shops/${shopId}/media`)
    if (!response.ok) throw new Error(`Request failed: ${response.status}`)
    return (await response.json()) as ShopMedia
  }

  return mockDelay<ShopMedia>(() => {
    const mode = getMockMode()
    if (mode === 'error') throw new Error('Mock error')
    if (mode === 'empty') return { images: [], tour_url: null }

    return {
      images: shopImages
        .filter((image) => image.shop_id === shopId)
        .sort((a, b) => a.sort_order - b.sort_order),
      tour_url: shopTours.find((tour) => tour.shop_id === shopId)?.tour_url ?? null,
    }
  })
}