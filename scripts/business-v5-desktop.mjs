import {_electron} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {Store} from '../packages/db/store.ts';
import {seedUnconfiguredBusiness} from '../packages/db/private-settings.ts';
import {syntheticPartnerDocument} from '../packages/testing/business-v5-synthetic.ts';
import {newDraft,newLine,DOCUMENT_TYPES} from '../packages/core/model.ts';
import {calculate} from '../packages/core/money.ts';
import {PDFDocument} from 'pdf-lib';

const root=mkdtempSync(join(tmpdir(),'invoice5-desktop-')),evidence=resolve('qa/evidence/business-v5');mkdirSync(evidence,{recursive:true});mkdirSync(join(root,'Imports'));writeFileSync(join(root,'Imports','partners-original.txt'),syntheticPartnerDocument);
const store=new Store(join(root,'Live'),{workspaceMode:'LIVE'});seedUnconfiguredBusiness(store,join(root,'Imports','partners-original.txt'));store.close();
const env={...process.env,STUDIO4_AUTOMATION:'1',STUDIO5_PRIVATE_ROOT:root};delete env.ELECTRON_RUN_AS_NODE;let app,page;const errors=[];
try{
 app=await _electron.launch({...(process.env.STUDIO4_PACKAGED_EXE?{executablePath:resolve(process.env.STUDIO4_PACKAGED_EXE),args:['--business-workspace']}:{args:['.','--business-workspace']}),env,timeout:30000});page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 await page.getByLabel('Your name',{exact:true}).fill('Synthetic Owner');await page.getByLabel('PIN (6–12 digits)',{exact:true}).fill('567890');await page.getByRole('button',{name:'Create Owner',exact:true}).click();await page.locator('.studio-header').waitFor();
 const invoke=(command,payload={})=>page.evaluate(({command,payload})=>window.studio4.invoke(command,payload),{command,payload});
 const state=await invoke('state');assert.equal(state.mode,'LIVE');assert.equal(state.customers.length,4);assert.equal(state.profile.templateVersion,'v5-1');assert.equal(await page.locator('.favourite-name').count(),4);
 await page.getByRole('button',{name:'Example Customer 2',exact:true}).click();
 const customer=state.customers.find(c=>c.name==='Example Customer 2');
 // Save via the real user action; the payload must preserve imported punctuation.
 await page.getByRole('button',{name:'Save',exact:true}).last().click();let saved=(await invoke('state')).drafts[0];assert.equal(saved.customerName,customer.name);assert.equal(saved.address,customer.address);assert.equal(saved.placeOfSupply,'09');
 await page.locator('.appearance-menu>summary').click();await page.getByRole('button',{name:'Edit invoice text',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Edit invoice text'});await dialog.getByLabel('Printed text',{exact:true}).selectOption('date');await dialog.getByLabel('Label text',{exact:true}).fill('Invoice date:');await dialog.getByRole('button',{name:'Save as default',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal((await invoke('state')).profile.invoiceLabels.date,'Invoice date:');
 const line={...newLine(),description:'Synthetic goods',hsn:'100630',quantity:'2',rate:'100',gst:'5'};
 const sample={...newDraft(),customerId:customer.id,customerName:customer.name,address:customer.address,placeOfSupply:customer.state,lines:[line]};
 const results=[];
 for(const type of DOCUMENT_TYPES){let d={...sample,id:crypto.randomUUID(),type,reason:'Synthetic correction',originalId:'synthetic-original',receiptPurpose:'Synthetic advance',amountReceived:'100',lines:type==='ADVANCE_RECEIPT'?[]:[{...line,category:type==='BILL_OF_SUPPLY'?'exempt':'taxable',gst:type==='BILL_OF_SUPPLY'?'0':'5'}]};
  // Correction templates use the same established calculation shape; render the
  // immutable synthetic snapshot directly without creating financial records.
  if(type==='CREDIT_NOTE')d={...d,type:'CREDIT_NOTE'};
  const snapshot={version:1,mode:'LIVE',document:d,profile:(await invoke('state')).profile,buyer:customer,number:'',issuedAt:'',actorId:'owner',totals:calculate({...d,type:type==='CREDIT_NOTE'?'TAX_INVOICE':type},state.profile),ruleVersion:'LIVE-DOMESTIC-1',templateVersion:'v5-1'};
  const {invoiceHTML}=await import('../packages/pdf/template.ts');const html=invoiceHTML(snapshot);assert(html.includes('Invoice date:')||type==='ADVANCE_RECEIPT');assert(!html.includes('TEST ONLY'));assert(!html.includes('FSSAI / Licence'));writeFileSync(join(evidence,type+'.html'),html);
  const pdf=await app.evaluate(async({BrowserWindow},html)=>{const win=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});try{await win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html));return (await win.webContents.printToPDF({printBackground:true,preferCSSPageSize:true,pageSize:'A4'})).toString('base64');}finally{win.destroy();}},html);const bytes=Buffer.from(pdf,'base64');assert((await PDFDocument.load(bytes)).getPageCount()>=1);writeFileSync(join(evidence,type+'.pdf'),bytes);results.push(type);
 }
 await page.screenshot({path:join(evidence,'favourites.png')});assert.deepEqual(errors,[]);assert.equal((await invoke('state')).register.length,0);console.log('PASS: LIVE owner setup, four favourites, exact customer fill, permanent label, seven PDF templates and no issued records. Synthetic workspace: '+root);
 writeFileSync(join(evidence,'results.json'),JSON.stringify({passed:true,results,errors,root},null,2));
}finally{if(app){await app.evaluate(({app})=>app.exit()).catch(()=>{});await app.close().catch(()=>{});}}
