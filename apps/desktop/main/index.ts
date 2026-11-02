import {health} from '../../../packages/core/validation.ts';
import {DemoExamples} from '../../../packages/db/demo-examples.ts';
import {DraftRecovery} from './recovery-drafts.ts';
import {LayoutPreview} from './layout-preview.ts';
import {Compliance} from '../../../packages/db/compliance.ts';
import {DemoSession} from '../../../packages/db/demo.ts';
import {exportWorkbook} from '../../../packages/import-export/workbooks.ts';
import {invoiceFileName} from '../../../packages/core/filenames.ts';
import type {IpcMainInvokeEvent} from 'electron';
import {randomUUID} from 'node:crypto';
import {app,BrowserWindow,ipcMain,dialog} from 'electron';
import {join,dirname} from 'node:path';import {fileURLToPath} from 'node:url';import {existsSync,readFileSync,writeFileSync,renameSync,rmSync,mkdirSync} from 'node:fs';
import {Maintenance} from './maintenance.ts';
import {GoogleManager} from './google-manager.ts';
import {Files} from './files.ts';
import type {Snapshot} from '../../../packages/core/model.ts';
import {calculate} from '../../../packages/core/money.ts';
import {Store,hash} from '../../../packages/db/store.ts';import {Controller} from './controller.ts';import {invoiceHTML} from '../../../packages/pdf/template.ts';
const here=dirname(fileURLToPath(import.meta.url));let store:Store;let controller:Controller;let main:BrowserWindow;let demo:DemoSession;let storeClosed=false;let layout:LayoutPreview;let maintenance:Maintenance;
app.setName('Invoice Studio 4');app.setAppUserModelId('in.ExampleBrand.invoicestudio4');
if(!app.requestSingleInstanceLock())app.quit();
else app.whenReady().then(async()=>{
  // Every build currently uses a separate TEST root. Live mode cannot be selected by renderer input.
  const configPath=join(app.getPath('userData'),'invoice-studio-4-config.json');let configuredRoot='';if(existsSync(configPath)){const config=JSON.parse(readFileSync(configPath,'utf8'));if(typeof config.root!=='string')throw Error('Invalid data-root configuration.');configuredRoot=config.root;}const root=process.env.STUDIO4_AUTOMATION==='1'&&process.env.STUDIO4_TEST_ROOT?process.env.STUDIO4_TEST_ROOT:configuredRoot||join(app.getPath('userData'),'InvoiceStudio4Data','Test');const initialized=existsSync(join(root,'initialized'));
  demo=new DemoSession(root);demo.recoverIfNeeded();
  store=new Store(root,{mustExist:initialized||(process.env.STUDIO4_AUTOMATION!=='1'&&!!configuredRoot)});controller=new Controller(store);if(!initialized)writeFileSync(join(root,'initialized'),'Invoice Studio 4 TEST database initialized\n',{mode:0o600});
  main=new BrowserWindow({width:1440,height:900,minWidth:1024,minHeight:640,title:'Invoice Studio 4 • TEST',webPreferences:{preload:join(here,'preload.cjs'),contextIsolation:true,sandbox:true,nodeIntegration:false,webSecurity:true}});
  main.setMenuBarVisibility(false);main.setAutoHideMenuBar(true);
  main.webContents.setWindowOpenHandler(()=>({action:'deny'}));main.webContents.on('will-navigate',e=>e.preventDefault());main.webContents.session.setPermissionRequestHandler((_web,_permission,callback)=>callback(false));
  const google=new GoogleManager(store,main,join(app.getPath('userData'),'google-credentials.bin'));
  maintenance=new Maintenance(store,google);let closing=false;main.on('close',event=>{if(closing)return;event.preventDefault();main.webContents.send('studio4:before-close');});
  let switchingRoot=false;const files=new Files(store,main,renderReportPDF,root=>{writeFileSync(configPath,JSON.stringify({root}),{mode:0o600});app.relaunch();app.quit();});
  files.demo=demo;const examples=new DemoExamples(store,demo);layout=new LayoutPreview(store,examples);const recovery=new DraftRecovery(join(app.getPath('userData'),'draft-recovery'),store);let recoveryActor='';
  const inFlight=new Set<Promise<unknown>>();
  const dispatchStudio=async(event:IpcMainInvokeEvent,command:unknown,payload:unknown)=>{
    if(event.sender!==main.webContents||event.senderFrame!==main.webContents.mainFrame)return {ok:false,error:'Sender not allowed.'};
    if(switchingRoot&&command!=='closeReady')return {ok:false,error:'Data-root switchover is in progress. Wait for restart.'};
    if(command==='files'&&payload&&typeof payload==='object'&&(payload as {action:string}).action==='demoStatus'){try{store.actor(controller.token,'read');return {ok:true,data:demo.status()};}catch(e){return {ok:false,error:(e as Error).message};}}
    if(command==='recovery'){try{const p=payload as {action:string;input?:unknown};if(!p||Object.keys(p).some(k=>!['action','input'].includes(k)))throw Error('Invalid recovery request.');const data=p.action==='save'?recovery.save(recoveryActor,p.input,demo.active?demo.manifest!.id:''):p.action==='load'?recovery.load(controller.token):p.action==='clear'?recovery.clear(controller.token):(()=>{throw Error('Unknown recovery action.');})();return {ok:true,data};}catch(e){return {ok:false,error:(e as Error).message};}}
    if(command==='fillDemoExample'){try{const p=payload as {type:any};if(!p||Object.keys(p).some(k=>k!=='type'))throw Error('Invalid example request.');return {ok:true,data:examples.fill(controller.token,p.type)};}catch(e){return {ok:false,error:(e as Error).message};}}
    try{demo.guard(String(command),payload);}catch(e){return {ok:false,error:(e as Error).message};}
    if(command==='layoutPreview'){try{return {ok:true,data:await layout.measure(controller.token,payload as Parameters<LayoutPreview['measure']>[1])};}catch(e){return {ok:false,error:(e as Error).message};}}
    if(command==='closeReady'){try{await layout.drain();await maintenance.drain();if(google.busy)throw Error('Google sync is still finishing.');await Promise.allSettled([...pdfTasks.values()]);if(!(payload as {discardUnsaved?:boolean})?.discardUnsaved&&store.security.hasUsers()&&!demo.active)await maintenance.withSystemSession(token=>store.backup(token,'on-close'));closing=true;main.close();return {ok:true,data:true};}catch{maintenance.stopped=false;return {ok:false,error:'Closing backup failed. The app remains open; check the backup destination.'};}}
    if(command==='google'){try{const p=payload as {action:string;input?:Record<string,unknown>;pin?:string};if(!p||typeof p.action!=='string'||Object.keys(p).some(k=>!['action','input','pin'].includes(k)))throw Error('Invalid Google action.');if(['connect','enable','disconnect','repairConflict'].includes(p.action)){const actor=store.actor(controller.token,'sync');const temp=store.login(actor.id,String(p.pin||''));store.security.logout(temp);}return {ok:true,data:await google.handle(controller.token,p.action,p.input||{})};}catch(e){return {ok:false,error:(e as Error).message};}}
    if(command==='files'){try{const p=payload as {action:string;input?:Record<string,unknown>;pin?:string};if(!p||typeof p.action!=='string'||Object.keys(p).some(k=>!['action','input','pin'].includes(k)))throw Error('Invalid file action.');if(['confirmComplianceImport','saveComplianceReference','loadDemoData','removeDemoData','commitWorkbook','activateRestore','restorePreview','legacyCommit','legacyAccept','legacyCutover','legacyStockReview','applyPdfRecovery','applyJobRecovery','relocate','installGstFormat'].includes(p.action)){const actor=store.actor(controller.token,'read');const temp=store.login(actor.id,String(p.pin||''));store.security.logout(temp);}if(p.action==='loadDemoData'||p.action==='removeDemoData'){
       const actor=store.actor(controller.token,'settings');if(actor.role!=='Owner')throw Error('Owner permission required.');
       if(p.input?.acknowledgement!==(p.action==='loadDemoData'?'START DEMO SESSION':'REMOVE ALL DEMO DATA'))throw Error('Confirm the demo session action.');
       if(p.action==='loadDemoData'&&demo.manifest)throw Error('A demo session already exists. Remove it before loading another.');switchingRoot=true;await Promise.allSettled([...inFlight]);await maintenance.drain();if(google.busy)throw Error('Wait for Google work to finish before changing demo sessions.');await Promise.allSettled([...pdfTasks.values()]);
       if(p.action==='loadDemoData'){try{const status=await demo.begin(store,controller.token);switchingRoot=false;return {ok:true,data:status};}catch(e){if(demo.manifest&&!demo.active){closing=true;app.relaunch();main.destroy();}throw e;}}
       recovery.clearDemo(demo.manifest!.id);demo.markRestoring();store.close();storeClosed=true;try{demo.restore();}catch(e){closing=true;app.relaunch();main.destroy();throw e;}closing=true;app.relaunch();main.destroy();return {ok:true,data:{restartRequired:true}};
      }if(p.action==='activateRestore'){switchingRoot=true;await Promise.allSettled([...inFlight]);await maintenance.drain();if(google.busy)throw Error('Wait for Google work to finish before switching roots.');await Promise.allSettled([...pdfTasks.values()]);}const result=await files.handle(controller.token,p.action,p.input||{});return {ok:true,data:result};}catch(e){switchingRoot=false;maintenance.stopped=false;return {ok:false,error:(e as Error).message};}}
    if(command==='pdf'||command==='print'){
      try{store.actor(controller.token,'print');const p=payload as {id:string;invoiceOnly?:boolean};if(!p||typeof p.id!=='string'||Object.keys(p).some(k=>!['id','invoiceOnly'].includes(k)))throw Error('Invalid document request.');const doc=store.document(p.id);if(!doc){const draft=store.draft(p.id);if(!draft)throw Error('Save the draft first.');const issues=health(draft,store.profile()).filter(i=>i.severity==='error');if(issues.length)throw Error(issues.map(i=>i.message).join(' '));}if(doc)await makePDF(doc.id);const result=await layout.render(controller.token,doc?{documentId:doc.id,invoiceOnly:p.invoiceOnly}:{draft:store.draft(p.id)!,invoiceOnly:p.invoiceOnly});const out=writePdf((demo.active?demo.folder('Exports'):'Exports')+'/Presentations/'+invoiceFileName(doc?.number||result.snapshot.previewNumber||('Draft-'+p.id.slice(0,8)),result.snapshot.document.customerName).replace(/\.pdf$/i,'-'+result.key.slice(0,8)+'.pdf'),result.bytes);demo.recordFile(out.path);if(command==='print')await printPDF(out.path);store.audit(store.actor(controller.token,'print'),command==='print'?'document-printed':'pdf-exported',p.id,{hash:out.hash,key:result.key,pages:result.pages});return {ok:true,data:command==='pdf'?await files.exportPdf(controller.token,out.path):out};}catch(e){return {ok:false,error:(e as Error).message};}
    }
    const reply=await controller.dispatch(command,payload);if(command==='login'&&reply.ok)recoveryActor=String((reply.data as any).actor.id);if(command==='logout'&&reply.ok)recoveryActor='';if(reply.ok&&['state','login'].includes(String(command))&&reply.data&&typeof reply.data==='object')(reply.data as Record<string,unknown>).demo=demo.status();if(command==='issue'&&reply.ok&&store.profile().refreshExcel&&!demo.active){try{await maintenance.withSystemSession(async token=>{const path=store.safeFile('Exports/Invoice-Studio-Register.xlsx');const stage=path+'.'+randomUUID()+'.tmp';writeFileSync(stage,await exportWorkbook(store,token),{flag:'wx'});renameSync(stage,path);});}catch{store.audit(store.actor(controller.token,'read'),'excel-refresh-failed','business',{message:'Invoice issued; workbook refresh needs retry.'});}}return reply;
  };
  ipcMain.handle('studio4:command',(event,command:unknown,payload:unknown)=>{const task=dispatchStudio(event,command,payload);const activating=command==='files'&&payload&&typeof payload==='object'&&['activateRestore','loadDemoData','removeDemoData'].includes((payload as {action?:string}).action||'');if(!activating){inFlight.add(task);void task.then(()=>inFlight.delete(task),()=>inFlight.delete(task));}return task;});
  await main.loadFile(join(here,'../renderer/index.html'));
  main.on('closed',()=>{if(!storeClosed){store.close();storeClosed=true;}app.quit();});
  // Resume PDF jobs independently; unconfigured Google jobs remain safely queued.
  const timer=setInterval(()=>{if(switchingRoot)return;void drainPDF();if(!demo.active)void maintenance.tick();},5000);timer.unref();
}).catch(e=>{dialog.showErrorBox('Invoice Studio 4 could not start',(e as Error).message);app.quit();});
const pdfTasks=new Map<string,Promise<{path:string;hash:string}>>();
function makePDF(id:string):Promise<{path:string;hash:string}>{const pending=pdfTasks.get(id);if(pending)return pending;const task=generatePDF(id).finally(()=>pdfTasks.delete(id));pdfTasks.set(id,task);return task;}
async function generatePDF(id:string):Promise<{path:string;hash:string}>{
  const doc=store.document(id);if(!doc)throw Error('Document unavailable.');const existing=store.db.prepare('SELECT path,hash FROM document_files WHERE document_id=? AND template_version=?').get(id,doc.snapshot.templateVersion);
  if(existing){if(hash(readFileSync(existing.path as string))!==existing.hash)throw Error('Original PDF hash mismatch. Owner recovery review required.');return {path:existing.path as string,hash:existing.hash as string};}
  return maintenance.withSystemSession(async token=>{const presentation=await layout.render(token,{documentId:id});const out=writePdf(`${demo.active?demo.folder('Bills'):'Bills'}/${doc.snapshot.document.date.slice(0,7)}/${invoiceFileName(String(doc.number),String(doc.snapshot.buyer?.name||''))}`,presentation.bytes);demo.recordFile(out.path);store.tx(()=>{store.db.prepare('INSERT INTO document_files VALUES(?,?,?,?,?)').run(id,doc.snapshot.templateVersion,out.path,out.hash,new Date().toISOString());store.db.prepare("UPDATE sync_outbox SET state='done',error='' WHERE entity_id=? AND target='PDF'").run(id);});return out;});
}
let pdfBusy=false;async function drainPDF():Promise<void>{if(pdfBusy)return;pdfBusy=true;try{const row=store.db.prepare("SELECT * FROM sync_outbox WHERE target='PDF' AND state IN('pending','failed') AND next_retry<=? ORDER BY rowid").all(new Date().toISOString()).find(row=>!demo.active||!demo.isExisting('documents',row.entity_id));if(!row)return;try{await makePDF(row.entity_id as string);}catch{store.db.prepare("UPDATE sync_outbox SET state='failed',attempts=attempts+1,error='PDF creation failed; retry from immutable snapshot.',next_retry=? WHERE id=?").run(new Date(Date.now()+60000).toISOString(),row.id as string);}}finally{pdfBusy=false;}}

async function renderReportPDF(html:string):Promise<Buffer>{return layout.html(html);}

async function printPDF(path:string):Promise<void>{const win=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,plugins:true}});try{await win.loadFile(path);await new Promise<void>((resolve,reject)=>win.webContents.print({silent:false,printBackground:true,pageSize:'A4',margins:{marginType:'none'}},(ok,why)=>ok?resolve():reject(Error(why))));}finally{win.destroy();}}

function writePdf(relativeName:string,bytes:Buffer){demo.planFile(relativeName,hash(bytes));return store.atomicFile(relativeName,bytes);}
