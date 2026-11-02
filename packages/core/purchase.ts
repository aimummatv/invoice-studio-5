import type {Purchase,Product,Profile,Customer} from './model.ts';
import {newDraft,newLine} from './model.ts';
import {calculate,dec,validDate} from './money.ts';
export function purchaseCalculation(p:Purchase,products:Product[],profile:Profile,supplier:Customer){
 if(p.reverseCharge!==undefined&&typeof p.reverseCharge!=='boolean')throw Error('Reverse charge must be a boolean.');
 if(!Array.isArray(p.lines)||!p.lines.length)throw Error('Add purchase lines.');
 const draft=newDraft(p.id);Object.assign(draft,{date:p.date,dueDate:p.dueDate||p.date,freight:p.freight||'0',packing:p.packing||'0',discount:p.discount||'0',roundOff:p.roundOff||'0',placeOfSupply:profile.state,reverseCharge:p.reverseCharge||false});
 draft.lines=p.lines.map((line,index)=>{const product=products.find(product=>product.id===line.productId);if(!product)throw Error('Purchase product unavailable.');if(typeof line.cases!=='boolean')throw Error('Choose base units or cases.');const quantity=dec(line.quantity).times(line.cases?product.casePack:'1');const category=line.category||product.category;
  if(!['taxable','nil','exempt','nonGST'].includes(category)||!['eligible','blocked','pending'].includes(line.itc))throw Error('Review purchase classification.');
  if(line.itcPeriod&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(line.itcPeriod))throw Error('Invalid ITC review period.');
  if(line.itcReason!==undefined&&(typeof line.itcReason!=='string'||line.itcReason.length>2000))throw Error('Invalid ITC reason.');
  if(line.expiry&&!validDate(line.expiry))throw Error('Invalid purchase expiry date.');
  return {...newLine('purchase-line-'+index),productId:product.id,description:product.name,hsn:product.hsn,unit:product.unit,casePack:product.casePack,quantity:quantity.toString(),rate:line.cost,gst:line.gst,category};
 });
 const totals=calculate(draft,{...profile,state:supplier.state});
 const lines=p.lines.map((line,index)=>{const calculated=totals.lines[index]!,product=products.find(p=>p.id===line.productId)!;return {...line,category:calculated.category,baseQuantity:calculated.quantity,casePackAtPost:product.casePack,chargesMinor:calculated.charges,taxableMinor:calculated.taxable,taxMinor:calculated.tax,cgstMinor:calculated.cgst,sgstMinor:calculated.sgst,igstMinor:calculated.igst,itcReason:line.itcReason||'',itcPeriod:line.itcPeriod||p.date.slice(0,7),inventoryCostMinor:calculated.taxable};});
 return {totals,lines,ruleVersion:profile.taxRuleVersion,notice:'Charges/discounts use the provisional reviewed line-allocation policy. ITC classification does not establish claim eligibility.'};
}
