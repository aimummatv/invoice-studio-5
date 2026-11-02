# Invoice Studio 5

This repository is the home of Invoice Studio 5 development, continuing the Invoice Studio 4 history. The included application remains v4-12.2 until Version 5 changes are implemented and rebuilt.

Keep completed, verified source and documentation changes pushed to [aimummatv/invoice-studio-5](https://github.com/aimummatv/invoice-studio-5). Exclude local business data, profiles, credentials and demo checkpoints.

**Current implemented application: v4-12.2.** Offline Windows invoicing built with Electron, TypeScript, Preact and SQLite. The v4-13 guided government JSON workflow is approved but **paused and not implemented**.

## Download the Windows application

Download the [Windows portable EXE](https://github.com/aimummatv/invoice-studio-5/releases/download/v4.12.2/Invoice-Studio-4.12.2-Windows-x64-Portable.exe) or the [complete Windows ZIP](https://github.com/aimummatv/invoice-studio-5/releases/download/v4.12.2/Invoice-Studio-4.12.2-Windows-x64.zip) from the [v4.12.2 release](https://github.com/aimummatv/invoice-studio-5/releases/tag/v4.12.2).

The portable EXE includes its required companion files. For the ZIP, extract the entire folder before opening `Start Invoice Studio.bat` or `Invoice Studio 4.exe`. Node.js is not needed to run the packaged app. These downloads contain program files only; they do not include the existing local business records or demo checkpoint. On a new/default profile, create a TEST Owner. Continue using an existing custom Desktop launcher to retain its configured profile/data paths. See [Windows download notes](docs/WINDOWS_DOWNLOAD.md).

## Run from source

Use Windows x64 and Node.js 24 LTS or newer supported Node 24 release.

```powershell
npm ci
npm run typecheck
npm test
npm run build
npm start
```

The application includes its local backend; no separate web server is required. On a new PC, create the first TEST Owner when prompted. This repository does not contain the existing business database, user PINs, active demo checkpoint or local profile. Do not point a fresh checkout at existing records without a verified backup and an explicit data-location decision.

## Current capabilities

- Document-specific invoices, proforma, advance receipts, delivery challans, credit notes, bill of supply and debit notes.
- Paginated A4 PDF preview/export/Print path with interactive Edit Preview, typography and presentation controls.
- Decimal calculations, case packing and pricing, immutable issued snapshots, protected numbering and correction workflows.
- Complete removable TEST examples, sample invoice-summary QR and sample e-way appendix.
- Manual compliance JSON export/import with signed-evidence matching, pending/verified status and preserved PDF revisions.
- Encrypted Windows draft recovery, autosave, restart/reauthentication recovery and conflict protection.

The current e-way export remains a **review worksheet**, not the proposed v4-13 portal-upload workflow. The current app is **TEST-only**. A readable demo QR is not an official government registration. See [current release notes](release/RELEASE_NOTES.md) and [verification summary](docs/CURRENT_RELEASE.md).

## Work through GitHub

Clone this repository, make changes on a feature branch and open a pull request. A [Windows CI template](docs/ci/windows-ci.yml) checks TypeScript, service tests and the production build. It is not activated: the publishing GitHub login has repository permission but no workflow-write scope. Once workflow permission is granted, place the template at `.github/workflows/windows-ci.yml`. See [CONTRIBUTING.md](CONTRIBUTING.md) for commands and preservation rules. GitHub's browser editor can update files, but the full Electron UI runs locally on Windows. Repository changes do not automatically update an installed Desktop program or its local records.

Use `main` for the published source baseline. Start future v4-13 implementation from `feature/v4-13-government-workflow`; review the paused [v4-13 plan](docs/plans/v4-13-guided-government-workflow.md) first.

## Verification

The v4-12.2 desktop release passed 120 service tests, TypeScript/build, seven-document packaged checks, QR decoding, compliance mismatch/pending checks, PDF geometry and font/pagination fixtures. Physical printer output and real government portal submission were not tested.

```powershell
npm run test:desktop
npm run test:desktop:recovery
npm run test:desktop:preservation
npm run test:desktop:compliance
npm run test:desktop:pdf
```

Desktop tests use isolated synthetic data. PDF visual checks require Poppler. Historical handover documents under `docs/` and `qa/` retain earlier limitations and observations; this README and the latest release notes describe the current release.

## License

Project code is UNLICENSED. Third-party notices are in [LICENSES](LICENSES/).
