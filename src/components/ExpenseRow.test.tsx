import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseRow } from './ExpenseRow';
import type { Expense } from '../lib/types';
import { I18nProvider } from '../i18n';

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

function renderRow(props: Parameters<typeof ExpenseRow>[0]) {
  return render(
    <I18nProvider initialLanguage="en">
      <table>
        <tbody>
          <ExpenseRow {...props} />
        </tbody>
      </table>
    </I18nProvider>,
  );
}

describe('ExpenseRow', () => {
  it('renders expense data', () => {
    renderRow({ expense });
    expect(screen.getByText('Shelby')).toBeVisible();
    expect(screen.getByText('→ Francisco')).toBeVisible();
    expect(screen.getByText('PIX 500')).toBeVisible();
  });

  it('is non-interactive without onClick', () => {
    renderRow({ expense });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onClick with the expense when interactive', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderRow({ expense, onClick });

    await user.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledWith(expense);
  });

  it('triggers onClick on Enter key', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderRow({ expense, onClick });

    const row = screen.getByRole('button');
    row.focus();
    await user.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledWith(expense);
  });
});
