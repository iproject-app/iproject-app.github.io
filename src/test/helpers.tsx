import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, type RenderOptions } from '@testing-library/react';
import { I18nProvider, type Language } from '../i18n';

interface RenderProps extends Omit<RenderOptions, 'wrapper'> {
  /** Initial path for the in-memory router. Defaults to '/'. */
  route?: string;
  /** Pin the language so test assertions are deterministic. Defaults to 'en'. */
  language?: Language;
}

/** Renders a UI fragment inside MemoryRouter + I18nProvider. Components that
 *  call useAuth0 directly should mock '@auth0/auth0-react' at the top of the
 *  test file. The default language is 'en' to keep label-based queries stable. */
export function renderWithProviders(
  ui: ReactNode,
  { route = '/', language = 'en', ...options }: RenderProps = {},
) {
  return render(
    <I18nProvider initialLanguage={language}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </I18nProvider>,
    options,
  );
}

/** Wrap a fragment with just I18nProvider — used for components that don't
 *  need router context. */
export function renderWithI18n(
  ui: ReactNode,
  { language = 'en', ...options }: { language?: Language } & Omit<RenderOptions, 'wrapper'> = {},
) {
  return render(
    <I18nProvider initialLanguage={language}>{ui}</I18nProvider>,
    options,
  );
}
