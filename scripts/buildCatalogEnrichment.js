import fs from 'node:fs';
import { reconcileCatalog } from './lib/reconcileCatalog.js';

const sourcePath = process.argv[2];
const catalogPath = process.argv[3];
if (!sourcePath || !catalogPath)
  throw new Error(
    'Usage: node scripts/buildCatalogEnrichment.js SOURCE.json CATALOG.json',
  );
const sources = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const aliases = JSON.parse(
  fs.readFileSync(
    new URL('../src/data/catalog-aliases.json', import.meta.url),
    'utf8',
  ),
);
const result = reconcileCatalog(catalog, sources.rows, aliases);
fs.writeFileSync(
  new URL('../src/data/catalog-enrichment.json', import.meta.url),
  JSON.stringify(result.overlay, null, 2) + '\n',
);
fs.writeFileSync(
  new URL('../docs/catalog-reconciliation.json', import.meta.url),
  JSON.stringify(
    {
      retrievedAt: sources.retrievedAt,
      source: sources.source,
      ...result,
      overlay: undefined,
    },
    null,
    2,
  ) + '\n',
);
console.log(JSON.stringify(result.stats));
console.log(
  'Unmatched:',
  result.unmatched.length,
  'creator conflicts:',
  result.conflicts.length,
);
