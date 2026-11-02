import type {Draft,Profile,Line} from './model.ts';
import {D} from './money.ts';
export const PRINT_FIELDS:readonly string[]=['brandName','name','tagline','address','gstin','pan','phone','email','fssai','paymentTerms','bankName','accountNumber','ifsc','bank','upi','hsn','quantity','rate','gst','itemTotals'] as const;
export function visible(d:Draft,p:Profile,key:string){return d.appearance.visibility?.[key]??p.printVisibility?.[key]??true;}
export function presentationErrors(d:Draft,p:Profile,required:string[]=[]){return required.filter(key=>key==='einvoiceQr'?d.appearance.einvoiceQr===false:!visible(d,p,key)).map(key=>'Required print field is hidden: '+key);}
export function quantitySummary(lines:Line[]){const quantities=new Map<string,InstanceType<typeof D>>();let cases=new D(0);for(const l of lines){const isCase=['CASE','CAS','CASES'].includes(l.unit.toUpperCase());if(isCase)cases=cases.plus(l.quantity);const unit=isCase?(l.baseUnit||'NOS'):l.unit.toUpperCase();const q=new D(l.quantity).times(isCase?l.casePack:1);quantities.set(unit,(quantities.get(unit)||new D(0)).plus(q));}return [...(cases.gt(0)?[cases.toString()+' cases']:[]),...[...quantities].map(([unit,q])=>q.toString()+' '+unit)].join(' · ');}

export function caseCalculation(l:Line){return `${l.quantity} cases × ${l.casePack} ${l.unitDescription||'pieces'} per case = ${new D(l.quantity).times(l.casePack).toString()} ${l.unitDescription||'pieces'}`;}
export function displayedQuantity(l:Line){return l.quantity+(l.unitDisplay==='none'?'':l.unit.toUpperCase()==='CASE'?' cases':' '+l.unit);}
export function displayQuantityTotal(lines:Line[]){if(lines.length&&lines.every(l=>l.unit.toUpperCase()==='CASE'))return lines.reduce((n,l)=>n.plus(l.quantity),new D(0)).toString()+' cases';if(lines.length&&lines.every(l=>l.unitDisplay==='none'))return lines.reduce((n,l)=>n.plus(l.quantity),new D(0)).toString();return quantitySummary(lines);}

export function invoiceQuantityTotal(lines:Line[]){const groups=new Map<string,InstanceType<typeof D>>();for(const l of lines){const key=l.unit==='CASE'?'cases':l.unitDisplay==='none'?'':l.unit;groups.set(key,(groups.get(key)||new D(0)).plus(l.quantity));}return [...groups].map(([k,v])=>v.toString()+(k?' '+k:'')).join(' · ');}
