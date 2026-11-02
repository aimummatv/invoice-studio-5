# Defect log

| ID | Severity | Reproduction / expected / actual | Root cause / treatment | Evidence |
|---|---|---|---|---|
| ENV-001 | blocker | npm ping should download metadata; socket EPERM | workspace networking permission unavailable; do not repeat requests | environment/tool transcript |
| ENV-002 | blocker | launch Chromium for screenshot; exits SIGTRAP | crashpad setsockopt denied by sandbox; no visual pass claimed | environment/tool transcript |
| V3-001 | high design risk | save/issue may rewrite catalogue | autoSyncCatalogueAndParties automatic changes; replace with explicit confirmation in v4 | docs/V3_AUDIT.md |
| V3-002 | high design risk | crash after commit needs PDF/sync recovery | no durable issue outbox; implement v4 jobs | docs/V3_AUDIT.md |

Source findings are not claims of reproduced GUI behavior. Every discovered v4 failure will be added with regression tests and resolution.

| ID | Severity | Reproduction / expected / actual | Root cause / treatment | Evidence |
|---|---|---|---|---|
| V4-001 | high, fixed | Issue hit SQLite column/value count failure; no record should commit | ledger INSERT placeholder count corrected; rollback and issue regression tests pass | qa/logs/v4-offline-tests-initial-failures.tap; packages/testing/safety.test.ts |
| V4-002 | high, fixed | 10k register should remain usable; measured 17.34s | repeated per-row outstanding scans; ledger document index + consolidated register SQL; rerun 136ms | qa/logs/performance-before-register-fix.json; performance.json |
| V4-003 | high, fixed — final service suite passed | Backup restore rejected a consistent snapshot because a read-only WAL probe created sidecars | normalize private backup destination to standalone DELETE journal before hashing; restore regression | qa/logs/v4-backup-sidecar-regression.tap; packages/testing/safety.test.ts |
| V4-004 | high, fixed by source review | Row reorder/removal cleared manual locks, allowing later autofill overwrite | remap provenance by stable line ID; regression asserts preserved locks | packages/testing/editing-sync.test.ts |
| V4-005 | high, fixed by source review | Original customer GSTIN absent from immutable issued snapshot | preserve buyer master snapshot and use its GSTIN in template; regression added | packages/testing/safety.test.ts |

No complete-app defect-free claim: GUI/build/Windows checks are blocked and many workflows remain unimplemented.

V4-006 (high, fixed): sync version N+1 could overtake failed N and later be overwritten. Worker now blocks newer jobs behind unresolved older versions and reconciles latest links only; explicit regression in editing-sync.test.ts. Real Google verification still pending.
