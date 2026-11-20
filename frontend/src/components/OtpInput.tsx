import { useEffect, useRef } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import styles from './OtpInput.module.css'

interface OtpInputProps {
  legend: string
  // One entry per box ('' for an empty box). The number of boxes is value.length.
  value: string[]
  onChange: (digits: string[]) => void
  digitLabel: (position: number) => string
  invalid?: boolean
  // Change this number to move the focus to the first box (after a clear or a resend).
  focusKey?: number
}

// A row of single-digit boxes for an OTP code: the focus moves on by itself,
// Backspace and the arrow keys move between boxes, and pasting fills all boxes.
export default function OtpInput({
  legend,
  value,
  onChange,
  digitLabel,
  invalid,
  focusKey,
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const length = value.length

  useEffect(() => {
    if (focusKey) refs.current[0]?.focus()
  }, [focusKey])

  function setDigit(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1)
    onChange(value.map((item, i) => (i === index ? digit : item)))
    if (digit && index < length - 1) refs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !value[index] && index > 0) refs.current[index - 1]?.focus()
    if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus()
    if (event.key === 'ArrowRight' && index < length - 1) refs.current[index + 1]?.focus()
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    event.preventDefault()
    onChange(Array.from({ length }, (_, i) => pasted[i] ?? ''))
    refs.current[Math.min(pasted.length, length - 1)]?.focus()
  }

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.digits}>
        {value.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              refs.current[index] = element
            }}
            className={styles.digit}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={digit}
            aria-label={digitLabel(index + 1)}
            aria-invalid={invalid ? true : undefined}
            onChange={(e) => setDigit(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
          />
        ))}
      </div>
    </fieldset>
  )
}