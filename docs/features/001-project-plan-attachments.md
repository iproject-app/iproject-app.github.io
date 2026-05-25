# 001 · Project plan attachments

## Value delivered

An owner can attach the documents that describe *what is being built* —
architectural drawings, sketches, scope PDFs, permit images — to a
**project** (not to an expense), then open or remove them later. After
this slice, a project has a "Plans" section: drop a file in, see it in a
list, click to view it inline, delete it.

This is the foundation slice. It establishes the project-scoped
blob-storage + reference pattern that progress reports (002) and any
later contractor view reuse. It mirrors the existing receipt pattern, so
risk is low and the code path is well-trodden.

## Acceptance criteria

- Backend (`iproject` repo):
  - Plan blobs stored on the existing data PVC at
    `projects/<slug>/plans/`, filenames canonicalized the same way
    receipts are (no caller-controlled paths; reject `..`, `/`, leading
    `.`).
  - Plan references persisted in Postgres as a `plans` JSONB column on
    `projects` (`[{file, title, content_type, added_at}, ...]`).
    Consistent with how `custom_categories` / `approved_checkpoints`
    already live as JSONB on the project row.
  - Endpoints, all behind the existing Auth0 JWT gate:
    - `POST   /api/projects/<slug>/plans` — multipart/base64 upload,
      optional `title`; returns the stored ref.
    - `GET    /api/projects/<slug>/plans` — list, newest first.
    - `GET    /plans/<file>?project=<slug>` — serve bytes with correct
      content-type; same path-traversal guards as `/receipts/`.
    - `POST   /api/projects/<slug>/plans/<file>/delete` — soft-delete
      (move to `projects/<slug>/plans/.trash/`, drop the JSONB entry).
  - pytest covers: upload→list round-trip, path-traversal rejection,
    delete removes the reference and trashes the file, unauthorized
    request is 401.
- Frontend (`iproject-app.github.io` repo):
  - A "Plans" section on the project view: drag-drop upload (reuse the
    receipt-drop UX), a list with title + type + date, click-to-view in
    the existing inline viewer (PDF and image), two-step delete.
  - `useProjectPlans` hook (list/upload/delete) following the existing
    `projectAdmin` hook patterns.
  - EN + PT strings for every new label. Vitest for the hook + the
    section component (empty state, upload, delete-confirm, error).

## Dependencies

None — this is the foundation. Note (not a blocker): plans add more
irreplaceable blobs to a PVC that is **still not backed up** (`iproject`
repo stories 002 pg_dump / 003 receipts→object storage). Flagging so the
backup work is scheduled alongside, not after a data loss.

## Implementation notes

- Reuse, don't reinvent: `save_upload` / `build_canonical_filename` /
  the `_handle_get_receipt` traversal guards in `server.py` are the
  template. A plan is just a receipt attached at project scope instead
  of expense scope.
- Decision (made, not deferred): plan refs as JSONB on `projects`, not a
  new table. The list is small and bounded per project; a table is
  overkill and a JSONB column matches the existing project-row shape.
  Progress reports (002) *do* get a table because they're an unbounded
  time series — different shape, different choice.
- Serving route is a sibling of `/receipts/` (`/plans/`) so the
  auth + content-type + traversal logic is copy-adapted, not redesigned.
- Security: same posture as receipts — JWT-gated, server-generated
  filenames, traversal-guarded, soft-delete to `.trash/`. No new attack
  surface beyond "another file type at project scope."

## Risk

Low. Behaviour-preserving extension of an existing, tested pattern.
