# 002 · Project progress reports (photo timeline)

## Value delivered

An owner can post a dated progress update — one or many photos plus an
optional note — and review a project's progress **chronologically**.
After this slice, a project has a "Progress" timeline: newest entry
first, each entry showing its date, note, and photo(s) in a lightbox.

This is the capability that makes the app useful *during* execution, not
just for accounting after the fact. It's also the data a contractor view
would later write into, so the shape matters.

## Acceptance criteria

- Backend (`iproject` repo):
  - New `progress_reports` table: `id PK, project_slug FK → projects.slug,
    created_at timestamptz, note text, photos JSONB (list of stored
    filenames)`. A table, not JSONB-on-project — this is an unbounded,
    queryable time series (see 001's note on the deliberate split).
  - Photo blobs on the PVC at `projects/<slug>/progress/`, canonicalized
    and traversal-guarded exactly as receipts/plans.
  - Endpoints behind the Auth0 JWT gate:
    - `POST   /api/projects/<slug>/progress` — note + 1..N photos in one
      request; creates one report row.
    - `GET    /api/projects/<slug>/progress` — list, `created_at DESC`.
    - `GET    /progress/<file>?project=<slug>` — serve bytes.
    - `POST   /api/projects/<slug>/progress/<id>/delete` — soft-delete
      the report (trash its photos, delete the row).
  - pytest covers: multi-photo create, descending order, delete cascades
    photos to `.trash/`, traversal rejection, 401 unauthorized.
- Frontend (`iproject-app.github.io` repo):
  - A "Progress" section/tab on the project view: a vertical timeline,
    newest first; each entry = date, note, photo grid; click a photo →
    lightbox with next/prev.
  - "Add update" flow: note field + multi-file picker (reuse the
    receipt-drop component, allow multiple), one submit = one entry.
  - Two-step delete per entry.
  - `useProgressReports` hook (list/create/delete). EN + PT strings.
  - Vitest: hook (create/list/delete), timeline component (empty state,
    multi-photo entry, ordering, delete-confirm, error path).

## Dependencies

- 001 — reuses the project-scoped blob upload/serve/trash pattern that
  001 establishes. Not a hard code dependency, but building 002 first
  would mean inventing that pattern here instead, so order is 001 → 002.

## Implementation notes

- The only genuinely new shape vs 001 is **multi-file-per-entry** and a
  **table instead of JSONB**. Everything else (storage path, canonical
  names, traversal guard, serve route, soft-delete) is the 001 pattern.
- One report = one row + N photo files. Keep the write transactional:
  store all photos, then insert the row referencing them; on partial
  failure, trash what was written so there are no orphan blobs.
- Timeline ordering is server-side (`ORDER BY created_at DESC`) so the
  client stays dumb. `created_at` defaults to now() but accept an
  optional client-supplied date (back-dating a missed update is a real
  use case).
- Security: identical posture to 001 — JWT-gated, server-named files,
  traversal-guarded, soft-delete. No new surface.

## Risk

Low–medium. The multi-file upload and the lightbox/timeline UI are the
only parts not already proven by the receipt/plan paths.
