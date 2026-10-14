import fs from 'node:fs';
import path from 'node:path';
import {atomicJson,hash} from './storage.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function exportsFor(results,reviewed={}) {
 const overlay={},documents=[];
 for(const result of results) {
  if(reviewed[result.dvdId] || result.status!=='matched')continue;
  const sources=result.sources.filter(s=>s.status==='matched');
  const trickMap=new Map();let conflict=false;
  for(const source of sources)for(const trick of source.tricks) {
   const key=trick.name.toLowerCase().replace(/[^a-z0-9]/g,'');
   if(trickMap.has(key)) {
    const prev=trickMap.get(key);if(prev.creator&&trick.creator&&prev.creator!==trick.creator)conflict=true;
    prev.sourceIds.push(source.id);
   }else trickMap.set(key,{...trick,sourceIds:[source.id]});
  }
  if(conflict)continue;
  const tricks=[...trickMap.values()];
  if(!tricks.length)continue;
  overlay[result.dvdId]={title:result.title,creators:result.creators,status:'machine_matched_source',independentlyVerified:false,
   summary:'Source-listed contents matched automatically by title, credited magician, format, and volume.',
   props:[...new Set(sources.flatMap(s=>s.props))],subjects:[],tricks,
   sources:sources.map(s=>({id:s.id,label:s.label,url:s.url,scope:s.scope})),url:sources[0].url,sourceLabel:sources[0].label,
   editionNote:'Automatically matched source listing; the physical DVD and supplied props have not been checked.',matchedAt:result.completedAt};
  for(const trick of tricks) {
   const text=`DVD: ${result.title}\nMagicians: ${result.creators.join('; ')}\nTrick: ${trick.name}${trick.creator?'\nCredit: '+trick.creator:''}${trick.description?'\nDescription: '+trick.description:''}`;
   documents.push({documentId:`${result.dvdId}:trick:${hash(trick.name).slice(0,12)}`,dvdId:result.dvdId,text,sourceUrls:sources.filter(s=>trick.sourceIds.includes(s.id)).map(s=>s.url),contentHash:hash(text),status:'machine_matched_source'});
  }
 }
 return {overlay,documents};
}
export function writeExports({results,directory,reviewed={},publishPath}) {
 fs.mkdirSync(directory,{recursive:true});
 const {overlay,documents}=exportsFor(results,reviewed);
 const counts={};for(const r of results)counts[r.status]=(counts[r.status]||0)+1;
 const summary={processed:results.length,statuses:counts,machineEnriched:Object.keys(overlay).length,trickDocuments:documents.length};
 atomicJson(path.join(directory,'results.json'),results);atomicJson(path.join(directory,'summary.json'),summary);
 atomicJson(path.join(directory,'machine-enrichment.json'),overlay);
 fs.writeFileSync(path.join(directory,'trick-documents.jsonl'),documents.map(d=>JSON.stringify(d)).join('\n')+(documents.length?'\n':''));
 fs.writeFileSync(path.join(directory,'report.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Whole catalog research</title><style>body{font:16px/1.5 system-ui;max-width:1100px;margin:32px auto;padding:0 20px;color:#28251e;background:#faf9f5}article{padding:16px 0;border-top:1px solid #ccc}summary{cursor:pointer}a{color:#73520d}small{color:#555}</style><h1>Whole-catalog research</h1><p>${results.length} DVDs accounted for. ${Object.keys(overlay).length} new machine-matched records. ${documents.length} trick documents.</p><p>Unavailable sources are not researched contents. Machine matches are not human verification. Existing reviewed records take precedence.</p>${results.map(r=>`<article><details><summary>${escape(r.title)} — ${escape(r.status)}</summary><p>${escape(r.creators.join(', '))}</p>${r.sources.map(s=>`<p><strong>${escape(s.label)}</strong> — ${escape(s.status)} ${s.url?`<a href="${escape(s.url)}">Source</a>`:''}<br><small>${escape(s.reason||'')} ${s.tricks?.length||0} named entries</small></p>`).join('')}</details></article>`).join('')}</html>`);
 if(publishPath)atomicJson(publishPath,overlay);
 return summary;
}
