import type { Shop, WorkingHour } from '../api/shop'

// Open every day, 10:00 to 20:00. weekday 0 = Sunday (same as docs/schema.sql).
const defaultHours: WorkingHour[] = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  is_closed: false,
  opens_at: '10:00',
  closes_at: '20:00',
}))

// A new owner who has not filled anything yet.
// To preview the other banners, change approval_status ('pending', 'approved',
// 'rejected', 'suspended') and approval_reason here.
export const mockShop: Shop = {
  id: '7c1f0d52-9b3e-4a8c-8d46-2e5a1b9f3c70',
  name: '',
  description: '',
  address: '',
  area: '',
  phone: '',
  gender_category: 'unisex',
  latitude: null,
  longitude: null,
  working_hours: defaultHours,
  approval_status: 'draft',
  approval_reason: null,
  documents: [],
}
