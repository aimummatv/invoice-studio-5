> **Historical evidence:** this report describes checkpoint `ca44e7b` (dev.1). Implementation-first dev.2 changes have not been compiled or tested. See docs/IMPLEMENTATION_FIRST.md and qa/IMPLEMENTATION_STATUS.md.

# M07 — Purchases/stock

Gate: **BLOCKED — not passed**. No milestone acceptance has advanced beyond the unresolved M0 build/GUI environment gate. Independent source/service work below is partial; pending implementation is not attributed solely to external approvals.

Implemented/prepared: Purchase payable/stock transaction, base-unit case conversion, weighted cost/FEFO/expiry checks, cancellation/return foundations.

Files: packages/db/store.ts; packages/testing/stock-boundary.test.ts.

Actual current service regression: `npm test` — 56/56 passed, 0 failed, 0 skipped. This shared count is not a claim of Purchases/stock GUI or Windows verification. Exact test cases/log: qa/logs/v4-offline-tests.tap. `npm run lint` parses source only. Build, strict typecheck and desktop verification stop with recorded dependency/build blockers.

Pending: Purchases/returns/stocktake/manual adjustments and exceptions, supplier allocations/statements, complete reports/UI and costing edge cases.

Screenshots/PDF visual review: BLOCKED; none captured or inspected. No GUI click/demo claimed. Migration/recovery/security implications are documented in docs/DATA_MODEL.md, MIGRATION_V3_TO_V4.md, SECURITY_MODEL.md and BACKUP_AND_RECOVERY.md.

Performance: 10k synthetic service benchmark in qa/logs/performance.json; full register 136.3 ms after fix, issue p95 1.56 ms. Not a Windows/GUI benchmark; memory 491.3 MiB, further optimization/targets pending.

Demo commands: `npm test`; `node scripts/performance.ts 10000`. For desktop, install dependencies in a suitable environment, run typecheck/build and actual Electron E2E, then inspect every screenshot/PDF. No publishing command is authorized.

Next: resolve execution/dependency blockers and unfinished scope for this gate, fix/retest, record genuine acceptance evidence, then advance sequentially. Owner/CA approvals remain listed in docs/OPEN_DECISIONS.md.
