# Copied-v3 migration workflow

Use a closed, consistent **copy** of the v3 database and a copied original-PDF folder. Never select the installed v3 database, edit it in place, or copy an active WAL database as a standalone file.

1. Import & export → Preview copied v3. Enter the cutover date. Select the database copy, then the copied PDF folder, or cancel the folder picker to review explicit missing-PDF exceptions.
2. Review/export inventory, field/type/status mappings, snapshot hashes, signed tax totals, customer receivables/unapplied receipts and opening balances, stock opening quantities, and original-PDF hashes. Resolve mismatches. Unknown stock costs remain null, requiring review.
3. Accept reconciliation with a reference and `ACCEPT TEST MIGRATION`. Missing/ambiguous PDFs stay explicit; originals are never regenerated during import.
4. Import reviewed v3 history with `IMPORT INTO TEST`. Raw source tables and historical snapshots/identifiers are preserved separately; selected masters receive new stable IDs. Matched PDFs are copied byte-for-byte into Legacy storage. Historical invoices/payments are not reposted to the live v4 ledger.
5. Review the returned mapped IDs/opening amounts. Use Review migration stock units to record the physically reviewed base-unit quantity for each source product; v3 ledger units must not be assumed to be base units. Use the versioned opening workbook to post customer/supplier openings and physical stock/costs on the cutover date. Product stock tracking may need enabling before stock import. Do not invent original costs from today's product master.
6. Reconcile cutover openings with `CONFIRM TEST CUTOVER` and a review reference. Differences are shown; issuance is blocked until openings match and remains blocked for dates before cutover.

Tools are implemented as source, not exercised against actual owner data in this handover. Run a parallel isolated pilot and obtain owner/CA acceptance before any live cutover. Restoring the pre-import backup into a new root is the rollback path; no destructive undo of financial rows is offered.
