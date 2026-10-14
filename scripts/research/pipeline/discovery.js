import path from 'node:path';
import { atomicJson,readJson } from './storage.js';
import { parsePublicationIndex,publicationIndexLinks,candidateScore,normal } from './sources.js';
export async function archiveIndex(http,directory,log=()=>{},stopped=()=>false) {
 const file=path.join(directory,'archive-index.json');const previous=readJson(file);
 if(previous?.complete && Date.now()-Date.parse(previous.checkedAt)<30*86_400_000)return previous;
 const home=await http.get('https://www.conjuringarchive.com/publications/title/A');
 if(home.outcome!=='ok')return {complete:false,records:[],errors:[{url:home.url,outcome:home.outcome}]};
 const links=publicationIndexLinks(home.body);
 if(!links.length)throw new Error('Archive index navigation changed; no index pages found');
 const records=new Map(),errors=[];
 for(const [i,url] of links.entries()) {
  if(stopped()){errors.push({url,outcome:'interrupted'});break;}
  const result=await http.get(url,{ajax:true});
  if(result.outcome!=='ok')errors.push({url,outcome:result.outcome});
  else for(const publication of parsePublicationIndex(result.body))records.set(publication.url,publication);
  log(`Archive index ${i+1}/${links.length}: ${records.size} publications`);
 }
 const result={complete:errors.length===0,records:[...records.values()],errors,checkedAt:new Date().toISOString()};atomicJson(file,result);return result;
}
export function candidatesFor(dvd,index,inventory=[]) {
 const ca=index.records.map(record=>({...record,source:'conjuringArchive',score:candidateScore(dvd,record)})).filter(r=>r.score>=0.75).sort((a,b)=>b.score-a.score).slice(0,5);
 const candidates=[...ca];
 const add=(url,source)=>{try{if(!url)return;const parsed=new URL(url);for(const name of [...parsed.searchParams.keys()])if(name!=='ID')parsed.searchParams.delete(name);parsed.hash='';if(!candidates.some(c=>c.url===parsed.href))candidates.push({url:parsed.href,source,title:'',creators:[],format:'',score:null});}catch{}};
 for(const [field,source] of [['vanishingIncUrl','vanishingInc'],['penguinUrl','penguin'],['conjuringArchiveUrl','conjuringArchive']])add(dvd[field],source);
 const row=inventory.find(r=>r.id===dvd.id);
 for(const c of row?.candidates||[]) {
  if(c.url.includes('vanishingincmagic.com/'))add(c.url,'vanishingInc');
  if(c.url.includes('penguinmagic.com/'))add(c.url,'penguin');
 }
 return candidates;
}
export function sitemapCandidates(xml, catalog) {
 // Sitemap discovery only; product pages still pass edition/creator/format gates.
 const urls=[...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(m=>m[1].replace(/&amp;/g,'&'));
 return catalog.map(dvd=>({id:dvd.id,urls:urls.filter(url=>normal(new URL(url).pathname.split('/').filter(Boolean).pop()).includes(normal(dvd.title))).slice(0,3)}));
}

export async function retailerDiscovery(http,catalog,{maxPages=100,stopped=()=>false}={}) {
 const records=[],errors=[],urls=new Set(),seen=new Set();
 for(const host of ['www.vanishingincmagic.com','www.penguinmagic.com']) {
  const policy=await http.get(`https://${host}/robots.txt`);
  if(policy.outcome!=='ok'){errors.push({url:policy.url,outcome:policy.outcome});continue;}
  const queue=[...policy.body.matchAll(/^Sitemap:\s*(https:\/\/\S+)/gim)].map(m=>m[1]);
  if(host.includes('vanishing')&&!queue.length)queue.push(`https://${host}/sitemap-index.xml`);
  while(queue.length && seen.size<maxPages && !stopped()) {
   const url=queue.shift();if(seen.has(url))continue;seen.add(url);
   let parsed;try{parsed=new URL(url);}catch{continue;}
   if(parsed.hostname.replace(/^www\./,'')!==host.replace(/^www\./,'')){errors.push({url,outcome:'cross_source_sitemap'});continue;}
   let result;try{result=await http.get(url);}catch(error){errors.push({url,outcome:'invalid_sitemap',reason:error.message});continue;}
   if(result.outcome!=='ok'){errors.push({url,outcome:result.outcome});continue;}
   const locations=[...result.body.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(m=>m[1].replace(/&amp;/g,'&'));
   if(/<sitemapindex\b/.test(result.body))queue.push(...locations.filter(u=>!seen.has(u)));
   else if(/<urlset\b/.test(result.body))for(const location of locations)urls.add(location);
   else errors.push({url,outcome:'unsupported_sitemap'});
  }
  if(queue.length)errors.push({url:queue[0],outcome:stopped()?'interrupted':'sitemap_limit',remaining:queue.length});
 }
 for(const dvd of catalog) {
  const title=normal(dvd.title);if(title.length<4)continue;
  const candidates=[...urls].filter(url=>{try{return (' '+normal(new URL(url).pathname.split('/').filter(Boolean).pop())+' ').includes(' '+title+' ');}catch{return false;}}).map(url=>({url}));
  if(candidates.length)records.push({id:dvd.id,candidates});
 }
 return {rows:records,errors,pages:seen.size,productURLs:urls.size};
}
