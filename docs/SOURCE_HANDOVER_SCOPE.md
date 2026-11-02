# Source implementation supplied in dev.5

The requested continuation has added source for the previously listed feature groups. This is an implementation handover with verification deferred; source presence is not evidence of correct runtime behavior or complete production acceptance.

| Feature group | Added implementation |
|---|---|
| v3 migration and reconciliation | `packages/import-export/migration.ts`, `legacy.ts`: read-only inventory, type/status mapping, snapshot hashes, source tax/receivable/unapplied balances, stock opening proposals, original PDF matching/hash preservation, acceptance, cutover and opening reconciliation. History stays separate; original documents are not reposted or regenerated. |
| Google proposals and integrity | `packages/db/master-proposals.ts`, `packages/sync/google.ts`, `worker.ts`, desktop Google manager/screens: separate master proposal tab, validation/diff/baseline conflicts, explicit acceptance/rejection, paged periodic integrity, latest-version recovery with evidence. |
| Transport/export/compliance | `packages/core/logistics.ts`, model/validation/registry, editor and `template-v4-5.ts`: structured transport, vehicle/distance, shipping/export/e-way/IRN evidence; effective reviewed applicability; preserved older templates; operational metadata history. Official formats and legal configuration remain external inputs. |
| Inventory exceptions | `packages/db/stock-review.ts`: exact-draft and stock-baseline reviews, lot/FEFO override, below-cost warning/approval, configured unbatched negative-stock exception with explicit unit cost, settlement variance and chronological backdated purchase/issue replay using append-only value corrections. Expired lots remain blocked; batch-tracked negative stock is intentionally blocked. |
| Editor and catalogue | Additional field registry entries/state indicators, manual-source locks and reset, tax category/inclusive controls, transport evidence, full existing print toggles, correction/receipt controls, catalogue editing/archive, search/favorites and documented keyboard controls. |
| Reports and daily close | Customer/supplier aging, collections, HSN, purchase-tax/return evidence, stock/expiry, sales/margin, detail views, statements and module CSV/XLSX/JSON/PDF exports. Close includes refunds/noncash, unapplied receipts, credit sales, stock exceptions and ledger reconciliation. Historical reports use currently revised books; close snapshots retain what was submitted. |
| Workbook imports | Row differences, duplicate IDs/SKUs/references, revision/overlap/header checks, stale-preview guard, atomic import, separate illustrative examples. |
| Diagnostics/recovery | `packages/db/health.ts`, `recovery.ts`, file actions: integrity/hash/numbering/backup/sync findings with impact/action, previewed failed-job retry and PDF-original/rebuild recovery, backup before applying, evidence preservation and audit. Financial histories are never repaired by deleting rows. |
| PC handover | Setup/start/check/package scripts; source-only ZIP with documentation, deferred-QA status, SHA-256 manifest and no runtime data or credentials. |

## Deferred by agreement

Strict typecheck/full compilation, updated coverage and unit/integration/security/recovery tests, actual app execution, screenshots/PDF inspection, Windows installer/portable construction and validation, real external-service access and configuration, legal/CA/owner acceptance and production/publishing decisions. No new pass claims are made for these.

The app remains TEST-only. Unknown defects may be found in the PC pass; this package is not a production release. The full original plans remain included and govern acceptance.

See ../qa/SOURCE_AUDIT-dev.5.md for the follow-up audit, corrections and exact verification limits. Register filters/details, shared purchase charge normalization, line ITC review, registry consolidation and stale-restore protections were strengthened after the original handover.
