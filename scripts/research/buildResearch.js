import fs from 'node:fs';
import { reviewReport } from './reviewReport.js';
import { compareSources, publishRecord, embeddingDocuments } from './compareSources.js';
const read = file => JSON.parse(fs.readFileSync(file,'utf8'));
const batch = read(process.argv.slice(2).find(arg=>!arg.startsWith('--')) || 'data/research/batches/pilot-01.json');
const catalog = new Map(read('tests/fixtures/catalog-snapshot.json').map(d=>[d.id,d]));
const seen = new Set();
const results = batch.records.map(record => {
  const dvd=catalog.get(record.dvdId);
  if (!dvd || dvd.title !== record.title || JSON.stringify(dvd.magician) !== JSON.stringify(record.creators) || seen.has(record.dvdId)) throw new Error('Catalog identity changed or duplicated: '+record.dvdId);
  seen.add(record.dvdId);
  return compareSources(record);
});
const dir='data/research/compiled';fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(`${dir}/comparison.json`,JSON.stringify({reviewedAt:batch.reviewedAt,results},null,2)+'\n');
fs.writeFileSync(`${dir}/trick-documents.jsonl`,results.flatMap(embeddingDocuments).map(d=>JSON.stringify(d)).join('\n')+'\n');
fs.writeFileSync(`${dir}/review.html`,reviewReport(results,batch.reviewedAt));
const overlay=read('src/data/external-enrichment.json');
for (const result of results) {
  const published=publishRecord(result,batch.reviewedAt);
  if (published) overlay[result.dvdId]=published;
}
if (process.argv.includes('--publish')) fs.writeFileSync('src/data/external-enrichment.json',JSON.stringify(overlay,null,2)+'\n');
console.log(JSON.stringify({dvds:results.length,publishable:results.filter(r=>publishRecord(r,batch.reviewedAt)).length,tricks:results.reduce((n,r)=>n+r.tricks.length,0),documents:results.flatMap(embeddingDocuments).length,published:process.argv.includes('--publish')},null,2));
