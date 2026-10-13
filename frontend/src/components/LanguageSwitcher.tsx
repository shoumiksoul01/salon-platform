import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, setLanguage } from '../i18n'
import { Button } from './ui'
import styles from './LanguageSwitcher.module.css'

// Switches between English and Bengali and remembers the choice (see setLanguage in i18n.ts).
// Each language name is written in its own language, so it is readable even if the
// interface is in the wrong language.
export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage ?? i18n.language

  return (
    <div role="group" aria-label={t('language.label')} className={styles.group}>
      {SUPPORTED_LANGUAGES.map((code) => (
        <Button
          key={code}
          lang={code}
          variant={current === code ? 'primary' : 'secondary'}
          aria-pressed={current === code}
          onClick={() => setLanguage(code)}
        >
          {t(`language.${code}`)}
        </Button>
      ))}
    </div>
  )
}
