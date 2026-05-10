import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { applyFilter, FilterChips } from './FilterChips';
import { renderWithI18n } from '../test/helpers';

describe('FilterChips', () => {
  it('renders three options with the active state on the current value', () => {
    renderWithI18n(<FilterChips value="bills" onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.getByRole('radio', { name: 'Bills only' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('calls onChange with the selected value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithI18n(<FilterChips value="all" onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: 'Payments only' }));

    expect(onChange).toHaveBeenCalledWith('payments');
  });

  it('localizes labels in Portuguese', () => {
    renderWithI18n(<FilterChips value="all" onChange={vi.fn()} />, {
      language: 'pt',
    });
    expect(screen.getByRole('radio', { name: 'Apenas pagamentos' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Apenas orçamentos' })).toBeInTheDocument();
  });
});

describe('applyFilter', () => {
  const items = [
    { kind: 'bill' as const, label: 'b1' },
    { kind: 'expense' as const, label: 'e1' },
    { label: 'unset' }, // no kind defaults to expense/payment
  ];

  it('returns everything when filter is all', () => {
    expect(applyFilter(items, 'all')).toEqual(items);
  });

  it('keeps only bills when filter is bills', () => {
    expect(applyFilter(items, 'bills').map((i) => i.label)).toEqual(['b1']);
  });

  it('keeps non-bills (including kind-unset) when filter is payments', () => {
    expect(applyFilter(items, 'payments').map((i) => i.label)).toEqual([
      'e1',
      'unset',
    ]);
  });
});
