import type { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  fullWidth?: boolean
  loading?: boolean
}

export default function Button({
  variant = 'primary',
  fullWidth = false,
  loading = false,
  disabled,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[variant], fullWidth ? styles.full : '', className ?? '']
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {children}
    </button>
  )
}