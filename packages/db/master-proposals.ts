import {randomUUID} from 'node:crypto';
import {Store,canonical,hash} from './store.ts';
import {validateCustomer,validateProduct,id,text} from '../core/validation.ts';
import type {Customer,Product} from '../core/model.ts';
export interface MasterEdit {kind:'customer'|'supplier'|'product';id:string;expectedRevision:number;changes:Record<string,unknown>;sourceRow?:number}
const partyFields=['name','address','shippingAddress','state','gstin','termsDays','phone','email','city','pincode','creditLimit','archived'];
const productFields=['sku','name','hsn','unit','saleUnit','rate','gst','category','casePack','tracked','batchTracked','reorder','barcode','mrp','archived'];
export class MasterProposals {
 readonly s:Store;
 constructor(s:Store){this.s=s;}
 private visible(token:string,payload:Record<string,unknown>){let canSeeCost=false;try{this.s.security.require(token,'cost');canSeeCost=true;}catch{}if(canSeeCost)return payload;const safe=structuredClone(payload) as {rows?:{before?:Record<string,unknown>;after?:Record<string,unknown>}[]};for(const row of safe.rows||[])for(const value of [row.before,row.after])if(value)delete value.purchaseCost;return safe;}
 private current(edit:MasterEdit):Customer|Product|null{return edit.kind==='product'?this.s.products().find(p=>p.id===edit.id)||null:this.s.customers().find(p=>p.id===edit.id)||null;}
 preview(token:string,source:string,edits:MasterEdit[]){
  const actor=this.s.actor(token,'masters');text(source,'Source',200);if(!Array.isArray(edits)||!edits.length||edits.length>500)throw Error('Use 1–500 proposed master edits.');
  const errors:{row:number;message:string}[]=[],seen=new Set<string>();
  const rows=edits.map((edit,index)=>{let before:Customer|Product|null=null,after:unknown=null,fields:string[]=[];try{
   if(!['customer','supplier','product'].includes(edit.kind))throw Error('Only customer, supplier and product master proposals are allowed.');id(edit.id);if(!Number.isInteger(edit.expectedRevision)||edit.expectedRevision<0)throw Error('Invalid expected master revision.');
   const key=(edit.kind==='product'?'product':'party')+':'+edit.id;if(seen.has(key))throw Error('Duplicate master in proposal.');seen.add(key);
   if(!edit.changes||typeof edit.changes!=='object'||Array.isArray(edit.changes))throw Error('Changes must be a plain object.');const allowed=edit.kind==='product'?productFields:partyFields;
   if(Object.keys(edit.changes).some(k=>!allowed.includes(k)))throw Error('The proposal contains a protected or unsupported field.');
   before=this.current(edit);if((before?.revision||0)!==edit.expectedRevision)throw Error('Local revision conflicts with the Sheet proposal.');if(before&&'kind'in before&&before.kind!==edit.kind)throw Error('Party type cannot change.');
   after={...(before||{}),...edit.changes,id:edit.id,revision:edit.expectedRevision,...(edit.kind==='product'?{}:{kind:edit.kind})};
   edit.kind==='product'?validateProduct(after as Product):validateCustomer(after as Customer);
   fields=Object.keys(edit.changes).filter(k=>canonical((before as unknown as Record<string,unknown>|null)?.[k]??null)!==canonical(edit.changes[k]));
  }catch(e){errors.push({row:edit.sourceRow||index+2,message:(e as Error).message});}
  return {edit,before,after,fields};});
  const baseline=rows.map(row=>({kind:row.edit.kind,id:row.edit.id,before:row.before})),baselineHash=hash(baseline),payload={rows,errors};const sourceHash=hash({source,edits});
  const old=this.s.db.prepare('SELECT id,payload FROM master_proposals WHERE source=? AND source_hash=? AND baseline_hash=? ORDER BY rowid DESC LIMIT 1').get(source,sourceHash,baselineHash);if(old)return {id:old.id,...this.visible(token,JSON.parse(old.payload as string))};
  const proposalId=randomUUID();this.s.tx(()=>{this.s.db.prepare('INSERT INTO master_proposals VALUES(?,?,?,?,?,?,?)').run(proposalId,source,sourceHash,canonical(payload),baselineHash,actor.id,new Date().toISOString());this.s.audit(actor,'master-proposal-previewed',proposalId,{source,sourceHash,rows:rows.length,errors:errors.length});});return {id:proposalId,...this.visible(token,payload)};
 }
 async decide(token:string,proposalId:string,decision:'accepted'|'rejected',reason:string){
  const actor=this.s.actor(token,'approve');id(proposalId);text(reason,'Reason',2000);if(reason.trim().length<3||!['accepted','rejected'].includes(decision))throw Error('Choose a decision and enter a reason.');
  if(decision==='accepted')await this.s.backup(token,'before-master-proposal');
  return this.s.tx(()=>{const proposal=this.s.db.prepare('SELECT * FROM master_proposals WHERE id=?').get(proposalId);if(!proposal)throw Error('Proposal unavailable.');if(this.s.db.prepare('SELECT 1 FROM master_proposal_decisions WHERE proposal_id=?').get(proposalId))throw Error('Proposal already decided.');const payload=JSON.parse(proposal.payload as string);
   if(decision==='accepted'){if(payload.errors.length)throw Error('Resolve every proposal error and preview again.');const baseline=payload.rows.map((row:{edit:MasterEdit})=>({kind:row.edit.kind,id:row.edit.id,before:this.current(row.edit)}));if(hash(baseline)!==proposal.baseline_hash)throw Error('Local masters changed after preview. Fetch and preview again.');for(const row of payload.rows){if(!row.fields.length)continue;row.edit.kind==='product'?this.s.saveProduct(token,row.after):this.s.saveCustomer(token,row.after);}}
   this.s.db.prepare('INSERT INTO master_proposal_decisions VALUES(?,?,?,?,?)').run(proposalId,decision,reason,actor.id,new Date().toISOString());this.s.audit(actor,'master-proposal-'+decision,proposalId,{reason});return {id:proposalId,decision};
  });
 }
 list(token:string){this.s.actor(token,'masters');return this.s.db.prepare('SELECT p.*,d.decision,d.reason FROM master_proposals p LEFT JOIN master_proposal_decisions d ON d.proposal_id=p.id ORDER BY p.at DESC').all().map(row=>({...row,payload:this.visible(token,JSON.parse(row.payload as string))}));}
}
