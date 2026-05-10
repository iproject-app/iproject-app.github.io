import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { OutstandingPill } from './OutstandingPill';
import { renderWithI18n } from '../test/helpers';

describe('OutstandingPill', () => {
  it('renders the label and formatted BRL amount when positive', () => {
    renderWithI18n(<OutstandingPill amount={1234.56} />);
    expect(screen.getByText(/Outstanding/)).toBeVisible();
    expect(screen.getByText(/R\$\s?1\.234,56/)).toBeVisible();
  });

  it('renders nothing for zero', () => {
    const { container } = renderWithI18n(<OutstandingPill amount={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for negative values', () => {
    const { container } = renderWithI18n(<OutstandingPill amount={-5} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('localizes the label in Portuguese', () => {
    renderWithI18n(<OutstandingPill amount={100} />, { language: 'pt' });
    expect(screen.getByText(/A pagar/)).toBeVisible();
  });
});
