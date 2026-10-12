import type { SelectHTMLAttributes } from 'react'
import control from './control.module.css'
import styles from './Select.module.css'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
  /** Text of the empty first option. Pass a translated string from the page. */
  placeholder?: string
}

export default function Select({
  invalid = false,
  placeholder,
  className,
  children,
  ...rest
}: SelectProps) {
  const classes = [control.control, styles.select, className ?? ''].filter(Boolean).join(' ')

  return (
    <div className={styles.wrap}>
      <select className={classes} aria-invalid={invalid || undefined} {...rest}>
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
      <span className={styles.chevron} aria-hidden="true" />
    </div>
  )
}