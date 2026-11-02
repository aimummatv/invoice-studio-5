# Tax rules and CA gates

All calculations use `TEST-PROVISIONAL-1`, template `v4-1`, TEST watermark and integer paise with Decimal.js calculations. Quantity/rate inputs allow six places. Per-line base and each tax component round half-up; freight/packing allocate deterministic paise by largest remainder. Signed controlled round-off supported. Credits use original tax/rates and final remaining paise. No fixture is CA approved.

Offline tests cover mixed/inclusive/exclusive rates, intra/interstate, cess, reverse charge, nil/exempt/non-GST, LUT, fractional credits, FY boundaries, 50 lines and input limits. GST summary/2B helpers and a filing tracker validator exist. 2B matching NEVER makes an ITC claim automatically.

Not implemented/approved: complete versioned official GSTR-1/3B and e-way JSON, all applicability/category/rule tables, amendment workflows, return UI, official utility import, complete CA pack and legal sign-off. Proforma/challan tax presentation and receipt time-of-supply need CA review before live use. IRN generation is deferred by scope; legally affected live workflows must remain blocked until an agreed compliant process exists.

Required approvals: business registration/GSTIN; place-of-supply and transaction classifications; scheme/return type; rates/effective dates; rounding and credit/debit cases; numbering/cancellation; statutory field visibility; IRN/e-way applicability; current filing schemas/dates/tolerances and official utility results. No claim of legal compliance or portal acceptance.
