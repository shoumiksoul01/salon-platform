import { getShopDetails } from './shops'
import type { ShopOffer } from './shops'
import type { Service, Shop } from '../mocks/shops'
import { staffMembers, staffServices } from '../mocks/bookings'

// Mock or real data. Flip to false in the wire-up commit for the booking flow (FR-03).
const USE_MOCK = true

export interface BookableStaff {
  id: string
  full_name: string
  role_title: string
  service_ids: string[] // the services this person does
}

// Everything BOOK-01 needs, in one call. null means the shop was not found or is not approved.
export interface BookingOptions {
  shop: Shop
  services: Service[]
  offers: ShopOffer[]
  staff: BookableStaff[]
}

export async function getBookingOptions(shopId: string): Promise<BookingOptions | null> {
  const details = await getShopDetails(shopId)
  if (!details) return null

  if (USE_MOCK) {
    const staff: BookableStaff[] = staffMembers
      .filter((member) => member.shop_id === shopId && member.is_active)
      .map((member) => ({
        id: member.id,
        full_name: member.full_name,
        role_title: member.role_title,
        service_ids: staffServices
          .filter((link) => link.staff_id === member.id)
          .map((link) => link.service_id),
      }))
    return {
      shop: details.shop,
      services: details.services.filter((service) => service.is_active),
      offers: details.offers,
      staff,
    }
  }
  throw new Error('The real booking options API is not wired yet')
}