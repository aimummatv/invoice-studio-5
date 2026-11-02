# Invoice Studio v4-12.3 — startup pipe hotfix

2 November 2026. Prevents a JavaScript main-process error when a desktop launcher closes an inherited output pipe while Node/Electron prints a warning. Handles asynchronous stdout/stderr `EPIPE` and synchronous console `EPIPE`; unrelated errors still propagate.

Validation: TypeScript, production build, 123 service tests, and an isolated packaged startup/disconnected-pipe check passed. A separate local Windows package was produced; no new GitHub binary release has been published. Existing data, issued documents and demo checkpoints are unchanged by this code change.

## Invoice Studio v4-12.2 — GST QR field check

02 November 2026. Added a clearly labelled sample IRN generation date/time and taxable/GST values to demo QR summaries. Main HSN now follows the highest-taxable-value line. New official imports retain pending status for missing/invalid registration dates and reject inconsistent main HSNs; signed portal QR payloads are preserved. Printed party/place-of-supply fields show state names with codes. Demo samples remain unregistered and all original issued records/PDFs are preserved.

Verified: 120 service tests, TypeScript/build, standalone seven-document suite, official import checks, current-invoice QR refresh, rendered QR decoding and font/pagination fixtures. These changes check field completeness; they do not determine a business's statutory applicability or replace official portal registration. Physical printing was not exercised. See GST QR field check for official references and business-data issues.

---

# Invoice Studio v4-12.1 — Appearance and invoice polish

31 October 2026.

- Dropdown menus close on outside click, focus leaving the menu or Escape. Opening another menu closes the previous one. Specialist collapsible form sections remain independently usable.
- Appearance uses labelled two-column controls, clear application/invoice scope, an independently scrolling body and always-accessible Save / Save preset actions. Changes preview live; Save persists the current draft.
- Save preset closes Appearance first and opens a compact correctly titled dialog. Dialogs are above all menus; names can be entered and saved with mouse or keyboard.
- Invoice header metadata is right-aligned as a compact list with colon separators. Estimated/grand total labels stay on one line while the numeric amount remains prominent. Totals and amount in words receive more width.
- Demo QR summaries include seller/buyer names and GSTINs, reference/date/type, total, item count, primary HSN and explicitly synthetic registration references. UTF-8 encoding preserves punctuation and non-ASCII names. Appearance → View QR summary displays the exact current payload.
- Fixed unfinished catalogue-rate price hints crashing draft rendering. Fill Demo Data now passes a regression check starting from an incomplete line while preserving that draft.

Verification: TypeScript and production build passed; 117 service tests passed. The standalone package passed the targeted Appearance/preset/demo checks at 1024/1366/1840px and the seven-document preview/export/Print PDF-handoff suite. Font/pagination fixtures and 15-item one-page/50-item checks passed. Demo and signed QR fixture payloads were decoded exactly from 300dpi PDF renders. Physical printer output was not exercised.

A demo QR contains readable text, not a Google/web link and not an official registration. A compatible text-QR scanner can show that summary; camera apps differ in their handling of text codes. A public browser summary would require an actual hosted page. Invoice data is not uploaded to Google. The UPI payment QR remains separate. Official signed e-invoice verification uses the portal/supported verifier; see [GSTN guidance](https://www.gstn.org.in/faqs-category-details).

Desktop launchers start the backend automatically. Previous packages and original issued PDFs remain available. The active demo checkpoint and existing records are preserved. Test coverage does not guarantee universal bug-free operation.

---

# Invoice Studio v4-12

Released 31 October 2026. This release improves presentation and draft recovery while preserving issued financial snapshots, original PDFs and the active demo checkpoint.

## What changed

- Fit Width / 100%, Appearance and Invoice controls are in the command row. The preview starts immediately below the demo banner; its floating page indicator is outside printed content.
- Locally bundled PDF.js displays the same generated PDF used by export and Print. Edit Preview retains interactive fields, then returns to the viewed PDF page. Pages render lazily; stale layout responses are ignored.
- Invalid drafts retain their fields and preview controls. The last valid PDF is labelled out of date; initial incomplete documents show their own layout. Invalid exports remain blocked.
- Fill Demo Data opens a complete separate example for the selected type. Current and edited samples are preserved. Each document type remembers its own working draft.
- Tax examples include a readable, explicitly unregistered demo QR and a matching sample e-way appendix. Normal PDF/Print includes both pages; Invoice only is available in More. Demo evidence is never official registration evidence.
- Proforma, advance payment receipt, challan, credit note, bill of supply and debit note have appropriate sections and totals. Advance receipts retain the existing payment accounting; this is not a new statutory GST receipt-voucher engine.
- Encrypted Windows recovery copies retain unsaved drafts through session expiry and restart. Reauthentication preserves the editor, revision conflicts preserve both versions, and uncertain issuance checks for a committed result before retry.
- Demo cleanup also removes the session's protected recovery copies, preventing demo drafts from returning after restoration.

## Using this version

Double-click the Desktop shortcut **Invoice Studio 4 Updated**, or **Start Server.cmd** inside that Desktop folder. The backend starts automatically. Sign in with your existing account. In the yellow demo banner, choose **Fill Demo Data**. Type tabs open their respective complete examples while in example mode. **Remove All Demo Data** restores the pre-demo workspace; all changes made during that demo session are temporary.

Existing issued documents keep their original snapshots/templates/PDFs. New editable documents use v4-12. Official IRN/QR registration still requires portal export/import and supported verification; the sample QR is explicitly not registered.

## Verified release checks

- TypeScript check, production build and 116 service tests passed.
- Standalone Windows package: all seven document examples filled, edited, saved, reopened, switched, previewed, exported and passed through the Print PDF handoff. Preview/export/Print bytes matched.
- Two-page standard tax example; one-page advance receipt; invoice-plus-e-way ordering verified. All seven PDFs rendered and visually inspected.
- 15-item one-page fixture, 50-item repeated headings, Segoe UI/Arial/Cambria at 8/9/12pt, case-calculation visibility and one-line interest clause passed PDF checks.
- Demo and signed-QR fixture payloads decoded exactly from 300dpi PDF renders at 32mm.
- 1024/1366/1840px checks passed. Page navigation and returning from Edit Preview retain the viewed page.
- Invalid PIN/rate/zero receipt/no-item charge cases retained the preview. Encrypted recovery, expired sign-in, restart, revision conflicts and a lost successful-issue response passed isolated tests.
- Exact pre-demo checkpoint restoration and recovery-file removal passed. Actual existing workspace checkpoint/protected records and all original PDF hashes were checked before delivery.
- Official evidence mismatch rejection, unsupported signing-key pending status, attachment ordering and original snapshot preservation passed.

## Practical limits

Print tests exercise the application's native PDF handoff without sending paper to a physical printer. Printer drivers, paper alignment and an actual paper print were not tested. Official portal submissions were not performed. Tests are evidence for the covered cases, not a guarantee of universal bug-free operation.

This is a locally built, unsigned Windows package. Previous program folders remain available for rollback; user data is never automatically rolled back. Keep the demo checkpoint until cleanup succeeds.

Document particulars were reviewed against the [CBIC invoice, credit/debit note and delivery challan reference](https://cbic-gst.gov.in/gst-invoice-rules.html). Sample documents are not valid for tax or transport.
