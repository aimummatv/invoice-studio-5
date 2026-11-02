import {performance} from 'node:perf_hooks';import {writeFileSync,mkdirSync} from 'node:fs';import {fixture,draft} from '../packages/testing/fixtures.ts';
const count=Number(process.argv[2]||10000);if(!Number.isInteger(count)||count<1||count>20000)throw Error('Use 1–20000 TEST documents.');
const f=fixture();const start=performance.now();const issueTimes:number[]=[];
try{
 for(let i=0;i<count;i++){
  const d=f.s.saveDraft(f.token,draft({date:i<9999?'2026-10-28':'2027-04-01',dueDate:i<9999?'2026-11-12':'2027-04-16'}));const before=performance.now();f.s.issue(f.token,{draftId:d.id,expectedVersion:d.version,idempotencyKey:'perf-'+i});issueTimes.push(performance.now()-before);
  if((i+1)%1000===0)console.log(`${i+1}/${count} synthetic invoices issued`);
 }
 const generationMs=performance.now()-start;const t=performance.now();const rows=f.s.register(f.token);const registerMs=performance.now()-t;const q=performance.now();const found=f.s.register(f.token,'0001');const searchMs=performance.now()-q;const v=performance.now();f.s.verifyInternal();const integrityMs=performance.now()-v;issueTimes.sort((a,b)=>a-b);
 const report={count,environment:{node:process.version,platform:process.platform,arch:process.arch},targets:'Measurement baseline only; no approved latency targets.',generationMs,registerMs,searchMs,integrityMs,registerCount:rows.length,searchCount:found.length,issueP50:issueTimes[Math.floor(count*.5)],issueP95:issueTimes[Math.floor(count*.95)],rssBytes:process.memoryUsage().rss};
 mkdirSync('qa/logs',{recursive:true});writeFileSync('qa/logs/performance.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 if(rows.length!==count)throw Error('Register count mismatch.');
}finally{f.cleanup();}
