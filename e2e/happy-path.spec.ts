import { test, expect, type Route } from '@playwright/test';

/**
 * Happy-path E2E covers the core user flow: list → detail → add → edit → delete.
 * Auth is bypassed via VITE_E2E. The backend is mocked at the network layer
 * so the test is hermetic.
 */

const projectListResponse = {
  projects: [{ slug: 'back-wall', name: 'Back Wall', expenseCount: 1, total: 500 }],
};

const initialExpense = {
  id: 'seed-01',
  date: '2026-05-04',
  category: 'Labor',
  payer: 'Shelby',
  payee: 'Francisco',
  description: 'PIX 500',
  amount: 500,
  currency: 'BRL',
  kind: 'expense' as const,
};

interface ExpenseLite {
  id?: string;
  payee: string;
  amount: number;
}

type ProjectFixture = {
  slug: string;
  name: string;
  currency: string;
  customCategories: string[];
  contacts: unknown[];
  expenses: typeof initialExpense[];
};

test('list → detail → add → edit → delete', async ({ page }) => {
  const projectData: ProjectFixture = {
    slug: 'back-wall',
    name: 'Back Wall',
    currency: 'BRL',
    customCategories: [],
    contacts: [],
    expenses: [initialExpense],
  };
  const saved: { expenses: ExpenseLite[] }[] = [];

  await page.route('**/api/projects', (route: Route) =>
    route.fulfill({ json: projectListResponse }),
  );
  await page.route('**/api/data*', async (route: Route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { expenses: ExpenseLite[] };
      saved.push(body);
      // Apply the change to the in-memory fixture so subsequent GETs see it.
      projectData.expenses = body.expenses as ProjectFixture['expenses'];
      await route.fulfill({ json: { ok: true } });
      return;
    }
    await route.fulfill({ json: projectData });
  });

  await page.goto('/');

  // List shows the back-wall card → click into it.
  await expect(page.getByRole('heading', { name: 'Back Wall' })).toBeVisible();
  await page.getByRole('link', { name: /back wall/i }).click();
  await expect(page).toHaveURL(/\/projects\/back-wall/);

  // Existing entry is rendered in the table.
  await expect(page.getByRole('table').getByText('→ Francisco')).toBeVisible();

  // Add an expense.
  await page.getByRole('button', { name: /expand add expense form/i }).click();
  await page.getByLabel(/^Date/).fill('2026-05-10');
  await page.getByLabel(/^Payee/).fill('Pedro');
  await page.getByLabel(/^Amount/).fill('99.50');
  await page.getByRole('button', { name: 'Add expense', exact: true }).click();

  await expect.poll(() => saved.length).toBeGreaterThanOrEqual(1);
  const afterAdd = saved[saved.length - 1].expenses;
  expect(afterAdd).toHaveLength(2);
  expect(afterAdd.find((e) => e.payee === 'Pedro')?.amount).toBe(99.5);

  // Click the original Francisco row by content (the new Pedro row is sorted
  // first). Modal opens in *view* mode now — the pencil icon enters edit.
  await page.locator('tr', { hasText: 'Francisco' }).click();
  await expect(page.getByRole('heading', { name: /^Details$/i })).toBeVisible();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByRole('heading', { name: /edit expense/i })).toBeVisible();
  await page.getByLabel(/^Amount/).fill('750');
  await page.getByRole('button', { name: /save changes/i }).click();

  await expect.poll(() => saved.length).toBeGreaterThanOrEqual(2);
  const afterEdit = saved[saved.length - 1].expenses;
  const francisco = afterEdit.find((e) => e.payee === 'Francisco');
  expect(francisco?.amount).toBe(750);

  // Delete the Pedro entry from view mode; "Are you sure?" prompt + confirm.
  await page.locator('tr', { hasText: 'Pedro' }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(
    page.getByRole('alertdialog', { name: /delete this entry/i }),
  ).toBeVisible();
  await page.getByRole('button', { name: /yes, delete/i }).click();

  await expect.poll(() => saved.length).toBeGreaterThanOrEqual(3);
  const afterDelete = saved[saved.length - 1].expenses;
  expect(afterDelete).toHaveLength(1);
});
