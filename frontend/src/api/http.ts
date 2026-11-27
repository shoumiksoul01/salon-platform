import { getSupabase } from './supabaseClient'

// Address of the FastAPI backend, for example http://localhost:8000 or the Render URL.
// When it is empty the api modules keep using their mock data (see apiConfigured).
const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

// api modules use this for their USE_MOCK switch: the real API is used only when the
// address is set, so the deployed demo keeps working before the backend is deployed.
export const apiConfigured = API_URL !== ''

// An error answer from the backend: { detail, code } (docs/api-conventions.md).
export class ApiError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, detail: string) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown // sent as JSON
  form?: FormData // sent as a file upload
}

// Calls /api/v1<path> with the logged-in user's token. Returns the JSON answer,
// or undefined for 204. Throws ApiError for 4xx and 5xx answers.
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { data } = await getSupabase().auth.getSession()
  const token = data.session?.access_token

  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.form ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    })
  } catch {
    throw new ApiError(0, 'network_error', 'Could not reach the server')
  }

  if (response.status === 204) return undefined as T

  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    // The body was not JSON; the status code below still tells what happened.
  }

  if (!response.ok) {
    const failure = (payload ?? {}) as { detail?: unknown; code?: unknown }
    throw new ApiError(
      response.status,
      typeof failure.code === 'string' ? failure.code : 'failed',
      typeof failure.detail === 'string' ? failure.detail : 'The request failed',
    )
  }
  return payload as T
}
