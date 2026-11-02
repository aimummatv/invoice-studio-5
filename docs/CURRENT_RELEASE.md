# Finalized release baseline: v4-12.2

Implemented and packaged before GitHub publication. Validation recorded in the local release checklist:

- 120 service tests, TypeScript and production build passed.
- All seven document workflows passed packaged fill/edit/save/reopen/preview/export/Print PDF-handoff checks.
- Main HSN uses the highest-taxable-value line; IRN generation date is included in demo summaries; official imports reject inconsistent main HSN and keep missing/invalid registration dates pending.
- TEST/LIVE separation and guided portal tabs described in v4-13 remain planned, not implemented.
- Original records/PDF hashes and the active demo checkpoint were preserved.
- Physical printer output and a real portal submission were not exercised.

Machine-specific reports and local business data are excluded from Git. Re-run CI/checks on future commits; the prior package's verification is not a claim about untested modifications.
