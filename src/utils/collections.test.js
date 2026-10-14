import { it, expect } from 'vitest';
import { createDiscoveryIndex } from './discovery';
import { buildCollections, collectionItems, browseOrder, relatedTitles } from './collections';
const dvds=[{id:'a',title:'Coins One',magician:['Alice'],notes:'Coin magic'}, {id:'b',title:'Coins Two',magician:['Alice'],notes:'Coin magic'}, {id:'c',title:'Cards',magician:['Alice','Bob'],notes:'Card magic'}, {id:'d',title:'Other',magician:['C'],aiSummary:'Coin magic'}];
const index=createDiscoveryIndex(dvds);
it('builds shelves from source-backed subjects and credited creators, not AI guesses',()=>{
 expect(collectionItems(index,'coins').map(d=>d.id)).toEqual(['a','b']);
 expect(collectionItems(index,'collaborations').map(d=>d.id)).toEqual(['c']);
 expect(buildCollections(index).some(s=>s.key==='magician:Alice')).toBe(true);
 expect(collectionItems(index,'magician:Alice')).toHaveLength(3);
});
it('uses stable browse ordering without mutating input and excludes self from related titles',()=>{
 const original=JSON.stringify(dvds);
 expect(browseOrder(dvds)).toEqual(browseOrder(dvds));
 expect(JSON.stringify(dvds)).toBe(original);
 expect(relatedTitles(index,index.docs[0].dvd).every(d=>d.id!=='a')).toBe(true);
});
