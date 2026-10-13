import { useEffect, useState } from 'react'
import type { SyntheticEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, FormField, Input, useToast } from '../../components/ui'
import LanguageSwitcher from '../../components/LanguageSwitcher'
import { getProfile, updateProfile } from '../../api/profile'
import styles from './ProfilePage.module.css'

type LoadState = 'loading' | 'error' | 'ready'

interface FormErrors {
  fullName?: string
  phone?: string
  email?: string
}

const PHONE_PATTERN = /^(?:\+?88)?01[3-9]\d{8}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// CUS-04: profile and language (C-05, C-07)
export default function ProfilePage() {
  const { t } = useTranslation(['customer', 'common'])
  const toast = useToast()

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    getProfile()
      .then((profile) => {
        if (cancelled) return
        setFullName(profile.full_name)
        setPhone(profile.phone ?? '')
        setEmail(profile.email ?? '')
        setLoadState('ready')
      })
      .catch(() => {
        if (!cancelled) setLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  function retry() {
    setLoadState('loading')
    setReloadKey((key) => key + 1)
  }

  function validate(): FormErrors {
    const found: FormErrors = {}
    const name = fullName.trim()
    const phoneValue = phone.trim()
    const emailValue = email.trim()

    if (!name) found.fullName = t('profile.nameRequired')
    if (!phoneValue && !emailValue) {
      found.phone = t('profile.contactRequired')
    } else {
      if (phoneValue && !PHONE_PATTERN.test(phoneValue)) found.phone = t('profile.phoneInvalid')
      if (emailValue && !EMAIL_PATTERN.test(emailValue)) found.email = t('profile.emailInvalid')
    }
    return found
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
      })
      toast.show({ message: t('profile.saved'), variant: 'success' })
    } catch {
      toast.show({ message: t('profile.saveFailed'), variant: 'danger' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>{t('profile.title')}</h1>

      <Card as="section">
        <h2 className={styles.sectionTitle}>{t('profile.languageTitle')}</h2>
        <p className={styles.hint}>{t('profile.languageHint')}</p>
        <LanguageSwitcher />
      </Card>

      <Card as="section">
        <h2 className={styles.sectionTitle}>{t('profile.detailsTitle')}</h2>

        {loadState === 'loading' && (
          <p className={styles.status} role="status">
            {t('common:states.loading')}
          </p>
        )}

        {loadState === 'error' && (
          <>
            <p className={styles.status} role="alert">
              {t('common:states.error')}
            </p>
            <Button variant="secondary" onClick={retry}>
              {t('common:actions.retry')}
            </Button>
          </>
        )}

        {loadState === 'ready' && (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <FormField label={t('profile.fullName')} error={errors.fullName} required>
              {(control) => (
                <Input
                  {...control}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              )}
            </FormField>

            <FormField label={t('profile.phone')} hint={t('profile.phoneHint')} error={errors.phone}>
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

            <FormField label={t('profile.email')} error={errors.email}>
              {(control) => (
                <Input
                  {...control}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              )}
            </FormField>

            <div className={styles.actions}>
              <Button type="submit" loading={saving}>
                {t('common:actions.save')}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </main>
  )
}
