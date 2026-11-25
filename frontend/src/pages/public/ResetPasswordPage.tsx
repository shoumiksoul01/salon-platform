import { useEffect, useState } from 'react'
import type { SyntheticEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Card, FormField, Input, useToast } from '../../components/ui'
import OtpInput from '../../components/OtpInput'
import { AuthError, requestPasswordReset, resetPassword } from '../../api/auth'
import styles from './ResetPasswordPage.module.css'

const LENGTH = 6
const RESEND_SECONDS = 60
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_MIN = 8

type Step = 'email' | 'reset' | 'done'

interface ResetErrors {
  code?: string
  password?: string
  confirm?: string
}

function emptyDigits(): string[] {
  return Array.from({ length: LENGTH }, () => '')
}

// AUTH-04: reset a forgotten password with an emailed code (C-04)
export default function ResetPasswordPage() {
  const { t } = useTranslation('auth')
  const toast = useToast()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [digits, setDigits] = useState<string[]>(emptyDigits)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<ResetErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [seconds, setSeconds] = useState(RESEND_SECONDS)
  const [resending, setResending] = useState(false)
  const [focusKey, setFocusKey] = useState(0)

  useEffect(() => {
    if (step !== 'reset' || seconds <= 0) return
    const id = window.setTimeout(() => setSeconds((value) => value - 1), 1000)
    return () => window.clearTimeout(id)
  }, [step, seconds])

  async function handleEmailSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = email.trim().toLowerCase()
    if (!value) {
      setEmailError(t('reset.errors.emailRequired'))
      return
    }
    if (!EMAIL_PATTERN.test(value)) {
      setEmailError(t('reset.errors.emailInvalid'))
      return
    }
    setEmailError('')

    setSubmitting(true)
    try {
      await requestPasswordReset(value)
      setEmail(value)
      setDigits(emptyDigits())
      setSeconds(RESEND_SECONDS)
      setFocusKey((key) => key + 1)
      setStep('reset')
      toast.show({ message: t('reset.codeSent', { email: value }), variant: 'success' })
    } catch (error) {
      const limited = error instanceof AuthError && error.code === 'rate_limited'
      toast.show({
        message: t(limited ? 'reset.errors.rateLimited' : 'reset.errors.sendFailed'),
        variant: 'danger',
      })
    } finally {
      setSubmitting(false)
    }
  }

  function validate(): ResetErrors {
    const found: ResetErrors = {}
    if (digits.some((digit) => !digit)) found.code = t('otp.errors.incomplete')
    if (!password) found.password = t('reset.errors.passwordRequired')
    else if (password.length < PASSWORD_MIN) found.password = t('reset.errors.passwordShort')
    if (confirm !== password) found.confirm = t('reset.errors.confirmMismatch')
    return found
  }

  async function handleResetSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      await resetPassword(email, digits.join(''), password)
      setStep('done')
    } catch (error) {
      const code = error instanceof AuthError ? error.code : 'failed'
      if (code === 'wrong_code') {
        setErrors({ code: t('otp.errors.wrongCode') })
        setDigits(emptyDigits())
        setFocusKey((key) => key + 1)
      } else if (code === 'same_password') {
        // The code was used up by the check, so a new one is needed.
        setDigits(emptyDigits())
        setSeconds(0)
        setFocusKey((key) => key + 1)
        toast.show({ message: t('reset.errors.samePassword'), variant: 'danger' })
      } else if (code === 'rate_limited') {
        toast.show({ message: t('reset.errors.rateLimited'), variant: 'danger' })
      } else {
        toast.show({ message: t('reset.errors.failed'), variant: 'danger' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      await requestPasswordReset(email)
      setSeconds(RESEND_SECONDS)
      setDigits(emptyDigits())
      setErrors({})
      setFocusKey((key) => key + 1)
      toast.show({ message: t('otp.resent'), variant: 'success' })
    } catch (error) {
      const limited = error instanceof AuthError && error.code === 'rate_limited'
      toast.show({
        message: t(limited ? 'reset.errors.rateLimited' : 'otp.errors.resendFailed'),
        variant: 'danger',
      })
    } finally {
      setResending(false)
    }
  }

  function handleBack() {
    setStep('email')
    setDigits(emptyDigits())
    setPassword('')
    setConfirm('')
    setErrors({})
  }

  if (step === 'done') {
    return (
      <div className={styles.page}>
        <div className={styles.wrap}>
          <Card as="section" role="status">
            <h1 className={styles.title}>{t('reset.doneTitle')}</h1>
            <p className={styles.text}>{t('reset.doneBody')}</p>
            <Link className={styles.link} to="/login">
              {t('reset.login')}
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  if (step === 'reset') {
    return (
      <div className={styles.page}>
        <div className={styles.wrap}>
          <h1 className={styles.title}>{t('reset.title')}</h1>
          <p className={styles.intro}>{t('reset.codeIntro', { email })}</p>

          <Card as="section">
            <form className={styles.form} onSubmit={handleResetSubmit} noValidate>
              <div>
                <OtpInput
                  legend={t('otp.codeLabel')}
                  value={digits}
                  onChange={(next) => {
                    setDigits(next)
                    setErrors((previous) => ({ ...previous, code: undefined }))
                  }}
                  digitLabel={(n) => t('otp.digit', { n })}
                  invalid={Boolean(errors.code)}
                  focusKey={focusKey}
                />
                {errors.code && (
                  <p className={styles.error} role="alert">
                    {errors.code}
                  </p>
                )}
              </div>

              <FormField
                label={t('reset.newPassword')}
                hint={t('reset.passwordHint')}
                error={errors.password}
                required
              >
                {(control) => (
                  <Input
                    {...control}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                )}
              </FormField>

              <FormField label={t('reset.confirm')} error={errors.confirm} required>
                {(control) => (
                  <Input
                    {...control}
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                )}
              </FormField>

              <Button type="submit" loading={submitting} fullWidth>
                {t('reset.submit')}
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
            <Button variant="ghost" onClick={handleBack}>
              {t('reset.changeEmail')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <h1 className={styles.title}>{t('reset.title')}</h1>
        <p className={styles.intro}>{t('reset.emailIntro')}</p>

        <Card as="section">
          <form className={styles.form} onSubmit={handleEmailSubmit} noValidate>
            <FormField label={t('reset.email')} error={emailError || undefined} required>
              {(control) => (
                <Input
                  {...control}
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              )}
            </FormField>

            <Button type="submit" loading={submitting} fullWidth>
              {t('reset.sendCode')}
            </Button>
          </form>
        </Card>

        <p className={styles.footer}>
          <Link className={styles.link} to="/login">
            {t('reset.backToLogin')}
          </Link>
        </p>
      </div>
    </div>
  )
}