import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { en } from './en';
import { pt } from './pt';
import {
  SUPPORTED_LANGUAGES,
  type Language,
  type TranslationKey,
  type Translations,
} from './types';

const DICTIONARIES: Record<Language, Translations> = { en, pt };
const STORAGE_KEY = 'iproject.language';

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

interface ProviderProps {
  children: ReactNode;
  /** Override initial language; mostly for tests. Production reads from
   *  localStorage, then falls back to navigator.language, then 'en'. */
  initialLanguage?: Language;
}

function detectInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.includes(stored as Language)) {
      return stored as Language;
    }
  } catch {
    // localStorage may be blocked; fall through to navigator.
  }
  const browserLang = window.navigator.language?.toLowerCase() ?? 'en';
  return browserLang.startsWith('pt') ? 'pt' : 'en';
}

export function I18nProvider({ children, initialLanguage }: ProviderProps) {
  const [language, setLanguageState] = useState<Language>(
    () => initialLanguage ?? detectInitialLanguage(),
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // ignore storage errors
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const value = useMemo<I18nContextValue>(() => {
    const dict = DICTIONARIES[language];
    const t = (
      key: TranslationKey,
      vars?: Record<string, string | number>,
    ): string => {
      const template = dict[key];
      if (!template) {
        // Helpful in dev; fall back to the key itself so the UI doesn't break.
        // eslint-disable-next-line no-console
        console.warn(`[i18n] missing translation: ${key}`);
        return key;
      }
      if (!vars) return template;
      return template.replace(/\{(\w+)\}/g, (_, name) => {
        const v = vars[name];
        return v === undefined || v === null ? `{${name}}` : String(v);
      });
    };
    return { language, setLanguage, t };
  }, [language, setLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useTranslation must be used inside I18nProvider');
  }
  return ctx;
}
