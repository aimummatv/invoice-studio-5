import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Console} from 'node:console';
import {Writable} from 'node:stream';
import {protectDiagnosticOutput} from '../../apps/desktop/main/diagnostic-output.ts';

test('closed diagnostic streams do not crash asynchronous writes',async()=>{
  const streams=[0,1].map(()=>new Writable({write(_chunk,_encoding,done){done(Object.assign(new Error('broken pipe'),{code:'EPIPE'}));}}));
  protectDiagnosticOutput(streams,new Console({stdout:streams[0]!,stderr:streams[1]!}));
  await Promise.all(streams.map(stream=>new Promise<void>(resolve=>{stream.once('error',()=>resolve());stream.write('startup warning');})));
});

test('Electron console writes ignore EPIPE and preserve other failures',()=>{
  const sink=new Writable({write(_chunk,_encoding,done){done();}});
  const logger=new Console(sink);let failure:Error|undefined;
  logger.error=()=>{if(failure)throw failure;};
  protectDiagnosticOutput([],logger);
  failure=Object.assign(new Error('broken pipe'),{code:'EPIPE'});
  assert.doesNotThrow(()=>logger.error('SQLite startup warning'));
  failure=Object.assign(new Error('permission denied'),{code:'EACCES'});
  assert.throws(()=>logger.error('real failure'),error=>error===failure);
  assert.throws(()=>sink.emit('error',failure),error=>error===failure);
});

test('diagnostic stream errors other than EPIPE remain visible',()=>{
  const sink=new Writable({write(_chunk,_encoding,done){done();}});
  protectDiagnosticOutput([sink],new Console(sink));
  const failure=Object.assign(new Error('I/O failure'),{code:'EIO'});
  assert.throws(()=>sink.emit('error',failure),error=>error===failure);
});
