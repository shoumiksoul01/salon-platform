import { useState } from 'react'
import type { SyntheticEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Card, FormField, Input, useToast } from '../../components/ui'
import { AuthError, loginAccount } from '../../api/auth'
import type { UserRole } from '../../api/auth'
import styles from './LoginPage.module.css'

interface FormErrors {
  email?: string
  password?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Where each kind of user lands after logging in.
const HOME: Record<UserRole, string> = {
  customer: '/me',
  owner: '/owner',
  staff: '/staff',
}

// AUTH-03: log in (C-03)
export default function LoginPage() {
  const { t } = useTranslation('auth')
  const toast = useToast()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function validate(): FormErrors {
    const found: FormErrors = {}
    if (!email.trim()) found.email = t('login.errors.emailRequired')
    else if (!EMAIL_PATTERN.test(email.trim())) found.email = t('login.errors.emailInvalid')
    if (!password) found.password = t('login.errors.passwordRequired')
    return found
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    setFormError('')
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      const result = await loginAccount(email.trim(), password)
      toast.show({ message: t('login.welcome', { name: result.full_name }), variant: 'success' })
      navigate(HOME[result.role])
    } catch (error) {
      if (error instanceof AuthError && error.code === 'invalid_credentials') {
        setFormError(t('login.errors.invalid'))
      } else if (error instanceof AuthError && error.code === 'not_verified') {
        navigate('/verify', { state: { email: email.trim().toLowerCase() } })
      } else if (error instanceof AuthError && error.code === 'rate_limited') {
        toast.show({ message: t('login.errors.rateLimited'), variant: 'danger' })
      } else {
        toast.show({ message: t('login.errors.failed'), variant: 'danger' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <h1 className={styles.title}>{t('login.title')}</h1>
        <p className={styles.intro}>{t('login.intro')}</p>

        <Card as="section">
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <FormField label={t('login.email')} error={errors.email} required>
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

            <FormField label={t('login.password')} error={errors.password} required>
              {(control) => (
                <Input
                  {...control}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              )}
            </FormField>

            <div className={styles.forgot}>
              <Link className={styles.link} to="/reset-password">
                {t('login.forgot')}
              </Link>
            </div>

            {formError && (
              <p className={styles.error} role="alert">
                {formError}
              </p>
            )}

            <Button type="submit" loading={submitting} fullWidth>
              {t('login.submit')}
            </Button>
          </form>
        </Card>

        <p className={styles.footer}>
          {t('login.noAccount')}{' '}
          <Link className={styles.link} to="/register">
            {t('login.register')}
          </Link>
        </p>
      </div>
    </div>
  )
}