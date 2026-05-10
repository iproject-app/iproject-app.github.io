import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, type RenderOptions } from '@testing-library/react';

interface RenderProps extends Omit<RenderOptions, 'wrapper'> {
  /** Initial path for the in-memory router. Defaults to '/'. */
  route?: string;
}

/** Renders a UI fragment inside a MemoryRouter for tests that don't need
 *  the real Auth0Provider. Components that call useAuth0 directly should mock
 *  '@auth0/auth0-react' at the top of the test file.
 */
export function renderWithRouter(ui: ReactNode, { route = '/', ...options }: RenderProps = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>, options);
}
