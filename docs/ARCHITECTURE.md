# Architecture and boundaries

Separate local project `/workspace/invoice-studio-4`, application ID `in.ExampleBrand.invoicestudio4`, data root InvoiceStudio4Data, explicit Test subroot. v3 source stays under `/workspace/reference/invoice-studio-3.01`; no migration in place. No remote attached to v4.

Target Electron/TypeScript/Preact/Vite with context isolation, renderer sandbox and no Node access. Renderer submits allowlisted schema-validated commands; main owns authenticated sessions and checks every permission. Business services run on canonical decimal-string inputs and SQLite transactions. Main accepts no renderer-provided role or filesystem path.

Authoritative schema: masters + effective configuration; versioned drafts; immutable issue snapshots; separate series and idempotency commands; append-only customer/supplier/stock movements; immutable audit; durable PDF/sync jobs; file manifest, backups, locks and approvals. Money stored as integer paise; quantities/rates decimal strings. Calculations use Decimal.js. FY/date based on user-entered date; timestamps UTC and display Asia/Kolkata.

Issue: validate session/config/period/version/references inside BEGIN IMMEDIATE, calculate, allocate, snapshot/hash, ledger/stock/audit/outbox, COMMIT. Post-commit PDF writes through staged file and manifest; failures leave recoverable jobs. Retry key returns same result, mismatched key payload rejects. Financial snapshot update/delete prevented by SQLite triggers.

Backup uses SQLite online backup API, checksum plus integrity/invariants; restore verifies into a new TEST location before any controlled switch. Live root and cutover remain unavailable pending owner/CA gates. No production migration or tax filing during development.

Offline dependency constraint: code and Node24 SQLite/decimal tests can be prepared without npm. Full Electron/Vite build, strict typecheck and renderer tests remain BLOCKED until dependencies are available. Node's native TypeScript execution is a runtime test, not a substitute for strict TypeScript checking or Electron verification.
