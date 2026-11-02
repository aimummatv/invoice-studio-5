import {randomUUID} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import type {Profile,Customer} from '../core/model.ts';
import {emptyProfile} from '../core/model.ts';
import {validateAppearance,gstinValid,validateCustomer} from '../core/validation.ts';
import {validateLabels} from '../core/invoice-labels.ts';
import {Store,canonical} from './store.ts';

export interface PortableSettings {format:'invoice-studio-private-settings';version:1;profile:Partial<Profile>;customers:Customer[];appearance?:unknown}
const profileKeys=['name','brandName','tagline','address','city','pincode','state','gstin','pan','fssai','phone','email','bankName','accountHolder','accountNumber','ifsc','bankBranch','accountType','businessType','gstRegistrationDate','panFormationDate','fssaiFeePaidUntil','bank','upi','terms','paymentTerms','logoData','staticQrData','stampData','signatureData','invoiceTypography','signingSpace','printVisibility','invoiceLabels','registered','composition','defaultGst','warehouseAddress','warehouseState','warehousePincode'] as const;
export function portableSettings(s:Store):PortableSettings {
 const profile=s.profile();return {format:'invoice-studio-private-settings',version:1,profile:Object.fromEntries(profileKeys.filter(k=>profile[k]!==undefined).map(k=>[k,profile[k]])),customers:s.customers(),appearance:JSON.parse(String(s.db.prepare("SELECT payload FROM app_settings WHERE key='appearance'").get()?.payload||'null'))};
}
export function writePrivateSettings(s:Store):string {
 const folder=join(s.root,'Settings');mkdirSync(folder,{recursive:true});const path=join(folder,'business-settings.json'),stage=path+'.'+randomUUID()+'.tmp';
 writeFileSync(stage,canonical(portableSettings(s)),{mode:0o600});renameSync(stage,path);return path;
}
export function importPortableSettings(s:Store,token:string,input:unknown){
 s.actor(token,'settings');const data=input as PortableSettings;
 if(!data||data.format!=='invoice-studio-private-settings'||data.version!==1||!data.profile||!Array.isArray(data.customers)||data.customers.length>10000)throw Error('Choose a version 1 private settings file.');
 if(Object.keys(data.profile).some(k=>!profileKeys.includes(k as typeof profileKeys[number])))throw Error('Settings cannot import credentials, workspace identity or invoice numbering.');
 if(data.appearance)validateAppearance(data.appearance as import('../core/model.ts').Appearance);if(data.profile.invoiceLabels)validateLabels(data.profile.invoiceLabels);
 const customers=data.customers.map(row=>{validateCustomer(row);const matches=s.customers().filter(c=>row.gstin?c.gstin===row.gstin:c.id===row.id);if(matches.length>1)throw Error('Duplicate GSTIN in existing customers.');const prior=matches[0];if(prior){const fields=['name','address','state','phone','city','pincode','gstin'] as const;if(fields.some(k=>(prior[k]||'')!==(row[k]||'')))throw Error('Customer import conflicts with saved details. Review the existing customer.');return {...row,id:prior.id,revision:prior.revision};}return {...row,id:randomUUID(),revision:0};});
 if(new Set(customers.filter(c=>c.gstin).map(c=>c.gstin)).size!==customers.filter(c=>c.gstin).length)throw Error('Duplicate GSTIN in import.');
 s.tx(()=>{s.saveProfile(token,{...s.profile(),...data.profile});for(const customer of customers)s.saveCustomer(token,customer);if(data.appearance){const old=s.db.prepare("SELECT revision FROM app_settings WHERE key='appearance'").get();s.db.prepare('INSERT INTO app_settings VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET revision=excluded.revision,payload=excluded.payload').run('appearance',Number(old?.revision||0)+1,canonical(data.appearance));}});
 return {customers:customers.length,path:writePrivateSettings(s)};
}
export function parsePartnerDocument(source:string):PortableSettings {
 const get=(text:string,label:string)=>{const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp('^'+escaped+':[ \\t]*(.+)$','mi').exec(text)?.[1]?.trim()||'';};
 const blocks=source.split(/^\d+\.\s+/m).slice(1);const customers:Customer[]=[];
 for(const raw of blocks){const block=raw;const name=get(block,'Company Name');if(!name)continue;const address=/Billing Address:\s*\r?\n([\s\S]*?)\r?\nState:/i.exec(block)?.[1]?.trim();if(!address)throw Error('A billing address is missing.');const gstin=get(block,'GSTIN'),state=get(block,'State Code');if(!gstinValid(gstin)||gstin.slice(0,2)!==state)throw Error('GSTIN/state validation failed.');const customer:Customer={id:randomUUID(),revision:0,name,address:address.replace(/\r\n/g,'\n'),state,gstin,phone:get(block,'Mobile Number'),kind:'customer',termsDays:0,favourite:true,pincode:/\b(\d{6})\b/.exec(address)?.[1]||''};validateCustomer(customer);customers.push(customer);}
 if(new Set(customers.map(c=>c.gstin)).size!==customers.length)throw Error('Duplicate GSTIN in source document.');if(customers.length!==4)throw Error('Expected exactly four companies in this document.');
 // The legal name appears again inside the business block: locate the section
 // using Account Holder, rather than relying on a heading or display spelling.
 const seller=source.slice(source.indexOf('Account Holder:'));
 const val=(label:string)=>get(seller,label);const sellerDate=(label:string)=>{const v=val(label),m=/^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(v);if(!m)throw Error('Invalid business date.');return `${m[3]}-${m[2]}-${m[1]}`;};
 const profile:Partial<Profile>={name:val('Legal Business Name'),address:val('Registered Address'),pincode:/\b(\d{6})\b/.exec(val('Registered Address'))?.[1]||'',state:val('GSTIN').slice(0,2),gstin:val('GSTIN'),pan:val('PAN'),fssai:val('FSSAI Registration'),bankName:val('Bank Name'),accountHolder:val('Account Holder'),accountNumber:val('Account Number'),ifsc:val('IFSC Code'),bankBranch:val('Branch'),accountType:val('Account Type'),businessType:val('Business Type'),gstRegistrationDate:sellerDate('GST Registration Date'),panFormationDate:sellerDate('PAN Formation Date'),fssaiFeePaidUntil:sellerDate('FSSAI Fee Paid Upto'),registered:true,composition:false};
 if(!gstinValid(profile.gstin||'')||profile.gstin!.slice(2,12)!==profile.pan||!/^\d{14}$/.test(profile.fssai||'')||!profile.name||!profile.address)throw Error('Business identity validation failed.');
 return {format:'invoice-studio-private-settings',version:1,profile,customers};
}
export function seedUnconfiguredBusiness(s:Store,documentPath:string){
 if(s.mode!=='LIVE'||s.security.hasUsers()||s.customers().length||s.profile().name||!existsSync(documentPath))return;
 const data=parsePartnerDocument(readFileSync(documentPath,'utf8'));s.tx(()=>{const profile={...emptyProfile(),...data.profile,mode:'LIVE' as const,series:'MR',templateVersion:'v5-1',taxRuleVersion:'LIVE-DOMESTIC-1'};s.db.prepare('UPDATE profile SET payload=? WHERE id=?').run(canonical(profile),'business');for(const c of data.customers)s.db.prepare('INSERT INTO customers VALUES(?,?,?,?)').run(c.id,c.revision,c.kind,canonical(c));});
 const saved=portableSettings(s);for(const [key,value]of Object.entries(data.profile))if(canonical(saved.profile[key as keyof Profile])!==canonical(value))throw Error('Business import read-back mismatch.');for(const c of data.customers){const row=saved.customers.find(x=>x.gstin===c.gstin);if(canonical(row)!==canonical(c))throw Error('Customer import read-back mismatch.');}writePrivateSettings(s);
}
