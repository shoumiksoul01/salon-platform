import { DEMO_SHOP_ID } from '../mocks/bookings'
import { services as serviceFixtures } from '../mocks/shops'
import type { GenderCategory, Service } from '../mocks/shops'
import { getMockMode, mockDelay } from './mock'

// true = use the fixtures in src/mocks/. Set to false in the wire-up commit for FR-01.2.
// Pages call the functions below and never import the fixtures.
const USE_MOCK = true

export type { GenderCategory, Service }

// What the owner types in the service form. Money is integer poisha (100 poisha = 1 taka).
export interface ServiceInput {
  name: string
  price_poisha: number
  duration_minutes: number
  gender_category: GenderCategory
  image_urls: string[]
}

export const MAX_SERVICE_IMAGES = 3
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// The mock keeps changes in memory only, so they reset when the page is reloaded.
let mockServices: Service[] | null = null

function store(): Service[] {
  if (!mockServices) {
    mockServices = serviceFixtures
      .filter((service) => service.shop_id === DEMO_SHOP_ID)
      .map((service) => ({ ...service, image_urls: [...service.image_urls] }))
  }
  return mockServices
}

function notWritten(): never {
  throw new Error('The real services API is not written yet')
}

// The services of the owner's shop (active and inactive).
export async function listServices(): Promise<Service[]> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const mode = getMockMode()
      if (mode === 'error') throw new Error('Mock error: could not load the services')
      if (mode === 'empty') return []
      return store().map((service) => ({ ...service }))
    })
  }
  return notWritten()
}

export async function createService(input: ServiceInput): Promise<Service> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const service: Service = {
        id: crypto.randomUUID(),
        shop_id: DEMO_SHOP_ID,
        ...input,
        image_urls: [...input.image_urls],
        is_active: true,
      }
      store().push(service)
      return { ...service }
    })
  }
  return notWritten()
}

export async function updateService(id: string, input: ServiceInput): Promise<Service> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const service = store().find((item) => item.id === id)
      if (!service) throw new Error('Service not found')
      Object.assign(service, input, { image_urls: [...input.image_urls] })
      return { ...service }
    })
  }
  return notWritten()
}

// Deactivating hides the service from customers. Old bookings keep it.
export async function setServiceActive(id: string, isActive: boolean): Promise<Service> {
  if (USE_MOCK) {
    return mockDelay(() => {
      const service = store().find((item) => item.id === id)
      if (!service) throw new Error('Service not found')
      service.is_active = isActive
      return { ...service }
    })
  }
  return notWritten()
}

// The mock turns the picture into a data URL. The real API will upload it to storage
// and return its public URL, so the page only ever deals with a string.
export function uploadServiceImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the picture'))
    reader.readAsDataURL(file)
  })
}
