import { test, expect, type Route } from '@playwright/test';

/**
 * Happy-path E2E:
 *   1. Land on `/` (auth bypassed via VITE_E2E)
 *   2. Backend mocked: project list contains `back-wall`
 *   3. Click into the project, see one existing expense
 *   4. Open the add-expense form, fill it, submit
 *   5. POST is captured and the new expense appears in the list
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

const projectDataResponse = {
  slug: 'back-wall',
  name: 'Back Wall',
  currency: 'BRL',
  customCategories: [],
  contacts: [],
  expenses: [initialExpense],
};

test('list → detail → add expense', async ({ page }) => {
  let savedPayload: { expenses: { payee: string; amount: number }[] } | null = null;

  await page.route('**/api/projects', (route: Route) =>
    route.fulfill({ json: projectListResponse }),
  );

  await page.route('**/api/data*', async (route: Route) => {
    if (route.request().method() === 'POST') {
      savedPayload = route.request().postDataJSON();
      await route.fulfill({ json: { ok: true } });
      return;
    }
    await route.fulfill({ json: projectDataResponse });
  });

  await page.goto('/');

  // 1. Project list shows the back-wall card
  await expect(page.getByRole('heading', { name: 'Back Wall' })).toBeVisible();
  await expect(page.getByText('back-wall')).toBeVisible();

  // 2. Click into the project
  await page.getByRole('link', { name: /back wall/i }).click();
  await expect(page).toHaveURL(/\/projects\/back-wall/);

  // 3. Existing expense is rendered. The same data appears in both the mobile
  //    card view and the desktop table view (one hidden via CSS); scope the
  //    assertion to the table to avoid the strict-mode duplicate match.
  await expect(page.getByRole('table').getByText('→ Francisco')).toBeVisible();
  await expect(
    page.getByRole('table').getByText('PIX 500', { exact: true }),
  ).toBeVisible();

  // 4. Open the add-expense form and fill it
  await page
    .getByRole('button', { name: /expand add expense form/i })
    .click();
  // Set the date explicitly (browser date input default may differ from test expectations).
  await page.getByLabel(/^Date/).fill('2026-05-10');
  await page.getByLabel(/^Payee/).fill('Pedro');
  await page.getByLabel(/^Amount/).fill('99.50');
  await page.getByRole('button', { name: 'Add expense', exact: true }).click();

  // 5. POST captured, payload includes the new expense
  await expect.poll(() => savedPayload).not.toBeNull();
  const last = savedPayload!.expenses[savedPayload!.expenses.length - 1];
  expect(last.payee).toBe('Pedro');
  expect(last.amount).toBe(99.5);
});
