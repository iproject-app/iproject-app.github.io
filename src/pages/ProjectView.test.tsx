import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { ProjectDataProvider } from '../lib/ProjectDataProvider';
import { http, HttpResponse, makeServer } from '../test/msw';
import { renderWithProviders } from '../test/helpers';
import { Home } from './Home';
import { ProjectView } from './ProjectView';
import type { ProjectData } from '../lib/types';

vi.mock('@auth0/auth0-react', () => {
  const ctx = {
    isAuthenticated: true,
    user: { sub: 'auth0|owner' },
    getAccessTokenSilently: async () => 'fake-token',
    loginWithRedirect: vi.fn(),
  };
  return { useAuth0: () => ctx };
});

const server = makeServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => { server.resetHandlers(); vi.restoreAllMocks(); });
afterAll(() => server.close());

const data: ProjectData = {
  slug: 'back-wall', name: 'Back Wall', currency: 'BRL', contacts: [], customCategories: [],
  expenses: [{ id: 'one', date: '2026-05-04', category: 'Labor', payer: 'Joe', payee: 'Pedro', description: 'Original', amount: 500 }],
};

function renderProject(language: 'en' | 'pt' = 'en') {
  return renderWithProviders(
    <ProjectDataProvider>
      <Routes>
        <Route path="/projects/:slug" element={<ProjectView />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </ProjectDataProvider>,
    { route: '/projects/back-wall', language },
  );
}

function unloadIsPrevented() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

async function openSettings(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Project settings' }));
  return within(screen.getByRole('dialog'));
}

describe('Settings rename then save', () => {
  it.each(['new', 'old', 'missing-rename-revision'] as const)('uses the correct revision with the %s server', async (version) => {
    let revision = version === 'old' ? undefined : 7;
    const posted: unknown[] = [];
    server.use(
      http.get('*/api/data', () => HttpResponse.json({ ...data, revision })),
      http.post('*/api/projects/back-wall/rename', () => {
        if (version === 'new') revision = 8;
        return HttpResponse.json({ slug: data.slug, name: 'Renamed', ...(version === 'new' ? { revision } : {}) });
      }),
      http.post('*/api/data', async ({ request }) => {
        const body = await request.json() as ProjectData & { revision?: number };
        posted.push(body);
        if (body.revision !== revision) return HttpResponse.json({ revision }, { status: 409 });
        return HttpResponse.json({ ok: true, revision: revision === undefined ? undefined : ++revision });
      }),
    );
    const user = userEvent.setup();
    renderProject();
    const dialog = await openSettings(user);
    await user.clear(dialog.getByLabelText('Project name'));
    await user.type(dialog.getByLabelText('Project name'), 'Renamed');
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(posted).toEqual([expect.objectContaining({ name: 'Renamed', ...(version === 'old' ? {} : { revision: version === 'new' ? 8 : 7 }) })]);
    expect(unloadIsPrevented()).toBe(false);
    // A following settings save uses the revision returned by POST /api/data.
    const again = await openSettings(user);
    await user.click(again.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(posted).toHaveLength(2));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('save recovery', () => {
  it.each([400, 409, 428])('retains blocked edits after project → Home → project for HTTP %s', async (status) => {
    let posts = 0;
    let gets = 0;
    server.use(
      http.get('*/api/data', () => { gets++; return HttpResponse.json({ ...data, revision: 7 }); }),
      http.post('*/api/data', () => { posts++; return HttpResponse.json({ revision: 8 }, { status }); }),
    );
    const user = userEvent.setup();
    renderProject();
    expect(unloadIsPrevented()).toBe(false);
    await user.click(await screen.findByRole('button', { name: /expand add expense/i }));
    await waitFor(() => expect(screen.getByLabelText(/^Date/)).toHaveFocus());
    await user.type(screen.getByLabelText(/^Payee/), 'Unsaved item');
    await user.type(screen.getByLabelText(/^Amount/), '123');
    await user.click(screen.getByRole('button', { name: 'Add expense' }));
    await screen.findByRole('button', { name: 'Reload latest' });
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent(status === 400 ? /data or revision is invalid/ : /saving is paused/);
    expect(unloadIsPrevented()).toBe(true);
    await user.click(screen.getByRole('link', { name: /All projects/ }));
    await screen.findByRole('heading', { name: 'Projects' });
    expect(unloadIsPrevented()).toBe(true); // guard remains active while ProjectView is unmounted
    await user.click(await screen.findByRole('link', { name: /Back Wall/ }));
    expect(await screen.findByRole('button', { name: 'Reload latest' })).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('→ Unsaved item')).toBeInTheDocument();
    expect(gets).toBe(1);
    // Attempt another save after remount; the conflict must still block POST.
    const dialog = await openSettings(user);
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(posts).toBe(1);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: 'Reload latest' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(unloadIsPrevented()).toBe(false);
    expect(screen.queryByText('→ Unsaved item')).not.toBeInTheDocument();
  });

  it.each(['en', 'pt'] as const)('closes the expense modal on conflict and exposes translated recovery (%s)', async (language) => {
    server.use(
      http.get('*/api/data', () => HttpResponse.json({ ...data, revision: 7 })),
      http.post('*/api/data', () => HttpResponse.json({ revision: 8 }, { status: 409 })),
    );
    const user = userEvent.setup();
    renderProject(language);
    await user.click(await screen.findByText('→ Pedro'));
    const dialog = within(screen.getByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: language === 'en' ? 'Edit' : 'Editar' }));
    const amount = dialog.getByLabelText(language === 'en' ? 'Amount' : 'Valor');
    await user.clear(amount);
    await user.type(amount, '750');
    await user.click(dialog.getByRole('button', { name: language === 'en' ? 'Save changes' : 'Salvar alterações' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent(language === 'en' ? /saving is paused/ : /salvamento está pausado/);
    expect(screen.getByRole('button', { name: language === 'en' ? 'Reload latest' : 'Recarregar versão mais recente' })).toBeInTheDocument();
    expect(screen.queryByText(/Request failed/)).not.toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText(/750,00/)).toBeInTheDocument();
  });

  it('warns for pending writes after unmount and clears the guard after success', async () => {
    let resolve!: () => void;
    const gate = new Promise<void>((done) => { resolve = done; });
    server.use(
      http.get('*/api/data', () => HttpResponse.json({ ...data, revision: 7 })),
      http.post('*/api/data', async () => { await gate; return HttpResponse.json({ ok: true, revision: 8 }); }),
    );
    const user = userEvent.setup();
    renderProject();
    await user.click(await screen.findByRole('button', { name: /expand add expense/i }));
    await waitFor(() => expect(screen.getByLabelText(/^Date/)).toHaveFocus());
    await user.type(screen.getByLabelText(/^Payee/), 'Pending item');
    await user.type(screen.getByLabelText(/^Amount/), '123');
    await user.click(screen.getByRole('button', { name: 'Add expense' }));
    expect(unloadIsPrevented()).toBe(true);
    await user.click(screen.getByRole('link', { name: /All projects/ }));
    expect(unloadIsPrevented()).toBe(true);
    await act(async () => { resolve(); });
    await waitFor(() => expect(unloadIsPrevented()).toBe(false));
    await user.click(await screen.findByRole('link', { name: /Back Wall/ }));
    expect(await screen.findByText('→ Pending item')).toBeInTheDocument();
  });
});
