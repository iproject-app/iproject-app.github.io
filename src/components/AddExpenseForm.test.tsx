import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddExpenseForm } from './AddExpenseForm';
import type { ProjectData } from '../lib/types';
import { renderWithI18n } from '../test/helpers';

// Default mock: succeed with a stable canonical filename and no extracted
// fields. Individual tests override via mockProcessReceiptOnce.
const processReceiptMock = vi.fn();
vi.mock('../lib/processReceipt', async () => {
  const actual = await vi.importActual<typeof import('../lib/processReceipt')>(
    '../lib/processReceipt',
  );
  return {
    ...actual,
    useProcessReceipt: () => processReceiptMock,
  };
});

const makeFile = (name = 'r.jpg') =>
  new File(['bytes'], name, { type: 'image/jpeg' });

const buildData = (over: Partial<ProjectData> = {}): ProjectData => ({
  slug: 'back-wall',
  name: 'Back Wall',
  currency: 'BRL',
  customCategories: [],
  contacts: [],
  expenses: [],
  ...over,
});

async function fillRequired(
  user: ReturnType<typeof userEvent.setup>,
  fields: { date: string; payee: string; amount: string },
) {
  await user.clear(screen.getByLabelText(/^Date/));
  await user.type(screen.getByLabelText(/^Date/), fields.date);
  await user.type(screen.getByLabelText(/^Payee/), fields.payee);
  await user.type(screen.getByLabelText(/^Amount/), fields.amount);
}

describe('AddExpenseForm', () => {
  beforeEach(() => {
    processReceiptMock.mockReset();
  });

  it('renders collapsed by default with title and hint visible', () => {
    renderWithI18n(
      <AddExpenseForm data={buildData()} saving={false} onAdd={vi.fn()} />,
    );
    expect(screen.getByText('Add expense')).toBeVisible();
    expect(screen.queryByLabelText(/^Date/)).not.toBeInTheDocument();
  });

  it('expands when the header is clicked', async () => {
    const user = userEvent.setup();
    renderWithI18n(
      <AddExpenseForm data={buildData()} saving={false} onAdd={vi.fn()} />,
    );

    await user.click(
      screen.getByRole('button', { name: /expand add expense form/i }),
    );

    const dateField = await screen.findByLabelText(/^Date/);
    expect(dateField).toBeVisible();
    expect(dateField).toBeEnabled();
  });

  it('submits a valid entry and calls onAdd with the appended expense', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const data = buildData();
    renderWithI18n(
      <AddExpenseForm data={data} saving={false} onAdd={onAdd} />,
    );

    await user.click(
      screen.getByRole('button', { name: /expand add expense form/i }),
    );
    await user.clear(screen.getByLabelText(/^Date/));
    await user.type(screen.getByLabelText(/^Date/), '2026-05-10');
    await user.clear(screen.getByLabelText(/^Category/));
    await user.type(screen.getByLabelText(/^Category/), 'Materials');
    await user.type(screen.getByLabelText(/^Payer/), 'Joe');
    await user.type(screen.getByLabelText(/^Payee/), 'Pedro');
    await user.type(screen.getByLabelText(/^Description/), 'sand');
    await user.type(screen.getByLabelText(/^Amount/), '99.50');
    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    const arg = onAdd.mock.calls[0][0] as ProjectData;
    expect(arg.expenses).toHaveLength(1);
    expect(arg.expenses[0]).toMatchObject({
      date: '2026-05-10',
      category: 'Materials',
      payer: 'Joe',
      payee: 'Pedro',
      description: 'sand',
      amount: 99.5,
      currency: 'BRL',
      kind: 'expense',
    });
    expect(arg.slug).toBe(data.slug);
  });

  it('marks kind=bill when the bill checkbox is ticked', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(undefined);
    renderWithI18n(
      <AddExpenseForm data={buildData()} saving={false} onAdd={onAdd} />,
    );

    await user.click(
      screen.getByRole('button', { name: /expand add expense form/i }),
    );
    await fillRequired(user, { date: '2026-05-10', payee: 'Quarry', amount: '500' });
    await user.click(screen.getByLabelText(/Mark as bill/));
    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect((onAdd.mock.calls[0][0] as ProjectData).expenses[0].kind).toBe('bill');
  });

  it('shows the localized validation error and does not call onAdd on missing payee', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    renderWithI18n(
      <AddExpenseForm data={buildData()} saving={false} onAdd={onAdd} />,
    );

    await user.click(
      screen.getByRole('button', { name: /expand add expense form/i }),
    );
    await user.clear(screen.getByLabelText(/^Date/));
    await user.type(screen.getByLabelText(/^Date/), '2026-05-10');
    await user.type(screen.getByLabelText(/^Amount/), '50');
    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/payee is required/i);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('shows the validation error in Portuguese', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    renderWithI18n(
      <AddExpenseForm data={buildData()} saving={false} onAdd={onAdd} />,
      { language: 'pt' },
    );

    await user.click(
      screen.getByRole('button', { name: /expandir formulário/i }),
    );
    await user.clear(screen.getByLabelText(/^Data/));
    await user.type(screen.getByLabelText(/^Data/), '2026-05-10');
    await user.type(screen.getByLabelText(/^Valor/), '50');
    await user.click(screen.getByRole('button', { name: 'Adicionar despesa' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /beneficiário é obrigatório/i,
    );
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('surfaces a save error from onAdd', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockRejectedValue(new Error('Request failed: 500'));
    renderWithI18n(
      <AddExpenseForm data={buildData()} saving={false} onAdd={onAdd} />,
    );

    await user.click(
      screen.getByRole('button', { name: /expand add expense form/i }),
    );
    await fillRequired(user, { date: '2026-05-10', payee: 'Pedro', amount: '50' });
    await user.click(screen.getByRole('button', { name: 'Add expense' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/500/);
  });

  describe('receipt upload + auto-fill', () => {
    it('auto-fills the form with AI-extracted fields and stores the canonical filename on submit', async () => {
      const user = userEvent.setup();
      const onAdd = vi.fn().mockResolvedValue(undefined);
      processReceiptMock.mockResolvedValueOnce({
        fields: {
          date: '2026-05-04',
          amount: 500,
          payer: 'Shelby',
          payee: 'Francisco',
          description: 'PIX 500',
          category: 'Labor',
          currency: 'BRL',
          kind: 'expense',
          fxRate: undefined,
          linkedTo: null,
        },
        filename: 'canonical.jpg',
      });

      const { container } = renderWithI18n(
        <AddExpenseForm data={buildData()} saving={false} onAdd={onAdd} />,
      );

      await user.click(
        screen.getByRole('button', { name: /expand add expense form/i }),
      );
      const input = container.querySelector(
        'input[type=file]',
      ) as HTMLInputElement;
      await user.upload(input, makeFile('snap.jpg'));

      // Wait for async processing to settle; the attached message is a
      // reliable signal that auto-fill ran.
      await waitFor(() =>
        expect(screen.getByText(/Attached: canonical\.jpg/)).toBeVisible(),
      );

      expect(screen.getByLabelText(/^Payee/)).toHaveValue('Francisco');
      expect(screen.getByLabelText(/^Amount/)).toHaveValue(500);
      expect(screen.getByLabelText(/^Payer/)).toHaveValue('Shelby');
      expect(screen.getByLabelText(/^Date/)).toHaveValue('2026-05-04');

      await user.click(screen.getByRole('button', { name: 'Add expense' }));

      expect(onAdd).toHaveBeenCalledTimes(1);
      const next = onAdd.mock.calls[0][0] as ProjectData;
      expect(next.expenses[0].receipt).toBe('canonical.jpg');
      expect(next.expenses[0].payee).toBe('Francisco');
    });

    it('attaches the duplicate filename without overwriting form fields', async () => {
      const user = userEvent.setup();
      const onAdd = vi.fn().mockResolvedValue(undefined);
      processReceiptMock.mockResolvedValueOnce({
        duplicate: {
          type: 'exact-file',
          filename: 'already.jpg',
          expense: {
            id: 'seed-01',
            date: '2026-01-01',
            category: 'Other',
            payer: '',
            payee: 'Dupe',
            description: '',
            amount: 1,
          },
        },
      });

      const { container } = renderWithI18n(
        <AddExpenseForm data={buildData()} saving={false} onAdd={onAdd} />,
      );

      await user.click(
        screen.getByRole('button', { name: /expand add expense form/i }),
      );
      // Set the payee atomically (fireEvent, not user.type) so the value can't
      // race with the upload's async state churn under React StrictMode.
      fireEvent.change(screen.getByLabelText(/^Payee/), {
        target: { value: 'Custom' },
      });
      const input = container.querySelector(
        'input[type=file]',
      ) as HTMLInputElement;
      await user.upload(input, makeFile('snap.jpg'));

      await waitFor(() =>
        expect(screen.getByText(/Attached: already\.jpg/)).toBeVisible(),
      );
      expect(screen.getByText(/already attached/i)).toBeVisible();
      expect(screen.getByLabelText(/^Payee/)).toHaveValue('Custom');
    });

    it('shows the dropzone error state when processing fails', async () => {
      const user = userEvent.setup();
      processReceiptMock.mockRejectedValueOnce(new Error('502 Bad Gateway'));

      const { container } = renderWithI18n(
        <AddExpenseForm
          data={buildData()}
          saving={false}
          onAdd={vi.fn()}
        />,
      );

      await user.click(
        screen.getByRole('button', { name: /expand add expense form/i }),
      );
      const input = container.querySelector(
        'input[type=file]',
      ) as HTMLInputElement;
      await user.upload(input, makeFile('snap.jpg'));

      expect(await screen.findByRole('alert')).toHaveTextContent(/502/);
    });
  });
});
