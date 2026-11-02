export const COMPLIANCE_SCHEMA=`
CREATE TABLE compliance_evidence(id TEXT PRIMARY KEY,document_id TEXT NOT NULL REFERENCES documents(id),kind TEXT NOT NULL CHECK(kind IN('IRP','EWAY','REFERENCE')),status TEXT NOT NULL,metadata TEXT NOT NULL,path TEXT NOT NULL,hash TEXT NOT NULL,actor_id TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(document_id,kind,hash,status));
CREATE INDEX compliance_document ON compliance_evidence(document_id,created_at);
CREATE TABLE document_presentations(id TEXT PRIMARY KEY,document_id TEXT NOT NULL REFERENCES documents(id),revision INTEGER NOT NULL,kind TEXT NOT NULL CHECK(kind IN('invoice','combined')),evidence_hash TEXT NOT NULL,path TEXT NOT NULL,hash TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(document_id,kind,revision));
`;
export function complianceTriggers(){return ['compliance_evidence','document_presentations'].map(table=>`CREATE TRIGGER ${table}_no_update BEFORE UPDATE ON ${table} BEGIN SELECT RAISE(ABORT,'immutable ${table}'); END;CREATE TRIGGER ${table}_no_delete BEFORE DELETE ON ${table} BEGIN SELECT RAISE(ABORT,'immutable ${table}'); END;`).join('\n');}
