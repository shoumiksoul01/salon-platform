import { useState } from 'react'
import type { SyntheticEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Card, Checkbox, FormField, Input, Select, useToast } from '../../components/ui'
import { AuthError, registerAccount } from '../../api/auth'
import type { RegisterRole } from '../../api/auth'
import styles from './RegisterPage.module.css'

interface FormErrors {
  fullName?: string
  phone?: string
  email?: string
  password?: string
  confirm?: string
  terms?: string
}

const PHONE_PATTERN = /^(?:\+?88)?01[3-9]\d{8}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_MIN = 8
const ROLES: RegisterRole[] = ['customer', 'owner']

// AUTH-01: register a customer or a shop owner (FR-02)
export default function RegisterPage() {
  const { t } = useTranslation('auth')
  const toast = useToast()
  const [params] = useSearchParams()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState<RegisterRole>(params.get('role') === 'owner' ? 'owner' : 'customer')
  const [agreed, setAgreed] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  function validate(): FormErrors {
    const found: FormErrors = {}
    if (!fullName.trim()) found.fullName = t('register.errors.nameRequired')
    if (!phone.trim()) found.phone = t('register.errors.phoneRequired')
    else if (!PHONE_PATTERN.test(phone.trim())) found.phone = t('register.errors.phoneInvalid')
    if (email.trim() && !EMAIL_PATTERN.test(email.trim())) found.email = t('register.errors.emailInvalid')
    if (!password) found.password = t('register.errors.passwordRequired')
    else if (password.length < PASSWORD_MIN) found.password = t('register.errors.passwordShort')
    if (confirm !== password) found.confirm = t('register.errors.confirmMismatch')
    if (!agreed) found.terms = t('register.errors.termsRequired')
    return found
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      const result = await registerAccount({
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        password,
        role,
      })
      toast.show({ message: t('register.success', { phone: result.phone }), variant: 'success' })
      setPassword('')
      setConfirm('')
      // UI-SK-18: go to the OTP page here, and pass the phone number along.
    } catch (error) {
      if (error instanceof AuthError && error.code === 'phone_taken') {
        setErrors({ phone: t('register.errors.phoneTaken') })
      } else {
        toast.show({ message: t('register.errors.failed'), variant: 'danger' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <h1 className={styles.title}>{t('register.title')}</h1>
        <p className={styles.intro}>{t('register.intro')}</p>

        <Card as="section">
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <FormField label={t('register.role')} required>
              {(control) => (
                <Select
                  {...control}
                  value={role}
                  onChange={(e) => setRole(e.target.value as RegisterRole)}
                >
                  {ROLES.map((value) => (
                    <option key={value} value={value}>
                      {t(`register.roles.${value}`)}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>

            <FormField label={t('register.fullName')} error={errors.fullName} required>
              {(control) => (
                <Input
                  {...control}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              )}
            </FormField>

            <FormField
              label={t('register.phone')}
              hint={t('register.phoneHint')}
              error={errors.phone}
              required
            >
              {(control) => (
                <Input
                  {...control}
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  autoComplete="tel"
                />
              )}
            </FormField>

            <FormField label={t('register.email')} error={errors.email}>
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

            <FormField
              label={t('register.password')}
              hint={t('register.passwordHint')}
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

            <FormField label={t('register.confirm')} error={errors.confirm} required>
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

            <div>
              <Checkbox
                label={t('register.terms')}
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              {errors.terms && (
                <p className={styles.error} role="alert">
                  {errors.terms}
                </p>
              )}
            </div>

            <Button type="submit" loading={submitting} fullWidth>
              {t('register.submit')}
            </Button>
          </form>
        </Card>

        <p className={styles.footer}>
          {t('register.haveAccount')}{' '}
          <Link className={styles.link} to="/login">
            {t('register.login')}
          </Link>
        </p>
      </div>
    </div>
  )
}