import { JSDOM } from 'jsdom';
import { checkedUrl } from './http.js';
export const text = value => String(value||'').replace(/\s+/g,' ').trim();
export const normal = value => text(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\bvol(?:ume)?s?\.?\s*|#\s*(?=\d)/g,'vol ').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const dom = html => new JSDOM(html);
export function parsePublicationIndex(html) {
 const page=dom(html);try{return [...page.window.document.querySelectorAll('table.booktable tbody tr')].flatMap(row=>{
  const cells=[...row.querySelectorAll('td')],link=cells[1]?.querySelector('a[href*="/list/publication/"]');if(!link)return [];
  return [{title:text(link.textContent),url:new URL(link.getAttribute('href'),'https://www.conjuringarchive.com').href,
   creators:[...new Set([...cells.slice(3,5).flatMap(c=>[...c.querySelectorAll('a')].map(a=>text(a.textContent)))])],
   format:cells[1].querySelector('[data-bs-title]')?.getAttribute('data-bs-title')||'',subtitle:text(cells[2]?.textContent)}];
 });}finally{page.window.close();}
}
export function publicationIndexLinks(html) {
 const page=dom(html);try{return [...new Set([...page.window.document.querySelectorAll('a[href*="/publications/title/"]:not(.disabled)')].map(a=>new URL(a.getAttribute('href'),'https://www.conjuringarchive.com').href))];}finally{page.window.close();}
}
function cleanTitle(title,creators=[]) {
 let value=normal(title).replace(/\b(?:dvd|dvds|video|download|instant|by)\b/g,' ').replace(/\s+/g,' ').trim();
 for(const name of creators) {const n=normal(name);if(!n)continue;if(value.startsWith(n+' '))value=value.slice(n.length+1);if(value.endsWith(' '+n))value=value.slice(0,-n.length-1);}
 return value.trim();
}
export function identityMatch(dvd,source) {
 const title=cleanTitle(dvd.title,dvd.magician),candidate=cleanTitle(source.title,dvd.magician);
 const volumes=s=>[...normal(s).matchAll(/\bvol (\d+)\b/g)].map(m=>m[1]);
 const editionMarkers=s=>[...normal(s).matchAll(/\b(?:special edition|revised|remastered|2 0|2024|2025|2026)\b/g)].map(m=>m[0]);
 const exactTitle=title===candidate && title.length>=4;
 const creators=(dvd.magician||[]).filter(n=>! /^(various|unknown|not listed)$/i.test(n));
 const names=source.creators.map(normal);
 const creatorMatch=creators.length>0 && creators.every(name=>names.includes(normal(name)));
 const volumeMatch=JSON.stringify(volumes(dvd.title))===JSON.stringify(volumes(source.title));
 const editionMatch=JSON.stringify(editionMarkers(dvd.title))===JSON.stringify(editionMarkers(source.title));
 const formatMatch=/\b(dvd|video|videos)\b/i.test(source.format) && !/\b(download|book|magazine)\b/i.test(source.format);
 const accepted=exactTitle&&creatorMatch&&volumeMatch&&editionMatch&&formatMatch;
 return {accepted,exactTitle,creatorMatch,volumeMatch,editionMatch,formatMatch};
}
export function candidateScore(dvd,source) {
 const a=new Set(cleanTitle(dvd.title,dvd.magician).split(' ')),b=new Set(cleanTitle(source.title,dvd.magician).split(' '));
 const overlap=[...a].filter(w=>b.has(w)).length;
 const title=2*overlap/(a.size+b.size||1);
 const creator=(dvd.magician||[]).some(n=>source.creators.map(normal).includes(normal(n)))?0.15:0;
 return title+creator;
}
function parseArchive(html,url) {
 const page=dom(html);try {
  const doc=page.window.document;
  const heading=text(doc.querySelector('h1')?.textContent);
  const rows=[...doc.querySelectorAll('table#entries tbody tr.content:not(.review)')];
  let remaining=700;
  const tricks=rows.flatMap(row=>{
   const name=text(row.querySelector('td.title .show')?.textContent);if(!name||name.length>180)return [];
   const creator=text(row.querySelector('td.creators .show')?.textContent);
   const original=text(row.querySelector('td.comment .show')?.textContent);
   const description=remaining>0?original.slice(0,Math.min(160,remaining)):'';remaining-=description.length;
   const sourceEntryId=row.getAttribute('data-id');
   return [{name,creator,description,evidence:{url,entryId:sourceEntryId,selector:`tr[data-id="${sourceEntryId}"]`}}];
  });
  return {heading,tricks,props:[],summary:'Indexed contents from Conjuring Archive.',extraction:'archive_entry_rows'};
 } finally{page.window.close();}
}
function parseRetailer(html,url) {
 const page=dom(html);try {
  const doc=page.window.document;
  const products=[];
  for(const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
   try {const visit=value=>{if(!value||typeof value!=='object')return;if(Array.isArray(value))return value.forEach(visit);if([value['@type']].flat().includes('Product'))products.push(value);if(value['@graph'])visit(value['@graph']);};visit(JSON.parse(script.textContent));}catch{}
  }
  const product=products[0];
  const title=text(doc.querySelector('h1')?.textContent||product?.name);
  const selectors=['[itemprop="description"]','#product-description','.product-description','#description','.product__description'];
  let section=selectors.map(s=>doc.querySelector(s)).find(Boolean);
  if(!section && product?.description) {section=doc.createElement('div');section.innerHTML=product.description;}
  if(!section)return {title,creators:[],format:'',tricks:[],props:[],extraction:'unsupported_product_markup'};
  section=section.cloneNode(true);section.querySelectorAll('script,style,form,nav,button,iframe').forEach(e=>e.remove());
  const content=text(section.textContent);
  const by=title.match(/\bby\s+(.+?)(?:\s*[-–]\s*(?:DVD|Download)|$)/i)?.[1];
  const author=product?.author;const creators=[by,...(Array.isArray(author)?author:[author]).map(a=>typeof a==='string'?a:a?.name)].filter(Boolean).map(text);
  const format=/download/i.test(title)?'Download':/\bdvd\b/i.test(title+' '+content)?'DVD':'';
  let remaining=700;const tricks=[];
  for(const list of section.querySelectorAll('ul,ol')) {
   let previous=list.previousElementSibling;let heading='';for(let n=0;n<3&&previous;n++,previous=previous.previousElementSibling){heading=text(previous.textContent)+' '+heading;if(/effects|contents|routines|contains|learn|featuring/i.test(heading))break;}
   if(!/effects|contents|routines|contains|learn|featuring/i.test(heading))continue;
   if(/reviews|shipping|features|requirements/i.test(heading))continue;
   for(const li of list.querySelectorAll(':scope > li')) {
    const value=text(li.textContent);if(!value||value.length>900)continue;
    const split=value.match(/^(.{2,150}?)(?:\s*:\s*|\s+[–—]\s+)(.+)$/);
    const name=split?split[1]:value;if(name.length>150)continue;
    const description=split&&remaining>0?split[2].slice(0,Math.min(160,remaining)):'';remaining-=description.length;
    tricks.push({name,creator:'',description,evidence:{url,section:'product description contents list'}});
   }
  }
  const props=[];
  const explicit=[...section.querySelectorAll('p,li')].map(el=>text(el.textContent)).join('. ').split(/[.!?]\s+/).filter(s=>/\b(?:requires?|you(?: will)? need|needed to perform|props? required)\b/i.test(s));
  for(const sentence of explicit)for(const [pattern,label] of [[/\b(?:playing cards?|deck of cards)\b/i,'Playing cards'],[/\bcoins?\b/i,'Coins'],[/\bribbon\b/i,'Ribbon'],[/\brope\b/i,'Rope'],[/\bsponge balls?\b/i,'Sponge balls'],[/\blinking rings?\b/i,'Linking rings']])if(pattern.test(sentence)&&!/\b(?:no|without|not)\b/i.test(sentence))props.push(label);
  return {title,creators,format,tricks,props:[...new Set(props)],summary:'Named contents extracted from the product listing.',extraction:'retailer_product_lists'};
 }finally{page.window.close();}
}
export function parseSource(html,url) {return checkedUrl(url).hostname.endsWith('conjuringarchive.com')?parseArchive(html,url):parseRetailer(html,url);}
