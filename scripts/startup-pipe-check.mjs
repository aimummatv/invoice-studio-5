import {_electron} from 'playwright-core';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';

const root=mkdtempSync(join(tmpdir(),'invoice-startup-pipe-'));
const env={...process.env,STUDIO4_AUTOMATION:'1',STUDIO4_TEST_ROOT:join(root,'data')};
delete env.ELECTRON_RUN_AS_NODE;
let app;
try{
  app=await _electron.launch({
    ...(process.env.STUDIO4_PACKAGED_EXE?{executablePath:resolve(process.env.STUDIO4_PACKAGED_EXE),args:['--user-data-dir='+join(root,'profile')]}:{args:['.','--user-data-dir='+join(root,'profile')]}),env,timeout:30000,
  });
  const page=await app.firstWindow();
  await page.getByLabel('Your name',{exact:true}).waitFor();
  const child=app.process();
  child.stdout?.destroy();child.stderr?.destroy();
  await app.evaluate(()=>{
    process.stdout.emit('error',Object.assign(new Error('closed launcher stdout'),{code:'EPIPE'}));
    process.stderr.emit('error',Object.assign(new Error('closed launcher stderr'),{code:'EPIPE'}));
    console.log('Output after launcher disconnect');
    console.error('Warning after launcher disconnect');
    process.emitWarning('Startup warning after launcher disconnect');
  });
  await new Promise(resolve=>setTimeout(resolve,1500));
  assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().filter(w=>!w.isDestroyed()).length),1);
  assert.equal(await page.getByLabel('Your name',{exact:true}).isVisible(),true);
  const evidence=resolve('qa/evidence/startup-pipe');mkdirSync(evidence,{recursive:true});
  await page.screenshot({path:join(evidence,'startup.png')});
  console.log('PASS: packaged startup, detached output pipes, EPIPE stream events and subsequent warnings; isolated data: '+root);
}finally{
  if(app){await app.evaluate(({app})=>app.exit()).catch(()=>{});await app.close().catch(()=>{});}
}
