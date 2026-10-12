import type { InputHTMLAttributes, ReactNode } from 'react'
import styles from './Checkbox.module.css'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
}

export default function Checkbox({ label, disabled, className, ...rest }: CheckboxProps) {
  const classes = [styles.checkbox, disabled ? styles.disabled : '', className ?? '']
    .filter(Boolean)
    .join(' ')

  return (
    <label className={classes}>
      <input type="checkbox" className={styles.input} disabled={disabled} {...rest} />
      <span>{label}</span>
    </label>
  )
}