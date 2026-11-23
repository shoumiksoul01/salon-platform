import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// One shared Supabase client for the whole frontend.
// It is created on first use, so the app still starts without frontend/.env
// (CI, a teammate who has no keys yet). Only the auth api modules call it.
let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (client) return client

  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env',
    )
  }

  client = createClient(url, key)
  return client
}