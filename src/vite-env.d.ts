/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH0_DOMAIN: string;
  readonly VITE_AUTH0_CLIENT_ID: string;
  readonly VITE_AUTH0_AUDIENCE?: string;
  readonly VITE_API_BASE_URL?: string;
  /** Build-time deployment flag. When 'true', the SPA skips the Auth0 login
   *  gate entirely (for auth-free environments like a local cluster). Pair
   *  with the backend's IPROJECT_AUTH_DISABLED. Default (unset) = auth on. */
  readonly VITE_AUTH_DISABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
