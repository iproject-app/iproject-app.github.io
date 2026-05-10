import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactsModal } from './ContactsModal';
import type { Contact, ProjectData } from '../lib/types';
import { renderWithI18n } from '../test/helpers';

const buildData = (contacts: Contact[] = []): ProjectData => ({
  slug: 'back-wall',
  name: 'Back Wall',
  currency: 'BRL',
  customCategories: [],
  contacts,
  expenses: [],
});

describe('ContactsModal', () => {
  it('renders nothing user-facing when closed', () => {
    renderWithI18n(
      <ContactsModal
        open={false}
        data={buildData()}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('heading', { name: 'Contacts' }),
    ).not.toBeInTheDocument();
  });

  it('shows the empty-state message when there are no contacts', () => {
    renderWithI18n(
      <ContactsModal
        open
        data={buildData([])}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText(/no contacts yet/i)).toBeInTheDocument();
  });

  it('lists existing contacts with name/role/aliases prefilled', () => {
    const contact: Contact = {
      id: 'c1',
      name: 'Francisco Alvaro',
      role: 'general contractor',
      aliases: ['Francisco', 'Alvaro'],
    };
    renderWithI18n(
      <ContactsModal
        open
        data={buildData([contact])}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue('Francisco Alvaro')).toBeInTheDocument();
    expect(screen.getByDisplayValue('general contractor')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Francisco, Alvaro')).toBeInTheDocument();
  });

  it('adds a new contact row and saves it on submit', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    renderWithI18n(
      <ContactsModal
        open
        data={buildData()}
        saving={false}
        onSave={onSave}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: /add contact/i }));
    // The new row is the only set of name/role/aliases inputs.
    await user.type(screen.getByLabelText(/^Name/i), 'Sandra');
    await user.type(screen.getByLabelText(/^Role/i), 'site manager');
    await user.type(screen.getByLabelText(/^Aliases/i), 'Dona Sandra, Mrs. Sandra');

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const next = onSave.mock.calls[0][0] as ProjectData;
    expect(next.contacts).toHaveLength(1);
    expect(next.contacts[0]).toMatchObject({
      name: 'Sandra',
      role: 'site manager',
      aliases: ['Dona Sandra', 'Mrs. Sandra'],
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('parses aliases as comma-separated, trimmed, and case-insensitively deduped', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithI18n(
      <ContactsModal
        open
        data={buildData()}
        saving={false}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /add contact/i }));
    await user.type(screen.getByLabelText(/^Name/i), 'Joe');
    await user.type(
      screen.getByLabelText(/^Aliases/i),
      '  Joey , joey, JOEY, Jose  ',
    );
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    const next = onSave.mock.calls[0][0] as ProjectData;
    expect(next.contacts[0].aliases).toEqual(['Joey', 'Jose']);
  });

  it('removes a contact row and persists the deletion', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const contact: Contact = { id: 'c1', name: 'Will Delete' };
    renderWithI18n(
      <ContactsModal
        open
        data={buildData([contact])}
        saving={false}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /delete contact/i }));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const next = onSave.mock.calls[0][0] as ProjectData;
    expect(next.contacts).toEqual([]);
  });

  it('drops draft rows whose name is left blank', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithI18n(
      <ContactsModal
        open
        data={buildData()}
        saving={false}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /add contact/i }));
    // Don't fill anything in.
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const next = onSave.mock.calls[0][0] as ProjectData;
    expect(next.contacts).toEqual([]);
  });

  it('cancel calls onClose without saving', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onClose = vi.fn();
    renderWithI18n(
      <ContactsModal
        open
        data={buildData()}
        saving={false}
        onSave={onSave}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('renders the Portuguese heading when language is pt', () => {
    renderWithI18n(
      <ContactsModal
        open
        data={buildData()}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
      { language: 'pt' },
    );
    expect(
      screen.getByRole('heading', { name: 'Contatos' }),
    ).toBeInTheDocument();
  });

  it('surfaces a save error from onSave', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error('Request failed: 500'));
    renderWithI18n(
      <ContactsModal
        open
        data={buildData()}
        saving={false}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /add contact/i }));
    await user.type(screen.getByLabelText(/^Name/i), 'Will Fail');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/500/);
  });

  // Silences the unused-import warning on `within` for now; reserved in case
  // we add tests that need to scope queries inside a single contact row.
  it('exports a value usable with within() scoping', () => {
    expect(typeof within).toBe('function');
  });
});
