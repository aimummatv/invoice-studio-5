import type {Store} from '../../../packages/db/store.ts';
import type {Customer,Product,Profile,Draft,Allocation,Purchase} from '../../../packages/core/model.ts';
import {id,text} from '../../../packages/core/validation.ts';
import {validateDraft} from '../../../packages/core/validation.ts';
import {calculate} from '../../../packages/core/money.ts';
import {Operations} from '../../../packages/db/operations.ts';
import {operation,HIGH_RISK_OPERATIONS} from './operation-commands.ts';
export type Reply={ok:true;data:unknown}|{ok:false;error:string};
export class Controller {
  store:Store;token='';operations:Operations;
  constructor(store:Store){this.store=store;this.operations=new Operations(store);}
  async dispatch(command:unknown,payload:unknown={}):Promise<Reply>{
    try{
      if(typeof command!=='string'||command.length>50||!payload||typeof payload!=='object'||Array.isArray(payload)||JSON.stringify(payload).length>5000000)throw Error('Invalid command payload.');
      const p=payload as Record<string,unknown>;
      const allowed:Record<string,string[]>={status:[],setup:['id','name','pin'],login:['id','pin'],logout:[],state:[],calculateDraft:['draft'],saveDraft:['draft'],issue:['draftId','expectedVersion','idempotencyKey','approvalId','reviewFingerprint','duplicateReason'],saveCustomer:['customer'],saveProduct:['product'],saveProfile:['profile'],recordPayment:['payment'],allocateAdvance:['paymentId','allocations','commandKey','effectiveDate','reason'],reversePayment:['paymentId','reason','pin'],purchase:['purchase'],register:['query'],document:['id'],backup:[],diagnostics:[],close:['date'],approveClose:['date','pin'],lockPeriod:['period','reason','pin'],cancel:['id','reason','pin'],addUser:['user','pin'],view:['name','filter'],operations:['action','input','pin']};
      const keys=allowed[command];if(!keys||Object.keys(p).some(k=>!keys.includes(k)))throw Error('Command or payload field is not allowlisted.');
      if(command==='status')return {ok:true,data:{configured:this.store.security.hasUsers(),mode:'TEST',productionBlocked:true}};
      if(command==='setup'){text(p.id,'User',100);text(p.name,'Name',100);text(p.pin,'PIN',12);this.store.setup({id:p.id,name:p.name,pin:p.pin});return {ok:true,data:true};}
      if(command==='login'){text(p.id,'User',100);text(p.pin,'PIN',12);this.token=this.store.login(p.id,p.pin);return {ok:true,data:this.store.state(this.token)};}
      if(command==='logout'){this.store.security.logout(this.token);this.token='';return {ok:true,data:true};}
      if(!this.token)throw Error('Sign in required.');
      if((command==='operations'&&HIGH_RISK_OPERATIONS.has(String(p.action)))||['cancel','reversePayment','lockPeriod','approveClose','addUser'].includes(command)){text(p.pin,'PIN',12);const actor=this.store.security.require(this.token,'read');const temp=this.store.login(actor.id,p.pin);this.store.security.logout(temp);}
      let data:unknown;
      switch(command){
        case 'view':text(p.name,'View',40);data=this.operations.view(this.token,p.name,(p.filter||{}) as Record<string,unknown>);break;
        case 'operations':text(p.action,'Operation',50);if(!p.input||typeof p.input!=='object'||Array.isArray(p.input))throw Error('Invalid operation input.');data=await operation(this.operations,this.token,p.action,p.input as Record<string,unknown>);break;
        case 'calculateDraft':{this.store.actor(this.token,'read');const draft=p.draft as Draft;validateDraft(draft);if(draft.type==='CREDIT_NOTE'&&!this.store.document(draft.originalId))throw Error('Choose an original invoice for the credit.');data=draft.type==='CREDIT_NOTE'?this.store.creditTotals(structuredClone(draft)):calculate(draft,this.store.profile());break;}
        case 'state':data=this.store.state(this.token);break;
        case 'saveDraft':data=this.store.saveDraft(this.token,p.draft as Draft);break;
        case 'issue':id(p.draftId);id(p.idempotencyKey);if(!Number.isSafeInteger(p.expectedVersion))throw Error('Invalid version.');data=this.store.issue(this.token,{draftId:p.draftId,expectedVersion:p.expectedVersion as number,idempotencyKey:p.idempotencyKey,...(p.approvalId?{approvalId:String(p.approvalId)}:{}),...(p.reviewFingerprint?{reviewFingerprint:String(p.reviewFingerprint),duplicateReason:String(p.duplicateReason||'')}:{})});break;
        case 'saveCustomer':data=this.store.saveCustomer(this.token,p.customer as Customer);break;
        case 'saveProduct':data=this.store.saveProduct(this.token,p.product as Product);break;
        case 'saveProfile':data=this.store.saveProfile(this.token,p.profile as Profile);break;
        case 'recordPayment':data=this.store.recordPayment(this.token,p.payment as Parameters<Store['recordPayment']>[1]);break;
        case 'allocateAdvance':id(p.paymentId);data=this.operations.payments.allocateCustomerAdvance(this.token,{paymentId:p.paymentId,allocations:p.allocations as Allocation[],commandKey:String(p.commandKey),effectiveDate:String(p.effectiveDate),reason:String(p.reason)});break;
        case 'reversePayment':id(p.paymentId);text(p.reason,'Reason',1000);data=this.store.reversePayment(this.token,p.paymentId,p.reason);break;
        case 'purchase':data=this.store.purchase(this.token,p.purchase as Purchase);break;
        case 'register':text(p.query??'','Query',200);data=this.store.register(this.token,(p.query as string)||'');break;
        case 'document':this.store.actor(this.token,'read');id(p.id);data=this.store.document(p.id);break;
        case 'backup':data=await this.store.backup(this.token);break;
        case 'diagnostics':data=this.store.diagnostics(this.token);break;
        case 'close':text(p.date,'Date',10);data=this.store.dailyClose(this.token,p.date);break;
        case 'approveClose':text(p.date,'Date',10);data=this.store.dailyClose(this.token,p.date,'approve');break;
        case 'lockPeriod':text(p.period,'Period',7);text(p.reason,'Reason',1000);data=this.store.lockPeriod(this.token,p.period,p.reason);break;
        case 'cancel':id(p.id);text(p.reason,'Reason',1000);data=this.store.cancel(this.token,p.id,p.reason);break;
        case 'addUser':data=this.store.addUser(this.token,p.user as Parameters<Store['addUser']>[1]);break;
        default:throw Error('Command not supported.');
      }
      return {ok:true,data:data??null};
    }catch(e){const message=e instanceof Error?e.message:'Operation failed.';return {ok:false,error:/SQLITE|constraint|bind|column|table/i.test(message)?'Database rejected the operation. Previous saved records are intact; check diagnostics.':message};}
  }
}

