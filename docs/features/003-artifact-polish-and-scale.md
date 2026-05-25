# 003 · Artifact polish & scale

## Value delivered

Plans and progress reports stay usable once a project accumulates *many*
of them. After this slice: thumbnail grids instead of flat lists,
titles/captions you can edit, drag-reorder for plans, and one-tap
"take a photo" capture for progress updates on a phone. A project with
40 receipts-worth of plans and a year of weekly progress photos is
navigable, not a wall of filenames.

This is the sophistication slice — pure UX and a thin metadata layer on
top of 001/002. No new storage or auth concepts.

## Acceptance criteria

- Thumbnails: image/PDF artifacts render as a thumbnail grid. Thumbnails
  generated server-side on upload (small JPEG next to the original) or
  lazily on first request; cached on the PVC. Falls back to a type icon
  when a thumbnail can't be made.
- Editable metadata: a plan's `title` and a progress report's `note` can
  be edited in place after upload (`POST .../<id-or-file>/update`).
- Plan ordering: owner can drag-reorder plans; order persisted (an
  `order` field in the plan JSONB entry). Progress stays date-ordered
  (chronology isn't user-reorderable — it's the point).
- Mobile capture: the progress "add photo" input uses
  `accept="image/*" capture="environment"` so phones open the camera
  directly. Verified on iOS Safari + Android Chrome.
- Bilingual strings for all new affordances. Vitest covers the reorder
  reducer, the edit-metadata hooks, and thumbnail-fallback rendering;
  pytest covers thumbnail generation + the update endpoints.

## Dependencies

- 001 and 002 — this polishes both. No value on its own without them.

## Implementation notes

- Thumbnails: prefer generate-on-upload (predictable latency, one code
  path). `Pillow` is the obvious dep for images; for PDFs render page 1
  via `pdf2image`/`pymupdf`. If adding a backend dep is unwanted, lazy
  on-request generation with a PVC cache is the fallback — decide at
  implementation, flag the dependency either way (new-dependency gate).
- Reorder is a client concern persisted as an integer `order` on each
  plan JSONB entry; server just stores what it's given. No new table.
- Mobile capture is a one-attribute change on the existing file input —
  cheapest item here, ship it even if thumbnails slip.
- Keep this slice droppable: 001+002 deliver the feature; 003 makes it
  pleasant at scale. If priorities shift, 003 can wait without leaving
  anything half-built.

## Risk

Low. Additive UX + a metadata field. The only judgement call is the
thumbnail-generation dependency, which is a confirm-before-adding gate.
