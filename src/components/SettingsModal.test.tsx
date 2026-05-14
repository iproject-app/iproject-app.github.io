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

  it('opens on the General tab and shows project name + slug', () => {
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
    expect(screen.getByRole('tab', { name: /General/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByLabelText(/project name/i)).toHaveValue('Back Wall');
    const slug = screen.getByLabelText(/url slug/i) as HTMLInputElement;
    expect(slug).toHaveValue('back-wall');
    expect(slug).toHaveAttribute('readonly');
  });

  it('shows the contacts manager when the Contacts tab is selected', async () => {
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
    await user.click(screen.getByRole('tab', { name: /^Contacts$/ }));
    expect(screen.getByText(/no contacts yet/i)).toBeInTheDocument();
  });

  it('calls onRename then onSave when the project name changes', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn().mockResolvedValue(undefined);
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    renderWithI18n(
      <SettingsModal
        open
        data={buildData()}
        saving={false}
        onSave={onSave}
        onRename={onRename}
        onClose={onClose}
      />,
    );

    await user.clear(screen.getByLabelText(/project name/i));
    await user.type(screen.getByLabelText(/project name/i), 'Back Wall v2');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onRename).toHaveBeenCalledWith('Back Wall v2');
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].name).toBe('Back Wall v2');
    // onRename must have completed before onSave fired.
    expect(onRename.mock.invocationCallOrder[0]).toBeLessThan(
      onSave.mock.invocationCallOrder[0],
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('skips onRename when the project name is unchanged', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithI18n(
      <SettingsModal
        open
        data={buildData()}
        saving={false}
        onSave={onSave}
        onRename={onRename}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onRename).not.toHaveBeenCalled();
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('surfaces a rename error and does not call onSave', async () => {
    const user = userEvent.setup();
    const onRename = vi
      .fn()
      .mockRejectedValue(new Error('Request failed: 409'));
    const onSave = vi.fn();
    renderWithI18n(
      <SettingsModal
        open
        data={buildData()}
        saving={false}
        onSave={onSave}
        onRename={onRename}
        onClose={vi.fn()}
      />,
    );

    await user.clear(screen.getByLabelText(/project name/i));
    await user.type(screen.getByLabelText(/project name/i), 'Something Else');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/409/);
    expect(onSave).not.toHaveBeenCalled();
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

    await user.click(screen.getByRole('tab', { name: /^Contract$/ }));

    expect(screen.getByLabelText(/contract amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Number of weeks/i)).toBeInTheDocument();
    expect(screen.queryByText(/no contacts yet/i)).not.toBeInTheDocument();
  });

  it('saves contract fields entered in the Contract tab', async () => {
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

    await user.click(screen.getByRole('tab', { name: /^Contract$/ }));
    await user.type(screen.getByLabelText(/contract amount/i), '15800');
    await user.type(screen.getByLabelText(/upfront payment/i), '2000');
    await user.clear(screen.getByLabelText(/start date/i));
    await user.type(screen.getByLabelText(/start date/i), '2026-05-01');
    await user.type(screen.getByLabelText(/^Number of weeks/i), '3');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const next = onSave.mock.calls[0][0];
    expect(next.plannedLabor).toBe(15800);
    expect(next.contractUpfront).toBe(2000);
    expect(next.contractStartDate).toBe('2026-05-01');
    expect(next.contractWeeks).toBe(3);
    expect(onClose).toHaveBeenCalled();
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

    await user.click(screen.getByRole('tab', { name: /^Contacts$/ }));
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
    expect(screen.getByRole('tab', { name: /^Geral$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Contatos/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Contrato$/ })).toBeInTheDocument();
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

  it('hides the delete-project section when no onDelete is provided', () => {
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
      screen.queryByRole('button', { name: /^delete project$/i }),
    ).not.toBeInTheDocument();
  });

  it('requires a second click to confirm before calling onDelete', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    renderWithI18n(
      <SettingsModal
        open
        data={buildData()}
        saving={false}
        onSave={vi.fn()}
        onDelete={onDelete}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^delete project$/i }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(
      screen.getByText(/delete this project\? this hides/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^yes, delete$/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('lets the user back out of the confirm step', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderWithI18n(
      <SettingsModal
        open
        data={buildData()}
        saving={false}
        onSave={vi.fn()}
        onDelete={onDelete}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^delete project$/i }));
    // Two cancel buttons exist (modal footer + delete confirm). Click the one
    // next to the "Yes, delete" button.
    const yesBtn = screen.getByRole('button', { name: /^yes, delete$/i });
    const cancelBtn = yesBtn.parentElement!.querySelector(
      'button[type="button"]:not([class*="rose-600"])',
    );
    await user.click(cancelBtn as HTMLElement);

    expect(onDelete).not.toHaveBeenCalled();
    // Back to the initial delete button.
    expect(
      screen.getByRole('button', { name: /^delete project$/i }),
    ).toBeInTheDocument();
  });

  it('surfaces an error and returns to the initial state if onDelete rejects', async () => {
    const user = userEvent.setup();
    const onDelete = vi
      .fn()
      .mockRejectedValue(new Error('Request failed: 500'));
    renderWithI18n(
      <SettingsModal
        open
        data={buildData()}
        saving={false}
        onSave={vi.fn()}
        onDelete={onDelete}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^delete project$/i }));
    await user.click(screen.getByRole('button', { name: /^yes, delete$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/500/);
    // After failure, the user can try again.
    expect(
      screen.getByRole('button', { name: /^delete project$/i }),
    ).toBeInTheDocument();
  });
});
