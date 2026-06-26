/** Whether the Auth0 login gate should be bypassed.
 *
 *  Two build-time triggers, both default-off (secure by default — auth is on
 *  unless a flag is explicitly set to the string 'true'):
 *
 *  - VITE_E2E: Playwright drives the UI without a real Auth0 session.
 *  - VITE_AUTH_DISABLED: deployment flag for auth-free environments (e.g. a
 *    local Kubernetes cluster). Pairs with the backend's IPROJECT_AUTH_DISABLED.
 *
 *  Because Vite inlines env at build time, toggling this requires a rebuild.
 */
export function isAuthDisabled(): boolean {
  return (
    import.meta.env.VITE_E2E === 'true' ||
    import.meta.env.VITE_AUTH_DISABLED === 'true'
  );
}
