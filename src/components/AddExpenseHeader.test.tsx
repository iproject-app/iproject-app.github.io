import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddExpenseHeader } from './AddExpenseHeader';

describe('AddExpenseHeader', () => {
  it('uses the expand label when collapsed', () => {
    render(<AddExpenseHeader open={false} onToggle={vi.fn()} />);
    const button = screen.getByRole('button', { name: /expand add expense form/i });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-controls', 'add-expense-fields');
  });

  it('uses the collapse label when open', () => {
    render(<AddExpenseHeader open={true} onToggle={vi.fn()} />);
    const button = screen.getByRole('button', { name: /collapse add expense form/i });
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('calls onToggle on click', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<AddExpenseHeader open={false} onToggle={onToggle} />);

    await user.click(screen.getByRole('button', { name: /expand/i }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders the title and description text', () => {
    render(<AddExpenseHeader open={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Add expense' })).toBeVisible();
    expect(screen.getByText(/record a payment or quote/i)).toBeVisible();
  });
});
