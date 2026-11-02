import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Store} from '../packages/db/store.ts';
import {DemoSession} from '../packages/db/demo.ts';

// Explicit local maintenance entry point. The desktop UI additionally requires Owner PIN reauthentication.
const index=process.argv.indexOf('--root'),root=index>=0?process.argv[index+1]:'';
if(!root||!process.argv.includes('--acknowledge-session-rollback'))throw Error('Use --root <closed TEST workspace> --acknowledge-session-rollback. Close the desktop app first.');
const demo=new DemoSession(resolve(root));demo.recoverIfNeeded();
if(demo.active){console.log(JSON.stringify(demo.status()));process.exit(0);}
const store=new Store(resolve(root),{mustExist:true});const token=randomUUID();
store.security.sessions.set(token,{actor:{id:'local-demo-maintenance',name:'Authorized local demo setup',role:'Owner'},lastUsed:Date.now()});
try{if(store.profile().templateVersion!=='v4-7')store.saveProfile(token,{...store.profile(),templateVersion:'v4-7'});await demo.begin(store,token);console.log(JSON.stringify(demo.status()));}finally{store.security.logout(token);store.close();}
