import { useId } from 'react'
import type { ReactNode } from 'react'
import styles from './FormField.module.css'

export interface FieldControlProps {
  id: string
  required: boolean
  invalid: boolean
  'aria-describedby'?: string
}

export interface FormFieldProps {
  label: string
  hint?: string
  error?: string
  required?: boolean
  /** Receives the props that connect the control to its label, hint and error. */
  children: (control: FieldControlProps) => ReactNode
}

export default function FormField({
  label,
  hint,
  error,
  required = false,
  children,
}: FormFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ')

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && (
          <span className={styles.required} aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children({
        id,
        required,
        invalid: Boolean(error),
        'aria-describedby': describedBy || undefined,
      })}
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}