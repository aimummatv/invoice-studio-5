import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../db/store.ts';
import {Operations} from '../db/operations.ts';
import {fixture,draft} from './fixtures.ts';
import {portableSettings,importPortableSettings,writePrivateSettings,parsePartnerDocument} from '../db/private-settings.ts';
import {applyInvoiceLabels,validateLabels} from '../core/invoice-labels.ts';
import {renderInvoice} from '../pdf/template.ts';
import {businessDate} from '../core/model.ts';
import {financialYear} from '../core/money.ts';
import {syntheticPartnerDocument} from './business-v5-synthetic.ts';

test('document import preserves punctuation, strings and registration-date meanings',()=>{
 const parsed=parsePartnerDocument(syntheticPartnerDocument);
 assert.equal(parsed.customers.length,4);assert.equal(parsed.customers[0]!.state,'07');assert.equal(parsed.customers[0]!.address,'1, Example Street,, Fictional District,\nExample City 110001');assert.equal(parsed.customers[0]!.phone,'9000000001');assert(parsed.customers.every(c=>c.favourite));
 assert.equal(parsed.profile.accountNumber,'00000000000001');assert.equal(parsed.profile.accountHolder,'EXAMPLE BUSINESS');assert.equal(parsed.profile.fssai,'00000000000000');assert.equal(parsed.profile.fssaiFeePaidUntil,'2029-05-15');assert.equal(parsed.profile.gstRegistrationDate,'2026-04-28');assert.equal(parsed.profile.panFormationDate,'2026-02-17');assert.equal(parsed.profile.address,'10 Example Lane,, Example City - 110001');assert(!('fssaiExpiry'in parsed.profile));
});

test('workspace identity is immutable and existing TEST records cannot become LIVE',t=>{
 const f=fixture();t.after(f.cleanup);assert.equal(f.s.mode,'TEST');assert.throws(()=>f.s.db.exec("UPDATE workspace_identity SET mode='LIVE'"),/immutable/);assert.throws(()=>f.s.saveProfile(f.token,{...f.profile,mode:'LIVE'}),/mode cannot/);f.s.close();assert.throws(()=>new Store(f.root,{workspaceMode:'LIVE'}),/identity differs/);
});
test('LIVE setup and applicability block numbering until reviewed; IRN gates release',t=>{
 const f=fixture({workspaceMode:'LIVE'});t.after(f.cleanup);const o=new Operations(f.s);const d=f.s.saveDraft(f.token,draft());const command={draftId:d.id,expectedVersion:d.version,idempotencyKey:'live-one'};
 assert.throws(()=>f.s.issue(f.token,command),/first invoice number/);assert.equal(f.s.db.prepare('SELECT COUNT(*) n FROM series').get()!.n,0);
 const fy=financialYear(businessDate()).slice(2);o.saveSetting(f.token,'liveSetup',0,{confirmed:true,startNumber:1,series:'MR',preview:`MR/TI/${fy}/0001`});assert.throws(()=>f.s.issue(f.token,command),/applicability review/);
 const policy={version:'review-1',reviewer:'Synthetic reviewer',reference:'Synthetic review',effectiveFrom:'2026-04-01',effectiveTo:'2027-03-31',einvoiceApplicable:'yes',ewayApplicable:'no'};o.saveSetting(f.token,'compliance',0,policy);
 f.s.saveProfile(f.token,{...f.s.profile(),gstin:'27AAPFU0939F1ZV',pan:'AAPFU0939F'});const issued=f.s.issue(f.token,command);assert.equal(issued.snapshot.mode,'LIVE');assert.equal(issued.number,'MR/TI/26-27/0001');assert.throws(()=>f.s.assertCustomerRelease(issued.id),/Verified matching IRN/);assert.throws(()=>f.s.saveProfile(f.token,{...f.s.profile(),series:'ZZ'}),/series is locked/);
});
test('portable settings are local, persist favourites, and exclude identity, credentials and numbering',t=>{
 const f=fixture({workspaceMode:'LIVE'});t.after(f.cleanup);f.s.saveCustomer(f.token,{...f.customer,favourite:true});f.s.saveProfile(f.token,{...f.s.profile(),invoiceLabels:{date:'Date:'},accountHolder:'Synthetic account holder'});
 const data=portableSettings(f.s);assert.equal(data.customers.find(c=>c.id===f.customer.id)!.favourite,true);assert.equal(data.profile.invoiceLabels!.date,'Date:');assert(!('series'in data.profile));assert(!('mode'in data.profile));assert(!('pin'in data));const path=writePrivateSettings(f.s);assert.deepEqual(JSON.parse(readFileSync(path,'utf8')),JSON.parse(JSON.stringify(data)));
 assert.throws(()=>importPortableSettings(f.s,f.token,{...data,profile:{...data.profile,series:'ZZ'}}),/numbering/);assert.throws(()=>importPortableSettings(f.s,f.token,{...data,customers:data.customers.map(c=>({...c,address:'different'}))}),/conflicts/);
 const root=f.root;f.s.close();const reopened=new Store(root);assert.equal(reopened.mode,'LIVE');assert.equal(reopened.customers().find(c=>c.id===f.customer.id)!.favourite,true);assert.equal(reopened.profile().invoiceLabels!.date,'Date:');reopened.close();
});
test('labels escape markup and do not change calculated values or historical templates',t=>{
 const f=fixture();t.after(f.cleanup);const saved=f.s.saveDraft(f.token,draft());const issued=f.s.issue(f.token,{draftId:saved.id,expectedVersion:saved.version,idempotencyKey:'label-snapshot'});const original=renderInvoice(issued.snapshot);const modern={...issued.snapshot,templateVersion:'v5-1',profile:{...issued.snapshot.profile,invoiceLabels:{date:'Date: <script>',payment_terms:'Payment terms:'}}};const html=renderInvoice(modern,{},true);assert(html.includes('Date: &lt;script&gt;'));assert(html.includes('data-invoice-label="date"'));assert.equal(renderInvoice(issued.snapshot),original);assert.equal(issued.snapshot.totals.total,11800);assert.throws(()=>validateLabels({date:'\0'}),/Invalid/);assert.equal(applyInvoiceLabels('<span data-invoice-label="date">Date</span>',{date:'Date:'}),'<span>Date:</span>');
});

test('verified local backup restores LIVE identity and private settings into a separate root',async t=>{
 const f=fixture({workspaceMode:'LIVE'});t.after(f.cleanup);f.s.saveCustomer(f.token,{...f.customer,favourite:true});f.s.saveProfile(f.token,{...f.s.profile(),invoiceLabels:{date:'Saved date:'}});const original=f.s.profile();const backup=await f.s.backup(f.token);const target=mkdtempSync(join(tmpdir(),'invoice5-restore-'));t.after(()=>rmSync(target,{recursive:true,force:true}));const restored=Store.restoreToNewRoot(backup.path,backup.hash,target);try{assert.equal(restored.mode,'LIVE');assert.deepEqual(restored.profile(),original);assert.equal(restored.customers().find(c=>c.id===f.customer.id)!.favourite,true);assert.equal(restored.db.prepare('SELECT COUNT(*) n FROM documents').get()!.n,0);assert.equal(restored.verifyInternal().integrity,'ok');}finally{restored.close();}
});
