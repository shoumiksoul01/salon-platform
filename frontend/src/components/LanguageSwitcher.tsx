import { useTranslation } from 'react-i18next'
import { saveLanguage } from '../api/profile'
import { useAuth } from '../auth/useAuth'
import { SUPPORTED_LANGUAGES, setLanguage } from '../i18n'
import type { Language } from '../i18n'
import { Button } from './ui'
import styles from './LanguageSwitcher.module.css'

// Switches between English and Bengali and remembers the choice (see setLanguage in i18n.ts).
// A signed-in user's choice is also saved on the server (C-07), so it follows them to a
// new browser or device; AuthProvider applies it again at login.
// Each language name is written in its own language, so it is readable even if the
// interface is in the wrong language.
export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage ?? i18n.language
  const { status } = useAuth()

  function choose(code: Language) {
    setLanguage(code)
    // A failed save is not shown: the choice still works in this browser.
    if (status === 'signedIn') saveLanguage(code).catch(() => undefined)
  }

  return (
    <div role="group" aria-label={t('language.label')} className={styles.group}>
      {SUPPORTED_LANGUAGES.map((code) => (
        <Button
          key={code}
          lang={code}
          variant={current === code ? 'primary' : 'secondary'}
          aria-pressed={current === code}
          onClick={() => choose(code)}
        >
          {t(`language.${code}`)}
        </Button>
      ))}
    </div>
  )
}
