import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { SummaryTiles } from './SummaryTiles';
import type { Expense } from '../lib/types';
import { renderWithI18n } from '../test/helpers';

const expense = (over: Partial<Expense> = {}): Expense => ({
  id: 'x',
  date: '2026-05-04',
  category: 'Materials',
  payer: 'Joe',
  payee: 'Pedro',
  description: '',
  amount: 100,
  currency: 'BRL',
  kind: 'expense',
  ...over,
});

describe('SummaryTiles', () => {
  it('renders nothing for an empty list', () => {
    const { container } = renderWithI18n(<SummaryTiles expenses={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the total spent in a top tile', () => {
    renderWithI18n(
      <SummaryTiles
        expenses={[
          expense({ category: 'Labor', amount: 100 }),
          expense({ category: 'Materials', amount: 50 }),
        ]}
      />,
    );
    // Scope the amount lookup to the top tile (the total can also legitimately
    // show up under a category or payer subsection if values happen to match).
    const totalTile = screen.getByText(/total spent/i).closest('div')!;
    expect(within(totalTile).getByText(/150,00/)).toBeInTheDocument();
  });

  it('renders a tile per non-zero category', () => {
    renderWithI18n(
      <SummaryTiles
        expenses={[
          expense({ category: 'Labor', amount: 200 }),
          expense({ category: 'Materials', amount: 100 }),
        ]}
      />,
    );
    expect(screen.getByText('Labor')).toBeInTheDocument();
    expect(screen.getByText('Materials')).toBeInTheDocument();
  });

  it('lists payer totals with localized fallback for unknown', () => {
    renderWithI18n(
      <SummaryTiles
        expenses={[
          expense({ payer: 'Joe', amount: 100 }),
          expense({ payer: '', amount: 50 }),
        ]}
      />,
    );
    expect(screen.getByText('Joe')).toBeInTheDocument();
    expect(screen.getByText(/Unknown/)).toBeInTheDocument();
  });

  it('localizes section headings in Portuguese', () => {
    renderWithI18n(<SummaryTiles expenses={[expense()]} />, { language: 'pt' });
    expect(screen.getByText(/Total gasto/)).toBeInTheDocument();
    expect(screen.getByText(/Por categoria/)).toBeInTheDocument();
    expect(screen.getByText(/Por pagador/)).toBeInTheDocument();
  });

  it('excludes bills from the totals', () => {
    renderWithI18n(
      <SummaryTiles
        expenses={[
          expense({ kind: 'bill', amount: 9999 }),
          expense({ category: 'Labor', amount: 100 }),
          expense({ category: 'Materials', amount: 200 }),
        ]}
      />,
    );
    const totalTile = screen.getByText(/total spent/i).closest('div')!;
    expect(within(totalTile).getByText(/300,00/)).toBeInTheDocument();
    // The 9999 bill never appears anywhere.
    expect(screen.queryByText(/9\.999/)).not.toBeInTheDocument();
  });
});
