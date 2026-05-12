import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Home } from './Home';
import { http, HttpResponse, makeServer } from '../test/msw';
import { renderWithProviders } from '../test/helpers';

vi.mock('@auth0/auth0-react', () => {
  const ctx = {
    isAuthenticated: true,
    user: { given_name: 'Joe' },
    getAccessTokenSilently: async () => 'fake-token',
  };
  return { useAuth0: () => ctx };
});

const server = makeServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Home', () => {
  it('renders the welcome greeting and project list once loaded', async () => {
    renderWithProviders(<Home />);
    await waitFor(() =>
      expect(screen.queryByText(/loading projects/i)).not.toBeInTheDocument(),
    );
    expect(screen.getByText(/welcome back, joe/i)).toBeInTheDocument();
    expect(screen.getByText('Back Wall')).toBeInTheDocument();
  });

  it('opens the create-project modal and navigates on success', async () => {
    server.use(
      http.post('*/api/projects', () =>
        HttpResponse.json({ slug: 'kitchen', name: 'Kitchen' }),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/projects/:slug"
          element={<div data-testid="project-page">project page</div>}
        />
      </Routes>,
    );

    await waitFor(() =>
      expect(screen.queryByText(/loading projects/i)).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: /new project/i }));
    expect(
      await screen.findByRole('heading', { name: /^new project$/i }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^name$/i), 'Kitchen');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    expect(await screen.findByTestId('project-page')).toBeInTheDocument();
  });
});
