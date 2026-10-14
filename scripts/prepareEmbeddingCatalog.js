import fs from 'node:fs';
import { prepareEmbeddingCatalog } from './lib/prepareEmbeddingCatalog.js';
const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const result = prepareEmbeddingCatalog(read('tests/fixtures/catalog-snapshot.json'), read('scripts/catalog-source.json'), read('src/data/catalog-aliases.json'));
const dir = 'data/embedding-ready';
fs.mkdirSync(dir, { recursive: true });
for (const [name, data] of [['catalog.json', result.records], ['quality-report.json', result.report]]) fs.writeFileSync(`${dir}/${name}`, JSON.stringify(data, null, 2) + '\n');
fs.writeFileSync(`${dir}/documents.jsonl`, result.documents.map(d => JSON.stringify(d)).join('\n') + '\n');
console.log(JSON.stringify({ records: result.records.length, documents: result.documents.length, coverage: result.report.coverage, review: result.report.reviewQueue.length }, null, 2));
