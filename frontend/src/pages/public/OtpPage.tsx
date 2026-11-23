import { useEffect, useRef, useState } from 'react'
import type { ClipboardEvent, KeyboardEvent, SyntheticEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Card, useToast } from '../../components/ui'
import { AuthError, resendOtp, verifyOtp } from '../../api/auth'
import styles from './OtpPage.module.css'

const LENGTH = 6
const RESEND_SECONDS = 60

function emptyDigits(): string[] {
  return Array.from({ length: LENGTH }, () => '')
}

// AUTH-02 (C-02): verify the OTP code sent to the email
export default function OtpPage() {
  const { t } = useTranslation('auth')
  const toast = useToast()
  const location = useLocation()
  const email = (location.state as { email?: string } | null)?.email ?? ''

  const [digits, setDigits] = useState<string[]>(emptyDigits)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [verified, setVerified] = useState(false)
  const [seconds, setSeconds] = useState(RESEND_SECONDS)
  const [resending, setResending] = useState(false)
  const refs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (seconds <= 0) return
    const id = window.setTimeout(() => setSeconds((value) => value - 1), 1000)
    return () => window.clearTimeout(id)
  }, [seconds])

  function setDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    setDigits((previous) => previous.map((item, i) => (i === index ? digit : item)))
    setError('')
    if (digit && index < LENGTH - 1) refs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) refs.current[index - 1]?.focus()
    if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus()
    if (event.key === 'ArrowRight' && index < LENGTH - 1) refs.current[index + 1]?.focus()
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH)
    if (!pasted) return
    event.preventDefault()
    setDigits(Array.from({ length: LENGTH }, (_, i) => pasted[i] ?? ''))
    setError('')
    refs.current[Math.min(pasted.length, LENGTH - 1)]?.focus()
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const code = digits.join('')
    if (code.length < LENGTH) {
      setError(t('otp.errors.incomplete'))
      refs.current[digits.findIndex((item) => !item)]?.focus()
      return
    }

    setSubmitting(true)
    try {
      await verifyOtp(email, code)
      setVerified(true)
    } catch (caught) {
      if (caught instanceof AuthError && caught.code === 'wrong_code') {
        setError(t('otp.errors.wrongCode'))
        setDigits(emptyDigits())
        refs.current[0]?.focus()
      } else if (caught instanceof AuthError && caught.code === 'rate_limited') {
        toast.show({ message: t('otp.errors.rateLimited'), variant: 'danger' })
      } else {
        toast.show({ message: t('otp.errors.failed'), variant: 'danger' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      await resendOtp(email)
      setSeconds(RESEND_SECONDS)
      setDigits(emptyDigits())
      setError('')
      refs.current[0]?.focus()
      toast.show({ message: t('otp.resent'), variant: 'success' })
    } catch (caught) {
      const key =
        caught instanceof AuthError && caught.code === 'rate_limited'
          ? 'otp.errors.rateLimited'
          : 'otp.errors.resendFailed'
      toast.show({ message: t(key), variant: 'danger' })
    } finally {
      setResending(false)
    }
  }

  if (!email) {
    return (
      <div className={styles.page}>
        <div className={styles.wrap}>
          <h1 className={styles.title}>{t('otp.title')}</h1>
          <Card as="section">
            <p className={styles.text}>{t('otp.noPhone')}</p>
            <Link className={styles.link} to="/register">
              {t('otp.toRegister')}
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  if (verified) {
    return (
      <div className={styles.page}>
        <div className={styles.wrap}>
          <Card as="section" role="status">
            <h1 className={styles.title}>{t('otp.verifiedTitle')}</h1>
            <p className={styles.text}>{t('otp.verifiedBody')}</p>
            <Link className={styles.link} to="/login">
              {t('otp.login')}
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <h1 className={styles.title}>{t('otp.title')}</h1>
        <p className={styles.intro}>{t('otp.intro', { email })}</p>

        <Card as="section">
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>{t('otp.codeLabel')}</legend>
              <div className={styles.digits}>
                {digits.map((digit, index) => (
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
                    aria-label={t('otp.digit', { n: index + 1 })}
                    aria-invalid={error ? true : undefined}
                    onChange={(e) => setDigit(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                  />
                ))}
              </div>
            </fieldset>

            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}

            <Button type="submit" loading={submitting} fullWidth>
              {t('otp.submit')}
            </Button>
          </form>
        </Card>

        <div className={styles.resend}>
          {seconds > 0 ? (
            <p className={styles.text}>{t('otp.resendIn', { seconds })}</p>
          ) : (
            <Button variant="secondary" onClick={handleResend} loading={resending}>
              {t('otp.resend')}
            </Button>
          )}
          <Link className={styles.link} to="/register">
            {t('otp.changeNumber')}
          </Link>
        </div>
      </div>
    </div>
  )
}