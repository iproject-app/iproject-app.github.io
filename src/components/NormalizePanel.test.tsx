import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NormalizePanel } from './NormalizePanel';
import type { Contact, Expense, ProjectData } from '../lib/types';
import { renderWithI18n } from '../test/helpers';

const expense = (over: Partial<Expense> = {}): Expense => ({
  id: 'x',
  date: '2026-05-04',
  category: 'Materials',
  payer: 'Joe',
  payee: 'Francisco',
  description: '',
  amount: 100,
  currency: 'BRL',
  kind: 'expense',
  ...over,
});

const projectWith = (expenses: Expense[]): ProjectData => ({
  slug: 's',
  name: 'p',
  currency: 'BRL',
  customCategories: [],
  contacts: [],
  expenses,
});

const fAlvaro: Contact = {
  id: 'c1',
  name: 'Francisco Alvaro Lima Vieira',
  aliases: ['Francisco', 'Alvaro'],
};

describe('NormalizePanel', () => {
  it('shows the all-up message when nothing would change', () => {
    renderWithI18n(
      <NormalizePanel
        data={projectWith([
          expense({ payer: 'Joe', payee: 'Francisco Alvaro Lima Vieira' }),
        ])}
        liveContacts={[fAlvaro]}
        saving={false}
        onApply={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/all existing entries already match/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /normalize/i }),
    ).not.toBeInTheDocument();
  });

  it('shows a button with the count of entries to rewrite', () => {
    renderWithI18n(
      <NormalizePanel
        data={projectWith([
          expense({ id: 'a', payer: 'francisco', payee: 'Sandra' }),
          expense({ id: 'b', payer: 'alvaro', payee: 'Francisco' }),
        ])}
        liveContacts={[fAlvaro]}
        saving={false}
        onApply={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('button', { name: /normalize 2 existing entries/i }),
    ).toBeInTheDocument();
  });

  it('uses the singular label when exactly one entry would change', () => {
    renderWithI18n(
      <NormalizePanel
        data={projectWith([expense({ payer: 'francisco' })])}
        liveContacts={[fAlvaro]}
        saving={false}
        onApply={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('button', { name: /normalize 1 existing entry/i }),
    ).toBeInTheDocument();
  });

  it('arms a confirmation step before saving', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn().mockResolvedValue(undefined);
    renderWithI18n(
      <NormalizePanel
        data={projectWith([expense({ payer: 'francisco' })])}
        liveContacts={[fAlvaro]}
        saving={false}
        onApply={onApply}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: /normalize 1 existing entry/i }),
    );
    expect(onApply).not.toHaveBeenCalled();
    expect(
      screen.getByRole('alertdialog', { name: /rewrite payer\/payee/i }),
    ).toBeInTheDocument();
  });

  it('dispatches save with the normalized expenses on confirm', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn().mockResolvedValue(undefined);
    renderWithI18n(
      <NormalizePanel
        data={projectWith([
          expense({ id: 'a', payer: 'francisco', payee: 'Joe' }),
          expense({ id: 'b', payer: 'Joe', payee: 'alvaro' }),
        ])}
        liveContacts={[fAlvaro]}
        saving={false}
        onApply={onApply}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: /normalize 2 existing entries/i }),
    );
    await user.click(screen.getByRole('button', { name: /yes, normalize/i }));

    expect(onApply).toHaveBeenCalledTimes(1);
    const next = onApply.mock.calls[0][0] as ProjectData;
    expect(next.expenses[0].payer).toBe('Francisco Alvaro Lima Vieira');
    expect(next.expenses[1].payee).toBe('Francisco Alvaro Lima Vieira');
    // Contacts get persisted alongside.
    expect(next.contacts).toEqual([fAlvaro]);
  });

  it('cancel from confirm returns to the button state without saving', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    renderWithI18n(
      <NormalizePanel
        data={projectWith([expense({ payer: 'francisco' })])}
        liveContacts={[fAlvaro]}
        saving={false}
        onApply={onApply}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: /normalize 1 existing entry/i }),
    );
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(onApply).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /normalize 1 existing entry/i }),
    ).toBeInTheDocument();
  });

  it('surfaces a save error', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn().mockRejectedValue(new Error('Request failed: 500'));
    renderWithI18n(
      <NormalizePanel
        data={projectWith([expense({ payer: 'francisco' })])}
        liveContacts={[fAlvaro]}
        saving={false}
        onApply={onApply}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: /normalize 1 existing entry/i }),
    );
    await user.click(screen.getByRole('button', { name: /yes, normalize/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/500/);
  });
});
