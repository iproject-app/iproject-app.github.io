import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider, useTranslation } from './I18nProvider';
import { en } from './en';
import { pt } from './pt';
import type { TranslationKey } from './types';

const wrap =
  (initialLanguage?: 'en' | 'pt') =>
  ({ children }: { children: React.ReactNode }) => (
    <I18nProvider initialLanguage={initialLanguage}>{children}</I18nProvider>
  );

describe('translation dictionaries', () => {
  it('PT defines the same keys as EN', () => {
    const enKeys = Object.keys(en).sort();
    const ptKeys = Object.keys(pt).sort();
    expect(ptKeys).toEqual(enKeys);
  });

  it('every value is a non-empty string in both languages', () => {
    for (const dict of [en, pt]) {
      for (const [key, value] of Object.entries(dict)) {
        expect(value, `key=${key}`).toBeTruthy();
        expect(value, `key=${key}`).toBeTypeOf('string');
      }
    }
  });
});

describe('useTranslation', () => {
  it('returns the translation for the active language', () => {
    const { result } = renderHook(() => useTranslation(), {
      wrapper: wrap('en'),
    });
    expect(result.current.t('add.title')).toBe('Add expense');
  });

  it('switches language via setLanguage', () => {
    const { result } = renderHook(() => useTranslation(), {
      wrapper: wrap('en'),
    });
    act(() => result.current.setLanguage('pt'));
    expect(result.current.language).toBe('pt');
    expect(result.current.t('add.title')).toBe('Adicionar despesa');
  });

  it('interpolates {name}-style placeholders', () => {
    const { result } = renderHook(() => useTranslation(), {
      wrapper: wrap('en'),
    });
    expect(result.current.t('home.welcome', { name: 'Joe' })).toBe(
      'Welcome back, Joe.',
    );
  });

  it('leaves the placeholder in place when a variable is missing', () => {
    const { result } = renderHook(() => useTranslation(), {
      wrapper: wrap('en'),
    });
    expect(result.current.t('home.welcome')).toBe('Welcome back, {name}.');
  });

  it('falls back to the key when a translation is missing', () => {
    const { result } = renderHook(() => useTranslation(), {
      wrapper: wrap('en'),
    });
    // The cast intentionally bypasses the type guard so we can exercise the
    // missing-key fallback at runtime.
    expect(result.current.t('does.not.exist' as unknown as TranslationKey)).toBe(
      'does.not.exist',
    );
  });
});

describe('I18nProvider persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('persists the chosen language to localStorage', () => {
    const { result } = renderHook(() => useTranslation(), {
      wrapper: wrap('en'),
    });
    act(() => result.current.setLanguage('pt'));
    expect(window.localStorage.getItem('iproject.language')).toBe('pt');
  });

  it('reads the persisted language on next mount', () => {
    window.localStorage.setItem('iproject.language', 'pt');
    const { result } = renderHook(() => useTranslation(), {
      wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
    });
    expect(result.current.language).toBe('pt');
  });
});

describe('useTranslation outside provider', () => {
  it('throws a clear error so missing wiring is loud', () => {
    expect(() => renderHook(() => useTranslation())).toThrow(/I18nProvider/);
  });
});

describe('component-level switch', () => {
  function Greeting() {
    const { t } = useTranslation();
    return <p>{t('add.title')}</p>;
  }

  function Toggle() {
    const { language, setLanguage } = useTranslation();
    return (
      <button
        type="button"
        onClick={() => setLanguage(language === 'en' ? 'pt' : 'en')}
      >
        toggle
      </button>
    );
  }

  it('re-renders consumers when the language changes', async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider initialLanguage="en">
        <Greeting />
        <Toggle />
      </I18nProvider>,
    );

    expect(screen.getByText('Add expense')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'toggle' }));
    expect(screen.getByText('Adicionar despesa')).toBeInTheDocument();
  });
});
