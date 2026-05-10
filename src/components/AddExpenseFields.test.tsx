import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddExpenseFields } from './AddExpenseFields';
import type { ExpenseFormInput } from '../lib/validation';

const blank = (): ExpenseFormInput => ({
  date: '2026-05-10',
  category: 'Materials',
  payer: '',
  payee: '',
  description: '',
  amount: '',
  currency: 'BRL',
  isBill: false,
});

describe('AddExpenseFields', () => {
  it('renders one input per form field', () => {
    render(
      <AddExpenseFields form={blank()} suggestions={[]} onChange={vi.fn()} />,
    );
    expect(screen.getByLabelText(/^Date/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Category/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Payer/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Payee/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Description/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Amount/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Currency/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mark as bill/)).toBeInTheDocument();
  });

  it('reflects the form prop in input values', () => {
    render(
      <AddExpenseFields
        form={{ ...blank(), payee: 'Pedro', amount: '99.50', isBill: true }}
        suggestions={[]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/^Payee/)).toHaveValue('Pedro');
    expect(screen.getByLabelText(/^Amount/)).toHaveValue(99.5);
    expect(screen.getByLabelText(/Mark as bill/)).toBeChecked();
  });

  it('calls onChange with the field key and new value when typing', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AddExpenseFields form={blank()} suggestions={[]} onChange={onChange} />,
    );

    await user.type(screen.getByLabelText(/^Payee/), 'P');

    expect(onChange).toHaveBeenCalledWith('payee', 'P');
  });

  it('renders suggestion options inside the category datalist', () => {
    const { container } = render(
      <AddExpenseFields
        form={blank()}
        suggestions={['Sand', 'Roofing']}
        onChange={vi.fn()}
      />,
    );
    const options = container.querySelectorAll('datalist#category-suggestions option');
    const values = Array.from(options).map((o) => o.getAttribute('value'));
    expect(values).toContain('Sand');
    expect(values).toContain('Roofing');
  });
});
