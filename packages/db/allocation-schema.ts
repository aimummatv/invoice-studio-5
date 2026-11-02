export const ALLOCATION_SCHEMA = `
CREATE TABLE allocation_reversals(
 id TEXT PRIMARY KEY,
 allocation_id TEXT NOT NULL UNIQUE REFERENCES payment_allocations(id),
 effective_date TEXT NOT NULL,
 actor_id TEXT NOT NULL,
 reason TEXT NOT NULL,
 at TEXT NOT NULL
);
CREATE TABLE supplier_allocation_reversals(
 id TEXT PRIMARY KEY,
 allocation_id TEXT NOT NULL UNIQUE REFERENCES supplier_allocations(id),
 effective_date TEXT NOT NULL,
 actor_id TEXT NOT NULL,
 reason TEXT NOT NULL,
 at TEXT NOT NULL
);
CREATE TABLE allocation_history(
 direction TEXT NOT NULL CHECK(direction IN('customer','supplier')),
 allocation_id TEXT NOT NULL,
 effective_date TEXT NOT NULL,
 actor_id TEXT NOT NULL,
 at TEXT NOT NULL,
 PRIMARY KEY(direction,allocation_id)
);
CREATE TABLE allocation_commands(
 key TEXT PRIMARY KEY,
 request_hash TEXT NOT NULL,
 payment_id TEXT NOT NULL REFERENCES payments(id),
 result TEXT NOT NULL,
 actor_id TEXT NOT NULL,
 at TEXT NOT NULL
);
INSERT INTO allocation_history
 SELECT 'customer',a.id,MAX(p.date,d.date),p.actor_id,strftime('%Y-%m-%dT%H:%M:%fZ','now')
 FROM payment_allocations a JOIN payments p ON p.id=a.payment_id JOIN documents d ON d.id=a.document_id;
INSERT INTO allocation_history
 SELECT 'supplier',a.id,MAX(p.date,d.date),p.actor_id,strftime('%Y-%m-%dT%H:%M:%fZ','now')
 FROM supplier_allocations a JOIN payments p ON p.id=a.payment_id JOIN purchase_documents d ON d.id=a.purchase_id;
CREATE INDEX allocation_history_date ON allocation_history(direction,effective_date);
`;
export function allocationTriggers():string {
 return ['allocation_reversals','supplier_allocation_reversals','allocation_history','allocation_commands'].map(table=>`
 CREATE TRIGGER ${table}_no_update BEFORE UPDATE ON ${table} BEGIN SELECT RAISE(ABORT,'immutable ${table}'); END;
 CREATE TRIGGER ${table}_no_delete BEFORE DELETE ON ${table} BEGIN SELECT RAISE(ABORT,'immutable ${table}'); END;`).join('\n');
}
