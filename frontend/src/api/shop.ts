import { mockShop } from '../mocks/shop'

// Mock or real data. Flip to false in the wire-up commit for FR-01.1.
const USE_MOCK = true

export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended'
export type GenderCategory = 'gents' | 'ladies' | 'unisex'

export interface WorkingHour {
  weekday: number // 0 = Sunday ... 6 = Saturday
  is_closed: boolean
  opens_at: string // 'HH:MM'
  closes_at: string // 'HH:MM'
}

export interface ShopDocument {
  id: string
  doc_type: 'trade_licence' | 'other'
  file_name: string
  file_url: string
  uploaded_at: string // ISO 8601, UTC
}

export interface Shop {
  id: string
  name: string
  description: string
  address: string
  area: string
  phone: string
  gender_category: GenderCategory
  latitude: number | null
  longitude: number | null
  working_hours: WorkingHour[]
  approval_status: ApprovalStatus
  approval_reason: string | null
  documents: ShopDocument[]
}

export type ShopInput = Pick<
  Shop,
  | 'name'
  | 'description'
  | 'address'
  | 'area'
  | 'phone'
  | 'gender_category'
  | 'latitude'
  | 'longitude'
  | 'working_hours'
>

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// Keeps changes while the page is open, so the mock behaves like a server.
let current: Shop = { ...mockShop }

export async function getMyShop(): Promise<Shop> {
  if (USE_MOCK) {
    await delay(300)
    return { ...current }
  }
  throw new Error('The real shop API is not wired yet')
}

export async function saveMyShop(input: ShopInput): Promise<Shop> {
  if (USE_MOCK) {
    await delay(300)
    current = { ...current, ...input }
    return { ...current }
  }
  throw new Error('The real shop API is not wired yet')
}
