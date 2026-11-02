# Canonical data model

Stable IDs separate from numbers. Profile/customer/product payloads have revisions. Draft payload version checked on save and issue. Issued document snapshot stores draft, business, decimal policy/template versions, actor and timestamp; its hash is SHA-256 of canonical sorted JSON. Financial history is append-only.

Series key: type/FY/series. Unique issued number; issue_commands idempotency key binds request digest to document. Issue attempts and audit record outcomes. PDF and mirror jobs are durable outbox entries. Document events record cancel/corrections without changing originals.

Customer ledger debits are positive receivable; credits/receipts negative. Allocations connect posted payments to documents; unapplied balance is derived. Supplier ledger purchases positive payable, supplier payments negative. Stock movements signed decimal base quantities and signed integer paise cost values; closing and average valuation derived per product/lot.

Period locks, users, approvals, daily closing snapshots, file manifest, backup catalog and import jobs remain distinct from financial snapshots. UTC event times; Asia/Kolkata business display; invoice date preserved independently. No live writes supported in this development candidate.
