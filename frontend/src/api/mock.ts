// Helpers shared by every api module while USE_MOCK is true.
export const MOCK_DELAY_MS = 400

export type MockMode = 'ok' | 'empty' | 'error'

// In development only, ?mock=empty or ?mock=error in the page address
// forces the empty or error state, so those states can be checked by hand.
export function getMockMode(): MockMode {
  if (!import.meta.env.DEV) return 'ok'
  const value = new URLSearchParams(window.location.search).get('mock')
  return value === 'empty' || value === 'error' ? value : 'ok'
}

// Resolves with value() after a short delay, so loading states are visible.
export function mockDelay<T>(value: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(value())
      } catch (error) {
        reject(error)
      }
    }, MOCK_DELAY_MS)
  })
}