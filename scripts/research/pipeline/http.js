import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { atomicJson, readJson, hash } from './storage.js';
const exec=promisify(execFile);
const ALLOWED=new Set(['www.conjuringarchive.com','conjuringarchive.com','www.vanishingincmagic.com','vanishingincmagic.com','www.penguinmagic.com','penguinmagic.com']);
export function checkedUrl(raw) {
 const u=new URL(raw);
 if(u.protocol!=='https:' || !ALLOWED.has(u.hostname) || u.port || u.username || u.password)throw new Error('Disallowed source URL');
 if(/\/trap\//.test(u.pathname))throw new Error('Excluded crawler-trap path');
 u.hash='';return u;
}
export function robotsAllows(text,url) {
 // Apply wildcard and the explicitly named crawler rules; default allow when no rule applies.
 const groups=[];let agents=[],rules=[],started=false;
 for(const raw of text.split('\n')) {
  const line=raw.split('#')[0].trim();const match=line.match(/^([\w-]+)\s*:\s*(.*)$/);if(!match)continue;
  const [,name,value]=match;
  if(name.toLowerCase()==='user-agent') {if(started){groups.push({agents,rules});agents=[];rules=[];started=false;}agents.push(value.toLowerCase());}
  else if(['allow','disallow'].includes(name.toLowerCase())) {started=true;rules.push({allow:name.toLowerCase()==='allow',path:value});}
 }
 groups.push({agents,rules});
 const specific=groups.filter(g=>g.agents.includes('racherbaumerlibraryresearch'));
 const chosen=specific.length?specific:groups.filter(g=>g.agents.includes('*'));
 const target=new URL(url).pathname+new URL(url).search;
 const matches=chosen.flatMap(g=>g.rules).filter(r=>r.path && new RegExp('^'+r.path.replace(/[.+?^{}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*')).test(target)).sort((a,b)=>b.path.length-a.path.length || Number(b.allow)-Number(a.allow));
 return !matches.length || matches[0].allow;
}
export function createHttp({directory,delayMs=5000,offline=false,permission=false,retryFailed=false,transport,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms))}) {
 fs.mkdirSync(path.join(directory,'http'),{recursive:true});
 const circuitFile=path.join(directory,'circuits.json');
 const circuits=retryFailed?{}:readJson(circuitFile,{});const last=new Map();
 const metrics={network:0,cache:0,blocked:0};const robots=new Map();
 async function curl(url,ajax) {
  const args=['--silent','--show-error','--max-time','35','--max-filesize','5000000','--proto','=https','--user-agent','RacherbaumerLibraryResearch/1.0 (+https://racherbaumer.kellakruebbe.com)','--dump-header','-',url];
  if(ajax)args.unshift('--header','X-Requested-With: XMLHttpRequest');
  try {
   const {stdout}=await exec('curl',args,{maxBuffer:6_000_000});
   // Proxy CONNECT headers may precede the origin response.
   let rest=stdout,headers='',status=0;
   while(rest.startsWith('HTTP/')) {const end=rest.indexOf('\r\n\r\n');if(end<0)break;headers=rest.slice(0,end);status=Number(headers.match(/^HTTP\/\S+ (\d+)/)?.[1]);rest=rest.slice(end+4);}
   const location=headers.match(/^location:\s*(.+)$/im)?.[1]?.trim();
   return {status,body:rest,location,retryAfter:headers.match(/^retry-after:\s*(\d+)/im)?.[1]};
  } catch(error) {return {status:0,body:'',error:`transport_failed_${error.code || 'unknown'}`};}
 }
 async function raw(url,ajax=false,redirects=0) {
  const u=checkedUrl(url);url=u.href;const file=path.join(directory,'http',hash([url,ajax])+'.json');
  const cached=readJson(file);
  if(cached && (cached.status===200 || (!retryFailed && now()-cached.fetchedAt<86_400_000))) {metrics.cache++;return {...cached,cached:true};}
  if(offline)return {url,status:0,outcome:'offline_cache_miss',body:''};
  if(circuits[u.hostname]) {metrics.blocked++;return {url,status:circuits[u.hostname].status,outcome:'host_blocked',body:''};}
  const wait=Math.max(0,(last.get(u.hostname)||0)+delayMs-now());if(wait)await sleep(wait);
  let response;
  for(let attempt=0;attempt<3;attempt++) {
   metrics.network++;last.set(u.hostname,now());response=await (transport||curl)(url,ajax);
   if(response.status!==429 && response.status<500 && response.status!==0)break;
   if(attempt<2)await sleep(Math.max(delayMs,Math.min(60000,Number(response.retryAfter||0)*1000||2**attempt*5000)));
  }
  if(response.status>=300 && response.status<400 && response.location) {
   if(redirects>=3)return {url,status:response.status,outcome:'redirect_limit',body:''};
   const next=checkedUrl(new URL(response.location,url).href);
   if(next.hostname!==u.hostname && next.hostname.replace(/^www\./,'')!==u.hostname.replace(/^www\./,''))return {url,status:response.status,outcome:'cross_source_redirect',body:''};
   if(!next.hostname.endsWith('conjuringarchive.com')) {
    const policy=robots.get(next.hostname)||await raw(next.origin+'/robots.txt');
    robots.set(next.hostname,policy);
    if(policy.status!==200)return {url:next.href,status:policy.status,outcome:'robots_unavailable',body:''};
    if(!robotsAllows(policy.body,next.href))return {url:next.href,status:0,outcome:'robots_disallowed',body:''};
   }
   return raw(next.href,ajax,redirects+1);
  }
  const outcome=response.status===200?'ok':[401,403,429].includes(response.status)?'access_blocked':response.status===404?'not_found':'fetch_error';
  const result={url,...response,outcome,fetchedAt:now()};
  if([401,403,429].includes(response.status)){circuits[u.hostname]={status:response.status,at:now()};atomicJson(circuitFile,circuits);}
  atomicJson(file,result);return result;
 }
 async function get(url,{ajax=false}={}) {
  const u=checkedUrl(url);
  if(u.hostname.endsWith('conjuringarchive.com')) {
   if(!permission)return {url,status:0,outcome:'permission_required',body:''};
  } else {
   if(!robots.has(u.hostname))robots.set(u.hostname,await raw(u.origin+'/robots.txt'));
   const policy=robots.get(u.hostname);
   if(policy.status!==200)return {url,status:policy.status,outcome:'robots_unavailable',body:''};
   if(!robotsAllows(policy.body,url))return {url,status:0,outcome:'robots_disallowed',body:''};
  }
  return raw(url,ajax);
 }
 return {get,metrics,circuits};
}
