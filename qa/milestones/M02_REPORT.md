> **Historical evidence:** this report describes checkpoint `ca44e7b` (dev.1). Implementation-first dev.2 changes have not been compiled or tested. See docs/IMPLEMENTATION_FIRST.md and qa/IMPLEMENTATION_STATUS.md.

# M02 — Usable billing

Gate: **BLOCKED — not passed**. No milestone acceptance has advanced beyond the unresolved M0 build/GUI environment gate. Independent source/service work below is partial; pending implementation is not attributed solely to external approvals.

Implemented/prepared: Preliminary real Electron/Preact/Vite source and shared snapshot HTML; source parsing; HTML safety assertions.

Files: apps/desktop; packages/pdf/template.ts.

Actual current service regression: `npm test` — 56/56 passed, 0 failed, 0 skipped. This shared count is not a claim of Usable billing GUI or Windows verification. Exact test cases/log: qa/logs/v4-offline-tests.tap. `npm run lint` parses source only. Build, strict typecheck and desktop verification stop with recorded dependency/build blockers.

Pending: Dependencies/build/typecheck; actual Electron workflow; screenshot review; PDF pagination/render; QR; full settings/keyboard/editor.

Screenshots/PDF visual review: BLOCKED; none captured or inspected. No GUI click/demo claimed. Migration/recovery/security implications are documented in docs/DATA_MODEL.md, MIGRATION_V3_TO_V4.md, SECURITY_MODEL.md and BACKUP_AND_RECOVERY.md.

Performance: 10k synthetic service benchmark in qa/logs/performance.json; full register 136.3 ms after fix, issue p95 1.56 ms. Not a Windows/GUI benchmark; memory 491.3 MiB, further optimization/targets pending.

Demo commands: `npm test`; `node scripts/performance.ts 10000`. For desktop, install dependencies in a suitable environment, run typecheck/build and actual Electron E2E, then inspect every screenshot/PDF. No publishing command is authorized.

Next: resolve execution/dependency blockers and unfinished scope for this gate, fix/retest, record genuine acceptance evidence, then advance sequentially. Owner/CA approvals remain listed in docs/OPEN_DECISIONS.md.
