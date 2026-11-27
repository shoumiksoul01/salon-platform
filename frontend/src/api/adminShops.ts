import { adminShops } from '../mocks/adminShops'
import type { AdminShop } from '../mocks/adminShops'
import { getMockMode, mockDelay } from './mock'

export type { AdminShop, AdminShopDocument } from '../mocks/adminShops'
export type { ShopStatus } from '../mocks/shops'

export type ShopDecision = 'approve' | 'reject' | 'suspend'

const USE_MOCK = true

// The status a shop must have for a decision, and the status it gets.
const RULES: Record<ShopDecision, { from: AdminShop['status']; to: AdminShop['status'] }> = {
  approve: { from: 'pending', to: 'approved' },
  reject: { from: 'pending', to: 'rejected' },
  suspend: { from: 'approved', to: 'suspended' },
}

// In memory only, so a page reload brings the fixtures back.
let store: AdminShop[] = adminShops

export async function listAdminShops(): Promise<AdminShop[]> {
  if (!USE_MOCK) throw new Error('The admin shops API is not wired yet')

  return mockDelay<AdminShop[]>(() => {
    const mode = getMockMode()
    if (mode === 'error') throw new Error('Mock error')
    return mode === 'empty' ? [] : store
  })
}

export async function decideShop(
  shopId: string,
  decision: ShopDecision,
  reason = '',
): Promise<AdminShop> {
  if (!USE_MOCK) throw new Error('The admin shops API is not wired yet')

  return mockDelay<AdminShop>(() => {
    const shop = store.find((item) => item.id === shopId)
    const rule = RULES[decision]
    if (!shop || shop.status !== rule.from) throw new Error('invalid_status')
    if (decision !== 'approve' && !reason.trim()) throw new Error('reason_required')

    const updated: AdminShop = {
      ...shop,
      status: rule.to,
      approval_reason: decision === 'approve' ? null : reason.trim(),
    }
    store = store.map((item) => (item.id === shopId ? updated : item))
    return updated
  })
}