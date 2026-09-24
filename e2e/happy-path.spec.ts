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

for (const versioned of [false, true]) {
  test(`list → detail → add → edit → delete (${versioned ? 'new' : 'old'} server)`, async ({ page }) => {
    let revision = 7;
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
        const body = route.request().postDataJSON() as { expenses: ExpenseLite[]; revision?: number };
        expect(body.revision).toBe(versioned ? revision : undefined);
        if (versioned && body.revision !== revision) {
          await route.fulfill({ status: 409, json: { revision } });
          return;
        }
        saved.push(body);
        // Apply the change to the in-memory fixture so subsequent GETs see it.
        projectData.expenses = body.expenses as ProjectFixture['expenses'];
        await route.fulfill({ json: { ok: true, ...(versioned ? { revision: ++revision } : {}) } });
        return;
      }
      await route.fulfill({ json: { ...projectData, ...(versioned ? { revision } : {}) } });
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
    await expect(page.getByLabel(/^Date/)).toBeFocused();
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
    await page.getByRole('dialog').getByLabel(/^Amount/).fill('750');
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

}

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
      const body = route.request().postDataJSON() as { expenses: ExpenseLite[]; revision?: number };
      saved.push(body);
      projectData.expenses = body.expenses as ProjectFixture['expenses'];
      await route.fulfill({ json: { ok: true } });
      return;
    }
    await route.fulfill({ json: projectData });
  });

  await page.goto('/projects/back-wall');

  // The single open bill drives the Outstanding pill in the page header.
  // "Outstanding" now also shows up in the summary tile — scope both
  // assertions to the page header so we test the pill specifically.
  await expect(page.locator('header').getByText(/Outstanding/i)).toBeVisible();
  await expect(page.locator('header').getByText(/1\.000,00/)).toBeVisible();

  // Add a payment that links to the bill.
  await page.getByRole('button', { name: /expand add expense form/i }).click();
  await expect(page.getByLabel(/^Date/)).toBeFocused();
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

test('detail modal shows attached receipt image', async ({ page }) => {
  const expenseWithReceipt = {
    id: 'seed-1',
    date: '2026-05-04',
    category: 'Materials',
    payer: 'Joe',
    payee: 'Quarry',
    description: 'Sand',
    amount: 200,
    currency: 'BRL',
    kind: 'expense' as const,
    receipt: 'sand.jpg',
  };
  const projectData: ProjectFixture = {
    slug: 'back-wall',
    name: 'Back Wall',
    currency: 'BRL',
    customCategories: [],
    contacts: [],
    expenses: [expenseWithReceipt],
  };

  await page.route('**/api/projects', (route: Route) =>
    route.fulfill({
      json: { projects: [{ slug: 'back-wall', name: 'Back Wall', expenseCount: 1, total: 200 }] },
    }),
  );
  await page.route('**/api/data*', (route: Route) =>
    route.fulfill({ json: projectData }),
  );
  // Tiny 1x1 PNG (base64) — enough bytes to render in the test browser.
  const pngBytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64',
  );
  await page.route('**/receipts/sand.jpg*', (route: Route) =>
    route.fulfill({
      status: 200,
      headers: { 'content-type': 'image/png' },
      body: pngBytes,
    }),
  );

  await page.goto('/projects/back-wall');
  await page.locator('tr', { hasText: 'Quarry' }).click();
  await expect(page.getByRole('heading', { name: /^Details$/i })).toBeVisible();

  const img = page.getByAltText('sand.jpg');
  await expect(img).toBeVisible();
  await expect(img).toHaveAttribute('src', /^blob:/);
});

for (const status of [400, 409, 428, 401, 403, 500, 0]) {
  test(`save failure ${status} keeps edits visible and offers recovery`, async ({ page }) => {
    let posts = 0;
    let gets = 0;
    let fail = true;
    await page.route('**/api/projects', (route) => route.fulfill({ json: projectListResponse }));
    const bodies: { expenses: ExpenseLite[]; revision: number }[] = [];
    await page.route('**/api/data*', async (route) => {
      if (route.request().method() === 'POST') {
        posts++;
        bodies.push(route.request().postDataJSON());
        if (fail) {
          if (status === 0) await route.abort();
          else await route.fulfill({ status, json: { revision: 9 } });
        } else await route.fulfill({ json: { ok: true, revision: 10 } });
        return;
      }
      gets++;
      await route.fulfill({ json: {
        slug: 'back-wall', name: 'Back Wall', currency: 'BRL',
        contacts: [], customCategories: [], expenses: [initialExpense],
        revision: gets === 1 ? 7 : 9,
      } });
    });
    await page.goto('/projects/back-wall');
    await page.getByRole('button', { name: /expand add expense form/i }).click();
    await expect(page.getByLabel(/^Date/)).toBeFocused();
    await page.getByLabel(/^Payee/).fill('My unsaved expense');
    await page.getByLabel(/^Amount/).fill('123');
    const submit = page.getByRole('button', { name: 'Add expense', exact: true });
    await submit.click();
    const message = status === 400 ? /data or revision is invalid/
      : status === 409 || status === 428 ? /saving is paused/
      : status === 401 ? /Please log in again/
      : status === 403 ? /You don't have access to this project/
      : /Check your connection and try saving again/;
    await expect(page.getByRole('alert').filter({ hasText: message }).first()).toBeVisible();
    await expect(page.getByLabel(/^Payee/)).toHaveValue('My unsaved expense');
    await expect(page.getByRole('table').getByText('→ My unsaved expense')).toBeVisible();
    expect(gets).toBe(1);
    if (status === 400 || status === 409 || status === 428) {
      await submit.click();
      expect(posts).toBe(1);
      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toContain('unsaved edits will be discarded');
        await dialog.dismiss();
      });
      await page.getByRole('button', { name: 'Reload latest' }).click();
      expect(gets).toBe(1);
      await expect(page.getByLabel(/^Payee/)).toHaveValue('My unsaved expense');
      await page.getByRole('link', { name: /All projects/ }).click();
      await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
      expect(await page.evaluate(() => {
        const event = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(event);
        return event.defaultPrevented;
      })).toBe(true);
      await page.getByRole('link', { name: /Back Wall/ }).click();
      await expect(page.getByRole('table').getByText('→ My unsaved expense')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Reload latest' })).toBeVisible();
      expect(gets).toBe(1);
      page.once('dialog', (dialog) => dialog.accept());
      await page.getByRole('button', { name: 'Reload latest' }).click();
      await expect(page.getByRole('table').getByText('→ My unsaved expense')).toHaveCount(0);
      await expect(page.getByRole('alert')).toHaveCount(0);
      expect(gets).toBe(2);
      fail = false;
      await page.getByRole('button', { name: /expand add expense form/i }).click();
      await expect(page.getByLabel(/^Date/)).toBeFocused();
      await page.getByLabel(/^Payee/).fill('Reapplied expense');
      await page.getByLabel(/^Amount/).fill('123');
      await submit.click();
      await expect.poll(() => posts).toBe(2);
      expect(bodies[1].revision).toBe(9);
    } else if (status === 401) {
      await expect(page.getByRole('button', { name: 'Log in again' })).toBeVisible();
    } else if (status === 500 || status === 0) {
      fail = false;
      await submit.click();
      await expect(page.getByRole('alert')).toHaveCount(0);
      expect(posts).toBe(2);
      expect(bodies[1].expenses).toHaveLength(2); // retry must not duplicate the local expense
      expect(bodies[1].revision).toBe(7);
    }
  });
}


for (const versioned of [false, true]) {
  test(`settings rename → save (${versioned ? 'new' : 'old'} server)`, async ({ page }) => {
    let revision = 7;
    let name = 'Back Wall';
    let saves = 0;
    await page.route('**/api/data*', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        expect(body.revision).toBe(versioned ? revision : undefined);
        expect(body.name).toBe('Renamed project');
        saves++;
        await route.fulfill({ json: { ok: true, ...(versioned ? { revision: ++revision } : {}) } });
        return;
      }
      await route.fulfill({ json: {
        slug: 'back-wall', name, currency: 'BRL', expenses: [initialExpense],
        contacts: [], customCategories: [], ...(versioned ? { revision } : {}),
      } });
    });
    await page.route('**/api/projects/back-wall/rename', async (route) => {
      expect(route.request().headers()['if-match']).toBe(versioned ? `"${revision}"` : undefined);
      name = route.request().postDataJSON().name;
      await route.fulfill({ json: { slug: 'back-wall', name, ...(versioned ? { revision: ++revision } : {}) } });
    });
    await page.goto('/projects/back-wall');
    await page.getByRole('button', { name: 'Project settings' }).click();
    await page.getByRole('dialog').getByLabel('Project name', { exact: true }).fill('Renamed project');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Renamed project' })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(saves).toBe(1);
  });
}


test('B1: two tabs cannot use rename to overwrite a newer save', async ({ page: tabA, context }) => {
  let stored = {
    slug: 'back-wall', name: 'Back Wall', currency: 'BRL', expenses: [initialExpense],
    contacts: [], customCategories: [], revision: 7,
  };
  const matches: (string | undefined)[] = [];
  const saves: number[] = [];
  await context.route('**/api/data*', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      if (body.revision !== stored.revision) {
        await route.fulfill({ status: 409, json: { revision: stored.revision } });
        return;
      }
      saves.push(body.revision);
      stored = { ...body, revision: stored.revision + 1 };
      await route.fulfill({ json: { ok: true, revision: stored.revision } });
      return;
    }
    await route.fulfill({ json: stored });
  });
  await context.route('**/api/projects/back-wall/rename', async (route) => {
    const match = route.request().headers()['if-match'];
    matches.push(match);
    if (!match || match !== `"${stored.revision}"`) {
      await route.fulfill({ status: match ? 409 : 428, json: { revision: stored.revision } });
      return;
    }
    stored = { ...stored, name: route.request().postDataJSON().name, revision: stored.revision + 1 };
    await route.fulfill({ json: { name: stored.name, revision: stored.revision } });
  });
  await tabA.goto('/projects/back-wall');
  await tabA.getByRole('button', { name: 'Project settings' }).click();
  await expect(tabA.getByRole('dialog').getByLabel('Project name', { exact: true })).toHaveValue('Back Wall');
  await tabA.getByRole('dialog').getByLabel('Project name', { exact: true }).fill('Tab A rename');
  const tabB = await context.newPage();
  await tabB.goto('/projects/back-wall');
  await tabB.getByRole('button', { name: /expand add expense form/i }).click();
  await expect(tabB.getByLabel(/^Date/)).toBeFocused();
  await tabB.getByLabel(/^Payee/).fill('Tab B expense');
  await tabB.getByLabel(/^Amount/).fill('123');
  await tabB.getByRole('button', { name: 'Add expense', exact: true }).click();
  await expect.poll(() => stored.revision).toBe(8);
  await tabA.bringToFront();
  await tabA.getByRole('button', { name: 'Save changes' }).click();
  await expect(tabA.getByRole('dialog')).toHaveCount(0);
  await expect(tabA.getByRole('alert')).toContainText('saving is paused');
  await expect(tabA.getByRole('button', { name: 'Reload latest' })).toBeVisible();
  expect(matches).toEqual(['"7"']);
  expect(saves).toEqual([7]);
  expect(stored.revision).toBe(8);
  expect(stored.name).toBe('Back Wall');
  expect(stored.expenses.some((expense) => expense.payee === 'Tab B expense')).toBe(true);
  // Explicit reload recovers tab B's data; the next rename and save use 8 then 9.
  tabA.once('dialog', (dialog) => dialog.accept());
  await tabA.getByRole('button', { name: 'Reload latest' }).click();
  await expect(tabA.getByRole('table').getByText('→ Tab B expense')).toBeVisible();
  await tabA.getByRole('button', { name: 'Project settings' }).click();
  await expect(tabA.getByRole('dialog').getByLabel('Project name', { exact: true })).toHaveValue('Back Wall');
  await tabA.getByRole('dialog').getByLabel('Project name', { exact: true }).fill('Tab A rename');
  await tabA.getByRole('button', { name: 'Save changes' }).click();
  await expect(tabA.getByRole('dialog')).toHaveCount(0);
  await expect(tabA.getByRole('alert')).toHaveCount(0);
  await expect(tabA.getByRole('heading', { name: 'Tab A rename' })).toBeVisible();
  expect(matches).toEqual(['"7"', '"8"']);
  expect(saves).toEqual([7, 9]);
  expect(stored.revision).toBe(10);
  expect(stored.expenses.some((expense) => expense.payee === 'Tab B expense')).toBe(true);
});

test('B2: returning from Home refreshes a clean project', async ({ page }) => {
  let gets = 0;
  let description = 'Before navigation';
  await page.route('**/api/projects', (route) => route.fulfill({ json: projectListResponse }));
  await page.route('**/api/data*', (route) => {
    gets++;
    return route.fulfill({ json: {
      slug: 'back-wall', name: 'Back Wall', currency: 'BRL',
      expenses: [{ ...initialExpense, description }], contacts: [], customCategories: [], revision: gets + 6,
    } });
  });
  await page.goto('/projects/back-wall');
  await expect(page.getByRole('table').getByText('Before navigation')).toBeVisible();
  await page.getByRole('link', { name: /All projects/ }).click();
  await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
  description = 'Changed while away';
  await page.getByRole('link', { name: /Back Wall/ }).click();
  await expect(page.getByRole('table').getByText('Changed while away')).toBeVisible();
  expect(gets).toBe(2);
});
