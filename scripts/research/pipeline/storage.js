import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
export const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
export function readJson(file, fallback = null) { try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch(error) { if(error.code==='ENOENT')return fallback;throw error; } }
export function atomicJson(file, data) {
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const temp=`${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp,JSON.stringify(data,null,2)+'\n');fs.renameSync(temp,file);
}
export function acquireLock(directory) {
  fs.mkdirSync(directory,{recursive:true});
  const file=path.join(directory,'run.lock');
  for(let attempt=0;attempt<2;attempt++) {
    try { const fd=fs.openSync(file,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid,host:os.hostname(),startedAt:new Date().toISOString()}));fs.closeSync(fd);return ()=>fs.unlinkSync(file); }
    catch(error) {
      if(error.code!=='EEXIST')throw error;
      const lock=readJson(file);
      if(!lock || lock.host!==os.hostname() || !Number.isInteger(lock.pid))throw new Error('Unverifiable pipeline lock; inspect before removing it');
      try {process.kill(lock.pid,0);throw new Error(`Pipeline already running (PID ${lock.pid})`);} catch(check) {if(check.code!=='ESRCH')throw check;}
      fs.unlinkSync(file);
    }
  }
  throw new Error('Could not acquire pipeline lock');
}
