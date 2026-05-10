# iproject.app

Static React SPA hosted on GitHub Pages, fronted by Cloudflare DNS, with
Auth0 for authentication. Backend will be served from k8s.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 (mobile-first)
- React Router v6
- `@auth0/auth0-react` for authentication
- GitHub Actions deploys to Pages on push to `main`

## Local development

```bash
npm install
cp .env.example .env.local   # fill in Auth0 + API values
npm run dev
```

Without Auth0 env vars set, the app runs unguarded so the UI is still
inspectable. Production builds require the variables.

## Deployment

GitHub Actions builds and deploys to GitHub Pages on push to `main`.
Required setup:

1. **Repo Settings → Pages → Source**: GitHub Actions.
2. **Repo Settings → Secrets and variables → Actions → Variables**:
   - `AUTH0_DOMAIN`
   - `AUTH0_CLIENT_ID`
   - `AUTH0_AUDIENCE` (optional)
   - `API_BASE_URL` (e.g. `https://api.iproject.app`)
3. **Custom domain**: `public/CNAME` already contains `iproject.app`.
   Configure DNS in Cloudflare:
   - `iproject.app` → CNAME (or ALIAS) to `iproject-app.github.io`
   - GitHub Pages will issue a TLS cert once DNS verifies.
   - Cloudflare proxy mode: orange cloud is fine; set SSL/TLS mode to
     **Full (strict)** so it doesn't loop.

## Routing on Pages

Client-side routing uses a `404.html` redirect trick so deep links survive
a hard refresh. See `public/404.html` and the decoder script in
`index.html`.

## Backend

The API client lives in `src/lib/api.ts`. It reads `VITE_API_BASE_URL`
and attaches the Auth0 access token. When the k8s backend is ready, set
`API_BASE_URL` in Actions Variables and call:

```ts
const api = useApi();
const projects = await api<Project[]>('/projects');
```
