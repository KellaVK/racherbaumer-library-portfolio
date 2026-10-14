import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
export function publicDVD(document) {
 const fields=document.fields||{};
 const string=key=>fields[key]?.stringValue||'';
 const list=key=>(fields[key]?.arrayValue?.values||[]).map(v=>v.stringValue).filter(Boolean);
 return {id:document.name.split('/').pop(),title:string('title'),magician:list('magician'),
  vanishingIncUrl:string('vanishingIncUrl'),penguinUrl:string('penguinUrl'),conjuringArchiveUrl:string('conjuringArchiveUrl')};
}
export async function fetchPublicCatalog() {
 const base='https://firestore.googleapis.com/v1/projects/racherbaumer-dvd-collection/databases/(default)/documents/dvds';
 const rows=[];let token='';
 do {
  const url=new URL(base);url.searchParams.set('pageSize','1000');if(token)url.searchParams.set('pageToken',token);
  const {stdout}=await exec('curl',['--silent','--show-error','--fail','--max-time','45',url.href],{maxBuffer:15_000_000});
  const data=JSON.parse(stdout);if(!Array.isArray(data.documents))throw new Error('Public catalog response missing documents');
  rows.push(...data.documents.map(publicDVD));token=data.nextPageToken||'';
 }while(token);
 if(!rows.length||rows.some(d=>!d.id||!d.title)||new Set(rows.map(d=>d.id)).size!==rows.length)throw new Error('Invalid public catalog');
 return rows;
}
