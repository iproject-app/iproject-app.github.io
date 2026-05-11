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

/** Informational duplicate hint the server attaches when extracted fields
 *  match an existing expense. Not blocking — `fields` + `filename` are still
 *  populated and the client should proceed normally. */
export interface SameFieldsDuplicate {
  type: 'same-fields';
  expense: Expense;
}

/** Blocking duplicate path the server uses when the exact-bytes file is
 *  already attached to an existing expense. No `fields` / top-level
 *  `filename` is returned in this case; the caller should reuse the existing
 *  canonical filename instead of overwriting form values. */
export interface ExactFileDuplicate {
  type: 'exact-file';
  filename: string;
  expense: Expense;
}

export interface ProcessReceiptOk {
  fields: ExtractedExpenseFields;
  filename: string;
  /** Optional informational hint; never blocks. May also be `null`. */
  duplicate?: SameFieldsDuplicate | null;
  model?: string;
  usage?: unknown;
}

export interface ProcessReceiptExactFileDuplicate {
  duplicate: ExactFileDuplicate;
}

export type ProcessReceiptResponse =
  | ProcessReceiptOk
  | ProcessReceiptExactFileDuplicate;

/** Discriminate the exact-file (blocking) path from the regular success path.
 *  The server signals it by returning a `duplicate` object with
 *  `type === 'exact-file'` and *no* top-level `filename`. */
export function isDuplicateResponse(
  res: ProcessReceiptResponse,
): res is ProcessReceiptExactFileDuplicate {
  if ('filename' in res && typeof res.filename === 'string') return false;
  const dup = (res as ProcessReceiptExactFileDuplicate).duplicate;
  return (
    dup != null &&
    typeof dup === 'object' &&
    'type' in dup &&
    dup.type === 'exact-file'
  );
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
