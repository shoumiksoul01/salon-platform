import { createContext } from 'react'

export type ToastVariant = 'success' | 'info' | 'warning' | 'danger'

export interface ToastOptions {
  message: string
  variant?: ToastVariant
  /** Milliseconds before it closes by itself. Default 5000. Use 0 to keep it until dismissed. */
  duration?: number
}

export interface ToastApi {
  show: (options: ToastOptions) => void
}

export const ToastContext = createContext<ToastApi | null>(null)