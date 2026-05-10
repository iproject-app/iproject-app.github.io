import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// React Testing Library auto-cleans between Vitest tests in v15+, but the
// explicit hook is cheap insurance and makes the lifecycle obvious.
afterEach(() => {
  cleanup();
});
