# Version 3.0.1 source audit

Reference: aimummatv/Invoice-Studio, main commit `9d3537a8188ad03c7186ab721596d5a3a0e394ab`. Retrieved through read-only GitHub connector. No remote changes made. Exact per-file Git blob verification is in V3_SOURCE_MANIFEST.json. Logo PNG is not retrieved; fonts, icon and workbook are retrieved.

## Architecture observed in source

- Electron 45, CommonJS main/preload; renderer is vanilla JavaScript with string-generated HTML, Tailwind and custom CSS. No Preact, Vite or TypeScript. Decimal.js 10.6, ExcelJS 4.4, JSZip 3.10. Playwright-core dev harness; Electron builder installer and portable targets.
- `desktop/store.cjs`: Node SQLite, WAL, FULL sync, foreign keys, schema v1, optimistic revisions, issue transaction, immutable-by-service snapshots, payment allocation, stock movements, backup API and restore probe. Main-process serialized write queue.
- `desktop/main.cjs`: isolated/sandboxed BrowserWindow, local protocol, IPC handler wrapper, PDF Chromium print, user-selected storage, backup-before-write, external navigation controls. `desktop/preload.cjs`: allowlisted bridge methods. Role/session permissions are absent.
- `shared/core.js`: six document types; decimal quantities/rates to six places, paise storage, line half-up CGST/SGST/IGST/cess, inclusive pricing, charge allocation, financial-year rollover, GSTIN checksum, provisional classification suggestions, due dates and reports.
- `shared/invoice-view.js` and `css/invoice.css`: shared preview/print template, A4, green brand header, billed/shipped blocks, tax/HSN tables, settlement, words, bank/QR, terms/signature. `js/studio.js`: six-step editor, draggable preview width, customer/product lookup, themes, preset toggles, undo, catalogues, payments/register/report dialogs.
- Profile includes specimen contact/bank/tax data. v4 must start TEST-only with clearly fictitious fixtures and empty production configuration. Transport presets contain invented driver/vehicle details; do not carry them into v4 defaults.

## Defects and differences requiring changes

1. `autoSyncCatalogueAndParties` silently changes customer addresses, tax/rate fields and product prices during save/issue; failures are swallowed as console warnings. v4 must use explicit master-data confirmation and provenance locks.
2. `finalise` returns an already-finalised document by ID but has no explicit command idempotency key or durable PDF/sync outbox. Optimistic check occurs before BEGIN. v4 must check version, permission, locks and number allocation inside one transaction.
3. Snapshot immutability is application-enforced; add SQLite triggers and append-only financial/audit constraints in v4.
4. There are no granular roles, salted PIN sessions, approvals, daily closing, purchases/supplier ledger, full batch/FEFO valuation, Google integration or filing workflow in inspected source. Do not equate README claims with tested behavior.
5. Item preview is rendered text, with no cell editors; manual customer/product entry can overwrite fields. v4 needs one draft command/undo model for both editors.
6. `AUDIT.md` describes the older pre-desktop source, not all current 3.0.1 behavior. Retain it as historical evidence only.
7. `roundOff` passes through a nonnegative decimal parser despite UI description suggesting signed adjustment; v4 needs explicit signed policy tests.

## Actual verification

`node --test --test-isolation=none --test-reporter=tap .../core.test.cjs .../store.test.cjs`: 21 passed, 0 failed. Recovery/workbook suites cannot load ExcelJS; recorded initial failure log is retained. No claim that these suites passed. Source files were not changed to make baseline tests pass.

Browser launch attempted with Python Playwright and installed Chromium. It exits with SIGTRAP / crashpad `setsockopt: Operation not permitted`. No screenshot produced or visually inspected. Electron is not installed; npm download is permission-blocked. Windows install/portable behavior, v3 GUI, PDF appearance, binary assets and documented workflows are unverified. Source/asset references are explicitly limited evidence.
