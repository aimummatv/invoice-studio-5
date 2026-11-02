# Top-to-bottom source audit — dev.5

## Verdict

**The dev.4 handover had omissions and defects.** This audit found and corrected further source-level gaps. Earlier broad descriptions of implementation completeness must not be read as proof that every original acceptance criterion was satisfied.

This is a review against both supplied Markdown documents, the local v3 reference, the current source, and the packaging workflow. It is not a runtime, accounting, legal or production certification. A statement that “nothing else can be missing” would require the deferred strict compilation, tests, real UI/PDF inspection and external sign-offs.

## Actual checks

- Read the product/execution requirements and followed renderer actions through preload, IPC/controller, services, persistence and exports.
- Reviewed model/math/validation/registry, schema/migrations, issuance/corrections, payments/allocations, stock/revaluation, reports/close/GST, security, import/migration, backup/recovery, Google workers/adapters and PC packaging.
- Syntax-parsed the TypeScript modules without evaluation: see SOURCE_PARSE.log.
- Linked local ESM imports/exports without evaluation, using stubs for external packages: see SOURCE_LINKS.log. This does not verify dependency APIs, installed package versions or TypeScript types.
- Rehashed the available v3 reference: 52 files unchanged, zero changed files. One previously missing large reference asset remains unavailable; see V3_REFERENCE_AUDIT.json. No v3 edits were made.
- The revised archive is checked by per-file SHA-256 readback and ZIP CRC when packaged.
- **Not run:** strict typecheck/full build, application/unit/integration/security/performance tests, Electron, screenshots/PDF renders, actual Google calls, Windows packaging/install/restore or official tax utilities.

## Findings corrected in source

| ID | Finding | Source correction |
|---|---|---|
| A01 | Invoice advances were allocated before the receivable ledger entry existed | Moved allocation after invoice ledger posting within the same transaction |
| A02 | Challan conversion could detect its own new invoice as an earlier conversion | Excluded the current document from the duplicate-link query |
| A03 | Issued advance receipts were absent from the payment mirror queue | Added payment mirroring for advance issuance/cancellation |
| A04 | Applying existing advances at issuance did not refresh receipt availability remotely | Added current payment metadata mirrors after allocation |
| A05 | Initial invoice mirror lacked current settlement/outstanding/status | Uses the canonical balance mirror after ledger/allocation posting |
| A06 | Supplier payment reversals did not check linked purchase/allocation periods | Added period checks for both allocation directions |
| A07 | Exception policy checks were tied only to the Staff label | Applies non-Owner protections to any role granted issuance permission |
| A08 | Purchase charges/discounts/rounding were missing | Added shared decimal purchase calculation and normalized frozen line values |
| A09 | Purchase returns did not preserve proportional charged/discounted values, final rounding and RCM treatment | Uses frozen source amounts, residual allocation and final rounding reconciliation |
| A10 | Adding a purchase row silently reset its chosen ITC classification to pending | Preserves row classification, reason and effective review period |
| A11 | Later line-level ITC reviews were not reflected in the purchase-tax report | Added validated append-only line reviews and effective-period report lookup; claimable remains false |
| A12 | Register UI lacked required filters, filtered totals and a usable detail drawer | Added customer/type/status/date/search controls, totals, actor/PDF/mirror evidence, readonly detail and permitted actions |
| A13 | Margin reporting missed inventory dispatched through converted challans | Recognizes the underlying dispatch cost and reviewed cost adjustments |
| A14 | Credit/debit output omitted the original invoice number/date/reason | Added authoritative source references and a preserved new v4-5 template |
| A15 | Credit buyer details could drift with master edits | Keeps the original buyer evidence for credits |
| A16 | Stock movements lacked a persisted UTC creation time | Additive schema5 column; new events record created_at; older times remain unknown |
| A17 | A reused batch could silently acquire a different expiry | Rejects inconsistent expiry for an existing product/batch |
| A18 | Ordinary historical manual adjustments bypassed cost review | Blocks unsupported historical adjustments; uses reviewed issue/purchase or current compensating workflows |
| A19 | Migration stock quantities were treated as verified base units | Flags original v3 ledger units and requires explicit unit/physical-opening review before cutover |
| A20 | Product cost could leak through proposal previews or stock/workbook exports | Masks protected fields and identifies permission-based export omissions |
| A21 | ZIP limits trusted declared uncompressed sizes | Checks directory/local boundaries and bounded actual decompression before workbook parsing |
| A22 | Restore destinations could already exist | Requires a fresh destination |
| A23 | Restore/relocation activation could use a stale preview and race other writes | Checks an active-data baseline, drains in-flight work and pauses background writers during switchover |
| A24 | Saved payment-mode choices were not enforced | Enforced in posting services and available UI choices; validates at least one mode |
| A25 | Default/sale units and case-price history were disconnected | Wires default/sale-unit selection and normalizes accepted case price history before conversion |
| A26 | Customer credit and product stock/cost context was absent | Adds balance/limit warnings, tentative-number labels and permission-aware stock/cost hints |
| A27 | Custom presets and copy/density controls were incomplete | Adds persisted custom presets, explicit density/copy selectors and print-setting validation |
| A28 | Payment configuration used two unrelated saves | Uses one transaction for bank/profile and payment-mode settings |
| A29 | Saved Google destination preferences did not prefill the connection review | Wires preferences into the explicit enable form |
| A30 | Repeated draft PDF exports could clash with different PDF bytes under the same filename | Uses distinct draft export paths |
| A31 | Cancelled document print presentation lacked a cancellation label | Adds a reference-copy label without altering the original PDF/snapshot |
| A32 | Tax-rule source input incorrectly used PDF-recovery choices | Restricts those choices to the relevant recovery form |
| A33 | GST review lacked readiness/document ranges/outward book sections | Adds explicit review checklists and non-authoritative book groupings |
| A34 | Malformed optional fields could reach financial settings | Adds master revision/flag, purchase RCM, supplier-number and print-setting checks |
| A35 | Manually cleared notes could reappear from profile defaults | New template respects the manual notes lock |
| A36 | Form/settings metadata was duplicated across screens | Moves shared field lists, labels, settings metadata and workbook header mapping to the core registry |
| A37 | Chosen data-root path and per-product stock/cost controls were not fully exposed | Displays the active root and adds permitted catalogue controls |
| A38 | Exporting a migration report could lose the selected job ID | Retains review context across file actions and returns the job ID after import |
| A39 | IPC work tracking could create an unhandled derived rejection | Uses handled completion callbacks for in-flight bookkeeping |
| A40 | Document-type navigation and missing-field navigation were incomplete | Adds document tabs and actionable validation navigation; notes route through linked-invoice actions |
| A41 | Workbook templates omitted new catalogue, purchase-charge and ITC evidence fields | Adds version 2 templates/export metadata, backward-compatible version 1 imports and consistent grouped headers |

These are source corrections. They are not marked as passing application regression tests.

## Coverage by original plan section

| Section | Review result |
|---|---|
| 0–1 Product, isolation, technology, exclusions | TEST-only, separate identity/root, no publishing; tool/QA/external gates explicitly deferred |
| 2 Storage/folders | Managed root, safe files, backup/relocation/restore sources; stale-activation guards added |
| 3 Data/math | Immutable event/snapshot model, decimal calculations, additive migrations; purchase normalization and movement timestamps added |
| 4 Issue/PDF | Reviewed transaction/idempotency/PDF paths; advance-order and challan-link defects corrected |
| 5 Editor/preview | Shared metadata, autofill locks, controls, presets, stock/credit hints and shortcuts present; actual usability/parity unverified |
| 6 Payments/close | Allocation history/reversals/advances/adjustments/statements/closing sources; mirror and lock gaps corrected |
| 7 Purchases/stock | Charges/ITC/returns/FEFO/cost review sources; unsupported exceptions stay blocked rather than inventing values |
| 8 GST | Book tracker, matching/reviews, readiness/variance, notes/ranges and candidate-format adapter; official schemas/applicability/acceptance remain external |
| 9 Google | Optional durable mirrors, master proposals, paged integrity and reviewed recovery; no actual API proof |
| 10 Recovery | Source snapshot/archive/independent backup/restore paths; source guards improved; spare-PC exercise deferred |
| 11 Security | Permission and PIN boundaries reviewed; targeted visibility/validation fixes added; no security-test pass claimed |
| 12 Imports/migration | Copied source/history/PDFs, reconciliation and acceptance; unit/opening review strengthened |
| 13 Health | Findings/retry/PDF repair sources present; financial history is not deleted as a repair |
| 14 Reports/register | Required register context/filters/detail added; other report/export sources reviewed |
| 15–16 Milestones/tests | Source presence is not milestone acceptance. Execution and sign-off gates remain deferred |
| 17–19 Artifacts/decisions/acceptance | Source/docs/scripts/QA records included; Windows, configuration, tax, migration and production approvals not claimed |

## Still required

Install/lock dependencies, strictly compile and fix reported types/build errors, update/extend and run coverage for all affected paths, exercise the app and inspect screenshots/PDFs, verify real integrations and recovery, build/install the Windows packages and obtain owner/CA acceptance. A syntax/link/ZIP check cannot replace those.

Restrictive boundaries remain: expired-lot issuance and batch-tracked negative stock are blocked; historical manual adjustments and cancellation of reviewed valuation dependencies require an appropriate reviewed correction path. These are explicit safety controls, not claims that every conceivable exception is automatically supported.
