import { mockProfile } from '../mocks/profile'

// Mock or real data. Flip to false in the wire-up commit for C-05.
const USE_MOCK = true

export interface Profile {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  preferred_language: 'bn' | 'en'
}

export type ProfileUpdate = Pick<Profile, 'full_name' | 'phone' | 'email'>

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// Keeps saved changes while the page is open, so the mock behaves like a server.
let current: Profile = { ...mockProfile }

export async function getProfile(): Promise<Profile> {
  if (USE_MOCK) {
    await delay(300)
    return { ...current }
  }
  throw new Error('The real profile API is not wired yet')
}

export async function updateProfile(update: ProfileUpdate): Promise<Profile> {
  if (USE_MOCK) {
    await delay(300)
    current = { ...current, ...update }
    return { ...current }
  }
  throw new Error('The real profile API is not wired yet')
}
