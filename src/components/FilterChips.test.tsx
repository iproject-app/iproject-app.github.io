import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  applyFilters,
  FilterBar,
  initialFilters,
  type ExpenseFilters,
} from './FilterChips';
import { renderWithI18n } from '../test/helpers';

const baseFilters: ExpenseFilters = { ...initialFilters };

describe('FilterBar — type radios', () => {
  it('renders three type options with the active one checked', () => {
    renderWithI18n(
      <FilterBar
        value={{ ...baseFilters, type: 'bills' }}
        onChange={vi.fn()}
        payers={[]}
        categories={[]}
      />,
    );
    expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.getByRole('radio', { name: 'Bills only' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('emits the selected type via onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithI18n(
      <FilterBar
        value={baseFilters}
        onChange={onChange}
        payers={[]}
        categories={[]}
      />,
    );

    await user.click(screen.getByRole('radio', { name: 'Payments only' }));

    expect(onChange).toHaveBeenCalledWith({ ...baseFilters, type: 'payments' });
  });
});

describe('FilterBar — payer + category dropdowns', () => {
  it('renders payer and category dropdowns with the provided values', () => {
    renderWithI18n(
      <FilterBar
        value={baseFilters}
        onChange={vi.fn()}
        payers={['Joe', 'Sandra']}
        categories={['Labor', 'Materials']}
      />,
    );
    expect(screen.getByLabelText('Payer')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Joe' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Labor' })).toBeInTheDocument();
  });

  it('emits payer selection through onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithI18n(
      <FilterBar
        value={baseFilters}
        onChange={onChange}
        payers={['Joe']}
        categories={[]}
      />,
    );

    await user.selectOptions(screen.getByLabelText('Payer'), 'Joe');

    expect(onChange).toHaveBeenCalledWith({ ...baseFilters, payer: 'Joe' });
  });

  it('shows the "Clear filters" button when anything is filtered', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithI18n(
      <FilterBar
        value={{ ...baseFilters, payer: 'Joe' }}
        onChange={onChange}
        payers={['Joe']}
        categories={[]}
      />,
    );

    await user.click(screen.getByRole('button', { name: /clear filters/i }));

    expect(onChange).toHaveBeenCalledWith(initialFilters);
  });
});

describe('applyFilters', () => {
  type Item = {
    label: string;
    kind?: 'expense' | 'bill';
    payer?: string;
    category?: string;
  };

  const items: Item[] = [
    { label: 'b1', kind: 'bill', payer: 'Joe', category: 'Materials' },
    { label: 'e1', kind: 'expense', payer: 'Joe', category: 'Labor' },
    { label: 'e2', kind: 'expense', payer: 'Sandra', category: 'Materials' },
    { label: 'e3', payer: '', category: 'Garbage' },
  ];

  it('returns everything when nothing is set', () => {
    expect(applyFilters(items, initialFilters).map((i) => i.label)).toEqual([
      'b1',
      'e1',
      'e2',
      'e3',
    ]);
  });

  it('filters by type=bills', () => {
    expect(
      applyFilters(items, { ...initialFilters, type: 'bills' }).map((i) => i.label),
    ).toEqual(['b1']);
  });

  it('filters by type=payments (anything not a bill, including kind-unset)', () => {
    expect(
      applyFilters(items, { ...initialFilters, type: 'payments' }).map(
        (i) => i.label,
      ),
    ).toEqual(['e1', 'e2', 'e3']);
  });

  it('filters by payer (exact match)', () => {
    expect(
      applyFilters(items, { ...initialFilters, payer: 'Joe' }).map(
        (i) => i.label,
      ),
    ).toEqual(['b1', 'e1']);
  });

  it('filters by the special __unknown payer (empty string)', () => {
    expect(
      applyFilters(items, { ...initialFilters, payer: '__unknown' }).map(
        (i) => i.label,
      ),
    ).toEqual(['e3']);
  });

  it('filters by category', () => {
    expect(
      applyFilters(items, { ...initialFilters, category: 'Materials' }).map(
        (i) => i.label,
      ),
    ).toEqual(['b1', 'e2']);
  });

  it('ANDs all three axes together', () => {
    expect(
      applyFilters(items, {
        type: 'payments',
        payer: 'Joe',
        category: 'Labor',
      }).map((i) => i.label),
    ).toEqual(['e1']);
  });
});
