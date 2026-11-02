# v4-13 guided government JSON workflow

**Status: approved; implementation paused at the user's request. No v4-13 implementation is included in this publication.**

## Confirmed decisions

- Guided manual portal transfer; no direct API integration or developer credentials.
- Ordinary domestic taxable B2B invoices and linked credit/debit notes; eligible goods invoices for separate e-way exports. Unsupported supply mappings remain blocked with explanations.
- Three shared Step 6/GST & Tax tabs: Prepare JSON, Portal & Response, Saved History.
- Public official portal links work in demo, while production-ready demo uploads remain blocked.
- A separate Owner-activated live workspace, with reviewed business details and selected real customers/products only. Preserve TEST and the active checkpoint; copy no demo/financial records or credentials.
- Accept official e-way PDFs plus reviewed references when no suitable JSON response is supplied, clearly labelled manually reviewed.

## Implementation requirements

### Guided workflow

Complete invoice -> validate -> finalize local number -> download/copy JSON -> open official portal -> user registers -> paste/upload response -> review/confirm -> enriched PDF revision.

Generate a versioned official upload envelope from the immutable financial snapshot. Replace the current e-way review worksheet with actual supported portal-upload JSON. Reconcile quantities, case pricing, discounts, charges, GST and rounding exactly; block unsupported precision/mappings rather than silently changing amounts. Keep incomplete drafts saved and show field-specific correction links.

### UI and portal handoff

Prepare JSON: readable invoice/transport summary; Download JSON, Copy JSON, View JSON, Open saved folder; confirmation before local financial finalization.

Portal & Response: official e-invoice and e-way buttons, Copy link, verified navigation guidance, Paste response JSON, Choose JSON file, Review response, Confirm and save. Open the system browser without invoice data in URLs. User performs login/OTP/registration. Do not assume a portal paste box or equate browser launch with registration. Reuse e-way results returned with an IRP response to avoid duplicate generation.

Saved History: retain preparation, copy/download, response/error, confirmation and PDF revision actions with actor/time/status; reopen exact JSON/PDF artifacts.

After confirmed evidence import, automatically create a separate enriched PDF revision and refresh the preview. PDF failure permits retry without repeating financial posting or registration.

### Live workspace

Backend-owned TEST/LIVE metadata and Owner setup wizard. Confirm legal identity, GSTIN/PAN consistency, addresses, invoice series/FY starting numbers and reviewed applicability; set a new live Owner PIN. Never convert historical TEST snapshots to LIVE through renderer input or environment overrides. Save work before workspace switching; isolate recovery, files, jobs and backups. Update supported TEST-only validation, reports, PDF markings and launchers deliberately. Where IRN is required, block customer release while locally finalized/awaiting IRN. Financial corrections use existing reviewed services.

### Storage and validation

Permission-checked actions for workspace setup/switching, transfer preparation/copy/download, response review/confirmation/history. Store exact request/response bytes, hashes, attachments and append-only events linked to workspace/invoice/schema/environment. Retain malformed/error responses for troubleshooting without storing credentials, OTPs or PINs. Observe only explicit workflow clipboard actions.

Use the same bounded parser for paste/upload, versioned official schemas/fixtures, matching of GSTINs/document identity/amounts/item count/main HSN/registration details and supported signature verification. Keep signed payloads unchanged. Unknown/failed signatures stay pending. Duplicate imports are idempotent; ambiguous bulk results require selection and validation. Persist reviews across restart instead of relying solely on the in-memory expiry map. Recheck permissions and hashes on Owner confirmation.

Extend migrations/backups and retain pre-demo checkpoint restoration compatibility. GSTR-1 has separate portal review/reconciliation status; auto-population never means the return was filed.

## Acceptance and delivery

Test official schema/sample compatibility; quantity/price/tax mappings; browser handoff; all response/error variants; restart, session expiry, conflicts, storage/PDF failures; exact artifact history; TEST/LIVE isolation/setup/numbering/permissions/backup/restore/demo cleanup; all seven documents; TypeScript/service/desktop tests; standalone package verification. Preserve original records and PDF hashes. Refresh launchers, source ZIP, examples, instructions and release checklist together; retain the previous package.

A real portal round-trip is user-controlled through an available sandbox or an explicitly authorized real invoice. Until performed, report portal acceptance as unverified.

## Official references

- https://einvoice1.gst.gov.in/Documents/UserManual_BulkE_invoiceGenerationtool.pdf
- https://docs.ewaybillgst.gov.in/html/faq.html
- https://tutorial.gst.gov.in/downloads/news/E-invoice_to_GSTR1.pdf
