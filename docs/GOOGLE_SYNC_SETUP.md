# Optional Google visibility and backup

No connection is needed for local draft/issue/payment/stock operations. This handover includes adapter and UI source; real Google access/quotas/ownership/revocation remain deferred configuration and validation.

1. Provision an appropriately scoped Desktop OAuth client, or a reviewed service account for approved shared-drive storage. Do not put credentials in source, chat, shared Sheets or exported diagnostics.
2. Google sync → Connect / rotate credentials. Use the trusted main-process JSON file picker. OAuth uses a loopback PKCE flow; protected credentials are kept using OS-backed storage. Basic-text Linux fallback is rejected.
3. Review & enable with spreadsheet/folder IDs and `MIRROR TEST DATA`. Confirm ownership, permissions, read-only owner visibility and whether background retries are allowed. Service-account Drive storage is restricted to reviewed shared-drive ownership.
4. Sync now consumes the durable queue. Retries use stable source keys and source versions. Changing/deleting mirrored finance data creates conflicts; it never changes local books.
5. Integrity checks read pages of 100 links; run through all pages (or allow background cycles) for a full scan. Findings persist in diagnostics. Renamed/moved Drive files are located through stable app properties.
6. Review local recovery previews the latest source version, backs up, captures remote evidence, checks for a changed remote version and then writes the approved local original. It does not automatically overwrite an owner's changed Sheet row.

## Owner master proposals

Create a separate tab `MASTER_PROPOSALS` with columns:

| kind | id | expectedRevision | changesJson |
|---|---|---|---|
| customer / supplier / product | stable local master ID | current integer revision | JSON object of permitted master changes |

Fetch proposals from Google sync. Open Master proposals to inspect before/after values and validation errors, then explicitly accept/reject with a reason. Duplicate/protected fields, invalid values or stale revisions are rejected. Accepting creates a pre-apply backup and audited local master updates. Financial rows are not allowed in this flow.

OAuth disconnect attempts token revocation. Service-account keys require separate Google IAM rotation/revocation. Independent recovery must not depend solely on the same Google account. No Google API request was performed for this source handover.
