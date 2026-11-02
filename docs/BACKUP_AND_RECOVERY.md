# Backup and reviewed recovery

The app uses SQLite's online backup mechanism, not raw copying of an active WAL file. Schema upgrades take a pre-upgrade snapshot. Backups, hashes and reason/audit records are retained separately from issued financial histories.

- Data health → Back up now creates a consistent local snapshot.
- Choose independent folder writes a proof copy and checks its hash. Verify physical/account independence yourself.
- Backup settings configure a local schedule and retention. Retention applies only to app-created local snapshots; it does not erase issued documents.
- Encrypted archive uses AES-GCM with a passphrase-derived key and a file/hash manifest, including database and managed PDFs/attachments/history. Keep the passphrase in a separately protected recovery location.
- Preview restore extracts into a new location, checks database/files and leaves the active root untouched. Activate explicitly after reviewing the result. Prepare new data location uses the same archive/verification boundary. Preserve the original root for rollback.

## Diagnostic repairs

Failed-job retry previews only failed jobs and expired worker leases; changed job baselines require a fresh preview. Conflicts require separate remote review. Applying retries creates a backup and audit record.

PDF recovery previews either a matching verified original or a candidate rebuilt from the original immutable snapshot/template. Rebuilt bytes may differ even when the visual document is equivalent; the preview reports whether the original hash matches. Apply with a reason and `ACCEPT PDF RECOVERY`. Changed prior bytes are preserved as evidence, the original manifest is retained in recovery history, and the replacement receives its own hash/path. Financial snapshots are never edited.

Numbering/ledger/integrity problems are investigated and explained or recovered from a verified backup; issued numbers are not reused and financial rows are never deleted to hide discrepancies.

All flows are source implementations awaiting the PC recovery/security tests. Perform a full spare-PC restore, compare snapshots/numbering/customer/supplier balances/allocations/stock/PDFs, and measure recovery point/time before production use.
