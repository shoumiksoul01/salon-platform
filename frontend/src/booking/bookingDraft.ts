// The booking in progress, kept in this browser tab only (it is gone when the tab closes).
// It holds ids, never personal data. Reading and writing can fail (private windows), so every call is wrapped.

export interface BookingDraft {
  shop_id: string
  service_ids: string[]
  staff_id: string | null // null = any available staff
}

const KEY = 'salon.bookingDraft'

export function loadDraft(shopId: string): BookingDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as BookingDraft
    return draft.shop_id === shopId && Array.isArray(draft.service_ids) ? draft : null
  } catch {
    return null
  }
}

export function saveDraft(draft: BookingDraft): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    // The page still works without storage.
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing to do.
  }
}