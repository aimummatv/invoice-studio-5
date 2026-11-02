# Open decisions

All defaults below are provisional TEST-only. No live issuance, migration, filing, external sharing or publishing authorized.

| Decision | Interim treatment | Release dependency |
|---|---|---|
| Business identity/GSTIN, CA reviewer, tax categories and return scheme | fictitious TEST fixtures only | M2/M8 |
| Series/FY/void and cancellation policy | separate TEST prefix per type/FY, no reused numbers | M1/live |
| Decimal rounding/inclusive tax/credit note policy | versioned half-up per-line fixtures, unapproved | M1/M8 |
| IRN/e-way applicability and legal workflow | affected live workflows blocked | live |
| Staff roles/approval thresholds | restrictive presets, no renderer role trust | M6 |
| Stock negative/FEFO/return costing | block negative, proposed weighted average, review exceptions | M7 |
| Google ownership/auth/scopes/sharing | adapter tests only, no real credentials | M3/M9 |
| Independent backup destination/key custody/retention/RPO/RTO | local TEST restore only; proposed 1 day / 4 hours not commitment | M3 |
| Daily close/payment modes | staff submits, owner reviews | M5 |
| GST dates/schema/2B tolerances | effective-dated CA configuration required | M8 |
| Source sample PDFs and workflows | source-limited audit, synthetic copy | M0/M10 |
| v3 cutover/date/opening balances | dry-run only, explicit signed reconciliation | M10 |
| Dependency download, Electron and screenshot execution permissions | blocked by workspace; do not repeat hidden approvals | build/QA |
| Windows 10/11 x64 test machine | unavailable in Linux workspace | install/portable/recovery |
