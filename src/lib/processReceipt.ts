import { useCallback } from 'react';
import { useApi } from './api';
import type { Expense, ExpenseKind } from './types';

/** Subset of fields that the AI extraction endpoint may return. Every field
 *  is optional — Claude may legitimately omit anything it can't read. */
export interface ExtractedExpenseFields {
  date?: string;
  amount?: number;
  payer?: string;
  payee?: string;
  description?: string;
  category?: string;
  currency?: string;
  kind?: ExpenseKind;
  fxRate?: number;
  fxRateDate?: string;
  fxRateSource?: string;
  linkedTo?: string | null;
}

export interface ProcessReceiptOk {
  fields: ExtractedExpenseFields;
  filename: string;
}

export interface ProcessReceiptDuplicate {
  duplicate: {
    type: 'exact-file';
    filename: string;
    expense: Expense;
  };
}

export type ProcessReceiptResponse = ProcessReceiptOk | ProcessReceiptDuplicate;

export function isDuplicateResponse(
  res: ProcessReceiptResponse,
): res is ProcessReceiptDuplicate {
  return 'duplicate' in res;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read file as data URL'));
        return;
      }
      // Strip the `data:<mime>;base64,` prefix; the server wants raw base64.
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/** Hook that posts a receipt to the existing AI extraction endpoint. The
 *  endpoint runs Claude server-side; this is just the client adapter. */
export function useProcessReceipt() {
  const api = useApi();
  return useCallback(
    async (slug: string, file: File): Promise<ProcessReceiptResponse> => {
      const contentBase64 = await fileToBase64(file);
      return api<ProcessReceiptResponse>(
        `/api/process-receipt?project=${encodeURIComponent(slug)}`,
        {
          method: 'POST',
          body: { originalName: file.name, contentBase64 },
        },
      );
    },
    [api],
  );
}
