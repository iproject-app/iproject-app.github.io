import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SummaryTiles } from './SummaryTiles';
import type { Expense, ProjectData } from '../lib/types';
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
  it('renders nothing for an empty project with no plannedLabor', () => {
    const { container } = renderWithI18n(<SummaryTiles expenses={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the Contract hero tile when plannedLabor is set', () => {
    renderWithI18n(
      <SummaryTiles expenses={[expense({ amount: 500 })]} plannedLabor={15800} />,
    );
    const contractTile = screen.getByText(/Contract/i).closest('div')!;
    expect(within(contractTile).getByText(/15\.800,00/)).toBeInTheDocument();
  });

  it('shows the Total spent hero tile (excludes bills)', () => {
    renderWithI18n(
      <SummaryTiles
        expenses={[
          expense({ kind: 'bill', amount: 9999 }),
          expense({ category: 'Labor', amount: 100 }),
          expense({ category: 'Materials', amount: 200 }),
        ]}
      />,
    );
    const totalTile = screen.getByText(/Total spent/i).closest('div')!;
    expect(within(totalTile).getByText(/300,00/)).toBeInTheDocument();
    // The bill counts toward Outstanding, not Spent.
    expect(within(totalTile).queryByText(/9\.999/)).not.toBeInTheDocument();
  });

  it('shows the Outstanding hero tile only when there are open bills', () => {
    renderWithI18n(
      <SummaryTiles
        expenses={[expense({ kind: 'bill', amount: 1000 }), expense({ amount: 100 })]}
      />,
    );
    const outstandingTile = screen.getByText(/^Outstanding$/i).closest('div')!;
    expect(within(outstandingTile).getByText(/1\.000,00/)).toBeInTheDocument();
  });

  it('renders one "Paid on {category}" tile per non-zero category', () => {
    renderWithI18n(
      <SummaryTiles
        expenses={[
          expense({ category: 'Labor', amount: 200 }),
          expense({ category: 'Materials', amount: 100 }),
        ]}
      />,
    );
    expect(screen.getByText('Paid on Labor')).toBeInTheDocument();
    expect(screen.getByText('Paid on Materials')).toBeInTheDocument();
  });

  it('collapses the by-payer list when the toggle is clicked', async () => {
    const user = userEvent.setup();
    renderWithI18n(
      <SummaryTiles expenses={[expense({ payer: 'Joe', amount: 100 })]} />,
    );

    const toggle = screen.getByRole('button', { name: /by payer/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Joe')).toBeVisible();

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Joe')).not.toBeInTheDocument();
  });

  it('emits onPayerSelect when a row is clicked', async () => {
    const user = userEvent.setup();
    const onPayerSelect = vi.fn();
    renderWithI18n(
      <SummaryTiles
        expenses={[expense({ payer: 'Joe', amount: 100 })]}
        onPayerSelect={onPayerSelect}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Joe/ }));

    expect(onPayerSelect).toHaveBeenCalledWith('Joe');
  });

  it('toggles off when clicking the currently-selected payer', async () => {
    const user = userEvent.setup();
    const onPayerSelect = vi.fn();
    renderWithI18n(
      <SummaryTiles
        expenses={[expense({ payer: 'Joe', amount: 100 })]}
        selectedPayer="Joe"
        onPayerSelect={onPayerSelect}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Joe/ }));

    expect(onPayerSelect).toHaveBeenCalledWith('');
  });

  describe('Contract vs paid-on-labor color logic', () => {
    it('Contract tile is rose-tinted when labor is under-paid', () => {
      renderWithI18n(
        <SummaryTiles
          expenses={[expense({ category: 'Labor', amount: 1000 })]}
          plannedLabor={5000}
        />,
      );
      const tile = screen.getByText(/Contract/i).closest('div')!;
      expect(tile.className).toMatch(/rose/);
    });

    it('Contract tile is emerald-tinted when labor exactly meets the budget', () => {
      renderWithI18n(
        <SummaryTiles
          expenses={[expense({ category: 'Labor', amount: 5000 })]}
          plannedLabor={5000}
        />,
      );
      const tile = screen.getByText(/Contract/i).closest('div')!;
      expect(tile.className).toMatch(/emerald/);
    });

    it('Contract tile stays emerald when labor overshoots — but Paid on Labor turns rose', () => {
      renderWithI18n(
        <SummaryTiles
          expenses={[expense({ category: 'Labor', amount: 6000 })]}
          plannedLabor={5000}
        />,
      );
      expect(
        screen.getByText(/Contract/i).closest('div')!.className,
      ).toMatch(/emerald/);
      // The Paid on Labor tile (in the by-category grid) gets the over-budget look.
      const laborTile = screen.getByText('Paid on Labor').closest('li')!;
      expect(laborTile.className).toMatch(/rose/);
    });

    it('Paid on Labor uses the default category palette when under budget', () => {
      renderWithI18n(
        <SummaryTiles
          expenses={[expense({ category: 'Labor', amount: 1000 })]}
          plannedLabor={5000}
        />,
      );
      const laborTile = screen.getByText('Paid on Labor').closest('li')!;
      expect(laborTile.className).toMatch(/blue/); // brand-ish, from categoryClass
      expect(laborTile.className).not.toMatch(/rose/);
    });

    it('Contract tile uses the brand tone when plannedLabor is unset', () => {
      renderWithI18n(
        <SummaryTiles expenses={[expense({ category: 'Labor', amount: 1000 })]} />,
      );
      // Without plannedLabor the Contract tile doesn't render at all.
      expect(screen.queryByText(/Contract/i)).not.toBeInTheDocument();
    });
  });

  describe('Next-payment footer on the Contract tile', () => {
    const buildContract = (
      expenses: Expense[],
      approved: string[] = [],
    ): ProjectData => ({
      slug: 'back-wall',
      name: 'Back Wall',
      currency: 'BRL',
      customCategories: [],
      contacts: [],
      plannedLabor: 15800,
      contractWeeks: 4,
      contractStartDate: '2026-05-01',
      approvedCheckpoints: approved,
      expenses,
    });

    it('shows the catch-up amount, not a flat weekly division', () => {
      // Weekly = 3950. Through week_1 (next unapproved), scheduled = 7900.
      // 5566 paid on Labor → due = 2334. Date for week_1 = start + 14 days.
      const data = buildContract(
        [{ ...expense({ category: 'Labor', amount: 5566 }) }],
        ['week_0'],
      );
      renderWithI18n(
        <SummaryTiles
          expenses={data.expenses}
          plannedLabor={data.plannedLabor}
          contractData={data}
        />,
      );
      const tile = screen.getByText(/Contract/i).closest('div')!;
      expect(within(tile).getByText(/2\.334,00/)).toBeInTheDocument();
      // The naive weekly amount must NOT appear.
      expect(within(tile).queryByText(/3\.950,00/)).not.toBeInTheDocument();
    });

    it('clamps to 0 when labor is already ahead of the cumulative schedule', () => {
      const data = buildContract(
        [{ ...expense({ category: 'Labor', amount: 10000 }) }],
        ['week_0'],
      );
      renderWithI18n(
        <SummaryTiles
          expenses={data.expenses}
          plannedLabor={data.plannedLabor}
          contractData={data}
        />,
      );
      const tile = screen.getByText(/Contract/i).closest('div')!;
      // Use a precise match so '10.000,00' on the value line doesn't confuse it.
      const footer = within(tile).getByText(/Next: R\$/i);
      expect(footer.textContent).toMatch(/Next: R\$\s*0,00/);
    });

    it('appends a payments-remaining count', () => {
      const data = buildContract([], ['week_0', 'week_1']);
      renderWithI18n(
        <SummaryTiles
          expenses={data.expenses}
          plannedLabor={data.plannedLabor}
          contractData={data}
        />,
      );
      const tile = screen.getByText(/Contract/i).closest('div')!;
      expect(
        within(tile).getByText(/2 payments remaining/),
      ).toBeInTheDocument();
    });

    it('hides the footer entirely when the contract is not configured', () => {
      // plannedLabor is set so the tile renders, but no startDate/weeks →
      // schedule is empty so renderNextPayment returns null.
      renderWithI18n(
        <SummaryTiles
          expenses={[]}
          plannedLabor={5000}
          contractData={{
            slug: 's',
            name: 'p',
            currency: 'BRL',
            customCategories: [],
            contacts: [],
            expenses: [],
            plannedLabor: 5000,
          }}
        />,
      );
      const tile = screen.getByText(/Contract/i).closest('div')!;
      expect(within(tile).queryByText(/Next:/i)).not.toBeInTheDocument();
      expect(
        within(tile).queryByText(/payments remaining/i),
      ).not.toBeInTheDocument();
    });
  });

  it('localizes the headings in Portuguese', () => {
    renderWithI18n(
      <SummaryTiles expenses={[expense()]} plannedLabor={1000} />,
      { language: 'pt' },
    );
    expect(screen.getByText(/Contrato/)).toBeInTheDocument();
    expect(screen.getByText(/Total gasto/)).toBeInTheDocument();
    expect(screen.getByText(/Por categoria/)).toBeInTheDocument();
    expect(screen.getByText(/Por pagador/)).toBeInTheDocument();
  });
});
