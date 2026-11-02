// Additive migration. All review decisions and recoveries retain append-only evidence.
export const COMPLETION_SCHEMA=`
CREATE TABLE master_proposals(id TEXT PRIMARY KEY,source TEXT NOT NULL,source_hash TEXT NOT NULL,payload TEXT NOT NULL,baseline_hash TEXT NOT NULL,actor_id TEXT NOT NULL,at TEXT NOT NULL);
CREATE TABLE master_proposal_decisions(proposal_id TEXT PRIMARY KEY REFERENCES master_proposals(id),decision TEXT NOT NULL CHECK(decision IN('accepted','rejected')),reason TEXT NOT NULL,actor_id TEXT NOT NULL,at TEXT NOT NULL);
CREATE TABLE stock_reviews(id TEXT PRIMARY KEY,entity_id TEXT NOT NULL,entity_hash TEXT NOT NULL,baseline_hash TEXT NOT NULL,payload TEXT NOT NULL,reason TEXT NOT NULL,actor_id TEXT NOT NULL,at TEXT NOT NULL);
CREATE TABLE stock_review_uses(review_id TEXT PRIMARY KEY REFERENCES stock_reviews(id),source_id TEXT NOT NULL,at TEXT NOT NULL);
CREATE TABLE recovery_proposals(id TEXT PRIMARY KEY,kind TEXT NOT NULL,entity_id TEXT NOT NULL,payload TEXT NOT NULL,actor_id TEXT NOT NULL,at TEXT NOT NULL);
CREATE TABLE recovery_decisions(proposal_id TEXT PRIMARY KEY REFERENCES recovery_proposals(id),result TEXT NOT NULL,reason TEXT NOT NULL,actor_id TEXT NOT NULL,at TEXT NOT NULL);
CREATE TABLE migration_acceptances(job_id TEXT PRIMARY KEY REFERENCES import_jobs(id),source_hash TEXT NOT NULL,report_hash TEXT NOT NULL,cutover_date TEXT NOT NULL,review_reference TEXT NOT NULL,payload TEXT NOT NULL,actor_id TEXT NOT NULL,at TEXT NOT NULL);
CREATE TABLE document_metadata_events(id TEXT PRIMARY KEY,document_id TEXT NOT NULL REFERENCES documents(id),revision INTEGER NOT NULL,payload TEXT NOT NULL,reason TEXT NOT NULL,actor_id TEXT NOT NULL,at TEXT NOT NULL,UNIQUE(document_id,revision));
CREATE INDEX stock_reviews_entity ON stock_reviews(entity_id);
CREATE INDEX metadata_document ON document_metadata_events(document_id,revision);
`;
export function completionTriggers():string{return ['master_proposals','master_proposal_decisions','stock_reviews','stock_review_uses','recovery_proposals','recovery_decisions','migration_acceptances','document_metadata_events'].map(table=>`CREATE TRIGGER ${table}_no_update BEFORE UPDATE ON ${table} BEGIN SELECT RAISE(ABORT,'immutable ${table}'); END; CREATE TRIGGER ${table}_no_delete BEFORE DELETE ON ${table} BEGIN SELECT RAISE(ABORT,'immutable ${table}'); END;`).join('\n');}
