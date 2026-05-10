import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { ReceiptViewer } from './ReceiptViewer';
import { renderWithI18n } from '../test/helpers';

interface ReceiptUrlState {
  url: string | null;
  contentType: string | null;
  loading: boolean;
  error: string | null;
}

const useReceiptUrlMock = vi.fn<(...args: unknown[]) => ReceiptUrlState>(() => ({
  url: null,
  contentType: null,
  loading: true,
  error: null,
}));

vi.mock('../lib/useReceiptUrl', () => ({
  useReceiptUrl: (...args: unknown[]) => useReceiptUrlMock(...args),
}));

beforeEach(() => {
  useReceiptUrlMock.mockReset();
});

describe('ReceiptViewer', () => {
  it('shows the loading state', async () => {
    useReceiptUrlMock.mockReturnValue({
      url: null,
      contentType: null,
      loading: true,
      error: null,
    });
    renderWithI18n(<ReceiptViewer filename="r.jpg" slug="back-wall" />);
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/loading receipt/i),
    );
  });

  it('renders the image as figure with download link on success', async () => {
    useReceiptUrlMock.mockReturnValue({
      url: 'blob:test/1',
      contentType: 'image/jpeg',
      loading: false,
      error: null,
    });
    renderWithI18n(<ReceiptViewer filename="r.jpg" slug="back-wall" />);

    await waitFor(() => {
      const img = screen.getByAltText('r.jpg') as HTMLImageElement;
      expect(img).toBeInTheDocument();
      expect(img.src).toBe('blob:test/1');
    });
    // The "open original" link points at the same blob URL.
    const links = screen.getAllByRole('link');
    expect(links.some((a) => (a as HTMLAnchorElement).href === 'blob:test/1')).toBe(
      true,
    );
  });

  it('falls back to a PDF link for application/pdf', async () => {
    useReceiptUrlMock.mockReturnValue({
      url: 'blob:test/2',
      contentType: 'application/pdf',
      loading: false,
      error: null,
    });
    renderWithI18n(<ReceiptViewer filename="r.pdf" slug="back-wall" />);

    await waitFor(() => {
      expect(screen.queryByAltText('r.pdf')).not.toBeInTheDocument();
      expect(screen.getByText(/open the attached pdf/i)).toBeVisible();
    });
  });

  it('infers PDF from filename when content-type is missing', async () => {
    useReceiptUrlMock.mockReturnValue({
      url: 'blob:test/3',
      contentType: null,
      loading: false,
      error: null,
    });
    renderWithI18n(<ReceiptViewer filename="r.PDF" slug="back-wall" />);

    expect(screen.getByText(/open the attached pdf/i)).toBeVisible();
  });

  it('shows an error message on failure', async () => {
    useReceiptUrlMock.mockReturnValue({
      url: null,
      contentType: null,
      loading: false,
      error: 'Receipt request failed: 404',
    });
    renderWithI18n(<ReceiptViewer filename="missing.jpg" slug="back-wall" />);
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/404/),
    );
  });
});
