import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// React Testing Library auto-cleans between Vitest tests in v15+, but the
// explicit hook is cheap insurance and makes the lifecycle obvious.
afterEach(() => {
  cleanup();
});

// jsdom doesn't implement HTMLDialogElement.showModal/close. Polyfill the
// minimum so tests for components that use <dialog> can drive the open state.
if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '');
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  }
}
