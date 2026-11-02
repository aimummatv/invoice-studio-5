# Invoice Studio 5.0.0 — private business setup

2 November 2026.

Implemented: immutable TEST/LIVE workspace identity, isolated private storage, local company/customer import with field-by-field read-back, customer favourites, editable printed captions and persistent defaults, FSSAI caption, portable settings JSON and local settings folder access. Private settings exclude credentials, workspace mode and numbering counters.

LIVE setup confirms numbering before issuance. Unknown applicability blocks real issuance; required IRN blocks customer export/open/print until matching production evidence is verified. LIVE synchronization is disabled. Existing TEST data and demo checkpoints stay separate. Historical templates and issued snapshots remain unchanged. New business documents use template v5-1.

Validation: TypeScript and production build; 129 service tests including source-document mapping, migration, immutable workspace mode, applicability/IRN gates, settings conflicts, favourites, restart and LIVE backup restoration; synthetic desktop checks for Owner setup, exact customer fill, persistent captions and all seven PDF templates. PDF pages were rendered and visually inspected. The packaged app is checked using the same isolated desktop workflow and the detached-output startup regression.

Publication requirements: privacy scan against the local reference, sanitized history and release assets, software-only Windows downloads. Real import verification and rollback copies remain private outside the repository. Historical external copies cannot be recalled.

Limits: unsigned Windows package; physical printer output and real government portal acceptance are unverified. E-invoice/e-way applicability must be reviewed by the Owner; software validation is not confirmation of government registration. The guided government JSON workflow remains paused.
