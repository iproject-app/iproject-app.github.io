import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Field } from './Field';

describe('Field', () => {
  it('renders the label and associates it with the wrapped input', () => {
    render(
      <Field label="Date">
        <input type="date" defaultValue="2026-05-10" />
      </Field>,
    );
    expect(screen.getByLabelText(/^Date/)).toHaveValue('2026-05-10');
  });

  it('renders the optional hint inline', () => {
    render(
      <Field label="Payer" hint="Leave blank for a bill / quote.">
        <input type="text" />
      </Field>,
    );
    expect(screen.getByText(/Leave blank for a bill/)).toBeInTheDocument();
  });

  it('omits the hint when not provided', () => {
    render(
      <Field label="Amount">
        <input type="number" />
      </Field>,
    );
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it('passes through an extra className for layout overrides', () => {
    render(
      <Field label="Description" className="sm:col-span-2">
        <input type="text" />
      </Field>,
    );
    expect(screen.getByText('Description').closest('label')).toHaveClass(
      'sm:col-span-2',
    );
  });
});
