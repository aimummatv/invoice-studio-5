import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../db/store.ts';
import {newDraft,newLine} from '../core/model.ts';
import type {Draft,Product,Customer} from '../core/model.ts';
export function fixture(options:ConstructorParameters<typeof Store>[1]={}){
 const root=mkdtempSync(join(tmpdir(),'invoice4-test-'));const s=new Store(root,options);s.setup({id:'owner',name:'Synthetic Owner',pin:'567890'});const token=s.login('owner','567890');
 const profile=s.saveProfile(token,{...s.profile(),name:'Fictitious Test Company',address:'1 Example Road, Test City',state:'27',terms:'TEST ONLY • Not for business use'});
 const customer:Customer=s.saveCustomer(token,{id:'customer',revision:0,kind:'customer',name:'Fictitious Buyer',address:'2 Example Street',state:'27',gstin:'',termsDays:15});
 const supplier:Customer=s.saveCustomer(token,{id:'supplier',revision:0,kind:'supplier',name:'Fictitious Supplier',address:'3 Example Street',state:'27',gstin:'',termsDays:30});
 const product:Product=s.saveProduct(token,{id:'product',revision:0,sku:'TEST-001',name:'Fictitious Product',hsn:'001234',unit:'NOS',rate:'100',gst:'18',category:'taxable',casePack:'24',tracked:false,batchTracked:false,reorder:'10'});
 return {root,s,token,profile,customer,supplier,product,cleanup:()=>{try{s.close();}catch{}rmSync(root,{recursive:true,force:true});}};
}
export function draft(extra:Partial<Draft>={}):Draft{return {...newDraft(),date:'2026-10-28',dueDate:'2026-11-12',customerId:'customer',customerName:'Fictitious Buyer',address:'2 Example Street',placeOfSupply:'27',lines:[{...newLine(),productId:'product',description:'Fictitious Product',hsn:'001234',rate:'100',gst:'18'}],...extra};}
