import { recommendCatalog } from './discovery';
const hash = text => [...text].reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 7);
export function browseOrder(dvds, seed = 'library') {
  return [...dvds].sort((a,b) => hash(seed + a.id) - hash(seed + b.id));
}
export function collectionItems(index, key) {
  if (key.startsWith('magician:')) return index.docs.filter(d => d.dvd.magician.includes(key.slice(9))).map(d => d.dvd);
  if (key === 'collaborations') return index.docs.filter(d => d.dvd.magician.length > 1).map(d => d.dvd);
  return index.docs.filter(d => d.fields.some(f => f.source !== 'AI description' && f.concepts.has(key))).map(d => d.dvd);
}
export function buildCollections(index) {
  const groups = [
    ['cards', 'Card magic', 'Explore sleights, routines, and effects with a deck.'],
    ['coins', 'Coin magic', 'From pocket-sized miracles to coin technique.'],
    ['collaborations', 'Collaborations & compilations', 'Titles with more than one credited magician.'],
    ['mentalism', 'Mentalism', 'Explore mental magic and prediction material.'],
  ].map(([key,title,description]) => ({key,title,description,items:browseOrder(collectionItems(index,key),key)}));
  const counts = new Map();
  for (const {dvd} of index.docs) for (const name of dvd.magician) {
    if (!/^(various|unknown|not listed)$/i.test(name)) counts.set(name,(counts.get(name)||0)+1);
  }
  const creators = [...counts].filter(([,count]) => count >= 3).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,5);
  for (const [name] of creators) {
    const key = `magician:${name}`;
    groups.push({key,title:name,description:'Explore this magician’s work in the collection.',items:browseOrder(collectionItems(index,key),key)});
  }
  return groups.filter(g=>g.items.length);
}
export function relatedTitles(index, dvd, limit=6) {
  const similar = recommendCatalog(index,{referenceId:dvd.id},{},limit);
  const ids = new Set([dvd.id,...similar.map(d=>d.id)]);
  const sameCreator = index.docs.map(d=>d.dvd).filter(d=>!ids.has(d.id)&&d.magician.some(n=>dvd.magician.includes(n)));
  return [...similar,...browseOrder(sameCreator,dvd.id)].slice(0,limit);
}
