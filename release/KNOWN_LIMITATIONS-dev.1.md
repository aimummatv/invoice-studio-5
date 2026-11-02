# Known limitations — development checkpoint

This checkpoint is **not a completed application or release candidate**. No M0–M10 full acceptance gate has passed. Implementing independently testable services while M0 tooling is blocked does not advance milestone acceptance.

## Environment blockers

- Workspace Git/npm networking denied; an Android-accessible approval control was not available. No further request is pending or being retried.
- Electron, Preact, Vite, TypeScript compiler, ExcelJS and Playwright-core dependencies are not installed. No lockfile or dependency audit. Build and strict typecheck cannot run.
- Installed Chromium exits SIGTRAP because sandbox denies crashpad setsockopt. No screenshots or visual inspections exist. Python Playwright availability does not resolve that restriction.
- Linux x64 only; no Windows installer/portable launch, install/upgrade/uninstall or spare-PC recovery validation.

## Required implementation still pending

- Full typed field registry, autosave and draft reopening, complete settings panels, keyboard palette/lookups, accessible modal focus management, min-size/scaling testing and polished error/loading/restricted states.
- All preview-edit fields/presets, date editing, real UPI QR/static upload, amount-in-words and full appearance toggle/print parity. Long and 50-line calculations tested, actual PDF pagination not verified.
- Guided credit/debit/challan conversion, advance cancellation, refunds, TDS, write-offs/settlement discounts, complete payment allocation/reconciliation UI, statements and full reports/register filters/details.
- Configurable granular permissions/policy thresholds, approvals/exception workflow, lock amendments, user/session management UI and comprehensive misuse coverage.
- Purchase returns, supplier allocations/statements, stocktake/adjustments, negative/FEFO exceptions, attachments, costing/return edge cases and full stock/margin/reorder/expiry reports. Backdated stock postings currently block pending reviewed costing policy.
- Full effective-dated tax classifications, GST tracker persistence/UI, GSTR-2B import UX, complete CA pack, versioned official GSTR/e-way exports and correction/amendment workflow.
- Versioned XLSX import/export/templates, full master-data diff/approval workflow and spreadsheet security/recovery tests. CSV escaping helper alone is not XLSX support.
- Real Google OAuth/OS-protected credentials, least-privilege/ownership proof, Sheets/Drive adapters, full manifest/file integrity recovery UI, viewer decision and account-independent backups. Worker tests use an in-memory adapter only.
- Scheduled backup/retention/encryption, complete document-file backup/restore, guided relocation/restore, update pre-migration backup orchestration and disk-full/file-lock/fault matrix. Current schema is initial development version only.
- Full v3 mapping/import/reconciliation of copied real datasets/PDFs, migration acceptance, pilot and release packages. Dry-run never imports or approves cutover.

## External gates

Business and CA decisions are unapproved: profile/GSTIN, schemes/categories, rounding/notes/numbering/cancellations, statutory fields, IRN/e-way applicability, filing schemas/dates/tolerances. Official utilities untested. Google credentials, independent destination/key custody and Windows test hardware unavailable. Owner must approve migration and production separately from publishing.

No real business data used. Nothing has been published. The original v3 repository is unchanged.
