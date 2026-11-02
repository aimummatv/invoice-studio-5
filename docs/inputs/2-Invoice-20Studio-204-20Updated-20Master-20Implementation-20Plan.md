# Invoice Studio 4 — Updated Master Implementation Plan

**Version:** 4.0 implementation specification, revision 2
**Prepared:** 28 October 2026
**Business:** Example Brand
**Audience:** Claude Code / Codex / implementation engineers, business owner, GST chartered accountant
**Status:** Build specification, subject to explicit business and CA sign-off at gates below

> **Mission:** Deliver a reliable, offline-first Windows GST invoicing and business operations application for one issuing PC, with remote owner visibility through Google Sheets/Drive. Keep Invoice Studio v3 intact. Implement the original master plan **and** the twelve recommended improvements. Never trade accounting correctness, recoverability or security for visual polish.

## 0. Instructions to the coding agent — read first

1. **Inspect before modifying:** Inventory the v3 source, data shapes, sample PDFs, tax calculations, dependencies, tests, and migration constraints. Do not modify v3 or its database. Create a separate `Invoice-Studio-4` repository, application identity, storage path and installer.
2. **Work in small milestones:** For each milestone produce (a) architecture/DB changes, (b) working feature, (c) automated tests, (d) manual verification steps, (e) migration/recovery implications, and (f) a concise completion report. Stop at the specified acceptance gate; do not claim unrun tests passed.
3. **No invented business or tax assumptions:** Maintain an `OPEN_DECISIONS.md` with questions, defaults explicitly marked provisional, owner approvals, CA sign-offs, and effective dates. Do not silently guess invoice format, legal tax classifications, due dates, thresholds, or required fields.
4. **No live business writes during development:** Use synthetic fixtures and an isolated TEST database with visibly watermarked documents and separate numbering. Live data import must read a **copy** of v3 and requires preview/approval.
5. **Make financial operations deterministic:** Decimal arithmetic only; no JavaScript floating-point for money or tax. All financial outputs must be reproducible from immutable inputs and a versioned ruleset.
6. **Protect credentials and private data:** Never commit Google keys, customer data, real invoices, database backups, or `.env` secrets. Restrict access and scrub sensitive data from logs and diagnostics.
7. **Provide usable deliverables:** Installer, portable distribution, user guide, recovery guide, CA validation pack, tests, changelog, and signed-off acceptance matrix. If an external credential or CA decision is unavailable, finish all offline-testable work and mark the dependent gate BLOCKED, not DONE.
8. **Preserve original UX intent:** Single-page editor, v3-style PDF preview, red/amber/green field feedback, two-way preview editing, toggle rail, themes, and keyboard speed. Implement sophisticated preview interactions only after issue/restore correctness is proven.
9. **No destructive shortcuts:** Never delete issued financial records or reuse an allocated/issued document number to make a sequence look continuous. Keep append-only corrections and complete audit trails.
10. **Change control:** Update this specification's requirement IDs, migration notes, tests and release notes whenever implementation differs. Do not expand scope into v4.1 features without owner approval.

## 1. Product scope and immutable decisions

### 1.1 Product

A standalone Windows application supporting tax invoices, bill of supply, proforma, delivery challan, advance receipts, credit/debit notes, customer payments, purchases, inventory/batches, supplier payments, GST preparation and monthly tracking. Employee uses the main PC; owner monitors via a read-only Google Sheet/browser or restricted Viewer application. Fully functional offline; cloud sync is optional and never a dependency for issuing.

### 1.2 Technology

- **Desktop:** Electron, TypeScript, Preact, Vite; strict TypeScript; schema validation at IPC boundary; context isolation, sandboxed renderer, minimal allowlisted IPC, no renderer Node access; restrict external navigation.
- **Storage:** Local SQLite, foreign keys, WAL where appropriate, transactional writes, indexed queries, versioned migrations. Do not share the live SQLite file over a network drive or across multiple active writers.
- **Math:** Use a proven decimal library and explicit currency rounding policy. Persist money as integer minor units where feasible or canonical decimal strings; rates/quantities with documented precision. Never use binary floats for authoritative amounts.
- **Exports:** PDF from a single canonical issued snapshot; Excel/XLSX for human review/import, CSV where useful; versioned GST/e-way formats. Excel is **not** the transactional datastore.
- **Google:** Drive and Sheets as optional backup/visibility services. Sync jobs durable in SQLite, idempotent and retried. Source of truth is local database. Owner edits to approved master-data sheets are proposed imports, never direct edits to financial ledgers.
- **Distribution:** Windows installer and portable package with independent application data directory. Portable does not imply database portability without a controlled backup/restore procedure.
- **v3:** Must remain unmodified; import from read-only copy with reconciliation and explicit owner acceptance.

### 1.3 Non-goals for v4.0

No OCR/AI supplier scanning (v4.1), multi-PC concurrent issuance, direct GST portal filing, automatic WhatsApp API messaging, IRN generation, multi-GSTIN/branch consolidation, or unrestricted Google Sheet editing. If IRN/e-invoicing legally applies to the business, **block live rollout of affected invoice workflows** until a compliant external process or integration is agreed with the CA.

## 2. Required folder structure and operational boundaries

Use an application-managed data root, separate from installed binaries, e.g. under a user-selected secured local path. Display the chosen path in Settings. Proposed structure:

```text
InvoiceStudio4Data/
  Data/invoice-studio.sqlite
  Bills/<FY>/<month>/
  Purchases/<FY>/<month>/
  Imports/  Exports/  CA-Packs/
  Backups/local/  Logs/  Diagnostics/
  Test/                 # separate database, numbering, settings, files
```

Do not copy an active WAL database using raw file copying. Use SQLite online backup API or a verified checkpoint/snapshot procedure. If the data root is moved, use a guided, verified relocation workflow that closes writers, checks integrity and reopens safely. Backups should also exist in an **independent second location**, not solely under the same drive or Google account.

## 3. Domain model and database contract

### 3.1 Core entities (minimum)

- `business_profile`: legal name, GSTIN, PAN, address/state, invoice footer, bank/UPI, print presets, effective configuration versions.
- `users`, `roles`, `permissions`, `approval_policies`, `approval_events`, `sessions`.
- `customers`, `customer_addresses`, `customer_price_rules`, `credit_terms`, `customer_opening_balances`.
- `suppliers`, `supplier_addresses`, `supplier_opening_balances`.
- `products`, `product_units`, `product_pack_conversions`, `product_prices`, `product_tax_classifications`, `product_reorder_rules`.
- `documents` (draft/issued/cancelled plus document type), `document_lines`, `document_snapshot`, `document_series`, `number_reservations_or_issue_events`, `document_links` (credit/debit/return references), `document_files`.
- `payments`, `payment_allocations`, `unapplied_receipts`, `adjustments`, `refunds`, `supplier_payments`, `supplier_payment_allocations`.
- `purchase_documents`, `purchase_lines`, `itc_classifications`, `gstr2b_imports`, `gstr2b_matches`.
- `stock_movements`, `stock_lots`, `stock_reservations_if_needed`, `stock_counts`, `stock_adjustments`, `cost_layers_or_weighted_average_snapshots`.
- `gst_rule_versions`, `gst_return_periods`, `gst_export_runs`, `gst_reconciliations`, `period_locks`.
- `audit_events`, `sync_outbox`, `sync_remote_links`, `sync_manifest`, `backup_catalog`, `diagnostic_runs`, `import_jobs`, `import_errors`.

### 3.2 Schema invariants

- Use stable UUID/ULID-style internal identifiers; invoice display numbers are separate business identifiers.
- Use unique constraints for document type + financial year + series + issued number; also idempotency keys for issue and sync commands.
- Foreign keys and CHECK constraints for valid status transitions and nonnegative quantities where applicable. Negative stock is a **controlled policy**, not an accidental database error.
- Issued financial snapshots are immutable. Correction is a linked new financial event/document; permissible operational metadata updates are separately versioned and audited.
- Financial and stock movements are append-only, with compensating entries for reversal. Store original and reversal references.
- Track UTC timestamps plus the business timezone (`Asia/Kolkata`) for displayed dates and FY/month boundaries; preserve the user-entered invoice date independently of the issue timestamp.
- Every calculation stores rule/version metadata and input provenance. Preserve historical snapshots when product price, GST rate or address later changes.
- Add schema migrations with `up` steps, compatibility checks, automatic pre-migration backups and explicit rollback-by-restore instructions. Do not promise arbitrary database downgrade.

### 3.3 Financial calculation policy

- Define and test precision for quantity, unit rate, line discount, taxable base, CGST/SGST/IGST/cess, invoice total, inclusive-price reverse calculation, freight/packing, round-off and payment balance.
- Rounding order (per line vs aggregate), treatment of negative credit-note amounts, and GST rate effective date must be reviewed by CA and locked into fixtures.
- Never use formatted UI strings as calculation inputs; parse `1,000`, `.5` and Indian number formats explicitly and reject ambiguous invalid input.
- Define signed tax components and the reconciliation invariant: taxable + applicable tax + non-tax charges + round-off = issued total, under the approved rounding policy.
- Provide golden fixtures covering mixed GST rates, intra/interstate, exemptions, nil-rated, reverse-charge cases where relevant, freight, discounts, returns, inclusive pricing, TDS, partial payments and at least 50 lines.

## 4. Invoice issue lifecycle — critical safety requirement

### 4.1 State machine

`DRAFT -> VALIDATED -> ISSUED`, with separate `CANCELLED/REVERSED` semantics subject to document type, time and CA policy. A failed issuance attempt must have a discoverable recoverable state, not an invisible half-issued record.

### 4.2 Atomic issuance algorithm

1. Renderer sends `issueDocument(draftId, expectedDraftVersion, idempotencyKey)` through validated IPC.
2. Main process checks role, approval thresholds, lock period, business configuration, customer/product references, tax rules and duplicate warning acknowledgments.
3. In **one SQLite transaction**, check optimistic version, compute deterministic totals, allocate the next series number, persist the immutable issued snapshot and hashes, post the required accounting/stock movements, append audit event, and enqueue PDF/sync outbox jobs. Commit once.
4. **After commit**, generate the PDF from the saved snapshot using a deterministic renderer. Write to temporary file, flush/close, rename atomically, hash and register file; retry safely if interrupted.
5. Background sync consumes the outbox; it never blocks issuance. Display PDF pending/failed status and provide retry/rebuild from snapshot.
6. Repeated command with the same idempotency key returns the same issued document. Never allocate a new number on retry.

**Power-loss tests:** crash before commit, after commit before PDF, during PDF write, after PDF before Google sync, and during sync. On restart, there must be exactly one issued document, one number, consistent stock/accounting effects and recoverable PDF/sync jobs. Keep a durable issue-attempt/event log; never silently reuse a number already committed. Numbering gaps are **flagged and explained**, not forcibly filled.

### 4.3 PDF integrity and documents

Store immutable normalized data snapshot, template version, rule version, PDF SHA-256, output path, creation time and print/reprint events. Regeneration should use the original snapshot/template version; if exact binary reproduction is impossible, preserve the original PDF and report the difference. Reprints marked `Duplicate copy` when required by the approved document policy. Non-tax operational metadata amendments must not rewrite the issued financial snapshot or original PDF without explicit versioning.

## 5. UI and daily billing experience

### 5.1 Layout

Keep the original single-page layout: left navigation (Home, New, Register, Customers, Products, Purchases, Payments, GST Filing, Reports, Data); center scrollable form (buyer/supply, items, charges/payment, collapsible transport/bank/terms/advanced dates); right v3-look live preview; toggle rail; top document tabs, missing-fields pill, Undo, Save Draft, Issue; bottom backup/sync status. Narrow widths use preview tab. Light/dark themes, density options, visible focus, keyboard accessibility and high contrast.

### 5.2 Field registry

One typed field registry drives form labels, requiredness by document type, validators, auto-fill provenance, tooltip/example, red/amber/green/grey states, preview editors and export mappings. Required invalid fields disable Issue and can be navigated from the missing-fields pill. Never assume a visual green status proves legal compliance; CA-required checks remain separate.

### 5.3 Auto-fill

- GSTIN: syntax/checksum, state code and PAN extraction; **do not infer place of supply solely from GSTIN**. Place-of-supply selection must account for transaction context and CA-approved rules.
- Customer: bill-to/ship-to, terms, price history, balance and credit warning.
- Product: SKU, HSN, effective GST classification, unit/pack, pricing priority (customer-specific > last accepted > list), available stock and owner-only margin.
- Dates/terms: due date, FY and tentative next number (clearly **preview only**, actual number allocated atomically on Issue).
- Offline pincode table: suggested city/state, editable and validated.
- Any manual edit locks the field against auto-recalculation until Reset to Auto. Catalogue updates require explicit confirmation.

### 5.4 Edit in preview and display toggles

Phase A: dates, notes, terms, quantity and rate; Phase B: addresses, ship-to, HSN, discounts, freight, transport, etc. Both editors operate on one draft state and one undo/redo stack. Calculated fields remain read-only; round-off has controlled policy. Issued documents are read-only. Edit outlines must never print. Toggle rail includes Logo, QR, Bank, Terms, HSN, Ship-to, Transport, Batch/Expiry, Discount, Cases, Amount in Words, Signature, Balance/Advance. Required statutory fields cannot be hidden when relevant; confirm which are legally required with CA rather than hardcoding assumptions. Presets: Simple, Detailed, Transport, custom.

### 5.5 Keyboard-first operations

Provide configurable or documented shortcuts: New Invoice, customer lookup, product lookup, add line, Save Draft, Preview, Issue (with explicit confirmation), command palette `Ctrl+K`, undo/redo, focus next required field. Search by SKU, product substring, customer name, GSTIN, invoice number; support keyboard selection and recent/favorite items. Measure a common known-customer bill end-to-end and optimize without bypassing validation.

### 5.6 Payment QR and dashboard

Allow generated UPI QR for a specific amount and uploaded static QR (no guaranteed amount). Validate UPI configuration, display payee/amount before issuing, and don't equate QR display with confirmed payment. Dashboard: today's sales, paid/unpaid, overdue, low stock, GST month status, last successful backup and sync queue/last sync/errors, with links to source records.

## 6. Customers, payments and daily closing

### 6.1 Customer ledger

Support opening balance (audited import), invoice receivables, advances, unapplied receipts, credit balances, partial payments, one receipt allocated across multiple invoices, refunds, TDS, settlement discounts and bad-debt write-offs as distinct event types. Never silently treat a short payment as paid in full. Recompute outstanding from posted ledger entries, not editable summary cells. Provide customer statement PDF and 30/60/90+ aging; define aging from due date and distinguish overdue vs outstanding.

### 6.2 Payment entry

Record date, mode (cash, UPI, bank, cheque, other), reference, payer, gross received, allocations, TDS and adjustments. Prevent allocation above available unapplied amount without explicit permitted adjustment. Duplicate-reference warnings, reversal with reason, period-lock checks, approval for write-offs. Allow bank/UPI reconciliation against manually imported statement data in a later subphase of v4.0; require preview, matching rules and owner review before posting.

### 6.3 Daily close (new mandatory workflow)

One-click daily closing screen: issued/cancelled/credited invoices, gross/net sales, tax components, cash/UPI/bank receipts, customer credit sales, refunds, adjustments, stock exceptions and opening/closing outstanding. Show transaction-level drilldown, unreconciled items and discrepancies. Staff submits a closing report; Owner can approve or request correction. Closing is an audited snapshot with version/reopen reason, not an irreversible replacement for the underlying ledger. Mirror approved summary to Google Sheets.

## 7. Products, purchases, stock and profitability

### 7.1 Catalogue

Fields: SKU unique within business, name, optional barcode, HSN, effective-dated GST category/rate, MRP, list price, customer price rules, purchase cost, base unit, sale unit, pack/case conversions, reorder level, stock-tracked flag, batch/expiry flag, active/archive state. Example conversion: `1 case = 24 pieces`; **all stock ledger quantities use base units**. Validate fractional pieces/cases and conversion precision.

### 7.2 Purchases and payables

Purchase bill number/date, supplier/GSTIN, tax lines, charges, payment terms, supplier balance and attached original file. On posting, create payable and stock-receipt movements atomically. Track ITC as eligible/blocked/pending verification with reason and effective period; GSTR-2B import matches supplier GSTIN, invoice number/date, taxable and tax components with reviewable tolerance/normalization. Do not automatically claim ITC solely because a supplier bill exists.

### 7.3 Stock movement ledger (mandatory)

Every change is an immutable event: purchase receipt, sale issue, sales return, purchase return, sample/free issue, damage, expiry, physical count correction, transfer (if later enabled), and reversal. Each event includes product, base quantity, optional batch/expiry, source document, timestamp, actor, reason and cost basis. Stock-on-hand is a derived balance; never edit a balance directly. Corrections append reversing/adjustment events.

- FEFO suggests earliest-expiring eligible lot; allow documented override and trace the selected batch.
- Negative stock policy per product/global: warn or block. Owner override requires reason and audit.
- Weighted-average cost (or explicitly selected costing policy) must handle returns, backdated postings, zero stock and adjustments deterministically. Distinguish gross margin from net profit; avoid calling stock-cost margin a full profit measure.
- Reorder alerts, near-expiry, expired-stock blocking where applicable, valuation by date, product/customer margin reports, purchase suggestions and stocktake variance report.
- **Invariant:** beginning stock + posted receipts - posted issues + posted adjustments = ending stock, per SKU/batch and base unit; all entries trace to source or approved manual adjustment.

## 8. GST Filing Center and compliance gates

Monthly GSTR-1/GSTR-3B tracker with status, filing date/ARN, tax split, ITC, cash/credit ledger usage, interest/late fees, book-vs-filed variance and readiness checklist. GSTR-1 exports include applicable B2B/B2C, notes, exports, nil/exempt, HSN/UQC and document ranges; GSTR-3B screen/PDF and versioned JSON when validated; e-way bulk JSON only where legally applicable and after validating transporter/vehicle/address/distance fields. Generate CA pack (sales, purchases, HSN, payments, ITC, variance, exceptions).

**Compliance design:**

1. Store tax classifications, invoice/export schema versions, effective dates, and CA-approved applicability decisions; never hardcode current thresholds or filing dates as timeless constants.
2. Maintain a `tax_rule_version` on each issued document and `export_format_version` on each filing export.
3. Treat GSTIN-derived state as a hint; confirm place of supply, reverse charge, exempt/nil/non-GST and export/SEZ treatment through CA-approved rules.
4. After a month is filed, lock routine edits. **Do not assume all corrections must be booked as a next-month credit/debit note**; offer a reviewed amendment/correction workflow according to the applicable law and return type.
5. Test generated JSON in the **current official offline utility** and obtain CA sign-off before production filing; no claim of portal acceptance without an actual test.
6. If e-invoicing is applicable, require a compliant IRN workflow before live use for affected transactions. Direct IRN API is deferred, but compliance cannot be deferred by software scope.

## 9. Google sync, remote access and resilience

### 9.1 Minimal sync moved earlier

Build a narrow, secure, one-way invoice-register/daily-close Google mirror in the early usable release. Later extend to payments, outstanding, purchases, stock, GST tracker and activity log, plus Drive PDFs and backup archives. Cloud outage never blocks local issuance.

### 9.2 Authentication and least privilege

Do not place the same powerful service-account key on the issuing PC and a second viewer PC by default. Investigate Google Drive/Sheets permissions, service-account compatibility with the chosen Drive ownership/shared-drive arrangement, API quotas and backup retention **before** committing to authentication design. Preferred owner viewing is via Google Sheets/browser with owner account access; if a dedicated Viewer is required, use read-only permissions and separately scoped credentials. Store credentials with OS-backed protection and implement rotation/revocation. Never expose service credentials in logs or spreadsheet cells.

### 9.3 Durable outbox and idempotency

`sync_outbox` holds event ID, entity/version, target, payload hash, attempt count, next retry, state and remote ID. Retries with exponential backoff and jitter; offline queue survives restart. Use stable remote keys to update existing rows/files rather than duplicating. Provide per-item status and Sync Now; record last successful sync, queue age and errors. Owner-approved master-data changes in a Sheet enter an **import proposal** workflow with diff, validation, conflict resolution and audit, not automatic overwrite.

### 9.4 Integrity manifest and recovery

Maintain document ID/number, snapshot hash, PDF hash, local path, Drive file ID and Sheet row ID. Reconcile local DB, files and remote mirror on startup, after sync and daily; detect missing/modified/duplicate rows, renamed/moved/deleted Drive files, and changed PDFs. Treat a Drive rename as metadata change, not disappearance. Restore remote files from verified local originals or snapshots with owner authorization; preserve evidence and audit event. Never automatically overwrite a legitimate remote change without conflict reporting.

## 10. Backup, restore and disaster recovery — critical

- Automated SQLite-consistent backups: at minimum daily and before migrations/updates; consider more frequent snapshots according to owner-approved recovery-point target. Backups are versioned, checksummed, encrypted where feasible, and stored locally **and** in a physically/account-independent location. Cloud backup alone is not sufficient.
- Define **RPO** (maximum acceptable data loss) and **RTO** (maximum acceptable downtime) in `OPEN_DECISIONS.md` before pilot. Suggested starting targets for discussion: RPO <= 1 business day, RTO <= 4 business hours; these are not approved commitments.
- Use retention policy (e.g. daily/weekly/monthly) approved for business and compliance needs. Prevent backups from filling the system drive; alert on failed/old backups.
- Restore wizard: select backup, verify checksum and schema, restore into a **new location/test profile first**, run `PRAGMA integrity_check`, validate document/ledger/stock invariants, then perform controlled production switchover with rollback copy.
- Simulate complete PC loss: install on a spare Windows PC, restore from independent backup, reconfigure Google credentials, regenerate/reconcile missing PDFs, verify invoice numbering and issue a test document without duplicate numbers.
- BitLocker/device encryption and restricted Windows accounts are recommended because the local DB may contain plaintext personal/financial data. Secure backup encryption and key recovery must be documented separately.

## 11. Security, roles, approvals and audit

- Start with Owner and Staff role presets but implement **permission-level checks**: issue, cancel, credit/debit, payment entry/reversal, approve discount, view purchase cost/margin, edit tax configuration, import/export customer data, view diagnostics, restore backup, manage Google credentials, change locks.
- PINs are not plaintext; use salted slow password hashing with rate limits, session timeout, and reauthentication for high-risk actions. Windows filesystem access is a separate threat: document that application permissions do not secure a database against an OS administrator or someone who can copy the files.
- Approval policies configurable for discount %, below-cost sale, invoice value, cancellations, backdating and write-offs. Capture approver, reason, policy version and time.
- Append-only audit events include actor, action, entity, before/after **non-sensitive** summaries, device/time, reason and correlation ID. Consider tamper-evident chained hashes, but do not claim they prevent modification by a full OS administrator. Export a redacted audit report.
- Lock filed periods, with owner exception procedure and CA review when needed. Do not permit untracked mutation of an issued snapshot.

## 12. Imports, exports and v3 migration

### 12.1 Excel templates

Provide versioned XLSX templates and sample rows for Customers, Suppliers, Products, Price Lists, Opening Stock (including batch/expiry), Opening Customer/Supplier Balances, and Purchase Bills. All imports: parse -> validate -> normalize -> detect duplicates -> preview diffs -> approval -> atomic commit -> report row-level errors. Invalid rows do not partially corrupt live data; allow explicit all-or-nothing or documented batch semantics. Export mirrors include generation timestamp, source version and filters.

### 12.2 v3 migration

Read only a copied v3 dataset. Produce inventory of source fields and mapping report. Map customers, products, document types, numbers, payments, opening balances and historical PDFs where available. Preserve original invoice identifiers and snapshots, mark legacy records, and do not regenerate or overwrite historical PDFs unless approved. Reconcile counts, totals, tax splits, customer outstanding and opening stock; produce mismatch report and require owner sign-off. Run v3/v4 in parallel on isolated data and establish an explicit cutover date to avoid double-posting.

## 13. Diagnostics and repair center

Create Data Health screen with: SQLite integrity, schema version, failed migrations, missing/corrupt PDFs, snapshot/PDF hash mismatches, orphaned document links, numbering gaps, ledger out-of-balance, stock movement inconsistencies, old/failed backups, pending/failed sync jobs, stale Drive/Sheet manifest and blocked GST exports. Show severity, impact, last checked and next safe action. Repairs are previewed, permission-gated, audited, and backed up first. **Never** offer a one-click action that deletes or rewrites issued financial history. Export redacted diagnostic bundle for coding support.

## 14. Reports and register

Bill register newest first with number, issued date/time, customer, total, status (paid/part-paid/unpaid/overdue/cancelled), actor, local PDF, Sheet/Drive status; search number/name/GSTIN/amount, date/status/type/customer filters, totals for filtered set, XLSX export. Detail drawer: immutable issued preview, line/tax/payment summary, linked credit/debit docs, activity timeline, PDF location, print/duplicate/credit/payment/cancel actions gated by permissions. Reports: sales by date/customer/product, collections, outstanding aging, purchase/payables aging, stock valuation/movement, near expiry, gross margin, GST readiness, daily closing, audit and sync health. Report definitions and reconciliation formulas must be tested.

## 15. Milestones, dependency order and delivery gates

Durations are **estimates, not commitments**; prior estimate was ~5–6 months part-time and should be re-estimated after inspecting v3. A milestone is DONE only after tests, manual demo, migration impact, documentation and sign-off criteria are satisfied.

| ID | Stage | Deliverables | Hard acceptance gate |
|---|---|---|---|
| M0 | Discovery and repository | v3 read-only audit, data mapping, risks, decisions log, isolated v4 repo/app ID, build pipeline | v3 untouched; v4 installs beside v3; baseline tests catalogued |
| M1 | Core DB and safety | SQLite schema, decimal core, immutable snapshots, issue transaction, numbering/idempotency, test mode, audit, backup API | Crash-injection tests pass; one issued number and consistent ledger after retries |
| M2 | Usable billing | Profile, customers/products, single-page editor, validation registry, PDF v3 visual parity, QR, keyboard flow | Known-customer invoice created offline; PDF and snapshot reconcile |
| M3 | Early visibility and recovery | Minimal Sheets invoice/daily-close mirror, secure auth proof-of-concept, durable outbox, backup/restore UI | Issue offline, reconnect, exactly one mirrored row; full spare-PC restore demonstrated |
| M4 | Smart editing | GSTIN/customer/product auto-fill, provenance locks, preview edit phase A, toggle rail, presets | Manual fields never overwritten; print contains no editing overlays |
| M5 | Register, customer ledger and daily close | Register/detail, payments, advances, allocations, aging, daily close and owner review | Ledger totals match statements; close reconciles all payment modes |
| M6 | Security and controls | Granular roles, PIN hashing, approvals, period locks, duplicate/gap alerts, WhatsApp draft reminders | Unauthorized IPC calls denied; overrides audited; issued docs immutable |
| M7 | Purchases and inventory | Supplier bills/payables, pack conversions, stock movement ledger, lots/FEFO, cost/margin, stocktake, reorder | Purchases/sales/returns/reversals reconcile stock and valuation |
| M8 | GST and ITC | GSTR-2B import/match, GST month tracker, CA pack, versioned GSTR-1/3B and applicable e-way exports | CA signs off fixtures and exports in current official tools |
| M9 | Advanced sync and diagnostics | Drive PDFs/backups, full Sheet tabs, manifests, conflict/recovery UI, read-only viewer if required, health center | Delete/alter remote item, detect/recover safely; no duplicate uploads |
| M10 | Migration, pilot and release | v3 migration, parallel-run reconciliation, installer/portable, documentation, spare-PC restore, pilot | Owner signs cutover; CA signs tax; pilot shows no unresolved critical defects |

**Release gates:**

- **Alpha (after M3):** Reliable offline invoicing, PDF, local restore, basic owner monitoring. Test mode/pilot only until tax and migration gates are satisfied.
- **Beta (after M7):** Daily operational workflow, payments, purchasing and stock. Parallel-run with v3; not automatically authorized for live filing.
- **Stable (after M10):** CA-approved GST exports, verified migration, backup recovery, production security, documented operational support.

**Scope rule:** If timing is tight, defer advanced preview-edit phase B, command-palette polish or Viewer app before deferring atomic issue, ledger reconciliation, backup restore, or CA validation.

## 16. Test strategy — mandatory matrix

### 16.1 Automated

- Unit/property tests: decimal arithmetic, round-off, tax classification, effective-dated rules, HSN/UQC, case conversions, outstanding allocation, weighted-average costing, aging and period boundaries.
- Integration tests: issue transaction, optimistic version conflicts, retry/idempotency, payments, returns, purchase receipts, stock movements, period lock, import atomicity, backup/restore, sync outbox.
- UI E2E (Playwright/Electron appropriate harness): form registry statuses, tooltip, keyboard-only flow, auto-lock, preview/form sync, undo/redo, issued read-only, print/PDF toggles, roles and approval prompts.
- Crash/fault injection: power-loss simulation at each issue boundary; disk full, file locked, bad PDF renderer, corrupt import, lost network, 429/rate-limit, revoked Google credentials, duplicate remote rows, failed migration.
- Performance: 10,000+ generated invoices with indexed register search, large customers/products, 50+ line invoice, stock reports and bounded memory use. Record actual latency targets before optimizing.
- Security: malicious renderer IPC payload, path traversal in export names, CSV/XLSX formula injection, external URL navigation, secrets in logs, unauthorized permission checks, local data directory permissions.

### 16.2 Reconciliation assertions

1. Sum of issued invoice components equals canonical total under approved rounding policy.
2. Customer outstanding = posted receivables - allocated receipts - approved credits/adjustments + approved reversals (with explicit sign conventions).
3. Supplier payable reconciles purchases and payments.
4. Stock closing = opening + movements per SKU/base unit/batch.
5. Each issued number has exactly one committed issued snapshot; cancellations/voids are recorded, not erased.
6. Every successful Google mirror record links to one local source ID; sync retries do not duplicate it.
7. A restored backup passes DB integrity, numbering, PDF manifest, customer balances and stock checks.
8. GST exports reconcile to approved books for the chosen filing period and rule version.

### 16.3 Manual sign-off

Employee tests a full day: create drafts, issue, print, collect cash/UPI, handle partial payment, process return, receive stock, close day and recover from offline mode. Owner tests monitoring, approval, backup restore and audit. CA tests invoices, GST classification, returns/amendments and official offline utility import. Record evidence/screenshots, date, build ID, failures and signatory.

## 17. Required project artifacts and code organization

Suggested repository:

```text
Invoice-Studio-4/
  apps/desktop/               # Electron main, preload, renderer
  packages/core/              # pure tax/money/document/stock rules
  packages/db/                # SQLite schema, repositories, migrations
  packages/pdf/               # versioned templates, rendering
  packages/sync/              # durable outbox, Google adapters
  packages/import-export/     # XLSX and GST adapters
  packages/testing/           # fixtures, golden tests, crash tests
  docs/
    OPEN_DECISIONS.md
    REQUIREMENTS_TRACEABILITY.md
    DATA_MODEL.md
    TAX_RULES_CA_SIGNOFF.md
    SECURITY_MODEL.md
    BACKUP_AND_RECOVERY.md
    MIGRATION_V3_TO_V4.md
    GOOGLE_SYNC_SETUP.md
    USER_GUIDE.md
    RELEASE_CHECKLIST.md
  scripts/                     # dev/build/test/packaging utilities
```

Agent must maintain a requirements traceability matrix mapping each section to implementation files, tests, status and approvals. Every milestone report must contain: implemented, changed files, test commands/results, demo instructions, outstanding decisions, risks, and next milestone. Supply a reproducible Windows build and a tested installation/uninstallation path; uninstall must **not** silently delete business data.

## 18. Decisions requiring owner/CA input before relevant release gates

| Decision | Needed by | Interim rule |
|---|---|---|
| Real v3 copy, sample invoice PDFs and current workflows | M0 | Use synthetic data; no production import |
| Business GSTIN/profile, tax categories, GST return type and CA reviewer | M2/M8 | Demo-only tax fixtures until approved |
| E-invoice/IRN and e-way applicability | Before live issue | Block affected live workflows if unresolved |
| Invoice series, FY rollover, cancellation/void policy | M1 | No live issuance until approved |
| Decimal rounding, inclusive tax and credit/debit note cases | M1/M8 | Golden fixtures provisional until CA approval |
| Negative stock and FEFO override policies | M7 | Default block for tracked products, owner can approve policy change |
| Stock cost policy and returns valuation | M7 | Proposed weighted average, pending approval |
| Approval thresholds and staff permissions | M6 | Restrictive default; Owner approves high-risk actions |
| Google Workspace/Drive ownership, credential strategy, sharing | M3 | No real credentials in repo; validate service-account feasibility |
| Independent backup destination, encryption key custody, RPO/RTO | M3 | No production go-live until recovery tested |
| Daily close approval and payment modes | M5 | Staff submits, Owner reviews |
| GST filing dates, return amendments, GSTR-2B matching tolerances | M8 | CA-configured and effective-dated; no hardcoded timeless assumptions |
| v3 cutover date and opening balances | M10 | Parallel isolated run; no double posting |

## 19. Final production acceptance checklist

- [ ] v3 remains installed, unchanged and recoverable.
- [ ] v4 installs and runs offline on target Windows hardware.
- [ ] Issuance is transactional, idempotent and crash-recoverable.
- [ ] All issued documents preserve snapshots, hashes, numbering and audit.
- [ ] PDF matches approved template and totals; reprints are tracked.
- [ ] Customer/supplier ledgers, payments and daily close reconcile.
- [ ] Stock ledger, batch/expiry and valuation reconcile after returns and adjustments.
- [ ] Permission checks occur in main process, not only hidden UI controls.
- [ ] Verified local and independent backups; spare-PC disaster restore completed.
- [ ] Google outage does not stop billing; sync resumes without duplication.
- [ ] Google access is least privilege and credentials can be rotated/revoked.
- [ ] GST rules, exports and applicability reviewed by CA; relevant official tool tests pass.
- [ ] v3 import totals, balances and document counts signed off by owner.
- [ ] Diagnostics show no unresolved critical issues; performance/security tests pass.
- [ ] Installer, portable package, user guide, recovery guide and release notes delivered.
- [ ] Owner explicitly approves production cutover and records build version/date.

---

**Implementation priority:** Correct financial records -> safe issuance -> restore -> fast employee workflow -> remote visibility -> inventory/payments -> GST preparation -> visual enhancements. This plan supersedes the earlier milestone ordering while preserving its original intended features. All new safeguards and twelve review recommendations are integrated above.
