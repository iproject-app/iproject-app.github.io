import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  applyContractDraft,
  ContractEditor,
  draftToContract,
  projectToContractDraft,
  type ContractDraft,
} from './ContractEditor';
import type { ProjectData } from '../lib/types';
import { renderWithI18n } from '../test/helpers';

const project = (over: Partial<ProjectData> = {}): ProjectData => ({
  slug: 's',
  name: 'p',
  currency: 'BRL',
  customCategories: [],
  contacts: [],
  expenses: [],
  ...over,
});

const blankDraft = (): ContractDraft => ({
  plannedLabor: '',
  contractUpfront: '',
  contractStartDate: '',
  contractWeeks: '',
  approvedCheckpoints: [],
});

describe('projectToContractDraft / draftToContract / applyContractDraft', () => {
  it('round-trips a fully-configured contract through draft → project', () => {
    const data = project({
      plannedLabor: 15800,
      contractUpfront: 2000,
      contractStartDate: '2026-05-01',
      contractWeeks: 3,
      approvedCheckpoints: ['upfront'],
    });
    const draft = projectToContractDraft(data);
    expect(draft).toEqual({
      plannedLabor: '15800',
      contractUpfront: '2000',
      contractStartDate: '2026-05-01',
      contractWeeks: '3',
      approvedCheckpoints: ['upfront'],
    });
    expect(applyContractDraft(project(), draft)).toMatchObject({
      plannedLabor: 15800,
      contractUpfront: 2000,
      contractStartDate: '2026-05-01',
      contractWeeks: 3,
      approvedCheckpoints: ['upfront'],
    });
  });

  it('clears the contract fields when the draft is blank', () => {
    const data = project({
      plannedLabor: 1000,
      contractWeeks: 3,
      contractStartDate: '2026-05-01',
    });
    const next = applyContractDraft(data, blankDraft());
    expect(next.plannedLabor).toBeUndefined();
    expect(next.contractWeeks).toBeUndefined();
    expect(next.contractStartDate).toBeUndefined();
  });

  it('parses non-numeric or non-positive values as missing', () => {
    expect(
      draftToContract({
        ...blankDraft(),
        plannedLabor: 'abc',
        contractWeeks: '0',
      }),
    ).toMatchObject({
      plannedLabor: undefined,
      contractWeeks: undefined,
    });
  });

  it('keeps an upfront of 0 as 0 (non-negative) when explicitly entered', () => {
    expect(draftToContract({ ...blankDraft(), contractUpfront: '0' })).toMatchObject(
      { contractUpfront: 0 },
    );
  });
});

describe('ContractEditor (UI)', () => {
  it('shows the "not configured" hint when fields are empty', () => {
    renderWithI18n(<ContractEditor value={blankDraft()} onChange={vi.fn()} />);
    expect(
      screen.getByText(/set the contract amount, start date/i),
    ).toBeInTheDocument();
  });

  it('renders the schedule preview as the user fills in fields', () => {
    renderWithI18n(
      <ContractEditor
        value={{
          plannedLabor: '15800',
          contractUpfront: '2000',
          contractStartDate: '2026-05-01',
          contractWeeks: '3',
          approvedCheckpoints: [],
        }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/Weekly amount/i)).toBeInTheDocument();
    // Schedule list shows one upfront row + three weekly rows. Scope the
    // upfront-row check to a list item so we don't collide with the form field
    // labeled "Upfront payment" above.
    const rows = screen.getAllByRole('listitem');
    expect(
      rows.some((li) => li.textContent?.includes('Upfront (start of contract)')),
    ).toBe(true);
    expect(screen.getByText('Week 1')).toBeInTheDocument();
    expect(screen.getByText('Week 3')).toBeInTheDocument();
  });

  it('emits onChange with the typed value (parent holds state)', async () => {
    const user = userEvent.setup();

    function Harness() {
      const [draft, setDraft] = useState(blankDraft());
      return <ContractEditor value={draft} onChange={setDraft} />;
    }

    renderWithI18n(<Harness />);

    await user.type(screen.getByLabelText(/contract amount/i), '5000');

    expect(screen.getByLabelText(/contract amount/i)).toHaveValue(5000);
  });

  it('toggles a week approval when its checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithI18n(
      <ContractEditor
        value={{
          plannedLabor: '1000',
          contractUpfront: '',
          contractStartDate: '2026-05-01',
          contractWeeks: '2',
          approvedCheckpoints: [],
        }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: /approve week 1/i }));

    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(last.approvedCheckpoints).toEqual(['week_0']);
  });

  it('marks approved rows with an emerald highlight', () => {
    const { container } = renderWithI18n(
      <ContractEditor
        value={{
          plannedLabor: '1000',
          contractUpfront: '',
          contractStartDate: '2026-05-01',
          contractWeeks: '2',
          approvedCheckpoints: ['week_0'],
        }}
        onChange={vi.fn()}
      />,
    );
    const approvedRow = container.querySelector('li.bg-emerald-50\\/60');
    expect(approvedRow).not.toBeNull();
    expect(within(approvedRow as HTMLElement).getByText('Week 1')).toBeInTheDocument();
  });
});
