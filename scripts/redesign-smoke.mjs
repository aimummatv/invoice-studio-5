import { _electron } from 'playwright-core';
import {mkdtempSync,mkdirSync,readFileSync,copyFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
const evidence=resolve('../../redesign-evidence');mkdirSync(evidence,{recursive:true});
const root=mkdtempSync(resolve('../../redesign-test-'));
let app,page;
const errors=[];
try {
 app=await _electron.launch({args:['.','--user-data-dir='+join(root,'profile')],env:{...process.env,STUDIO4_AUTOMATION:'1',STUDIO4_TEST_ROOT:join(root,'data')}});
 await app.evaluate(({shell})=>{globalThis.revealed=[];shell.showItemInFolder=path=>{globalThis.revealed.push(path);};shell.openPath=async path=>{globalThis.opened=path;return '';};});
 page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
 await page.getByLabel('Your name',{exact:true}).fill('Studio Review');await page.getByLabel('PIN (6–12 digits)',{exact:true}).fill('567890');await page.getByRole('button',{name:'Create Owner',exact:true}).click();
 await page.locator('.studio-header').waitFor();
 const shell=await page.evaluate(()=>({root:[...document.querySelector('.studio-shell').children].map(n=>n.tagName+':'+n.className),steps:document.querySelectorAll('[aria-label="Invoice workflow"]>button').length}));console.log(JSON.stringify(shell));assert.equal(shell.steps,5);assert(shell.root.some(c=>c==='MAIN:main'),'Main workspace must be a root sibling of sidebar');
 await page.getByRole('button',{name:'Business Settings',exact:true}).click();
 await page.getByLabel('Bank name',{exact:true}).fill('Example Bank');await page.getByLabel('Account number',{exact:true}).fill('000123456789');await page.getByLabel('IFSC',{exact:true}).fill('TEST0000001');await page.getByLabel('Contact phone',{exact:true}).fill('9999999999');
 await page.getByLabel('Refresh app-managed Excel after issue',{exact:true}).check();await page.getByRole('button',{name:'Save company details',exact:true}).click();await page.getByText(/Settings saved/).waitFor();
 if(process.env.STUDIO4_TEST_LOGO){const image=readFileSync(process.env.STUDIO4_TEST_LOGO,'utf8');await page.evaluate(async logo=>{const data=await window.studio4.invoke('state');await window.studio4.invoke('saveProfile',{profile:{...data.profile,logoData:logo}});},image);}
 let data=await page.evaluate(()=>window.studio4.invoke('state'));assert.equal(data.profile.series,'MR');assert.equal(data.profile.templateVersion,'v4-7');assert.equal(data.profile.phone,'9999999999');
 await page.screenshot({path:join(evidence,'business-settings.png')});
 await page.evaluate(async()=>{await window.studio4.invoke('saveCustomer',{customer:{id:'review-customer',revision:0,kind:'customer',name:'Example Buyer',address:'12 Example Street, Delhi',state:'07',gstin:'',termsDays:15}});await window.studio4.invoke('saveProduct',{product:{id:'review-product',revision:0,sku:'MR-001',name:'Green Chilli Pickle',hsn:'20019000',unit:'NOS',rate:'100',gst:'18',category:'taxable',casePack:'24',tracked:false,batchTracked:false,reorder:'0'}});});
 // Reload via sign-in to verify saved business and master details survive restart.
 await app.close();app=await _electron.launch({args:['.','--user-data-dir='+join(root,'profile')],env:{...process.env,STUDIO4_AUTOMATION:'1',STUDIO4_TEST_ROOT:join(root,'data')}});
 await app.evaluate(({shell})=>{globalThis.revealed=[];shell.showItemInFolder=path=>{globalThis.revealed.push(path);};shell.openPath=async path=>{globalThis.opened=path;return '';};});
 page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
 await page.getByLabel('PIN (6–12 digits)',{exact:true}).fill('567890');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('.studio-header').waitFor();
 const workflow=page.getByRole('navigation',{name:'Invoice workflow',exact:true});
 await workflow.getByRole('button').nth(1).click();await page.getByLabel('Customer',{exact:true}).selectOption('review-customer');
 await workflow.getByRole('button').nth(2).click();await page.getByRole('button',{name:'+ Add item',exact:true}).click();await page.locator('.item-card > label select').selectOption('review-product');
 await page.locator('.edit-toggle input').check();await page.locator('[data-edit="lines.0.quantity"]').click();await page.getByRole('dialog').getByLabel('Quantity',{exact:true}).fill('2');await page.getByRole('dialog').getByRole('button',{name:'Save',exact:true}).click();
 assert.equal(await page.getByLabel('Quantity',{exact:true}).inputValue(),'2');assert.match(await page.locator('.invoice').innerText(),/236\.00/);
 await page.getByLabel('Bank details',{exact:true}).uncheck();assert.equal(await page.locator('.invoice').getByText('Bank details',{exact:true}).count(),0);await page.getByLabel('Bank details',{exact:true}).check();
 await workflow.getByRole('button').nth(0).click();
 for(const [width,height] of [[1840,950],[1366,768],[1024,640]]){await app.evaluate(({BrowserWindow},size)=>BrowserWindow.getAllWindows().find(w=>w.isVisible()).setSize(size[0],size[1]),[width,height]);await page.screenshot({path:join(evidence,`workspace-${width}.png`)});assert(await page.locator('.preview-panel').isVisible());assert(await page.locator('.workflow-editor').isVisible());}
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.isVisible()).setSize(1840,950));
 await workflow.getByRole('button').nth(3).click();await page.getByLabel('Notes & terms',{exact:true}).fill('Synthetic review invoice. Payment within 15 days.');
 await workflow.getByRole('button').nth(4).click();await page.getByRole('button',{name:'Issue Invoice',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Issue TEST document',exact:true}).click();await page.getByText(/issued in TEST mode/).waitFor();
 const doc=(await page.evaluate(()=>window.studio4.invoke('state'))).register[0];assert.equal(doc.total,23600);assert(existsSync(join(root,'data','Exports','Invoice-Studio-Register.xlsx')));
 await page.getByRole('button',{name:'PDF',exact:true}).click();await page.getByText(/PDF saved:/).waitFor();
 const reveal=await app.evaluate(()=>globalThis.revealed);assert(reveal.length);const pdf=reveal.at(-1);assert(existsSync(pdf));assert(readFileSync(pdf).subarray(0,4).equals(Buffer.from('%PDF')));copyFileSync(pdf,join(evidence,'sample-invoice.pdf'));
 await page.getByRole('button',{name:'Invoice History',exact:true}).first().click();await page.getByRole('button',{name:'Preview',exact:true}).click();await page.getByRole('dialog',{name:'Issued document detail'}).waitFor();assert.match(await page.getByRole('dialog').innerText(),/MR\/TI/);await page.screenshot({path:join(evidence,'invoice-history.png')});await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Show in folder',exact:true}).click();assert((await app.evaluate(()=>globalThis.revealed)).length>=2);await page.getByRole('button',{name:'Open PDF',exact:true}).click();assert(await app.evaluate(()=>!!globalThis.opened));
 assert.deepEqual(errors,[]);writeFileSync(join(evidence,'results.json'),JSON.stringify({passed:true,root,pdf,total:23600,errors},null,2));console.log('PASS: business settings, restart, five steps, preview editing, toggles, responsive layout, issue, PDF, history and verified file actions.');
}catch(e){console.error(e.stack);if(page){console.error('ALERTS',await page.locator('[role=alert]').allTextContents().catch(()=>[]));await page.screenshot({path:join(evidence,'failure.png')}).catch(()=>{});}process.exitCode=1;}
finally{if(app)await app.close();}



