import { getShopDetails } from './shops'
import type { ShopOffer } from './shops'
import { freeSlotsForNewBooking } from './bookings'
import { getMockMode, mockDelay } from './mock'
import { services as allServices, shops as allShops, type Service, type Shop } from '../mocks/shops'
import { staffMembers, staffServices } from '../mocks/bookings'

// Mock or real data. Flip to false in the wire-up commit for the booking flow (FR-03).
const USE_MOCK = true

const DAY_MS = 24 * 60 * 60 * 1000
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000
const BOOKING_DAYS = 14

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

function staffForShop(shopId: string): BookableStaff[] {
  return staffMembers
    .filter((member) => member.shop_id === shopId && member.is_active)
    .map((member) => ({
      id: member.id,
      full_name: member.full_name,
      role_title: member.role_title,
      service_ids: staffServices
        .filter((link) => link.staff_id === member.id)
        .map((link) => link.service_id),
    }))
}

export async function getBookingOptions(shopId: string): Promise<BookingOptions | null> {
  const details = await getShopDetails(shopId)
  if (!details) return null

  if (USE_MOCK) {
    return {
      shop: details.shop,
      services: details.services.filter((service) => service.is_active),
      offers: details.offers,
      staff: staffForShop(shopId),
    }
  }
  throw new Error('The real booking options API is not wired yet')
}

// One free start time, with every staff member who is free then (BOOK-02).
export interface Slot {
  starts_at: string // ISO UTC
  staff_ids: string[]
}

export interface SlotDay {
  date: string // YYYY-MM-DD in Dhaka
  slots: Slot[] // empty when the day is closed or full
}

// A staff member who can take this booking. Used to show a name for each staff id in a slot.
export interface SlotStaff {
  id: string
  full_name: string
}

export interface SlotOptions {
  shop_name: string
  services: Pick<Service, 'id' | 'name' | 'price_poisha' | 'duration_minutes'>[]
  total_minutes: number
  total_poisha: number
  staff_name: string | null // set when one staff member was chosen in BOOK-01
  staff: SlotStaff[] // everyone who could take this booking (one person when staff_name is set)
  days: SlotDay[]
}

// Free times for the next two weeks. staffId null = anyone who does all the chosen services.
export async function getSlotOptions(
  shopId: string,
  serviceIds: string[],
  staffId: string | null,
): Promise<SlotOptions> {
  if (!USE_MOCK) throw new Error('The real slots API is not wired yet')

  return mockDelay(() => {
    if (getMockMode() === 'error') throw new Error('mock error')

    const chosen = allServices.filter(
      (service) => service.shop_id === shopId && serviceIds.includes(service.id),
    )
    const totalMinutes = chosen.reduce((sum, service) => sum + service.duration_minutes, 0)
    const totalPoisha = chosen.reduce((sum, service) => sum + service.price_poisha, 0)

    const capable = staffForShop(shopId).filter((member) =>
      serviceIds.every((id) => member.service_ids.includes(id)),
    )
    const candidates = staffId ? capable.filter((member) => member.id === staffId) : capable

    const days: SlotDay[] = []
    for (let i = 0; i < BOOKING_DAYS; i += 1) {
      const date = new Date(Date.now() + DHAKA_OFFSET_MS + i * DAY_MS).toISOString().slice(0, 10)
      const byStart = new Map<string, string[]>()
      if (getMockMode() !== 'empty' && chosen.length > 0) {
        for (const member of candidates) {
          for (const start of freeSlotsForNewBooking(shopId, member.id, totalMinutes, date)) {
            byStart.set(start, [...(byStart.get(start) ?? []), member.id])
          }
        }
      }
      const slots = [...byStart.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([starts_at, staff_ids]) => ({ starts_at, staff_ids }))
      days.push({ date, slots })
    }

    return {
      shop_name: allShops.find((shop) => shop.id === shopId)?.name ?? '',
      services: chosen.map(({ id, name, price_poisha, duration_minutes }) => ({
        id,
        name,
        price_poisha,
        duration_minutes,
      })),
      total_minutes: totalMinutes,
      total_poisha: totalPoisha,
      staff_name: candidates.length === 1 && staffId ? candidates[0].full_name : null,
      staff: candidates.map(({ id, full_name }) => ({ id, full_name })),
      days,
    }
  })
}

// The offer applied to a booking, as a discount in poisha (BOOK-03).
export interface AppliedOffer {
  id: string
  title: string
  discount_poisha: number
}

// Everything BOOK-03 needs to show the booking before payment.
export interface ReviewOptions {
  shop_id: string
  shop_name: string
  shop_address: string
  requires_booking_approval: boolean
  services: Pick<Service, 'id' | 'name' | 'price_poisha' | 'duration_minutes'>[]
  staff_name: string | null // the person assigned in BOOK-02
  starts_at: string // ISO UTC
  total_minutes: number
  subtotal_poisha: number
  offer: AppliedOffer | null
  total_poisha: number
}

// One offer per booking: the active, in-date offer that gives the biggest discount.
// A combo offer needs all of its services in the booking. The discount never goes above
// the price of the services the offer covers.
function bestOffer(
  offers: ShopOffer[],
  chosen: Pick<Service, 'id' | 'price_poisha'>[],
  nowMs: number,
): AppliedOffer | null {
  const chosenIds = new Set(chosen.map((service) => service.id))
  let best: AppliedOffer | null = null

  for (const offer of offers) {
    if (!offer.is_active) continue
    if (nowMs < Date.parse(offer.starts_at) || nowMs > Date.parse(offer.ends_at)) continue

    const covered = chosen.filter((service) => offer.service_ids.includes(service.id))
    if (covered.length === 0) continue
    if (offer.offer_type === 'combo' && !offer.service_ids.every((id) => chosenIds.has(id))) continue

    const coveredPoisha = covered.reduce((sum, service) => sum + service.price_poisha, 0)
    let discount = 0
    if (offer.discount_percent !== null) {
      discount = Math.round((coveredPoisha * offer.discount_percent) / 100)
    } else if (offer.discount_poisha !== null) {
      discount = offer.discount_poisha
    }
    discount = Math.min(discount, coveredPoisha)

    if (discount > 0 && (!best || discount > best.discount_poisha)) {
      best = { id: offer.id, title: offer.title, discount_poisha: discount }
    }
  }
  return best
}

// The booking in progress, priced and ready to review. null means the shop was not found
// or is not approved.
export async function getReviewOptions(
  shopId: string,
  serviceIds: string[],
  startsAt: string,
  assignedStaffId: string | null,
): Promise<ReviewOptions | null> {
  const details = await getShopDetails(shopId)
  if (!details) return null
  if (!USE_MOCK) throw new Error('The real review API is not wired yet')

  const chosen = details.services.filter(
    (service) => service.is_active && serviceIds.includes(service.id),
  )
  const totalMinutes = chosen.reduce((sum, service) => sum + service.duration_minutes, 0)
  const subtotal = chosen.reduce((sum, service) => sum + service.price_poisha, 0)
  const offer = bestOffer(details.offers, chosen, Date.now())
  const staff = staffForShop(shopId).find((member) => member.id === assignedStaffId)

  return {
    shop_id: details.shop.id,
    shop_name: details.shop.name,
    shop_address: details.shop.address,
    requires_booking_approval: details.shop.requires_booking_approval,
    services: chosen.map(({ id, name, price_poisha, duration_minutes }) => ({
      id,
      name,
      price_poisha,
      duration_minutes,
    })),
    staff_name: staff?.full_name ?? null,
    starts_at: startsAt,
    total_minutes: totalMinutes,
    subtotal_poisha: subtotal,
    offer,
    total_poisha: subtotal - (offer?.discount_poisha ?? 0),
  }
}