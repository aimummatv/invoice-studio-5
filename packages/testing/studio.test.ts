import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,draft} from './fixtures.ts';
import {invoiceHTML} from '../pdf/template.ts';
import {health} from '../core/validation.ts';

test('business settings preserve old issued templates while new invoices use the new brand and prefix',t=>{
 const f=fixture();t.after(f.cleanup);
 f.s.saveProfile(f.token,{...f.s.profile(),templateVersion:'v4-5'});
 const oldDraft=f.s.saveDraft(f.token,draft());const issued=f.s.issue(f.token,{draftId:oldDraft.id,expectedVersion:oldDraft.version,idempotencyKey:'old-template'});
 const original=invoiceHTML(issued.snapshot);
 f.s.saveProfile(f.token,{...f.s.profile(),brandName:'New <Brand>',name:'New Entity',city:'New Delhi',pincode:'110041',phone:'9999999999',bankName:'Example Bank',accountNumber:'00123',ifsc:'TEST0000001',series:'MR',templateVersion:'v4-6',paymentTerms:'Net 15 Days'});
 assert.equal(invoiceHTML(f.s.document(issued.id)!.snapshot),original);
 const d=f.s.saveDraft(f.token,draft());const next=f.s.issue(f.token,{draftId:d.id,expectedVersion:d.version,idempotencyKey:'new-template',reviewFingerprint:f.s.duplicateReview(d).fingerprint,duplicateReason:'Intentional repeat invoice for template preservation test'});
 assert.match(next.number,/^MR\/TI/);const html=invoiceHTML(next.snapshot);
 assert.match(html,/New &lt;Brand&gt;/);assert.match(html,/Example Bank/);assert.match(html,/A\/c: 00123/);assert.match(html,/Mobile: 9999999999/);assert.match(html,/Net 15 Days/);
 assert.equal(f.s.document(issued.id)!.hash,issued.hash);
});

test('business preference validation rejects invalid PIN, backup count and boolean values',t=>{
 const f=fixture();t.after(f.cleanup);const p=f.s.profile();
 assert.throws(()=>f.s.saveProfile(f.token,{...p,pincode:'abc'}),/6-digit/);
 assert.throws(()=>f.s.saveProfile(f.token,{...p,backupCount:'0'}),/Retain/);
 assert.throws(()=>f.s.saveProfile(f.token,{...p,refreshExcel:'yes' as unknown as boolean}),/preference/);
 assert.equal(f.s.profile().revision,p.revision);
});

test('registration preference blocks tax invoices and configured e-way threshold creates a review warning',t=>{
 const f=fixture();t.after(f.cleanup);const d=draft();
 assert(health(d,{...f.profile,composition:true}).some(i=>i.field==='document'&&i.severity==='error'));
 assert(!health({...d,type:'BILL_OF_SUPPLY'},{...f.profile,composition:true}).some(i=>i.field==='document'));
 assert(health(d,{...f.profile,ewayThreshold:'100'}).some(i=>i.field==='logistics.ewayBillNumber'&&i.severity==='warning'));
});
