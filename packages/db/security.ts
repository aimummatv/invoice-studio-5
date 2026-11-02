import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import type {Actor,Permission,Role} from '../core/model.ts';
export const PERMISSIONS:Record<Role,readonly Permission[]>={Owner:['read','draft','issue','masters','payments','purchase','stock','close','approve','settings','backup','restore','security','tax','sync','cancel','export','cost','print'],Staff:['read','draft','issue','masters','payments','close','print'],Viewer:['read']};
interface Session {actor:Actor; lastUsed:number}
export class Security {
  db:DatabaseSync; sessions=new Map<string,Session>(); attempts=new Map<string,{count:number;until:number}>(); now:()=>number;
  constructor(db:DatabaseSync,now=Date.now){this.db=db;this.now=now;}
  hasUsers():boolean{return !!this.db.prepare('SELECT 1 FROM users LIMIT 1').get();}
  createUser(actor:Actor|null,input:{id:string;name:string;role:Role;pin:string}):void {
    if(this.hasUsers()&&(!actor||actor.role!=='Owner'))throw Error('Owner permission required.');
    if(!this.hasUsers()&&input.role!=='Owner')throw Error('First user must be Owner.');
    if(!/^[a-zA-Z0-9_-]{1,100}$/.test(input.id)||!input.name.trim()||input.name.length>100||!['Owner','Staff','Viewer'].includes(input.role)||!/^\d{6,12}$/.test(input.pin))throw Error('Use a named user and a PIN of 6–12 digits.');
    const salt=randomBytes(16).toString('hex');const hash=scryptSync(input.pin,salt,64,{N:16384,r:8,p:1}).toString('hex');
    this.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,1)').run(input.id,input.name,input.role,salt,hash);
  }
  login(userId:string,pin:string):string {
    if(typeof userId!=='string'||userId.length>100||typeof pin!=='string'||pin.length>128)throw Error('Invalid credentials.');
    const now=this.now(),limit=this.attempts.get(userId);if(limit&&limit.count>=5&&limit.until>now)throw Error('Too many attempts. Try again later.');
    const row=this.db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(userId) as {id:string;name:string;role:Role;salt:string;pin_hash:string}|undefined;
    const salt=row?.salt||'00000000000000000000000000000000';const actual=scryptSync(pin,salt,64,{N:16384,r:8,p:1});const expected=Buffer.from(row?.pin_hash||'00'.repeat(64),'hex');
    if(!row||!timingSafeEqual(actual,expected)){this.attempts.set(userId,{count:limit&&limit.until>now?limit.count+1:1,until:now+300000});throw Error('Invalid credentials.');}
    this.attempts.delete(userId);const token=randomBytes(32).toString('hex');this.sessions.set(token,{actor:{id:row.id,name:row.name,role:row.role},lastUsed:now});return token;
  }
  require(token:string,permission:Permission):Actor {
    const s=this.sessions.get(token),now=this.now();if(!s||now-s.lastUsed>15*60000){this.sessions.delete(token);throw Error('Session expired. Sign in again.');}
    const override=this.db.prepare('SELECT allowed FROM role_permissions WHERE role=? AND permission=?').get(s.actor.role,permission);const allowed=override?override.allowed===1:PERMISSIONS[s.actor.role].includes(permission);if(!allowed)throw Error(`Permission denied: ${permission}.`);s.lastUsed=now;return {...s.actor};
  }
  logout(token:string):void{this.sessions.delete(token);}
}
