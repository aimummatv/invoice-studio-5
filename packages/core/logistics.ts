import {STATE_CODES} from './validation.ts';
import {dec,validDate} from './money.ts';
import type {Draft} from './model.ts';
export interface Logistics {
 transporterName:string;transporterId:string;transportMode:'road'|'rail'|'air'|'ship'|'';vehicleNumber:string;distanceKm:string;
 dispatchAddress:string;dispatchState:string;dispatchPincode:string;deliveryPincode:string;
 shippingBillNumber:string;shippingBillDate:string;portCode:string;countryCode:string;currencyCode:string;
 ewayBillNumber:string;ewayBillDate:string;irn:string;ackNumber:string;ackDate:string;
}
export const emptyLogistics=():Logistics=>({transporterName:'',transporterId:'',transportMode:'',vehicleNumber:'',distanceKm:'',dispatchAddress:'',dispatchState:'',dispatchPincode:'',deliveryPincode:'',shippingBillNumber:'',shippingBillDate:'',portCode:'',countryCode:'',currencyCode:'INR',ewayBillNumber:'',ewayBillDate:'',irn:'',ackNumber:'',ackDate:''});
export interface CompliancePolicy {version:string;effectiveFrom:string;effectiveTo:string;reviewer:string;reference:string;ewayApplicable:'unknown'|'yes'|'no';einvoiceApplicable:'unknown'|'yes'|'no';requiredPrintFields?:string[]}
export function logisticsErrors(d:Draft,policy?:CompliancePolicy):{field:string;message:string}[]{
 const l=d.logistics||emptyLogistics(),errors:{field:string;message:string}[]=[];
 const add=(field:string,message:string)=>errors.push({field:'logistics.'+field,message});
 for(const [key,value]of Object.entries(l)){if(typeof value!=='string'||value.length>5000||value.includes('\0'))add(key,'Enter a valid value.');}
 for(const key of ['shippingBillDate','ewayBillDate','ackDate'] as const)if(l[key]&&!validDate(l[key]))add(key,'Enter a valid date.');
 for(const key of ['dispatchPincode','deliveryPincode'] as const)if(l[key]&&!/^\d{6}$/.test(l[key]))add(key,'Enter a six-digit Indian pincode.');
 if(l.distanceKm){try{if(!/^\d+$/.test(l.distanceKm)||dec(l.distanceKm).lte(0)||dec(l.distanceKm).gt(4000))add('distanceKm','Enter a whole number from 1 to 4000 km.');}catch{add('distanceKm','Enter a valid distance.');}}
 if(l.ackNumber&&!/^\d{15}$/.test(l.ackNumber))add('ackNumber','Acknowledgement number must contain 15 digits.');
 if(l.irn&&!/^[a-fA-F0-9]{64}$/.test(l.irn))add('irn','IRN must contain 64 hexadecimal characters.');
 if(l.ewayBillNumber&&!/^\d{12}$/.test(l.ewayBillNumber))add('ewayBillNumber','E-way bill number must contain 12 digits.');
 if(l.dispatchState&&!STATE_CODES.has(l.dispatchState))add('dispatchState','Choose a valid two-digit state code.');
 if(l.transporterId&&!/^[0-9A-Z]{15}$/.test(l.transporterId))add('transporterId','Enter a 15-character GSTIN or transporter ID in capitals.');
 if(l.transportMode&&!['road','rail','air','ship'].includes(l.transportMode))add('transportMode','Choose a supported transport mode.');
 if(policy&&d.date>=policy.effectiveFrom&&(!policy.effectiveTo||d.date<=policy.effectiveTo)){
  if(policy.ewayApplicable==='yes'&&['TAX_INVOICE','BILL_OF_SUPPLY','CHALLAN'].includes(d.type))for(const key of ['transporterName','transportMode','distanceKm','dispatchAddress','dispatchState','dispatchPincode','deliveryPincode'] as const)if(!l[key])add(key,'Required by the selected reviewed e-way policy.');
  if(policy.ewayApplicable==='yes'&&l.transportMode==='road'&&!l.vehicleNumber)add('vehicleNumber','Vehicle number required by the reviewed road-transport policy.');
  if(policy.einvoiceApplicable==='yes'&&['TAX_INVOICE','CREDIT_NOTE','DEBIT_NOTE'].includes(d.type)&&!l.irn)add('irn','The reviewed external IRN process must supply its identifier. The app does not generate IRNs.');
 }
 return errors;
}
