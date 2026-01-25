import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files
import enTranslation from './locales/en/translation.json'
import trTranslation from './locales/tr/translation.json'
import deTranslation from './locales/de/translation.json'
import frTranslation from './locales/fr/translation.json'

// Type for window.api
interface WindowWithAPI {
  api?: {
    settings: {
      get: (key: string) => Promise<string | null>
      set: (key: string, value: string) => Promise<void>
    }
  }
}

// Supported languages
export const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' }
] as const

export type SupportedLanguage = (typeof supportedLanguages)[number]['code']

// Resources
const resources = {
  en: { translation: enTranslation },
  tr: { translation: trTranslation },
  de: { translation: deTranslation },
  fr: { translation: frTranslation }
}

// Initialize i18n
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'tr', 'de', 'fr'],
    
    // Detection options
    detection: {
      // Order of language detection
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Cache user language selection
      caches: ['localStorage'],
      // LocalStorage key
      lookupLocalStorage: 'vaultcrm-language'
    },
    
    interpolation: {
      escapeValue: false // React already escapes
    },
    
    // React options
    react: {
      useSuspense: true
    }
  })

// Helper function to change language and persist
export async function changeLanguage(lang: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(lang)
  
  // Also save to app settings if vault is unlocked
  try {
    const win = window as unknown as WindowWithAPI
    if (win.api?.settings?.set) {
      await win.api.settings.set('language', lang)
    }
  } catch {
    // Vault might be locked, just use localStorage
    console.log('Could not save language to settings (vault may be locked)')
  }
}

// Load language from settings on app start
export async function loadLanguageFromSettings(): Promise<void> {
  try {
    const win = window as unknown as WindowWithAPI
    if (win.api?.settings?.get) {
      const savedLang = await win.api.settings.get('language')
      if (savedLang && supportedLanguages.some((l) => l.code === savedLang)) {
        await i18n.changeLanguage(savedLang)
      }
    }
  } catch {
    // Vault is locked, use detected language
    console.log('Could not load language from settings (vault may be locked)')
  }
}

// Get current language
export function getCurrentLanguage(): SupportedLanguage {
  const lang = i18n.language?.split('-')[0] // Handle 'en-US' -> 'en'
  if (supportedLanguages.some((l) => l.code === lang)) {
    return lang as SupportedLanguage
  }
  return 'en'
}

export default i18n
