import { DEMO_SHOP_ID } from '../mocks/bookings'
import { shopImages, shopTours } from '../mocks/shopMedia'
import type { ShopImage } from '../mocks/shopMedia'
import { ApiError, apiConfigured, apiFetch } from './http'
import { getMockMode, mockDelay } from './mock'
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from './services'

// Mock data until VITE_API_URL points at the backend (FR-01.4 is wired).
// Pages call the functions below and never import the fixtures.
const USE_MOCK = !apiConfigured

export type { ShopImage }

// The photos of the owner's shop (in display order, the first is the cover) and the tour link.
export interface OwnerMedia {
  images: ShopImage[]
  tour_url: string | null
}

export const MAX_PHOTOS = 10
export const ALT_MAX = 120
export const TOUR_URL_MAX = 300
export { IMAGE_TYPES, MAX_IMAGE_BYTES }

export type MediaErrorCode =
  | 'too_many'
  | 'bad_type'
  | 'too_big'
  | 'read_failed'
  | 'alt_too_long'
  | 'bad_url'
  | 'not_found'

export class MediaError extends Error {
  code: MediaErrorCode

  constructor(code: MediaErrorCode) {
    super(`Shop media failed: ${code}`)
    this.name = 'MediaError'
    this.code = code
  }
}

// The mock keeps changes in memory only, so they reset when the page is reloaded.
interface Store {
  images: ShopImage[]
  tour_url: string | null
}

let mockStore: Store | null = null

function store(): Store {
  if (!mockStore) {
    mockStore = {
      images: shopImages
        .filter((image) => image.shop_id === DEMO_SHOP_ID)
        .map((image) => ({ ...image }))
        .sort((a, b) => a.sort_order - b.sort_order),
      tour_url: shopTours.find((tour) => tour.shop_id === DEMO_SHOP_ID)?.tour_url ?? null,
    }
  }
  return mockStore
}

function snapshot(): OwnerMedia {
  const current = store()
  return { images: current.images.map((image) => ({ ...image })), tour_url: current.tour_url }
}

function renumber() {
  store().images.forEach((image, index) => {
    image.sort_order = index
  })
}

const MEDIA_ERROR_CODES: MediaErrorCode[] = [
  'too_many',
  'bad_type',
  'too_big',
  'read_failed',
  'alt_too_long',
  'bad_url',
  'not_found',
]

// Runs a real API call. The backend uses the same error codes as MediaError, so the
// page shows the same messages as it does with the mock.
async function real<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call()
  } catch (error) {
    if (error instanceof ApiError) {
      const code = MEDIA_ERROR_CODES.find((item) => item === error.code)
      if (code) throw new MediaError(code)
    }
    throw error
  }
}

function cleanAlt(value: string): string {
  const alt = value.trim()
  if (alt.length > ALT_MAX) throw new MediaError('alt_too_long')
  return alt
}

// An empty text means "no tour". Anything else must be a valid https link.
function cleanTourUrl(value: string): string | null {
  const text = value.trim()
  if (text === '') return null
  if (text.length > TOUR_URL_MAX) throw new MediaError('bad_url')
  let url: URL
  try {
    url = new URL(text)
  } catch {
    throw new MediaError('bad_url')
  }
  if (url.protocol !== 'https:' || url.hostname === '') throw new MediaError('bad_url')
  return text
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new MediaError('read_failed'))
    reader.readAsDataURL(file)
  })
}

export async function getOwnerMedia(): Promise<OwnerMedia> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const mode = getMockMode()
      if (mode === 'error') throw new Error('Mock error: could not load the photos')
      if (mode === 'empty') return { images: [], tour_url: null }
      return snapshot()
    })
  }
  return real(() => apiFetch<OwnerMedia>('/shops/me/media'))
}

// Adds a photo at the end of the gallery. The mock turns the picture into a data URL.
// The real API will upload it to storage and save its public URL.
export async function addShopImage(file: File, altText: string): Promise<OwnerMedia> {
  if (USE_MOCK) {
    if (store().images.length >= MAX_PHOTOS) throw new MediaError('too_many')
    if (!IMAGE_TYPES.includes(file.type)) throw new MediaError('bad_type')
    if (file.size > MAX_IMAGE_BYTES) throw new MediaError('too_big')
    const alt = cleanAlt(altText)
    const url = await readAsDataUrl(file)
    return mockDelay(() => {
      if (store().images.length >= MAX_PHOTOS) throw new MediaError('too_many')
      store().images.push({
        id: crypto.randomUUID(),
        shop_id: DEMO_SHOP_ID,
        url,
        alt_text: alt,
        sort_order: store().images.length,
      })
      return snapshot()
    })
  }
  const form = new FormData()
  form.append('file', file)
  form.append('alt_text', altText)
  return real(() => apiFetch<OwnerMedia>('/shops/me/media/images', { method: 'POST', form }))
}

export async function updateImageAlt(id: string, altText: string): Promise<OwnerMedia> {
  if (USE_MOCK) {
    const alt = cleanAlt(altText)
    return mockDelay(() => {
      const image = store().images.find((item) => item.id === id)
      if (!image) throw new MediaError('not_found')
      image.alt_text = alt
      return snapshot()
    })
  }
  return real(() =>
    apiFetch<OwnerMedia>(`/shops/me/media/images/${id}`, { method: 'PATCH', body: { alt_text: altText } }),
  )
}

// direction -1 = one place earlier (towards the cover), 1 = one place later.
export async function moveImage(id: string, direction: -1 | 1): Promise<OwnerMedia> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const images = store().images
      const index = images.findIndex((item) => item.id === id)
      if (index === -1) throw new MediaError('not_found')
      const target = index + direction
      if (target >= 0 && target < images.length) {
        const [moved] = images.splice(index, 1)
        images.splice(target, 0, moved)
        renumber()
      }
      return snapshot()
    })
  }
  return real(() =>
    apiFetch<OwnerMedia>(`/shops/me/media/images/${id}/move`, { method: 'POST', body: { direction } }),
  )
}

export async function removeImage(id: string): Promise<OwnerMedia> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const current = store()
      if (!current.images.some((item) => item.id === id)) throw new MediaError('not_found')
      current.images = current.images.filter((item) => item.id !== id)
      renumber()
      return snapshot()
    })
  }
  return real(() => apiFetch<OwnerMedia>(`/shops/me/media/images/${id}`, { method: 'DELETE' }))
}

// Saves the virtual tour link. An empty text removes the tour. Returns the saved link or null.
export async function saveTourUrl(value: string): Promise<string | null> {
  if (USE_MOCK) {
    const url = cleanTourUrl(value)
    return mockDelay(() => {
      store().tour_url = url
      return url
    })
  }
  const saved = await real(() =>
    apiFetch<{ tour_url: string | null }>('/shops/me/media/tour', { method: 'PUT', body: { tour_url: value } }),
  )
  return saved.tour_url
}
