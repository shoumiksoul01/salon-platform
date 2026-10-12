import i18n from 'i18next'
import type { Resource } from 'i18next'
import { initReactI18next } from 'react-i18next'

export const SUPPORTED_LANGUAGES = ['en', 'bn'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

const STORAGE_KEY = 'salon.language'

// Loads every frontend/src/locales/<language>/<area>.json automatically.
// A new area file (public, auth, booking, ...) needs no change in this file.
const modules = import.meta.glob<Record<string, unknown>>('./locales/*/*.json', {
  eager: true,
  import: 'default',
})

const resources: Resource = {}
for (const [path, content] of Object.entries(modules)) {
  const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/)
  if (!match) continue
  const [, language, area] = match
  const bucket = (resources[language] ??= {})
  bucket[area] = content
}

function isLanguage(value: string | null): value is Language {
  return value === 'en' || value === 'bn'
}

// A saved choice wins. Otherwise use the browser language: Bengali if it
// starts with "bn", English for everything else.
function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isLanguage(saved)) return saved
  } catch {
    // storage can be blocked, fall through to the browser language
  }
  return navigator.language.toLowerCase().startsWith('bn') ? 'bn' : 'en'
}

// Call this from the language switcher. It also remembers the choice.
export function setLanguage(language: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // storage can be blocked, the language still changes for this session
  }
  void i18n.changeLanguage(language)
}

// Keeps <html lang> in sync (the tokens use :lang(bn) for Bengali line height)
i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
})

void i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: Object.keys(resources.en ?? {}),
  interpolation: { escapeValue: false },
})

export default i18n