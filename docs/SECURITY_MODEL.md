# Security model and limits

Electron renderer has no Node access; sandbox and context isolation enabled; preload exposes one allowlisted command bridge. Main validates sender and main-frame identity, command keys, sizes and business schemas. Controller owns its session token; renderer-supplied role/token/path fields are rejected. Each financial service checks permissions again.

Owner/Staff/Viewer presets, scrypt salted PIN hashes, failed-login rate limit and 15-minute idle sessions implemented and tested. High-risk controller actions require a fresh PIN. Staff product tax editing, notes, backdating, discount and price/rate overrides are blocked pending Owner workflow. Configurable approval policies and their full UI are NOT implemented; no security release sign-off.

Financial, stock and audit rows have SQLite update/delete-denial triggers. Audit hashes chain prior event hashes; this detects changes within the supported model and cannot defeat an OS administrator. Filesystem access remains a separate threat. Paths reject traversal and symlink ancestors; existing differing outputs are preserved. Main denies navigation, popup windows and permission requests.

Google credentials are not configured or stored. OS-backed credential protection and rotation remain pending. A current build uses TEST data exclusively; do not enter real customer or financial data. Diagnostic errors omit Google SDK messages that may contain credentials. Backups contain data and PIN hashes; protect/encrypt independently before production.
