import {_electron} from 'playwright-core';
import {mkdtempSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
import {newDraft,newLine} from '../packages/core/model.ts';
const executablePath=process.env.STUDIO4_PACKAGED_EXE;if(!executablePath||!existsSync(executablePath))throw Error('Set STUDIO4_PACKAGED_EXE to the packaged Windows executable.');
const root=mkdtempSync(resolve('../../packaged-smoke-'));let app;
try{
 const cleanEnv={...process.env};delete cleanEnv.ELECTRON_RUN_AS_NODE;app=await _electron.launch({executablePath,args:['--user-data-dir='+join(root,'profile')],env:{...cleanEnv,STUDIO4_AUTOMATION:'1',STUDIO4_TEST_ROOT:join(root,'data')}});
 await app.evaluate(({shell})=>{shell.showItemInFolder=()=>{};shell.openPath=async()=>'';});const page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.locator('.welcome').waitFor();
 const invoke=(command,payload={})=>page.evaluate(async({command,payload})=>window.studio4.invoke(command,payload),{command,payload});
 await invoke('setup',{id:'packaged-review',name:'Synthetic Package Review',pin:'567890'});await invoke('login',{id:'packaged-review',pin:'567890'});let state=await invoke('state');assert.equal(state.profile.templateVersion,'v4-12');
 await invoke('saveProfile',{profile:{...state.profile,name:'Synthetic Package Review',address:'1 Example Road',state:'27',templateVersion:'v4-12'}});
 const customer=await invoke('saveCustomer',{customer:{id:'package-buyer',revision:0,name:'Synthetic Buyer',address:'2 Example Road',state:'27',gstin:'',kind:'customer',termsDays:15}});
 const draft=await invoke('saveDraft',{draft:{...newDraft(),customerId:customer.id,customerName:customer.name,address:customer.address,placeOfSupply:'27',lines:[{...newLine(),description:'Package smoke test',hsn:'20019000',rate:'100',gst:'18'}]}});
 const result=await invoke('issue',{draftId:draft.id,expectedVersion:draft.version,idempotencyKey:'packaged-issue'});const pdf=await invoke('pdf',{id:result.id});assert.equal(readFileSync(pdf.path).subarray(0,5).toString(),'%PDF-');const compliance=await invoke('files',{action:'complianceStatus',input:{id:result.id}});assert.equal(compliance.evidence.length,0);assert.deepEqual(errors,[]);
 writeFileSync(resolve('../../desktop-release-v12/package-test.json'),JSON.stringify({passed:true,executablePath,root,pdfCreated:true,template:'v4-12',errors},null,2));console.log('PASS: standalone packaged executable, local backend, v4-12 template, issue, PDF export and compliance status.');
}finally{if(app)await app.close().catch(()=>{});}


