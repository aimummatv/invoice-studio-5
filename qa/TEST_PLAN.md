# Test plan

Run offline Node TypeScript tests for decimal goldens, validation, issue atomicity, optimistic versions, idempotency collisions, SQLite immutability, actual child-process exit at transaction boundaries, outbox recovery, backups/restores and permission bypass. Test all values using deterministic synthetic fixtures. Keep TAP/log output.

Electron Playwright: canonical form/preview editing and undo/redo, issue confirmation, issued read-only, register/ledger/stock/close, empty/error/offline/restricted states, navigation/keyboard and settings. Same fixture must reconcile DOM, SQLite snapshot and PDF. Browser-only evidence is explicitly insufficient for desktop acceptance.

PDF: 50+ lines and long descriptions, repeat headers, totals/signature no overlap, rendered images visually inspected, overlays absent, snapshot totals match extracted text. Capture before/after at 1920×1080, 1366×768, 1280×720 and minimum size, 100%/125% scaling.

Security: session timeout/rate-limited salted PIN, all backend permissions, forged renderer fields, path traversal, export formula injection, navigation, approval/lock exceptions. Financial/inventory/ledger movements append-only.

Recovery/performance: online SQLite backup, corrupt checksums/schema/invariants, restore new location, duplicate sync/timeouts/429/revocation, 10k invoices timings, disk full/query-only/locks, migration failure. Windows installer/portable install-upgrade-uninstall data preservation and spare-PC recovery required separately.

External gates: real Google service/least privilege, official GST utilities and CA fixtures, owner migration/production/publish approval. Simulations do not satisfy these gates.
