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

  // Mock the AI extraction endpoint to auto-fill some of the form fields.
  await page.route('**/api/process-receipt*', (route: Route) =>
    route.fulfill({
      json: {
        fields: {
          date: '2026-05-10',
          amount: 99.5,
          payer: 'AI Payer',
          payee: 'Pedro',
          description: 'Receipt-extracted',
          category: 'Materials',
          currency: 'BRL',
          kind: 'expense',
        },
        filename: 'canonical-pedro.jpg',
      },
    }),
  );

  // Open the form, drop a receipt, verify the AI auto-filled the fields.
  await page.getByRole('button', { name: /expand add expense form/i }).click();
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: 'snap.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-jpeg-bytes'),
    });
  await expect(page.getByText(/Attached: canonical-pedro\.jpg/)).toBeVisible();
  await expect(page.getByLabel(/^Payee/)).toHaveValue('Pedro');
  await expect(page.getByLabel(/^Amount/)).toHaveValue('99.5');

  await page.getByRole('button', { name: 'Add expense', exact: true }).click();

  await expect.poll(() => saved.length).toBeGreaterThanOrEqual(1);
  const afterAdd = saved[saved.length - 1].expenses;
  expect(afterAdd).toHaveLength(2);
  const pedro = afterAdd.find((e) => e.payee === 'Pedro');
  expect(pedro?.amount).toBe(99.5);
  // The canonical filename from the OCR endpoint round-trips onto the expense.
  expect((pedro as unknown as { receipt?: string })?.receipt).toBe(
    'canonical-pedro.jpg',
  );

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

test('outstanding pill + bill linkage', async ({ page }) => {
  type Bill = typeof initialExpense & { kind: 'bill' };
  const bill: Bill = {
    id: 'b1',
    date: '2026-05-01',
    category: 'Materials',
    payer: '',
    payee: 'Quarry',
    description: 'Stone delivery quote',
    amount: 1000,
    currency: 'BRL',
    kind: 'bill',
  };

  const projectData: ProjectFixture = {
    slug: 'back-wall',
    name: 'Back Wall',
    currency: 'BRL',
    customCategories: [],
    contacts: [],
    expenses: [bill],
  };
  const saved: { expenses: ExpenseLite[] }[] = [];

  await page.route('**/api/projects', (route: Route) =>
    route.fulfill({ json: { projects: [{ slug: 'back-wall', name: 'Back Wall', expenseCount: 1, total: 0 }] } }),
  );
  await page.route('**/api/data*', async (route: Route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { expenses: ExpenseLite[] };
      saved.push(body);
      projectData.expenses = body.expenses as ProjectFixture['expenses'];
      await route.fulfill({ json: { ok: true } });
      return;
    }
    await route.fulfill({ json: projectData });
  });

  await page.goto('/projects/back-wall');

  // The single open bill drives the Outstanding pill in the page header.
  // Scope to the header so we don't pick up the same total in the bill row.
  await expect(page.getByText(/Outstanding/i)).toBeVisible();
  await expect(page.locator('header').getByText(/1\.000,00/)).toBeVisible();

  // Add a payment that links to the bill.
  await page.getByRole('button', { name: /expand add expense form/i }).click();
  await page.getByLabel(/^Date/).fill('2026-05-08');
  await page.getByLabel(/^Payee/).fill('Quarry');
  await page.getByLabel(/^Amount/).fill('300');
  // Link to the bill by its id (the option's `value` is bill.id).
  await page.getByLabel(/Link to bill/i).selectOption('b1');
  await page.getByRole('button', { name: 'Add expense', exact: true }).click();

  await expect.poll(() => saved.length).toBeGreaterThanOrEqual(1);
  const persisted = saved[saved.length - 1].expenses as Array<{
    payee: string;
    amount: number;
    linkedTo?: string;
  }>;
  const payment = persisted.find((e) => e.payee === 'Quarry' && e.amount === 300);
  expect(payment?.linkedTo).toBe('b1');

  // After linking, the header pill should drop to R$ 700,00.
  await expect(page.locator('header').getByText(/700,00/)).toBeVisible();

  // Filter chips: Bills only should hide the payment row.
  await page.getByRole('radio', { name: 'Bills only' }).click();
  await expect(page.getByRole('table').getByText(/Stone delivery/)).toBeVisible();
  await expect(page.getByRole('table').getByText('300')).toHaveCount(0);
});
