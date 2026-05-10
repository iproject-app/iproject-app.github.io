import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseCard } from './ExpenseCard';
import type { Expense } from '../lib/types';
import { renderWithI18n } from '../test/helpers';

const expense: Expense = {
  id: 'seed-01',
  date: '2026-05-04',
  category: 'Labor',
  payer: 'Shelby',
  payee: 'Francisco',
  description: 'PIX 500',
  amount: 500,
  currency: 'BRL',
  kind: 'expense',
};

describe('ExpenseCard', () => {
  it('renders the expense data', () => {
    renderWithI18n(<ExpenseCard expense={expense} />);
    expect(screen.getByText('Francisco')).toBeVisible();
    expect(screen.getByText('PIX 500')).toBeVisible();
  });

  it('is rendered as a non-interactive article without onClick', () => {
    renderWithI18n(<ExpenseCard expense={expense} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders as a button and fires onClick with the expense when interactive', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithI18n(<ExpenseCard expense={expense} onClick={onClick} />);

    await user.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledWith(expense);
  });
});
