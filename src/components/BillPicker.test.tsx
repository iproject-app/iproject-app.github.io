import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BillPicker } from './BillPicker';
import { renderWithI18n } from '../test/helpers';
import type { Expense } from '../lib/types';

const expense = (over: Partial<Expense> = {}): Expense => ({
  id: 'x',
  date: '2026-05-04',
  category: 'Materials',
  payer: '',
  payee: 'Pedro',
  description: '',
  amount: 100,
  currency: 'BRL',
  kind: 'expense',
  ...over,
});

describe('BillPicker', () => {
  it('shows an info message when there are no bills to link to', () => {
    renderWithI18n(
      <BillPicker
        bills={[]}
        allExpenses={[]}
        value={undefined}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/no open bills to link to/i)).toBeVisible();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('renders an option per open bill with payee, date, and remaining amount', () => {
    const bill = expense({ id: 'b1', kind: 'bill', amount: 1000, payee: 'Quarry' });
    renderWithI18n(
      <BillPicker
        bills={[bill]}
        allExpenses={[bill]}
        value={undefined}
        onChange={vi.fn()}
      />,
    );
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /no linked bill/i })).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /Quarry.*R\$\s?1\.000,00/ }),
    ).toBeInTheDocument();
  });

  it('shows the remaining (not gross) balance for partly-paid bills', () => {
    const bill = expense({ id: 'b1', kind: 'bill', amount: 1000, payee: 'Quarry' });
    const payment = expense({
      id: 'p1',
      kind: 'expense',
      amount: 300,
      linkedTo: 'b1',
    });
    renderWithI18n(
      <BillPicker
        bills={[bill]}
        allExpenses={[bill, payment]}
        value={undefined}
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('option', { name: /R\$\s?700,00/ }),
    ).toBeInTheDocument();
  });

  it('calls onChange with the selected bill id', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const bill = expense({ id: 'b1', kind: 'bill', amount: 100, payee: 'Quarry' });
    renderWithI18n(
      <BillPicker
        bills={[bill]}
        allExpenses={[bill]}
        value={undefined}
        onChange={onChange}
      />,
    );

    await user.selectOptions(screen.getByRole('combobox'), 'b1');

    expect(onChange).toHaveBeenCalledWith('b1');
  });

  it('passes undefined when the no-link option is chosen', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const bill = expense({ id: 'b1', kind: 'bill', amount: 100, payee: 'Quarry' });
    renderWithI18n(
      <BillPicker
        bills={[bill]}
        allExpenses={[bill]}
        value="b1"
        onChange={onChange}
      />,
    );

    await user.selectOptions(screen.getByRole('combobox'), '');

    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
