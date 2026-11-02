# Source handover limitations

Version 4.0.0-dev.5 is TEST-only source. No dependency lockfile, strict compilation, current unit/integration run, screenshot review, EXE or Windows verification is included. Syntax parsing is not a substitute for those checks. Unknown source/type/runtime/accounting/UI defects may remain and must be resolved in the PC pass.

Configuration is deliberately left for later: Google credentials/accounts/ownership/scopes, current GST/e-way formats and CA applicability, postal data, independent backup/key custody, real copied-v3 data/PDFs and reviewed opening costs/balances.

Stock exception policies remain restrictive until configured. Batch-tracked negative stock, expired-lot issue and unreconciled/locked-period replays remain blocked. Backdated replay orders a newly inserted transaction after existing same-date movements; it appends valuation differences rather than editing old movements. That provisional costing convention needs accounting review.

As-of reports reflect currently revised books, including later reversals/cancellations backdated to their source book date. They are not an audit-time reconstruction of what an operator saw then; immutable daily-close snapshots preserve submitted figures separately.

Older automated suites/harnesses are included as a starting point; coverage, expectations and selectors require review for the expanded source. Original plans remain the full acceptance standard. See docs/PC_SETUP_AND_VALIDATION.md.

No production, filing, migration-cutover or publishing approval is implied by receipt of this ZIP.

Ordinary cancellation of documents with reviewed historical valuation dependencies is blocked; use a linked reviewed correction/return. This prevents cancellation from silently undoing later cost reviews.
