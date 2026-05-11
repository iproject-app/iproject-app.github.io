import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsModal } from './SettingsModal';
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

describe('SettingsModal', () => {
  it('renders nothing user-facing when closed', () => {
    renderWithI18n(
      <SettingsModal
        open={false}
        data={buildData()}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('heading', { name: /project settings/i }),
    ).not.toBeInTheDocument();
  });

  it('opens on the Contacts tab and shows the contacts manager', () => {
    renderWithI18n(
      <SettingsModal
        open
        data={buildData()}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('heading', { name: /project settings/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Contacts/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText(/no contacts yet/i)).toBeInTheDocument();
  });

  it('switches to the Contracts tab and shows the placeholder', async () => {
    const user = userEvent.setup();
    renderWithI18n(
      <SettingsModal
        open
        data={buildData()}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('tab', { name: /Contracts/ }));

    expect(screen.getByText(/upload contract documents here/i)).toBeVisible();
    expect(screen.queryByText(/no contacts yet/i)).not.toBeInTheDocument();
  });

  it('switches to the Plans tab and shows the placeholder', async () => {
    const user = userEvent.setup();
    renderWithI18n(
      <SettingsModal
        open
        data={buildData()}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('tab', { name: /Plans/ }));

    expect(
      screen.getByText(/architectural drawings, photos of progress/i),
    ).toBeVisible();
  });

  it('saves edited contacts and closes', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    renderWithI18n(
      <SettingsModal
        open
        data={buildData()}
        saving={false}
        onSave={onSave}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: /add contact/i }));
    await user.type(screen.getByLabelText(/^Name/i), 'Sandra');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const next = onSave.mock.calls[0][0] as ProjectData;
    expect(next.contacts).toEqual([
      expect.objectContaining({ name: 'Sandra' }),
    ]);
    expect(onClose).toHaveBeenCalled();
  });

  it('cancel calls onClose without saving', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onClose = vi.fn();
    renderWithI18n(
      <SettingsModal
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

  it('localizes the heading and tabs in Portuguese', () => {
    renderWithI18n(
      <SettingsModal
        open
        data={buildData()}
        saving={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
      { language: 'pt' },
    );
    expect(
      screen.getByRole('heading', { name: /configurações do projeto/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Contatos/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Contratos/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Plantas/ })).toBeInTheDocument();
  });

  it('surfaces a save error', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error('Request failed: 500'));
    renderWithI18n(
      <SettingsModal
        open
        data={buildData()}
        saving={false}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/500/);
  });
});
