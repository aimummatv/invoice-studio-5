# v3 feature parity matrix

All observations below are source observations at pinned commit. Screenshot column is BLOCKED: Electron missing, Chromium launch denied. No visual parity is claimed.

| Observed feature | Source | v3 screenshot | v4 behavior | Milestone | Verification |
|---|---|---|---|---|---|
| Six document tabs | shared/core.js TYPES; studio.js renderTabs | BLOCKED | preserve + debit note | M2 | per-type issue fixtures |
| Six-step form, split preview | studio.js renderEditor/renderPreview; styles.css | BLOCKED | single scrollable form, narrow preview tab | M2 | actual Electron sizes |
| Green A4 identity, billed/shipped, totals | shared/invoice-view.js; invoice.css | BLOCKED | shared canonical snapshot renderer | M2 | rendered PDF and visual comparison |
| Draft autosave/revisions | store.cjs saveDraft; studio.js flush | BLOCKED | explicit saved version and conflict handling | M1/M2 | save/reopen/conflict |
| Decimal mixed/inclusive/charge math | shared/core.js calculate | BLOCKED | versioned provisional decimal policy | M1 | goldens incl. signed round-off |
| Per-type FY series | store.cjs allocateNumber/finalise | BLOCKED | atomic number and explicit retry key | M1 | crash/duplicate/FY tests |
| Customer/product search and buyer prices | studio.js chooseBuyer/addProduct/edit | BLOCKED | provenance locks; explicit catalogue updates | M2/M4 | manual-field preservation |
| Preview text (no cell editor) | shared/invoice-view.js render | BLOCKED | bidirectional cell editing A and B | M4 | form/preview/undo/PDF |
| Light/dark and divider | studio.js theme/bind; styles.css | BLOCKED | accessible themes and responsive layout | M2/M4 | screenshots + keyboard |
| Simple/Detailed/Transport toggles | core.js defaultAppearance; studio.js appearance | BLOCKED | same settings in preview and PDF | M4 | DOM/PDF parity |
| Ctrl+S/P/Z, undo | studio.js bind/undo | BLOCKED | preserve plus redo and lookup shortcuts | M2/M4 | keyboard E2E |
| Register, payments, reports | studio.js register/payments/reports; core.js reports | BLOCKED | canonical ledger/register/aging/close | M5 | balance reconciliation |
| Credits/cancel/challan conversion | store.cjs creditTotals/cancel/duplicate | BLOCKED | append-only linked corrections | M1/M5/M6 | caps and reversals |
| SQLite backup/restore/move | store.cjs backup/restore; main.cjs changeDataFolder | BLOCKED | new-location verification and independent copy | M1/M3 | integrity + restore comparison |
| XLSX templates/import preview/export | desktop/workbooks.cjs | BLOCKED | versioned validation/preview/atomic import | M2/M10 | formula/injection/corruption |
| UPI QR and bank settings | shared/invoice-view.js qr; studio.js settings | BLOCKED | amount/payee disclosure, no receipt inference | M2 | URI/QR tests |
| WhatsApp URL draft | main.cjs openWhatsApp; studio.js messenger | BLOCKED | explicit user click only; no sending | M6 | URL validation |
| Optional stock movements | store.cjs recordStock | BLOCKED | base units/lots/purchases/valuation/FEFO | M7 | stock/return reconciliation |
| No Google/roles/daily close/GST filing modules | inspected file tree and IPC | BLOCKED | new v4 services | M3/M5–M9 | new suites + external gates |
| Installer + portable builder targets | package.json; installer-smoke.ps1 | BLOCKED | separate app ID and data-preserving uninstall | M10 | Windows required |
