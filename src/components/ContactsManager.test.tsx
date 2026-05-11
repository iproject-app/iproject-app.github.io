import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ContactsManager,
  contactToDraft,
  draftsToContacts,
  type ContactDraft,
} from './ContactsManager';
import type { Contact } from '../lib/types';
import { renderWithI18n } from '../test/helpers';

describe('contactToDraft / draftsToContacts', () => {
  it('round-trips a contact through draft → contact', () => {
    const c: Contact = {
      id: 'c1',
      name: 'Francisco',
      role: 'manager',
      aliases: ['Fran', 'Pancho'],
    };
    const draft = contactToDraft(c);
    expect(draft.aliases).toBe('Fran, Pancho');
    expect(draftsToContacts([draft])).toEqual([c]);
  });

  it('parses aliases case-insensitively, trims, and dedupes', () => {
    const draft: ContactDraft = {
      id: 'c1',
      name: 'Joe',
      role: '',
      aliases: '  Joey , joey, JOEY, Jose  ',
    };
    expect(draftsToContacts([draft])).toEqual([
      { id: 'c1', name: 'Joe', aliases: ['Joey', 'Jose'] },
    ]);
  });

  it('drops drafts whose name is left blank', () => {
    const drafts: ContactDraft[] = [
      { id: 'c1', name: '', role: '', aliases: 'x' },
      { id: 'c2', name: 'Real', role: '', aliases: '' },
    ];
    expect(draftsToContacts(drafts)).toEqual([{ id: 'c2', name: 'Real' }]);
  });

  it('omits role and aliases when both are empty after trim', () => {
    expect(
      draftsToContacts([
        { id: 'c1', name: 'Joe', role: '  ', aliases: '  ' },
      ]),
    ).toEqual([{ id: 'c1', name: 'Joe' }]);
  });
});

describe('ContactsManager (UI)', () => {
  it('renders an empty-state message when the value is empty', () => {
    renderWithI18n(<ContactsManager value={[]} onChange={vi.fn()} />);
    expect(screen.getByText(/no contacts yet/i)).toBeInTheDocument();
  });

  it('shows the prefilled fields for each draft', () => {
    const drafts: ContactDraft[] = [
      {
        id: 'c1',
        name: 'Francisco',
        role: 'contractor',
        aliases: 'Pancho, Fran',
      },
    ];
    renderWithI18n(<ContactsManager value={drafts} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('Francisco')).toBeInTheDocument();
    expect(screen.getByDisplayValue('contractor')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pancho, Fran')).toBeInTheDocument();
  });

  it('emits onChange with an added blank draft when Add is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithI18n(<ContactsManager value={[]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /add contact/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as ContactDraft[];
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ name: '', role: '', aliases: '' });
  });

  it('emits onChange when a field is edited', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const drafts: ContactDraft[] = [
      { id: 'c1', name: 'Joe', role: '', aliases: '' },
    ];
    renderWithI18n(<ContactsManager value={drafts} onChange={onChange} />);

    await user.type(screen.getByLabelText(/^Role/), 'X');

    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(last[0].role).toBe('X');
  });

  it('emits onChange with the draft removed when Delete is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const drafts: ContactDraft[] = [
      { id: 'c1', name: 'Drop me', role: '', aliases: '' },
    ];
    renderWithI18n(<ContactsManager value={drafts} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /delete contact/i }));

    expect(onChange).toHaveBeenCalledWith([]);
  });
});
