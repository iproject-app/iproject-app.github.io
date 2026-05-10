import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ProjectData, ProjectListResponse } from '../lib/types';

/** Default API base used by tests. The api client treats a relative path as
 *  same-origin; jsdom resolves that to http://localhost:3000 by default. We
 *  match URLs by path so callers don't have to worry about origin. */

const projectListFixture = (): ProjectListResponse => ({
  projects: [
    { slug: 'back-wall', name: 'Back Wall', expenseCount: 1, total: 500 },
  ],
});

const projectDataFixture = (slug: string): ProjectData => ({
  slug,
  name: 'Back Wall',
  currency: 'BRL',
  customCategories: [],
  contacts: [],
  expenses: [
    {
      id: 'seed-01',
      date: '2026-05-04',
      category: 'Labor',
      payer: 'Shelby',
      payee: 'Francisco',
      description: 'PIX',
      amount: 500,
      currency: 'BRL',
      kind: 'expense',
    },
  ],
});

export const defaultHandlers = [
  http.get('*/api/projects', () => HttpResponse.json(projectListFixture())),
  http.get('*/api/data', ({ request }) => {
    const url = new URL(request.url);
    const slug = url.searchParams.get('project') ?? 'back-wall';
    return HttpResponse.json(projectDataFixture(slug));
  }),
  http.post('*/api/data', () => HttpResponse.json({ ok: true })),
];

export function makeServer(...handlers: Parameters<typeof setupServer>) {
  return setupServer(...(handlers.length ? handlers : defaultHandlers));
}

export { http, HttpResponse };
