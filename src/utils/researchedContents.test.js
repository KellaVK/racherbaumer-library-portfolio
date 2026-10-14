import { it, expect } from 'vitest';
import catalog from '../../tests/fixtures/catalog-snapshot.json';
import { enrichCatalogDVD } from './catalogData';
import { createDiscoveryIndex, searchCatalog } from './discovery';
it('finds researched tricks on the correct DVD and searches factual descriptions',()=>{
 const index=createDiscoveryIndex(catalog.map(dvd=>enrichCatalogDVD(dvd)));
 for (const [query,id] of [['Las Vegas Leaper','QZ6zSJ3GUSoRxPZfAxZt'],['Card Warp','Q4VOWSSY04JrOCzfWrtl'],['Jazz Aces','9lTtHUuAUHH43Gy7Dzgi'],['Out With Three','r0rO0tvtNFONd1tmVBWG']]) {
  // Exact DVD-title matches may rank above a contents match (e.g. Card Warp Finale).
  expect(searchCatalog(index,query).slice(0,5).map(dvd=>dvd.id)).toContain(id);
 }
 expect(searchCatalog(index,'coins travel between hands').some(result=>result.id==='r0rO0tvtNFONd1tmVBWG')).toBe(true);
 expect(enrichCatalogDVD(catalog.find(d=>d.id==='HssuH3uTMapIP6awsLOc')).externalEvidence).toBeNull();
});

it('uses the reviewed edition link instead of a legacy link to a different version',()=>{
 const dvd=enrichCatalogDVD({...catalog.find(d=>d.id==='r0rO0tvtNFONd1tmVBWG'),vanishingIncUrl:'https://www.vanishingincmagic.com/magic-dvds/mirage-et-trois-20/'});
 expect(dvd.vanishingIncUrl).toBe('https://www.vanishingincmagic.com/magic-dvds/mirage-et-trois/');
});

it('makes machine-matched contents searchable while retaining their provenance',()=>{
 const raw={id:'machine-test',title:'Example DVD',magician:['Alice Example']};
 const machine={title:raw.title,creators:raw.magician,status:'machine_matched_source',summary:'Source-listed contents',props:[],subjects:[],sources:[],tricks:[{name:'Vanishing Walnut',description:'A walnut disappears.'}],editionNote:'Automatically matched; physical DVD not checked.'};
 const dvd=enrichCatalogDVD(raw,{}, {'machine-test':machine});
 expect(dvd.externalEvidence?.status).toBe('machine_matched_source');
 expect(searchCatalog(createDiscoveryIndex([dvd]),'Vanishing Walnut').map(d=>d.id)).toContain('machine-test');
 expect(enrichCatalogDVD({...raw,title:'Another DVD'}, {}, {'machine-test':machine}).externalEvidence).toBeNull();
});
