import type {Writable} from 'node:stream';

function isBrokenPipe(error:unknown):boolean {
  return typeof error==='object'&&error!==null&&'code' in error&&error.code==='EPIPE';
}

// A desktop launcher may exit while Electron still inherits its output pipes.
// Handle both Node's asynchronous stream errors and Electron's synchronous
// console writes, without masking unrelated application failures.
export function protectDiagnosticOutput(streams:readonly Writable[]=[process.stdout,process.stderr],logger:Pick<Console,'log'|'info'|'warn'|'error'|'debug'|'trace'>=console):void {
  for(const stream of streams)stream.on('error',(error:Error)=>{if(!isBrokenPipe(error))throw error;});
  for(const method of ['log','info','warn','error','debug','trace'] as const){
    const original=logger[method].bind(logger);
    logger[method]=(...args:unknown[])=>{try{original(...args);}catch(error){if(!isBrokenPipe(error))throw error;}};
  }
}

protectDiagnosticOutput();
