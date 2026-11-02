# Invoice Studio 5

Offline Windows invoicing with separate private business and TEST workspaces. Electron, TypeScript, Preact and SQLite.

## Windows download

Download the [portable EXE](https://github.com/aimummatv/invoice-studio-5/releases/download/v5.0.0/Invoice-Studio-5.0.0-Windows-x64-Portable.exe) or [complete ZIP](https://github.com/aimummatv/invoice-studio-5/releases/download/v5.0.0/Invoice-Studio-5.0.0-Windows-x64.zip). Extract the entire ZIP and keep its files together. Node.js is not needed to run the packaged program.

The package contains software and synthetic examples only. It does not contain business records, imported documents, Owner credentials or customer details. Older affected downloads are withdrawn as part of the privacy cleanup.

## Private business setup

Normal startup opens the private business workspace under your Windows Documents folder at Invoice Studio 5/Private. Create a new Owner account and PIN locally. Review business details, confirm the first invoice number in Business Settings, and record e-invoice/e-way applicability in GST & Tax before finalizing real documents. Unknown applicability blocks issuance. Where IRN is required, customer release requires matching evidence verified with a production signing key. Offline verification does not check current portal status.

The initial sequence defaults to MR/TI/26-27/0001 in financial year 2026-27, starting at 1. A changed series requires confirmation again; the series locks after first issuance. This LIVE release supports reviewed ordinary domestic supplies; reverse charge and special supply treatments remain blocked.

Business records, customer favourites, PDFs, jobs, recovery and backups are isolated from TEST. Google connections and synchronization are disabled in the private business workspace. Existing TEST workspaces and demo checkpoints are preserved; demo loading/removal cannot operate on LIVE records. Use the preserved TEST launcher for the prior demo program, or --test-workspace with a separately chosen profile for synthetic testing.

## Saved details and invoice editing

- Save business identity and bank details once; they load automatically for new work.
- Star customers and use compact name buttons above invoice details. Replacing manually edited customer details requires confirmation; items are retained.
- In Appearance, select Edit invoice text or click a caption in Edit Preview. Edit headings, punctuation and column captions; save for this invoice or as a local default. Reset controls restore defaults.
- FSSAI is the short licence caption. Fee-paid-through date is stored separately from licence validity.
- Edit draft values through the existing preview controls. Totals remain calculated; issued financial snapshots and original PDFs remain immutable.
- Business Settings provides Open local settings folder and JSON export/import. The automatically refreshed Settings/business-settings.json file contains company/customer details, favourites and presentation defaults. It excludes credentials and numbering counters. Import edited copies through the app; do not edit the database. Stop on conflicting customer details.

The seven document types, A4 preview/export, recorded payments, invoice history and manual compliance evidence tools remain available. The guided government JSON workflow is still paused. No government submission or filing happens automatically.

## Development and publication

Use Node.js 24 on Windows x64:

~~~powershell
npm ci
npm run typecheck
npm test
npm run build
npm run check:privacy
npm run test:desktop:business
~~~

For a packaged check, set STUDIO4_PACKAGED_EXE to the executable before running the desktop test. Tests use isolated synthetic data. Never point development tests at business records. Read [CONTRIBUTING.md](CONTRIBUTING.md) and [current verification](docs/CURRENT_RELEASE.md).

Keep verified source changes pushed to this repository. Enable the local publication guard with git config core.hooksPath .githooks. The privacy check compares tracked/unignored source with the optional private reference stored outside the repository. Never commit real records, imports, screenshots, logs, credentials, backups or checkpoints. Public fixtures use synthetic identities and a generic logo.

Source changes require rebuilding the installed app. The Windows package is unsigned. Physical printer output and real government portal acceptance remain unverified. Code is UNLICENSED; see LICENSES for third-party notices.
