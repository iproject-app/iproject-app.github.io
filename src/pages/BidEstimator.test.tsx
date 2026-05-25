import { describe, expect, it } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../test/helpers';
import { BidEstimator } from './BidEstimator';

describe('BidEstimator', () => {
  it('renders the bid type and its default-on components', () => {
    const { getByRole, getByLabelText, getAllByText } = renderWithProviders(
      <BidEstimator />,
    );
    expect(
      getByRole('heading', { name: 'Bid estimator' }),
    ).toBeInTheDocument();
    expect(getByLabelText('Bid type')).toHaveValue('external_security_wall');
    [
      'Foundation (footing)',
      'Layout (marcação)',
      'Block laying (alvenaria)',
      'Lintels / grout (vergas)',
      'Scratch coat (chapisco)',
      'Plaster (reboco)',
    ].forEach((label) =>
      expect(getAllByText(label).length).toBeGreaterThan(0),
    );
  });

  it('lists guided demolition/debris components, off by default', () => {
    const { getByLabelText } = renderWithProviders(<BidEstimator />);
    expect(getByLabelText('Include Demolition')).not.toBeChecked();
    expect(
      getByLabelText('Include Debris removal (caçambas)'),
    ).not.toBeChecked();
    expect(getByLabelText('Include Block laying (alvenaria)')).toBeChecked();
  });

  it('recomputes the price per m² when the wall height changes', () => {
    // Per-m² is length-invariant for a rectangular wall (face and
    // footing both scale with length); height changes the footing-to-
    // face ratio, so it must move.
    const { getByText, getByLabelText } = renderWithProviders(
      <BidEstimator />,
    );
    const perM2 = getByText(/\/ m²$/);
    const before = perM2.textContent;

    fireEvent.change(getByLabelText('Wall height (m)'), {
      target: { value: '6' },
    });

    expect(perM2.textContent).not.toEqual(before);
  });

  it('skipping an optional component lowers the total', () => {
    const { getByText, getByLabelText } = renderWithProviders(
      <BidEstimator />,
    );
    const perM2 = getByText(/\/ m²$/);
    const before = perM2.textContent;

    fireEvent.click(getByLabelText('Include Plaster (reboco)'));

    expect(perM2.textContent).not.toEqual(before);
  });

  it('brick orientation drives the alvenaria daily production', () => {
    const { getByLabelText } = renderWithProviders(<BidEstimator />);
    const prod = getByLabelText('Block laying (alvenaria) Output / day');
    expect(prod).toHaveValue(12); // flat

    fireEvent.change(getByLabelText('Brick orientation'), {
      target: { value: 'on_edge' },
    });

    expect(prod).toHaveValue(20); // on edge — thinner wall, faster
  });

  it('shows the per-unit math and a default direct cost for debris', () => {
    const { getByLabelText, getByText } = renderWithProviders(
      <BidEstimator />,
    );
    // the math is spelled out, not hidden
    expect(getByText(/Labor \/ unit = daily team cost/)).toBeInTheDocument();
    // include debris (its card controls show once it's in the bid)
    fireEvent.click(getByLabelText('Existing structure to demolish?'));
    fireEvent.click(getByLabelText('Include Debris removal (caçambas)'));
    // skip rental reference flows in as an editable per-unit direct cost
    expect(
      getByLabelText('Debris removal (caçambas) Direct / unit'),
    ).toHaveValue(350);
  });

  it('including debris with its rental raises the price', () => {
    const { getByText, getByLabelText } = renderWithProviders(
      <BidEstimator />,
    );
    fireEvent.click(getByLabelText('Existing structure to demolish?'));
    fireEvent.change(getByLabelText('Debris haul-off (caçambas)'), {
      target: { value: '4' },
    });
    const perM2 = getByText(/\/ m²$/);
    const before = perM2.textContent;
    fireEvent.click(getByLabelText('Include Debris removal (caçambas)'));
    expect(perM2.textContent).not.toEqual(before);
  });

  it('has no opening rows until one is added, then derives area from W×H', () => {
    const { getByText, queryByLabelText, getByLabelText } =
      renderWithProviders(<BidEstimator />);
    // zero openings → no row, no stray "openings area" field
    expect(
      queryByLabelText('Openings (gates / garage) 1 Width (m)'),
    ).toBeNull();

    const perM2 = getByText(/\/ m²$/);
    const before = perM2.textContent;

    fireEvent.click(getByText('+ Add opening'));
    const w = getByLabelText('Openings (gates / garage) 1 Width (m)');
    const h = getByLabelText('Openings (gates / garage) 1 Height (m)');
    const a = getByLabelText('Openings (gates / garage) 1 Area (m²)');

    fireEvent.change(w, { target: { value: '2' } });
    fireEvent.change(h, { target: { value: '3' } });
    expect(a).toHaveValue(6); // area auto-fills from W×H
    expect(perM2.textContent).not.toEqual(before); // face shrank → price moved
  });

  it('a directly-entered opening area is kept over W×H', () => {
    const { getByText, getByLabelText } = renderWithProviders(
      <BidEstimator />,
    );
    fireEvent.click(getByText('+ Add opening'));
    const a = getByLabelText('Openings (gates / garage) 1 Area (m²)');
    fireEvent.change(a, { target: { value: '5' } });
    expect(a).toHaveValue(5);
  });

  it('reveals the footing-factor explanation only when the info button is tapped', () => {
    const { getByLabelText, getByText, queryByText } = renderWithProviders(
      <BidEstimator />,
    );
    fireEvent.click(getByLabelText('Retaining wall (reinforced footing)'));
    const info = getByLabelText('Footing reinforcement factor — info');
    // single box: nothing shown until tapped (no native title duplicate)
    expect(
      queryByText(/Multiplies the footing work when the wall is retaining/),
    ).toBeNull();

    fireEvent.click(info);
    expect(
      getByText(/Multiplies the footing work when the wall is retaining/),
    ).toBeInTheDocument();

    fireEvent.click(info);
    expect(
      queryByText(/Multiplies the footing work when the wall is retaining/),
    ).toBeNull();
  });

  it('hides demolition fields until the existing-structure box is ticked', () => {
    const { getByLabelText, queryByLabelText } = renderWithProviders(
      <BidEstimator />,
    );
    expect(queryByLabelText('Existing structure length (m)')).toBeNull();
    expect(queryByLabelText('Debris haul-off (caçambas)')).toBeNull();

    fireEvent.click(getByLabelText('Existing structure to demolish?'));

    expect(
      getByLabelText('Existing structure length (m)'),
    ).toBeInTheDocument();
    expect(
      getByLabelText('Existing structure height (m)'),
    ).toBeInTheDocument();
  });

  it('hides the reinforcement factor unless the wall is retaining', () => {
    const { getByLabelText, queryByLabelText } = renderWithProviders(
      <BidEstimator />,
    );
    expect(queryByLabelText('Footing reinforcement factor')).toBeNull();
    fireEvent.click(getByLabelText('Retaining wall (reinforced footing)'));
    expect(
      getByLabelText('Footing reinforcement factor'),
    ).toBeInTheDocument();
  });

  it('itemizes materials from the takeoff and prices them on entry', () => {
    const { getByText, getAllByText, getByLabelText, queryByLabelText } =
      renderWithProviders(<BidEstimator />);
    // the lump is gone; an itemized bill is shown instead
    expect(queryByLabelText('Materials cost (R$)')).toBeNull();
    expect(getAllByText('Block / brick').length).toBeGreaterThan(0);

    const perM2 = getByText(/\/ m²$/);
    const before = perM2.textContent;
    fireEvent.change(
      getByLabelText('Block / brick — Block laying (alvenaria) Unit price (R$)'),
      { target: { value: '3' } },
    );
    expect(perM2.textContent).not.toEqual(before); // material cost now flows in
  });

  it('asks for the block/brick type first, and it drives block quantity', () => {
    const { getByLabelText, getByText, container } = renderWithProviders(
      <BidEstimator />,
    );
    const blockType = getByLabelText('Block / brick type');
    expect(blockType).toHaveValue('concrete_vedacao');

    // it is the first field in THE JOB (before wall length)
    const labelled = Array.from(
      container.querySelectorAll('input,select'),
    ).map((el) => el.getAttribute('aria-label'));
    expect(labelled.indexOf('Block / brick type')).toBeLessThan(
      labelled.indexOf('Wall length (m)'),
    );

    const perM2 = getByText(/\/ m²$/);
    // concrete vedação (13/m² @ R$5.30) → solid clay (52/m² @ R$1.40):
    // different units/m² and reference price, so the bill moves
    const before = perM2.textContent;
    fireEvent.change(blockType, { target: { value: 'solid_clay' } });
    expect(perM2.textContent).not.toEqual(before);
  });

  it('a core component cannot be skipped', () => {
    const { getByLabelText } = renderWithProviders(<BidEstimator />);
    // alvenaria is optional:false in the definition
    expect(getByLabelText('Include Block laying (alvenaria)')).toBeDisabled();
  });
});
