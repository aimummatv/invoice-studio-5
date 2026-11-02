# Deferred work for the PC handover

The previously listed source gaps were addressed in dev.5; see `../docs/SOURCE_HANDOVER_SCOPE.md` for concrete files and boundaries. Implementation is **not runtime-verified**.

The following remain deliberately deferred:

- Dependency installation and lockfile, strict typecheck/full compilation and source/type fixes revealed by them.
- Updated automated coverage, unit/integration/security/accounting/recovery/performance tests and fixes.
- Electron execution, actual UI/PDF screenshots and visual/accessibility verification.
- EXE/portable construction and Windows installation/upgrade/uninstall/spare-PC validation.
- Google accounts/scopes/destinations and real API proof; independent backups and key custody.
- Current official GST/e-way definitions, CA applicability/mappings/sign-offs, sourced postal data.
- Real copied-v3 reconciliation, opening values/costs, owner cutover/pilot and production acceptance.

Unsupported combinations remain blocked by policy: expired-lot issuance, batch-tracked negative stock, and a backdated replay that would create unreconciled quantities/values or affect a locked period. These controls must not be bypassed to force a transaction.

No current unit-test pass, full requirement acceptance, screenshot review, compliance certification or production readiness is claimed. No publishing authorization has been granted.
