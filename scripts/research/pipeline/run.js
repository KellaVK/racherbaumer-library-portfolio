import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquireLock,atomicJson,readJson,hash } from './storage.js';
import { createHttp } from './http.js';
import { archiveIndex,candidatesFor,retailerDiscovery } from './discovery.js';
import { identityMatch,parseSource,normal } from './sources.js';
import { fetchPublicCatalog } from './catalog.js';
import { writeExports } from './export.js';
export const PIPELINE_VERSION='1.1';
const LABELS={conjuringArchive:'Conjuring Archive',vanishingInc:'Vanishing Inc.',penguin:'Penguin Magic'};
export async function processDVD(dvd,{http,index,inventory,reviewed}) {
 const candidates=candidatesFor(dvd,index,inventory),sources=[];
 for(const [source,label] of Object.entries(LABELS)) {
  const options=candidates.filter(c=>c.source===source);
  if(!options.length){sources.push({id:source,label,status:source==='conjuringArchive'&&!index.complete?'discovery_incomplete':'no_candidate',reason:'No sufficiently matching candidate found in available discovery inputs.',tricks:[],props:[]});continue;}
  for(const [i,candidate] of options.entries()) {
   const base={id:`${source}-${i}`,label,url:candidate.url,tricks:[],props:[]};
   if(source==='conjuringArchive' && candidate.title && !identityMatch(dvd,candidate).accepted) {
    sources.push({...base,status:'identity_mismatch',identity:identityMatch(dvd,candidate),reason:`Candidate is ${candidate.format}: ${candidate.title}; not an exact DVD identity.`});continue;
   }
   let response;
   try {response=await http.get(candidate.url);}catch(error){sources.push({...base,status:'invalid_candidate',reason:error.message});continue;}
   if(response.outcome!=='ok'){sources.push({...base,status:response.outcome,reason:`HTTP ${response.status || 'unavailable'}`});continue;}
   if(source==='conjuringArchive' && new URL(response.url).pathname!==new URL(candidate.url).pathname) {
    sources.push({...base,status:'identity_mismatch',reason:'Publication redirect changed identity.'});continue;
   }
   const extracted=parseSource(response.body,response.url);
   const identitySource=source==='conjuringArchive'?candidate:extracted;
   if(source!=='conjuringArchive' && !identitySource.creators.length)identitySource.creators=(dvd.magician||[]).filter(name=>(' '+normal(extracted.title)+' ').includes(' '+normal(name)+' '));
   const identity=identityMatch(dvd,identitySource);
   if(!identity.accepted){sources.push({...base,status:'identity_mismatch',identity,reason:`Source identity: ${identitySource.title || extracted.heading || 'unknown'} (${identitySource.format || 'unknown format'})`});continue;}
   if(!extracted.tricks.length){sources.push({...base,status:'no_structured_contents',identity,reason:extracted.extraction});continue;}
   sources.push({...base,...extracted,status:'matched',identity,scope:`Exact title, creator, format and volume match: ${identitySource.title}`,sourceHash:hash(response.body)});
  }
 }
 const matched=sources.filter(s=>s.status==='matched');
 const credits=new Map();let conflict=false;
 for(const s of matched)for(const t of s.tricks){const key=normal(t.name);if(t.creator&&credits.has(key)&&credits.get(key)!==normal(t.creator))conflict=true;if(t.creator)credits.set(key,normal(t.creator));}
 const status=reviewed[dvd.id]?'previously_reviewed':conflict?'conflict':matched.length?'matched':sources.some(s=>['access_blocked','host_blocked','robots_unavailable','fetch_error','offline_cache_miss','discovery_incomplete'].includes(s.status))?'source_unavailable':sources.some(s=>s.status==='identity_mismatch')?'needs_review':'no_candidate';
 return {dvdId:dvd.id,title:dvd.title,creators:dvd.magician,status,sources,completedAt:new Date().toISOString(),pipelineVersion:PIPELINE_VERSION};
}
export async function runPipeline(options={}) {
 const root=options.root||process.cwd(),directory=path.resolve(root,options.directory||'.cache/catalog-pipeline');
 const release=acquireLock(directory);let stopped=false;
 const interrupt=()=>{stopped=true;};process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);
 const log=options.log||console.log;
 let state=readJson(path.join(directory,'state.json'),{createdAt:new Date().toISOString()});
 const http=options.http||createHttp({directory,permission:true,offline:!!options.offline,retryFailed:!!options.retryFailed,delayMs:options.delayMs??5000});
 try {
  state={...state,error:null,status:'running',pid:process.pid,updatedAt:new Date().toISOString(),pipelineVersion:PIPELINE_VERSION};atomicJson(path.join(directory,'state.json'),state);
  const inputFile=path.join(directory,'catalog.json');let catalog=options.catalog||readJson(inputFile);
  if(!catalog || options.refreshCatalog) {
   if(options.refreshCatalog && !options.offline) { catalog=await fetchPublicCatalog();state.catalogSource='live_firestore'; }
   else { catalog=readJson(path.join(root,'tests/fixtures/catalog-snapshot.json'));state.catalogSource='saved_snapshot'; }
   if(!Array.isArray(catalog)||!catalog.length)throw new Error('No saved catalog available; provide a catalog or use --refresh-catalog');
   atomicJson(inputFile,catalog);
  }
  const reviewed=readJson(path.join(root,'src/data/external-enrichment.json'),{});
  let inventory=readJson(path.join(root,'data/research/lookup-inventory.json'),{rows:[]}).rows;
  const index=options.index||await archiveIndex(http,directory,log,()=>stopped);
  const discovery=options.index||stopped?{rows:[],errors:[],pages:0,productURLs:0}:await retailerDiscovery(http,catalog,{stopped:()=>stopped});
  inventory=inventory.map(row=>({...row,candidates:[...(row.candidates||[]),...(discovery.rows.find(r=>r.id===row.id)?.candidates||[])]}));
  for(const row of discovery.rows)if(!inventory.some(r=>r.id===row.id))inventory.push(row);
  state.total=catalog.length;state.discovery={archiveComplete:index.complete,publications:index.records.length,errors:index.errors,retailers:discovery};
  const indexHash=hash([index.complete,index.records]);
  const results=[];let processed=0;
  for(const dvd of catalog) {
   const fingerprint=hash([PIPELINE_VERSION,dvd,indexHash,reviewed[dvd.id]||null,inventory.find(r=>r.id===dvd.id)||null]);
   const resultPath=path.join(directory,'results',`${dvd.id}.json`),previous=readJson(resultPath);
   const needsRetry=options.retryFailed&&previous?.sources?.some(source=>['access_blocked','host_blocked','robots_unavailable','fetch_error','offline_cache_miss','discovery_incomplete'].includes(source.status));
   if(previous?.fingerprint===fingerprint&&!needsRetry){results.push(previous);continue;}
   if(stopped || (options.limit && processed>=options.limit))continue;
   const result=await processDVD(dvd,{http,index,inventory,reviewed});result.fingerprint=fingerprint;
   atomicJson(resultPath,result);results.push(result);processed++;
   state.completed=results.length;state.lastDVD=dvd.title;state.metrics=http.metrics;state.updatedAt=new Date().toISOString();atomicJson(path.join(directory,'state.json'),state);
   log(`${results.length}/${catalog.length}: ${dvd.title} — ${result.status}`);
  }
  const summary=writeExports({results,directory:path.join(root,'data/research/automated'),reviewed,
   publishPath:options.publish===false || results.length!==catalog.length?null:path.join(root,'src/data/machine-enrichment.json')});
  state={...state,status:results.length===catalog.length?'completed':stopped?'interrupted':'partial',completed:results.length,metrics:http.metrics,summary,updatedAt:new Date().toISOString()};
  atomicJson(path.join(directory,'state.json'),state);log(JSON.stringify(state,null,2));return state;
 }catch(error){state.status='failed';state.error=error.message;state.updatedAt=new Date().toISOString();atomicJson(path.join(directory,'state.json'),state);throw error;}
 finally{process.off('SIGINT',interrupt);process.off('SIGTERM',interrupt);release();}
}
export function parseArguments(args) {
 const options={publish:true};
 const flags={'--offline':'offline','--refresh-catalog':'refreshCatalog','--retry-failed':'retryFailed','--status':'status','--help':'help'};
 for(let i=0;i<args.length;i++) {
  const arg=args[i];
  if(flags[arg])options[flags[arg]]=true;
  else if(arg==='--no-publish')options.publish=false;
  else if(arg==='--limit') {const limit=Number(args[++i]);if(!Number.isSafeInteger(limit)||limit<1)throw new Error('--limit requires a positive integer');options.limit=limit;}
  else throw new Error(`Unknown option: ${arg}. Use --help.`);
 }
 return options;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const options=parseArguments(process.argv.slice(2));
 if(options.help)console.log(`Whole-catalog research: npm run catalog:pipeline
Processes every saved catalog DVD, resumes cached progress, and exports eligible contents locally.
  --status           Show saved progress without running
  --offline          Use cached sources only
  --no-publish       Export research without changing website enrichment
  --refresh-catalog  Explicitly fetch the public Firestore catalog
  --retry-failed     Retry unavailable sources after access has changed
  --limit N          Optional developer smoke test; never required for normal runs
No AI API calls. See docs/AUTOMATED-RESEARCH.md.`);
 else if(options.status)console.log(JSON.stringify(readJson(path.resolve('.cache/catalog-pipeline/state.json'),{}),null,2));
 else await runPipeline(options);
}
