import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddExpenseHeader } from './AddExpenseHeader';
import { renderWithI18n } from '../test/helpers';

describe('AddExpenseHeader', () => {
  it('uses the expand label when collapsed', () => {
    renderWithI18n(<AddExpenseHeader open={false} onToggle={vi.fn()} />);
    const button = screen.getByRole('button', { name: /expand add expense form/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-controls', 'add-expense-fields');
  });

  it('uses the collapse label when open', () => {
    renderWithI18n(<AddExpenseHeader open={true} onToggle={vi.fn()} />);
    const button = screen.getByRole('button', { name: /collapse add expense form/i });
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('calls onToggle on click', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    renderWithI18n(<AddExpenseHeader open={false} onToggle={onToggle} />);

    await user.click(screen.getByRole('button', { name: /expand/i }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders the title and description text in English by default', () => {
    renderWithI18n(<AddExpenseHeader open={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Add expense' })).toBeVisible();
    expect(screen.getByText(/record a payment or quote/i)).toBeVisible();
  });

  it('switches to Portuguese when the language is pt', () => {
    renderWithI18n(<AddExpenseHeader open={false} onToggle={vi.fn()} />, {
      language: 'pt',
    });
    expect(
      screen.getByRole('heading', { name: 'Adicionar despesa' }),
    ).toBeVisible();
    expect(screen.getByText(/registre um pagamento/i)).toBeVisible();
  });
});
