// Shops as the administrator sees them (FR-10.1): the shop row plus the owner, documents and reason.
import { shops } from './shops'
import type { Shop } from './shops'

export interface AdminShopDocument {
  id: string
  file_name: string
  file_url: string | null
}

export interface AdminShop extends Shop {
  owner_name: string
  approval_reason: string | null
  documents: AdminShopDocument[]
}

const uid = (group: number, n: number): string =>
  `${String(group).padStart(8, '0')}-0000-4000-8000-${String(n).padStart(12, '0')}`

const licence = (n: number): AdminShopDocument[] => [
  { id: uid(9, n), file_name: `trade-licence-${n}.pdf`, file_url: null },
]

const OWNER_NAMES = [
  'Rupa Akter',
  'Sabbir Ahmed',
  'Nilima Das',
  'Kamrul Hasan',
  'Shona Begum',
  'Farzana Karim',
  'Mehedi Hasan',
]

type ExtraFields = Pick<
  AdminShop,
  'name' | 'address' | 'area' | 'owner_name' | 'status' | 'created_at'
> &
  Partial<Pick<AdminShop, 'approval_reason' | 'documents'>>

const extra = (n: number, fields: ExtraFields): AdminShop => ({
  ...shops[6],
  id: uid(1, n),
  owner_id: uid(5, n),
  phone: `01700-${String(n).padStart(6, '0')}`,
  description: '',
  rating_average: 0,
  review_count: 0,
  approval_reason: null,
  documents: licence(n),
  ...fields,
})

export const adminShops: AdminShop[] = [
  ...shops.map((shop, index) => ({
    ...shop,
    owner_name: OWNER_NAMES[index],
    approval_reason: null,
    documents: licence(index + 1),
  })),
  extra(8, {
    name: 'Mirror Magic Parlour',
    address: 'Road 3, Shyamoli',
    area: 'Shyamoli',
    owner_name: 'Sharmin Sultana',
    status: 'pending',
    created_at: '2026-11-18T05:30:00.000Z',
  }),
  extra(9, {
    name: 'Gentle Touch Salon',
    address: 'Block D, Bashundhara',
    area: 'Bashundhara',
    owner_name: 'Rakib Hossain',
    status: 'pending',
    created_at: '2026-11-20T09:15:00.000Z',
  }),
  extra(10, {
    name: 'Style Point',
    address: 'Elephant Road',
    area: 'New Market',
    owner_name: 'Jahid Islam',
    status: 'pending',
    created_at: '2026-11-23T11:00:00.000Z',
  }),
  extra(11, {
    name: 'Orchid Beauty Care',
    address: 'Road 8, Khilgaon',
    area: 'Khilgaon',
    owner_name: 'Moushumi Roy',
    status: 'pending',
    created_at: '2026-11-25T08:45:00.000Z',
  }),
  extra(12, {
    name: 'Quick Cuts',
    address: 'Station Road, Tongi',
    area: 'Tongi',
    owner_name: 'Salman Mia',
    status: 'rejected',
    created_at: '2026-11-02T07:20:00.000Z',
    approval_reason: 'The trade licence photo is unreadable.',
  }),
  extra(13, {
    name: 'Royal Look Salon',
    address: 'Wari Main Road',
    area: 'Wari',
    owner_name: 'Habib Rahman',
    status: 'suspended',
    created_at: '2026-09-14T10:00:00.000Z',
    approval_reason: 'Repeated complaints about cancelled bookings.',
  }),
]