import Decimal from './vendor/decimal.cjs';
import type {Draft,Profile,CalculatedLine,Totals} from './model.ts';
const DecimalBase = Decimal as unknown as typeof import('decimal.js').default;
export type Dec=InstanceType<typeof DecimalBase>;
export const D = DecimalBase.clone({precision:40,rounding:DecimalBase.ROUND_HALF_UP});
export const RULE_VERSION='TEST-PROVISIONAL-1';
export function normalized(input:unknown, signed=false):string {
  if(typeof input!=='string') throw Error('Use a decimal string.');
  let s=input.trim();
  if(s.includes(',')){
    if(!/^-?(?:\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d{1,6})?$/.test(s))throw Error('Invalid number grouping.');
    s=s.replaceAll(',','');
  }
  s=s.replace(/^(-?)\./,'$10.');
  if(!/^-?\d+(?:\.\d{1,6})?$/.test(s)||s.length>24)throw Error('Enter a decimal with at most six places.');
  const n=new D(s);if(!n.isFinite()||(!signed&&n.isNegative())||n.abs().gt('90000000000'))throw Error('Number outside supported range.');
  return n.toString();
}
export function dec(value:unknown,signed=false){return new D(normalized(value,signed));}
export function minor(value:unknown,signed=false):number {const n=dec(value,signed).times(100).toDecimalPlaces(0).toNumber();if(!Number.isSafeInteger(n))throw Error('Amount exceeds safe integer storage.');return n;}
export function fromMinor(n:number):string {if(!Number.isSafeInteger(n))throw Error('Invalid minor amount.');return new D(n).div(100).toFixed(2);}
export function percent(s:string){const n=dec(s);if(n.gt(100))throw Error('Percentage must be 0–100.');return n;}
export function sum(values:number[]):number {const n=values.reduce((a,b)=>a.plus(b),new D(0)).toNumber();if(!Number.isSafeInteger(n)||Math.abs(n)>9000000000000)throw Error('Total outside supported range.');return n;}
export function allocate(amount:number,weights:InstanceType<typeof D>[]):number[]{
  if(!Number.isSafeInteger(amount)||amount<0)throw Error('Allocation amount must be nonnegative paise.');
  if(!weights.length){if(amount)throw Error('Add a line before charges.');return [];}
  const total=weights.reduce((a,b)=>a.plus(b),new D(0));
  const exact=weights.map((w,i)=>{const x=total.isZero()?new D(amount).div(weights.length):new D(amount).times(w).div(total);return {i,n:x.floor().toNumber(),rest:x.minus(x.floor())};});
  const remaining=amount-sum(exact.map(x=>x.n));const rank=[...exact].sort((a,b)=>b.rest.cmp(a.rest)||a.i-b.i);
  for(let i=0;i<remaining;i++)rank[i%rank.length]!.n++;
  return exact.map(x=>x.n);
}
export function calculate(doc:Draft,profile:Profile):Totals {
  if(doc.type==='ADVANCE_RECEIPT'){const total=minor(doc.amountReceived);if(total<=0)throw Error('Receipt amount must be positive.');return {lines:[],taxable:0,discount:0,charges:0,cgst:0,sgst:0,igst:0,cess:0,tax:0,roundOff:0,total};}
  if(!Array.isArray(doc.lines)||doc.lines.length>1000)throw Error('Use up to 1,000 lines.');
  const noTax=doc.type==='BILL_OF_SUPPLY'||doc.type==='CHALLAN';
  const inter=doc.placeOfSupply!==profile.state||doc.treatment!=='domestic';
  const zero=doc.treatment.endsWith('LUT');const discount=percent(doc.discount);
  const raw=doc.lines.map(l=>{
    const qty=dec(l.quantity),rate=dec(l.rate).times(['CASE','CAS','CASES'].includes(l.unit.toUpperCase())&&l.rateBasis==='piece'?dec(l.casePack):1);if(qty.lte(0))throw Error('Quantity must be positive.');
    const taxRate=noTax||zero||l.category!=='taxable'?new D(0):percent(l.gst);
    const cess=noTax||zero||l.category!=='taxable'?new D(0):percent(l.cess);
    const gross=qty.times(rate);const discounted=gross.times(new D(1).minus(percent(l.discount).div(100))).times(new D(1).minus(discount.div(100)));
    const divisor=l.inclusive?new D(1).plus(taxRate.plus(cess).div(100)):new D(1);
    const base=discounted.div(divisor);const disc=gross.minus(discounted).div(divisor);
    return {l,base,discount:disc.times(100).toDecimalPlaces(0).toNumber(),taxRate,cess};
  });
  const charges=sum([minor(doc.freight),minor(doc.packing)]);const fees=allocate(charges,raw.map(x=>x.base));
  const lines:CalculatedLine[]=raw.map((x,i)=>{
    const base=x.base.times(100).toDecimalPlaces(0).toNumber();const taxable=sum([base,fees[i]!]);
    const cgst=inter?0:new D(taxable).times(x.taxRate).div(200).toDecimalPlaces(0).toNumber();
    const igst=inter?new D(taxable).times(x.taxRate).div(100).toDecimalPlaces(0).toNumber():0;
    const cessMinor=new D(taxable).times(x.cess).div(100).toDecimalPlaces(0).toNumber();
    const tax=sum([cgst,cgst,igst,cessMinor]);return {...x.l,quantity:dec(x.l.quantity).toString(),rate:dec(x.l.rate).toString(),base,discountMinor:x.discount,charges:fees[i]!,taxable,cgst,sgst:cgst,igst,cessMinor,tax,total:sum([taxable,doc.reverseCharge?0:tax])};
  });
  const roundOff=minor(doc.roundOff,true);if(Math.abs(roundOff)>10000)throw Error('Round-off must be within 100 rupees.');
  const taxable=sum(lines.map(x=>x.taxable)),cgst=sum(lines.map(x=>x.cgst)),sgst=sum(lines.map(x=>x.sgst)),igst=sum(lines.map(x=>x.igst)),cess=sum(lines.map(x=>x.cessMinor)),tax=sum([cgst,sgst,igst,cess]);
  const total=sum([taxable,doc.reverseCharge?0:tax,roundOff]);if(total<0)throw Error('Total cannot be negative.');
  return {lines,taxable,discount:sum(lines.map(x=>x.discountMinor)),charges,cgst,sgst,igst,cess,tax,roundOff,total};
}
export function financialYear(date:string):string{if(!validDate(date))throw Error('Invalid date.');const y=Number(date.slice(0,4))-(date.slice(5,7)<'04'?1:0);return `${y}-${String(y+1).slice(-2)}`;}
export function validDate(s:unknown):s is string{return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;}
