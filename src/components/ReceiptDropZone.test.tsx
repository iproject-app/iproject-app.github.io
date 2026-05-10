import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReceiptDropZone } from './ReceiptDropZone';
import { renderWithI18n } from '../test/helpers';

const makeFile = (name = 'r.jpg') =>
  new File(['bytes'], name, { type: 'image/jpeg' });

describe('ReceiptDropZone', () => {
  it('renders the idle prompt and AI hint when state is idle', () => {
    renderWithI18n(
      <ReceiptDropZone state={{ kind: 'idle' }} onFile={vi.fn()} />,
    );
    expect(
      screen.getByRole('button', { name: /drop a receipt here/i }),
    ).toBeVisible();
    expect(screen.getByText(/AI will extract/i)).toBeVisible();
  });

  it('shows a processing message with the filename', () => {
    renderWithI18n(
      <ReceiptDropZone
        state={{ kind: 'processing', filename: 'pix.jpg' }}
        onFile={vi.fn()}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/reading receipt/i);
    expect(screen.getByText('pix.jpg')).toBeVisible();
  });

  it('shows the attached state with the canonical filename', () => {
    renderWithI18n(
      <ReceiptDropZone
        state={{ kind: 'attached', filename: 'final.jpg' }}
        onFile={vi.fn()}
      />,
    );
    expect(screen.getByText(/Attached: final\.jpg/)).toBeVisible();
    expect(screen.queryByText(/already attached/i)).not.toBeInTheDocument();
  });

  it('flags duplicates in the attached state', () => {
    renderWithI18n(
      <ReceiptDropZone
        state={{
          kind: 'attached',
          filename: 'final.jpg',
          duplicate: true,
        }}
        onFile={vi.fn()}
      />,
    );
    expect(screen.getByText(/already attached to another entry/i)).toBeVisible();
  });

  it('shows the error message and the prefix when state is error', () => {
    renderWithI18n(
      <ReceiptDropZone
        state={{ kind: 'error', message: 'Bad image' }}
        onFile={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/bad image/i);
  });

  it('calls onFile when a file is selected via the input', async () => {
    const user = userEvent.setup();
    const onFile = vi.fn();
    const { container } = renderWithI18n(
      <ReceiptDropZone state={{ kind: 'idle' }} onFile={onFile} />,
    );

    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    await user.upload(input, makeFile('snap.jpg'));

    expect(onFile).toHaveBeenCalledTimes(1);
    expect(onFile.mock.calls[0][0]).toBeInstanceOf(File);
    expect((onFile.mock.calls[0][0] as File).name).toBe('snap.jpg');
  });
});
