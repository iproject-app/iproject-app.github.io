import { afterEach, describe, expect, it, vi } from 'vitest';
import { isAuthDisabled } from './authDisabled';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isAuthDisabled', () => {
  it('is false by default — secure unless explicitly disabled', () => {
    expect(isAuthDisabled()).toBe(false);
  });

  it('is true when VITE_AUTH_DISABLED=true', () => {
    vi.stubEnv('VITE_AUTH_DISABLED', 'true');
    expect(isAuthDisabled()).toBe(true);
  });

  it('is true in E2E mode (VITE_E2E=true)', () => {
    vi.stubEnv('VITE_E2E', 'true');
    expect(isAuthDisabled()).toBe(true);
  });

  it('treats any value other than the string "true" as not disabled', () => {
    vi.stubEnv('VITE_AUTH_DISABLED', '1');
    expect(isAuthDisabled()).toBe(false);
  });
});
