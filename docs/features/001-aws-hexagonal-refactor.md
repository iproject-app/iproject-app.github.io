# 001 · Hexagonal refactor of `server.py`

## Value delivered

Pull the domain logic out of the HTTP+filesystem driver so the same code
can run unchanged behind either Lambda+S3 or the existing
HTTPServer+filesystem. No user-visible change; this is the structural
prerequisite that makes the AWS migration possible without rewriting the
business rules. Also makes the existing code dramatically easier to unit
test.

## Acceptance criteria

- A new `iproject_core/` package (or equivalent) contains pure functions
  for: `list_projects`, `load_data`, `save_data`, `process_receipt`,
  `fetch_fx_rate`, plus the helpers for `collect_receipt_refs`,
  `trash_receipt`, `save_upload`, `find_expense_by_receipt`,
  `normalize_contact_name`, `open_bills_summary`. None of these import
  `pathlib.Path`-as-storage or `BaseHTTPRequestHandler`.
- Two adapters live alongside:
  - **Storage**: `FilesystemStorage` (current behaviour) + a `Storage`
    protocol with the methods the core needs (`get_project_data`,
    `put_project_data`, `list_projects`, `put_receipt`, `get_receipt`,
    `trash_receipt`).
  - **AI**: `AnthropicClient` wrapping `call_anthropic_extract`. Same
    shape will work in Lambda.
- `server.py` becomes a thin driver that wires `FilesystemStorage` +
  `AnthropicClient` into the core and routes HTTP requests.
- Existing tests + `make run` behavior preserved.
- `pytest` (or whatever test runner) covers the core with at least one
  test per public function — drives off in-memory storage fakes.

## Dependencies

None — this is the unblocker for stories 002–004.

## Implementation notes

- Suggested layout:

  ```
  iproject/
    iproject_core/
      __init__.py
      data.py          # load_data, save_data, list_projects, schemas
      receipts.py      # save_upload, trash, find_by_receipt, collect_refs
      contacts.py      # normalize_contact_name
      bills.py         # open_bills_summary
      ai.py            # AI client interface + Anthropic impl
      fx.py            # fetch_fx_rate (+ cache abstraction)
      storage.py       # Storage protocol + FilesystemStorage
    server.py          # HTTP driver — uses iproject_core
    tests/
      test_core.py     # pure-function tests, no HTTP, no real FS
  ```

- The Storage protocol uses bytes/str in/out — never `Path`. That keeps
  the S3 adapter from later having to fake `Path` semantics.
- FX cache stays a simple TTL cache; abstraction is a `FXCache` protocol
  with `get(date, from, to)` / `set(...)`.
- `pytest` + `pytest-mock` is the lightest stack; adopt as the test
  framework now and add a `make test` target.

## Risk

Low. This is a refactor that preserves behaviour. Add tests first against
the existing functions, then move the code, then re-run the tests.
