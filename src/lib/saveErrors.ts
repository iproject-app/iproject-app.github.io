import { ApiError } from './api';

export type SaveError = 'conflict' | 'invalid' | 'unauthorized' | 'forbidden' | 'failed';

export function saveErrorKind(error: unknown): SaveError {
  if (error instanceof ApiError) {
    if (error.status === 409 || error.status === 428) return 'conflict';
    if (error.status === 400) return 'invalid';
    if (error.status === 401) return 'unauthorized';
    if (error.status === 403) return 'forbidden';
  }
  if (
    typeof error === 'object' && error !== null && 'error' in error &&
    (error.error === 'login_required' || error.error === 'consent_required')
  ) {
    return 'unauthorized';
  }
  return 'failed';
}

export function requiresReload(kind: SaveError | null) {
  return kind === 'conflict' || kind === 'invalid';
}
