import type { Language } from '../i18n'
import { mockProfile } from '../mocks/profile'
import { apiConfigured, apiFetch } from './http'

// Mock data until VITE_API_URL is set (see http.ts).
const USE_MOCK = !apiConfigured

export interface Profile {
  id: string
  full_name: string
  phone: string | null
  email: string | null // read only: the email is the login, Supabase Auth owns it
  preferred_language: Language | null // null = not chosen yet
}

// C-05 update policy: a user may change only these three. The role and the email
// can never be changed here, and the backend refuses any other field.
export interface ProfileUpdate {
  full_name?: string
  phone?: string | null
  preferred_language?: Language
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// Keeps saved changes while the page is open, so the mock behaves like a server.
let current: Profile = { ...mockProfile }

export async function getProfile(): Promise<Profile> {
  if (USE_MOCK) {
    await delay(300)
    return { ...current }
  }
  return apiFetch<Profile>('/me')
}

export async function updateProfile(update: ProfileUpdate): Promise<Profile> {
  if (USE_MOCK) {
    await delay(300)
    current = { ...current, ...update }
    return { ...current }
  }
  return apiFetch<Profile>('/me', { method: 'PATCH', body: update })
}

// C-07: the language the user saved on the server, or null if none (or in mock mode).
export async function fetchSavedLanguage(): Promise<Language | null> {
  if (USE_MOCK) return null
  return (await getProfile()).preferred_language
}

// C-07: remember the choice for later sessions and other devices.
export async function saveLanguage(language: Language): Promise<void> {
  if (USE_MOCK) return
  await updateProfile({ preferred_language: language })
}
