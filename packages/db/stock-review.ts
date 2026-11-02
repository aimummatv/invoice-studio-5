import {purchaseCalculation} from '../core/purchase.ts';
import {randomUUID} from 'node:crypto';
import {Store,canonical,hash} from './store.ts';
import {D,dec,allocate,sum} from '../core/money.ts';
import type {Draft,Purchase,Totals,Actor} from '../core/model.ts';
import {id,text} from '../core/validation.ts';
type Qty=InstanceType<typeof D>;
interface Planned {productId:string;batch:string;expiry:string;quantity:string;value:number;line:string;kind:string;date:string}
const draftHash=(d:Draft)=>hash({...d,version:0,stockReviewId:undefined});
export function stockBaseline(s:Store,productIds:string[]){return hash(productIds.slice().sort().map(productId=>({productId,rows:s.db.prepare('SELECT * FROM stock_movements WHERE product_id=? ORDER BY rowid').all(productId)})));}
export class StockReview {
 readonly s:Store;
 constructor(s:Store){this.s=s;}
 policy(){return JSON.parse((this.s.db.prepare("SELECT payload FROM app_settings WHERE key='stock'").get()?.payload as string)||'{"negativeStockPolicy":"block","selection":"FEFO"}') as {negativeStockPolicy:string;selection:string;policyVersion?:string};}
 plan(d:Draft,t:Totals,options:{allowNegative?:boolean;allowLotOverride?:boolean;allowBackdated?:boolean;negativeUnitCost?:string}={}){
  const plans:Planned[]=[],warnings:string[]=[];const quantities=new Map<string,Qty>(),values=new Map<string,number>();
  const products=this.s.products();const ids=[...new Set(t.lines.map(l=>l.productId).filter(id=>products.some(p=>p.id===id&&p.tracked)))];
  for(const line of t.lines){const product=products.find(p=>p.id===line.productId);if(!product?.tracked)continue;
   const last=this.s.db.prepare('SELECT MAX(date) date FROM stock_movements WHERE product_id=?').get(product.id)?.date;
   if(last&&String(last)>d.date&&!options.allowBackdated)throw Error('Use the reviewed backdated-cost workflow; ordinary issue cannot precede later stock events.');
   const qty=dec(line.quantity).times(line.unit.toUpperCase()==='CASE'?line.casePack:'1');
   const total=this.s.stock(product.id,undefined,options.allowBackdated?d.date:undefined),available=quantities.get(product.id)||dec(total.quantity,true),value=values.get(product.id)??total.value;
   const lots=this.s.db.prepare("SELECT batch,MAX(expiry) expiry FROM stock_movements WHERE product_id=? AND date<=? GROUP BY batch ORDER BY CASE WHEN MAX(expiry)='' THEN '9999-12-31' ELSE MAX(expiry) END,batch").all(product.id,d.date).filter(l=>!l.expiry||String(l.expiry)>=d.date);
   const eligible=lots.filter(l=>dec((quantities.get(product.id+'|'+l.batch)||new D(this.s.stock(product.id,String(l.batch),options.allowBackdated?d.date:undefined).quantity)).toString(),true).gt(0));
   if(line.batch&&eligible.length&&eligible[0]!.batch!==line.batch){warnings.push(product.name+': selected batch overrides FEFO.');if(!options.allowLotOverride)throw Error('Owner lot-selection review required for the selected batch.');}
   let remaining=qty;const selections:{batch:string;expiry:string;quantity:Qty}[]=[];
   for(const lot of eligible.filter(l=>!line.batch||l.batch===line.batch)){if(remaining.isZero())break;const key=product.id+'|'+lot.batch,lotQty=quantities.get(key)||dec(this.s.stock(product.id,String(lot.batch),options.allowBackdated?d.date:undefined).quantity,true);const taken=D.min(remaining,lotQty);quantities.set(key,lotQty.minus(taken));selections.push({batch:String(lot.batch),expiry:String(lot.expiry),quantity:taken});remaining=remaining.minus(taken);}
   if(remaining.gt(0)){
    warnings.push(product.name+': insufficient eligible stock; negative-stock exception required.');
    if(!options.allowNegative||this.policy().negativeStockPolicy!=='warn'||product.allowNegative===false)throw Error('Insufficient eligible stock. Negative stock is blocked by policy or lacks Owner review.');
    if(product.batchTracked)throw Error('Negative stock is blocked for batch/expiry tracked products. Receive verified stock first.');
    if(!options.negativeUnitCost||dec(options.negativeUnitCost).lte(0))throw Error('Enter an explicit positive unit cost for the negative-stock exception.');
    selections.push({batch:'',expiry:'',quantity:remaining});
   }
   const positive=D.min(qty,D.max(available,0));const normalCost=available.gt(0)?positive.eq(available)?Math.max(0,value):new D(value).div(available).times(positive).toDecimalPlaces(0).toNumber():0;
   const deficit=qty.minus(positive);const cost=sum([normalCost,deficit.gt(0)?dec(options.negativeUnitCost||'0').times(deficit).times(100).toDecimalPlaces(0).toNumber():0]);
   if(cost>line.taxable)warnings.push(product.name+': selling below the current stock cost.');
   quantities.set(product.id,available.minus(qty));values.set(product.id,sum([value,-cost]));const costs=allocate(cost,selections.map(l=>l.quantity));
   selections.forEach((lot,index)=>plans.push({productId:product.id,batch:lot.batch,expiry:lot.expiry,quantity:lot.quantity.negated().toString(),value:-costs[index]!,line:line.id,kind:d.type==='CHALLAN'?'dispatch':'sale',date:d.date}));
  }
  return {plans,warnings,productIds:ids,baselineHash:stockBaseline(this.s,ids)};
 }
 approveIssue(token:string,draftId:string,reason:string,options:{allowNegative?:boolean;allowLotOverride?:boolean;allowBackdated?:boolean;negativeUnitCost?:string}){
  const actor=this.s.actor(token,'approve');this.s.actor(token,'cost');for(const key of ['allowNegative','allowLotOverride','allowBackdated'] as const)if(options?.[key]!==undefined&&typeof options[key]!=='boolean')throw Error('Invalid stock review option.');text(reason,'Stock review reason',2000);if(reason.trim().length<3)throw Error('Enter the review reason.');const draft=this.s.draft(draftId);if(!draft)throw Error('Save the draft before reviewing stock.');this.s.checkPeriod(draft.date);
  const totals=this.s.calculateForReview(draft);const result=this.plan(draft,totals,options);const corrections=options?.allowBackdated?this.replayChanges(result.productIds,result.plans):[];const reviewId=randomUUID();this.s.tx(()=>{this.s.db.prepare('INSERT INTO stock_reviews VALUES(?,?,?,?,?,?,?,?)').run(reviewId,draft.id,draftHash(draft),result.baselineHash,canonical({kind:'issue',...result,options,corrections}),reason,actor.id,new Date().toISOString());this.s.audit(actor,'stock-issue-reviewed',draft.id,{reviewId,warnings:result.warnings,reason});});return {id:reviewId,warnings:result.warnings,corrections};
 }
 postIssue(actor:Actor,draft:Draft,totals:Totals){
  const options:{allowNegative?:boolean;allowLotOverride?:boolean;allowBackdated?:boolean;negativeUnitCost?:string}={};let review:Record<string,unknown>|undefined;
  if(draft.stockReviewId){review=this.s.db.prepare('SELECT * FROM stock_reviews WHERE id=? AND entity_id=?').get(draft.stockReviewId,draft.id);if(!review||review.entity_hash!==draftHash(draft)||this.s.db.prepare('SELECT 1 FROM stock_review_uses WHERE review_id=?').get(draft.stockReviewId))throw Error('Stock review is missing, stale or already used.');Object.assign(options,JSON.parse(review.payload as string).options);}
  const plan=this.plan(draft,totals,options);if(review&&review.baseline_hash!==plan.baselineHash)throw Error('Stock changed after review. Request a fresh review.');
  if(plan.warnings.some(w=>w.includes('below'))&&!review&&actor.role!=='Owner')throw Error('Owner review required for below-cost stock.');
  if(review)this.s.db.prepare('INSERT INTO stock_review_uses VALUES(?,?,?)').run(draft.stockReviewId!,draft.id,new Date().toISOString());
  for(const movement of plan.plans)this.s.stockMovement(actor,{...movement,source:draft.id,reason:review?String(review.reason):'Issue under FEFO policy'});
  if(review)for(const correction of JSON.parse(String(review.payload)).corrections||[])this.s.stockMovement(actor,{productId:correction.productId,batch:'',expiry:'',quantity:'0',value:correction.delta,kind:'valuation-review',source:draft.id,line:correction.movementId,date:correction.date,reason:String(review.reason),reversal:correction.movementId});
  if(plan.warnings.length)this.s.audit(actor,'stock-issue-warnings',draft.id,{warnings:plan.warnings,reviewId:draft.stockReviewId||null});
 }
 private replayChanges(productIds:string[],proposed:Planned[]){
  const corrections:{movementId:string;productId:string;date:string;delta:number}[]=[];
  for(const productId of productIds){
   const rows=this.s.db.prepare("SELECT rowid,* FROM stock_movements WHERE product_id=? AND kind!='valuation-review' ORDER BY date,rowid").all(productId).map((row:any)=>({...row,proposed:false}));
   const additions=proposed.filter(p=>p.productId===productId).map((p,index)=>({id:'proposed-'+index,product_id:productId,quantity:p.quantity,value:p.value,kind:p.kind,date:p.date,rowid:Number.MAX_SAFE_INTEGER,proposed:true,reversal_of:null}));
   const all=[...rows,...additions].sort((a,b)=>String(a.date).localeCompare(String(b.date))||Number(a.rowid)-Number(b.rowid));let quantity=new D(0),value=0;const values=new Map<string,number>();
   for(const row of all){const qty=dec(String(row.quantity),true),key=String(row.id);let desired=Number(row.value);
    if(qty.lt(0)&&['sale','dispatch','damage','expiry','sample','count','adjustment'].includes(String(row.kind))){if(quantity.lte(0)||qty.abs().gt(quantity))throw Error('Backdated replay creates a stock deficit.');desired=qty.abs().eq(quantity)?-value:new D(value).div(quantity).times(qty).toDecimalPlaces(0).toNumber();}
    if(row.kind==='sales-return'&&row.reversal_of&&values.has(String(row.reversal_of))){const original=all.find(m=>m.id===row.reversal_of)!;desired=new D(-values.get(String(row.reversal_of))!).times(qty).div(dec(String(original.quantity),true).abs()).toDecimalPlaces(0).toNumber();}
    if(row.kind==='reversal'&&row.reversal_of&&values.has(String(row.reversal_of)))desired=-values.get(String(row.reversal_of))!;
    quantity=quantity.plus(qty);value=sum([value,desired]);if(quantity.lt(0)||value<0||quantity.isZero()&&value!==0)throw Error('Backdated replay needs quantity/value reconciliation.');values.set(key,desired);
    if(!row.proposed){const prior=sum(this.s.db.prepare("SELECT value FROM stock_movements WHERE reversal_of=? AND kind='valuation-review'").all(key).map(v=>Number(v.value)));const delta=sum([desired,-Number(row.value),-prior]);if(delta){this.s.checkPeriod(String(row.date));corrections.push({movementId:key,productId,date:String(row.date),delta});}}
   }
  }return corrections;
 }
 // A backdated receipt is replayed chronologically; historical movements stay immutable.
 previewPurchase(token:string,purchase:Purchase){this.s.actor(token,'cost');this.s.actor(token,'purchase');id(purchase.id);this.s.checkPeriod(purchase.date);const supplier=this.s.customers().find(c=>c.id===purchase.supplierId&&c.kind==='supplier');if(!supplier)throw Error('Choose a supplier.');const calculated=purchaseCalculation(purchase,this.s.products(),this.s.profile(),supplier);const productIds=[...new Set(purchase.lines.map(l=>l.productId))];const corrections:{movementId:string;productId:string;date:string;delta:number}[]=[];
  for(const productId of productIds){const product=this.s.products().find(p=>p.id===productId);if(!product)throw Error('Product unavailable.');if(!product.tracked)continue;
   const originals=this.s.db.prepare("SELECT rowid,* FROM stock_movements WHERE product_id=? AND kind!='valuation-review' ORDER BY date,rowid").all(productId);
   const candidates=purchase.lines.filter(l=>l.productId===productId).map((l,index)=>{const quantity=dec(l.quantity).times(l.cases?product.casePack:'1');if(quantity.lte(0))throw Error('Quantity must be positive.');return {id:'proposed-'+index,product_id:productId,quantity:quantity.toString(),value:calculated.lines[purchase.lines.indexOf(l)]!.inventoryCostMinor,kind:'purchase',date:purchase.date,rowid:Number.MAX_SAFE_INTEGER,proposed:true,reversal_of:null};});
   const all=[...originals,...candidates].sort((a,b)=>String(a.date).localeCompare(String(b.date))||Number(a.rowid)-Number(b.rowid));let quantity=new D(0),value=0;const newValues=new Map<string,number>();
   for(const row of all){const qty=dec(String(row.quantity),true);let desired=Number(row.value);const id=String(row.id);
    if(qty.lt(0)&&['sale','dispatch','damage','expiry','sample','count','adjustment'].includes(String(row.kind))){if(quantity.lte(0)||qty.abs().gt(quantity))throw Error('Backdated replay creates negative stock; resolve the exception before posting.');desired=qty.abs().eq(quantity)?-value:new D(value).div(quantity).times(qty).toDecimalPlaces(0).toNumber();}
    if(row.kind==='sales-return'&&row.reversal_of&&newValues.has(String(row.reversal_of))){const original=all.find(m=>m.id===row.reversal_of)!;desired=new D(-newValues.get(String(row.reversal_of))!).times(qty).div(dec(String(original.quantity),true).abs()).toDecimalPlaces(0).toNumber();}
    quantity=quantity.plus(qty);value=sum([value,desired]);if(quantity.lt(0)||value<0||quantity.isZero()&&value!==0)throw Error('Backdated replay requires further quantity/value reconciliation.');newValues.set(id,desired);
    if(!('proposed'in row)){const existingAdjustments=sum(this.s.db.prepare("SELECT value FROM stock_movements WHERE reversal_of=? AND kind='valuation-review'").all(id).map(x=>Number(x.value)));const delta=sum([desired,-Number(row.value),-existingAdjustments]);if(delta){this.s.checkPeriod(String(row.date));corrections.push({movementId:id,productId,date:String(row.date),delta});}}
   }
  }
  return {purchaseHash:hash({...purchase,stockReviewId:undefined}),productIds,baselineHash:stockBaseline(this.s,productIds),corrections,notice:'Replay orders the new receipt after existing events on its date. Quantity and valuation are validated; every cost difference posts as an append-only valuation review.'};
 }
 approvePurchase(token:string,purchase:Purchase,reason:string){const actor=this.s.actor(token,'approve');text(reason,'Cost review reason',2000);if(reason.trim().length<3)throw Error('Enter a reason.');const result=this.previewPurchase(token,purchase),reviewId=randomUUID();this.s.tx(()=>{this.s.db.prepare('INSERT INTO stock_reviews VALUES(?,?,?,?,?,?,?,?)').run(reviewId,purchase.id,result.purchaseHash,result.baselineHash,canonical({kind:'purchase',...result}),reason,actor.id,new Date().toISOString());this.s.audit(actor,'backdated-purchase-reviewed',purchase.id,{reviewId,corrections:result.corrections,reason});});return {id:reviewId,...result};}
 consumePurchase(actor:Actor,purchase:Purchase){if(!purchase.stockReviewId)return null;const review=this.s.db.prepare('SELECT * FROM stock_reviews WHERE id=? AND entity_id=?').get(purchase.stockReviewId,purchase.id);if(!review||review.entity_hash!==hash({...purchase,stockReviewId:undefined})||this.s.db.prepare('SELECT 1 FROM stock_review_uses WHERE review_id=?').get(purchase.stockReviewId))throw Error('Cost review is stale or consumed.');const payload=JSON.parse(review.payload as string);if(payload.kind!=='purchase'||stockBaseline(this.s,payload.productIds)!==review.baseline_hash)throw Error('Stock changed after cost review.');this.s.db.prepare('INSERT INTO stock_review_uses VALUES(?,?,?)').run(purchase.stockReviewId,purchase.id,new Date().toISOString());return {review,payload};}
}
