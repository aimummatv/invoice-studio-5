# Risk register

| Risk | Impact | Treatment/status |
|---|---|---|
| Hidden network permission request hangs on Android | dependency build blocked | user requested no retry; local offline work only |
| Chromium socket denied | screenshots/UI assertions blocked | record actual failure; no invented screenshots |
| Electron unavailable | actual desktop acceptance unverified | maintain desktop source and executable test commands; gate blocked |
| Linux only | installer/portable/spare-PC not verified | Windows validation required |
| Unapproved tax assumptions | inaccurate live books/filing | TEST-only, versioned fixtures, CA gate |
| Immutable snapshot bypass | financial history mutation | DB triggers plus service guards and misuse tests |
| Crash/retry duplications | duplicate number/ledger/stock | issue transaction and durable idempotency/outbox |
| Same-disk backup | inadequate disaster recovery | independent-location + spare-PC gate remains open |
| Oversized product scope | partial work mistaken for finished | traceability and truthful per-milestone gates |
