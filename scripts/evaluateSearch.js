import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import Fuse from 'fuse.js';
import { createDiscoveryIndex, searchCatalog } from '../src/utils/discovery.js';
import { enrichCatalogDVD } from '../src/utils/catalogData.js';
import { normalizeDVD } from '../src/utils/dvd.js';
const catalogPath = process.argv[2];
if (!catalogPath)
  throw new Error('Usage: node scripts/evaluateSearch.js CATALOG.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const overlay = JSON.parse(
  fs.readFileSync(
    new URL('../src/data/catalog-enrichment.json', import.meta.url),
    'utf8',
  ),
);
const cases = JSON.parse(
  fs.readFileSync(
    new URL('../tests/fixtures/search-cases.json', import.meta.url),
    'utf8',
  ),
);
const baseline = new Fuse(catalog.map(normalizeDVD), {
  keys: [
    { name: 'title', weight: 3 },
    { name: 'magician', weight: 2 },
    { name: 'magicType', weight: 1.5 },
    { name: 'notes', weight: 1 },
    { name: 'producer', weight: 0.8 },
    { name: 'aiSummary', weight: 0.8 },
  ],
  threshold: 0.35,
  includeScore: true,
});
const start = performance.now();
const index = createDiscoveryIndex(
  catalog.map((d) => enrichCatalogDVD(d, overlay)),
);
const indexMs = performance.now() - start;
const results = cases.map((test) => {
  const old = baseline.search(test.query).map((r) => r.item);
  const started = performance.now();
  const next = searchCatalog(index, test.query);
  const queryMs = performance.now() - started;
  const rank = (list) => {
    const n = list.findIndex((d) => test.expected.includes(d.id));
    return n < 0 ? null : n + 1;
  };
  return {
    ...test,
    baselineRank: rank(old),
    newRank: rank(next),
    queryMs: Number(queryMs.toFixed(2)),
    topResults: next
      .slice(0, 5)
      .map((d) => ({
        id: d.id,
        title: d.title,
        source: d.discoveryMatch.source,
      })),
  };
});
const hit5 = (key) => results.filter((r) => r[key] && r[key] <= 5).length;
const exactTitleFailures = catalog
  .filter(
    (dvd) =>
      !searchCatalog(index, normalizeDVD(dvd).title)
        .slice(0, 5)
        .some((r) => r.id === dvd.id),
  )
  .map(({ id, title }) => ({ id, title }));
const report = {
  exactTitleAudit: { checked: catalog.length, failures: exactTitleFailures },
  catalogSize: catalog.length,
  cases: cases.length,
  baselineHit5: hit5('baselineRank'),
  newHit5: hit5('newRank'),
  indexMs: Number(indexMs.toFixed(2)),
  maxQueryMs: Math.max(...results.map((r) => r.queryMs)),
  note: 'Developer-curated diagnostic cases, not an independent user study or comprehensive relevance judgment. A target outside the top five may coexist with other relevant results.',
  results,
};
fs.writeFileSync(
  new URL('../docs/search-evaluation.json', import.meta.url),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    {
      ...report,
      results: results.map(({ query, baselineRank, newRank }) => ({
        query,
        baselineRank,
        newRank,
      })),
    },
    null,
    2,
  ),
);

if (
  report.newHit5 < report.baselineHit5 ||
  report.exactTitleAudit.failures.length
)
  process.exitCode = 1;
