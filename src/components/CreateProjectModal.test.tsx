import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateProjectModal } from './CreateProjectModal';
import { http, HttpResponse, makeServer } from '../test/msw';
import { renderWithI18n } from '../test/helpers';

vi.mock('@auth0/auth0-react', () => {
  const ctx = {
    isAuthenticated: true,
    getAccessTokenSilently: async () => 'fake-token',
  };
  return { useAuth0: () => ctx };
});

const server = makeServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('CreateProjectModal', () => {
  it('renders nothing user-facing when closed', () => {
    renderWithI18n(
      <CreateProjectModal
        open={false}
        onCreated={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('heading', { name: /new project/i }),
    ).not.toBeInTheDocument();
  });

  it('disables the Create button until a name is entered', async () => {
    const user = userEvent.setup();
    renderWithI18n(
      <CreateProjectModal open onCreated={vi.fn()} onClose={vi.fn()} />,
    );
    const submit = screen.getByRole('button', { name: /^create$/i });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText(/^name$/i), 'Kitchen');
    expect(submit).toBeEnabled();
  });

  it('submits the trimmed name and forwards the server response to onCreated', async () => {
    let received: unknown = null;
    server.use(
      http.post('*/api/projects', async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ slug: 'kitchen', name: 'Kitchen' });
      }),
    );

    const user = userEvent.setup();
    const onCreated = vi.fn();
    renderWithI18n(
      <CreateProjectModal open onCreated={onCreated} onClose={vi.fn()} />,
    );

    await user.type(screen.getByLabelText(/^name$/i), '  Kitchen  ');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith({
        slug: 'kitchen',
        name: 'Kitchen',
      }),
    );
    expect(received).toEqual({ name: 'Kitchen' });
  });

  it('surfaces an HTTP error and leaves the modal open', async () => {
    server.use(
      http.post(
        '*/api/projects',
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const user = userEvent.setup();
    const onCreated = vi.fn();
    const onClose = vi.fn();
    renderWithI18n(
      <CreateProjectModal open onCreated={onCreated} onClose={onClose} />,
    );

    await user.type(screen.getByLabelText(/^name$/i), 'Kitchen');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/500/);
    expect(onCreated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Cancel is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithI18n(
      <CreateProjectModal open onCreated={vi.fn()} onClose={onClose} />,
    );
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders the Portuguese strings when language is pt', () => {
    renderWithI18n(
      <CreateProjectModal open onCreated={vi.fn()} onClose={vi.fn()} />,
      { language: 'pt' },
    );
    expect(
      screen.getByRole('heading', { name: /novo projeto/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^criar$/i })).toBeInTheDocument();
  });
});
