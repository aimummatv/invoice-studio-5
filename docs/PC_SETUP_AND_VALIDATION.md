# PC setup and the deferred validation pass

This handover contains Invoice Studio **4.0.0-dev.5 source**, not a prebuilt program or a Windows installer. Configuration, strict compilation, application tests, screenshots, EXE creation and final acceptance are left for the PC pass by the owner's instruction. Only source syntax and package integrity were checked here.

## Start on Windows

1. Extract the entire ZIP into a normal local folder, for example `C:\InvoiceStudio4-Handover`. Do not run directly from the ZIP or put the live database in a shared/network folder.
2. Install **Node.js 24 LTS x64** from https://nodejs.org. Internet is needed for the first dependency download. Close and reopen terminals after installation.
3. Run `01-Install-Dependencies.cmd` in the handover root. This installs the exact declared packages and generates a lockfile if absent; it does not start the app or run tests. Package downloads and version availability have not been verified in this environment.
4. Run `02-Run-Developer-App.cmd`. It compiles the source and launches Electron. On the first run create a named TEST Owner and a 6–12 digit PIN. The app stores its own isolated TEST data, separate from v3.
5. Enter a fictitious company/customer/product. Do not use real business data while checking the build. If compilation or launch fails, keep the full console output; this handover has not been strictly compiled or executed.

You can also open PowerShell in `Source` and run:

```powershell
npm install
npm run typecheck
npm run build
npm start
```

The first `npm install` produces the dependency lockfile. Preserve it after review. No `node_modules` or runtime binaries are shipped in this source ZIP.

## Run the deferred checks

Run `03-Run-Checks.cmd` to perform strict types, source parsing and service tests. It stops at the first failing stage and records a transcript in `Source\qa\pc-results`. Test coverage and older expectations need review against the expanded source; the old 56-test result is historical, not current evidence.

For the actual Electron workflow and screenshot capture:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File Source\scripts\check-on-pc.ps1 -Desktop
```

The current desktop harness covers an initial billing path; complete the broader scenarios in `Documentation\VALIDATION-CHECKLIST.md` too. Some labels/selectors and fixtures may require updating in the deferred QA pass. Read each failure instead of assuming the harness proves all workflows.

Inspect screenshots at 1920×1080, 1366×768, 1280×720 and the minimum window size; include 100%/125% scaling, dark mode, permission errors, long addresses and 50-line PDF output. A saved image is not visual approval.

## EXE and portable builds later

Run `04-Build-EXE.cmd` after resolving compilation and functional defects. Artifacts are written under `Source\release\artifacts`. The script uses `--publish never`; it does not upload anything. An EXE that packages successfully is still an unvalidated TEST build until installation, upgrade, uninstall, data preservation and spare-PC restore are checked.

## Configuration later

- Google: connect using the app's protected credential-file picker; review Sheet/Drive destinations; explicitly enable TEST mirroring. No credential is in this package. OAuth/service-account ownership and actual API access require validation.
- GST/e-way: install the current reviewed schema/mapping, set effective applicability and review references. External IRN identifiers can be recorded; IRN generation and direct portal filing are outside v4.0 scope. Obtain CA/official-utility validation before any live use.
- Postal lookup: import a sourced, versioned Pincodes worksheet, or enter addresses manually.
- Backup: choose an independent destination and keep encrypted archive passphrases separately. Exercise a new-location restore on another PC.
- Migration: use only a closed copy of v3 plus a copied PDF folder. Preview/export the reconciliation; accept it; import preserved history; post reviewed opening balances/stock and confirm cutover. Issuance before cutover or before opening confirmation is blocked.

Nothing in this handover authorizes publishing, production cutover or statutory filing. v3 must remain intact.

## Audit regression priorities

Before relying on the app, exercise advance-at-issue posting, challan conversion without duplicate stock dispatch, multi-line purchases with charges/returns/ITC review, registered filters/details, stale restore/relocation rejection, permission-limited exports, original note references and repeated draft PDFs. The audit found source defects in these areas and corrected them without executing the workflows. Read `Source/qa/SOURCE_AUDIT-dev.5.md` in the extracted handover.
