# Current local package: v4-12.3 startup hotfix

2 November 2026. Handles `EPIPE` from inherited stdout/stderr pipes, including Electron's synchronous console writes. Other output errors still propagate. No data/schema or invoice workflow changes.

Verified: TypeScript, production build, all 123 service tests (including three diagnostic-output regressions), and a packaged startup check with isolated data, disconnected output pipes, injected `EPIPE` stream errors and subsequent console/process warnings. The owner setup screen remained responsive. Run `node scripts/startup-pipe-check.mjs` with `STUDIO4_PACKAGED_EXE` pointing to the desired executable to repeat the packaged check.

The corrected unsigned Windows package was built locally with electron-builder's version override `4.12.3`. GitHub downloads remain v4-12.2 until a new release is uploaded. Physical printing and real government portal acceptance remain unverified.

## Finalized release baseline: v4-12.2

Implemented and packaged before GitHub publication. Validation recorded in the local release checklist:

- 120 service tests, TypeScript and production build passed.
- All seven document workflows passed packaged fill/edit/save/reopen/preview/export/Print PDF-handoff checks.
- Main HSN uses the highest-taxable-value line; IRN generation date is included in demo summaries; official imports reject inconsistent main HSN and keep missing/invalid registration dates pending.
- TEST/LIVE separation and guided portal tabs described in v4-13 remain planned, not implemented.
- Original records/PDF hashes and the active demo checkpoint were preserved.
- Physical printer output and a real portal submission were not exercised.

Machine-specific reports and local business data are excluded from Git. Re-run CI/checks on future commits; the prior package's verification is not a claim about untested modifications.
