// Offline coverage check: no network requests, providers, or private user data.
import { readFileSync } from 'node:fs';
import { createDiscoveryIndex, recommendCatalog, INTERESTS, SETTINGS } from '../src/utils/discovery.js';
const input = JSON.parse(readFileSync('tests/fixtures/catalog-snapshot.json', 'utf8'));
const index = createDiscoveryIndex(Array.isArray(input) ? input : input.dvds);
let empty = 0;
let total = 0;
let three = 0;
for (const [interest] of INTERESTS) {
  for (const [setting] of SETTINGS) {
    const results = recommendCatalog(index, { interests: [interest], setting });
    total++;
    if (!results.length) empty++;
    if (results.length === 3) three++;
    if (results.length > 3 || new Set(results.map(d => d.id)).size !== results.length) throw new Error('Invalid recommendation batch');
  }
}
console.log(JSON.stringify({ scenarios: total, empty, threeResults: three, note: 'Coverage only; human relevance judgments are still needed.' }, null, 2));
