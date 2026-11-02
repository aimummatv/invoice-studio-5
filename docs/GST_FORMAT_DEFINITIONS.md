# Installing reviewed GST format definitions

The implementation-first source has a versioned schema/mapping adapter. It does **not** ship an invented official 2026 GSTR/e-way schema, and it cannot establish CA approval or official-utility acceptance.

A definition is a JSON object containing `id`, `version`, `kind` (GSTR1/GSTR3B/EWAY), `effectiveFrom`, `effectiveTo`, bundled JSON `schema`, data-only `mapping`, `requiredPaths`, `reviewer`, `reviewDate`, and HTTPS `source`. Install it through GST Filing → Install reviewed schema / mapping. Existing versions are not replaced. Candidate exports carry a separate TEST manifest and remain unapproved.

Mapping objects support literals and these operators:

- `$path`: read a safe dotted path from the current environment.
- `$map`: `{input, body}` maps an array; `item` and one-based `index` are available.
- `$filter`: `{input, field, op, value}`, with `eq`, `neq`, `in`, `notEmpty`.
- `$group`: `{input, by, body}` exposes `key` and `items`.
- `$sum`: `{input, field}` sums integer minor units.
- `$money`: serialize integer paise as a canonical rupee decimal string.
- `$number`: emit an exact decimal JSON number; serialization does not calculate authoritative money with binary floating point.
- `$date`: map an ISO date, optionally `format: DD-MM-YYYY`.
- `$coalesce`: select the first present value.

Environment: immutable active `documents`, reviewed `profile`, selected `period`, and `purchases`. No JavaScript, arbitrary method invocation, prototype paths, remote schema loading or portal filing is supported. Current source uses bundled-schema validation through Ajv; the implementation itself is untested.

The actual mapping must be prepared against the current official schema and book fixtures, reviewed by the CA, and tested in the current official utility later. Schema validation alone is not acceptance evidence.
