// Implementation-first revision. Not exercised or migration-tested yet.
export const EXTENSION_SCHEMA=`
CREATE TABLE IF NOT EXISTS app_settings(key TEXT PRIMARY KEY,revision INTEGER NOT NULL,payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS role_permissions(role TEXT NOT NULL,permission TEXT NOT NULL,allowed INTEGER NOT NULL CHECK(allowed IN(0,1)),PRIMARY KEY(role,permission));
CREATE TABLE IF NOT EXISTS approval_requests(id TEXT PRIMARY KEY,action TEXT NOT NULL,entity_id TEXT NOT NULL,entity_hash TEXT NOT NULL,payload TEXT NOT NULL,requester_id TEXT NOT NULL,policy_version TEXT NOT NULL,at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS approval_decisions(request_id TEXT PRIMARY KEY REFERENCES approval_requests(id),decision TEXT NOT NULL CHECK(decision IN('approved','rejected')),approver_id TEXT NOT NULL,reason TEXT NOT NULL,at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS approval_consumptions(request_id TEXT PRIMARY KEY REFERENCES approval_requests(id),action TEXT NOT NULL,entity_id TEXT NOT NULL,at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS supplier_allocations(id TEXT PRIMARY KEY,payment_id TEXT NOT NULL REFERENCES payments(id),purchase_id TEXT NOT NULL REFERENCES purchase_documents(id),amount INTEGER NOT NULL CHECK(amount>0));
CREATE TABLE IF NOT EXISTS financial_adjustments(id TEXT PRIMARY KEY,party_id TEXT NOT NULL REFERENCES customers(id),document_id TEXT REFERENCES documents(id),kind TEXT NOT NULL,amount INTEGER NOT NULL,mode TEXT NOT NULL,reference TEXT NOT NULL,reason TEXT NOT NULL,date TEXT NOT NULL,actor_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS purchase_returns(id TEXT PRIMARY KEY,purchase_id TEXT NOT NULL REFERENCES purchase_documents(id),date TEXT NOT NULL,reason TEXT NOT NULL,total INTEGER NOT NULL,payload TEXT NOT NULL,actor_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS stock_adjustments(id TEXT PRIMARY KEY,product_id TEXT NOT NULL REFERENCES products(id),date TEXT NOT NULL,reason TEXT NOT NULL,payload TEXT NOT NULL,actor_id TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tax_rules(id TEXT PRIMARY KEY,revision INTEGER NOT NULL,product_id TEXT,hsn TEXT NOT NULL,category TEXT NOT NULL,rate TEXT NOT NULL,effective_from TEXT NOT NULL,effective_to TEXT NOT NULL,payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS gstr2b_imports(id TEXT PRIMARY KEY,period TEXT NOT NULL,hash TEXT NOT NULL,payload TEXT NOT NULL,at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS gstr2b_reviews(id TEXT PRIMARY KEY,import_id TEXT NOT NULL REFERENCES gstr2b_imports(id),payload TEXT NOT NULL,actor_id TEXT NOT NULL,reason TEXT NOT NULL,at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS gst_tracker_events(id TEXT PRIMARY KEY,period TEXT NOT NULL,return_type TEXT NOT NULL,payload TEXT NOT NULL,actor_id TEXT NOT NULL,at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS attachments(id TEXT PRIMARY KEY,entity_id TEXT NOT NULL,name TEXT NOT NULL,path TEXT NOT NULL,hash TEXT NOT NULL,at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS legacy_records(source_hash TEXT NOT NULL,kind TEXT NOT NULL,source_id TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(source_hash,kind,source_id));
CREATE TABLE IF NOT EXISTS legacy_files(id TEXT PRIMARY KEY,source_hash TEXT NOT NULL,document_id TEXT NOT NULL,path TEXT NOT NULL,hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reconciliation_jobs(id TEXT PRIMARY KEY,state TEXT NOT NULL,payload TEXT NOT NULL,actor_id TEXT NOT NULL,at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS diagnostic_runs(id TEXT PRIMARY KEY,payload TEXT NOT NULL,actor_id TEXT NOT NULL,at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS supplier_allocations_purchase ON supplier_allocations(purchase_id);
CREATE INDEX IF NOT EXISTS approvals_entity ON approval_requests(entity_id,action);
CREATE INDEX IF NOT EXISTS adjustments_party_date ON financial_adjustments(party_id,date);
`;
export const EXTENSION_IMMUTABLE=['approval_requests','approval_decisions','approval_consumptions','supplier_allocations','financial_adjustments','purchase_returns','stock_adjustments','gstr2b_imports','gstr2b_reviews','gst_tracker_events','attachments','legacy_records','legacy_files','diagnostic_runs'];
export function extensionTriggers():string{return EXTENSION_IMMUTABLE.map(t=>`CREATE TRIGGER IF NOT EXISTS ${t}_no_update BEFORE UPDATE ON ${t} BEGIN SELECT RAISE(ABORT,'immutable ${t}'); END; CREATE TRIGGER IF NOT EXISTS ${t}_no_delete BEFORE DELETE ON ${t} BEGIN SELECT RAISE(ABORT,'immutable ${t}'); END;`).join('\n');}
