import type { InputHTMLAttributes } from 'react'
import control from './control.module.css'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export default function Input({ invalid = false, className, ...rest }: InputProps) {
  const classes = [control.control, className ?? ''].filter(Boolean).join(' ')
  return <input className={classes} aria-invalid={invalid || undefined} {...rest} />
}