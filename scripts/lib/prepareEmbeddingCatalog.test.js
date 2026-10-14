import { describe, expect, it } from 'vitest';
import { prepareEmbeddingCatalog, cleanText } from './prepareEmbeddingCatalog.js';
const source = rows => ({ retrievedAt: '2026-10-14', rows });
describe('embedding catalog preparation', () => {
  it('normalizes descriptions while preserving display titles and source evidence', () => {
    const result = prepareEmbeddingCatalog([{ id:'a', title:'Optical Delusion', magician:['A'], notes:'' }], source([
      { title:'Optical Delusion', magician:'A', notes:'Card Prediciton in Photo Effect', magicType:'Routine', source:'DVD List', row:3 },
    ]));
    const record = result.records[0];
    expect(record.title).toBe('Optical Delusion');
    expect(record.notes).toEqual(['Card prediction in Photo Effect']);
    expect(record.originalNotes).toEqual(['Card Prediciton in Photo Effect']);
    expect(record.categories.subjects.map(t => t.label)).toContain('cards');
    expect(record.categories.subjects.map(t => t.label)).not.toContain('mentalism');
    expect(record.provenance.spreadsheetRows).toEqual([{tab:'DVD List',row:3}]);
  });
  it('excludes account data and unverified AI claims from embedding text', () => {
    const result = prepareEmbeddingCatalog([{ id:'a', title:'Expert Coin Magic Made Easy', magician:['A'], aiSummary:'Suitable for beginner children shows', checkedOutBy:'PRIVATE_USER', requesterEmail:'SECRET_EMAIL' }], source([]));
    expect(result.records[0].categories.levels).toEqual([]);
    expect(result.documents[0].text).not.toMatch(/beginner|children|PRIVATE_USER|SECRET_EMAIL/);
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE_USER|SECRET_EMAIL/);
    expect(result.records[0].aiDescription.includedInDefaultEmbeddings).toBe(false);
  });
  it('does not confuse generic rings with linking rings or negate difficulty claims', () => {
    const result = prepareEmbeddingCatalog([{ id:'a',title:'Ring and Rope',notes:'Not for beginners. A finger ring and rope routine.' }],source([]));
    expect(result.records[0].categories.subjects.map(t=>t.label)).toEqual(['ropes','finger rings']);
    expect(result.records[0].categories.levels).toEqual([]);
  });
  it('quarantines creator conflicts rather than attaching their notes', () => {
    const result = prepareEmbeddingCatalog([{ id:'a',title:'Shared Title',magician:['Alice'] }],source([{title:'Shared Title',magician:'Bob',notes:'Coin magic',source:'DVD List',row:4}]));
    expect(result.report.conflicts).toHaveLength(1);
    expect(result.records[0].notes).toEqual([]);
  });
  it('produces deterministic hashes and chunks with context', () => {
    const catalog = [{id:'a',title:'Course Vol.2',notes:'An instructional coin routine. '.repeat(150)}];
    const first = prepareEmbeddingCatalog(catalog,source([]));
    const second = prepareEmbeddingCatalog(catalog,source([]));
    expect(first).toEqual(second);
    expect(first.documents.length).toBeGreaterThan(1);
    expect(first.documents.every(d=>d.text.startsWith('Title: Course Vol.2'))).toBe(true);
    expect(first.records[0].series).toEqual({title:'Course',volume:'2'});
    const changed = prepareEmbeddingCatalog([{...catalog[0], notes:'Different notes'}],source([]));
    expect(changed.records[0].contentHash).not.toBe(first.records[0].contentHash);
    expect(cleanText(' N/A ')).toBe('');
  });
  it('rejects duplicate catalog IDs', () => {
    expect(()=>prepareEmbeddingCatalog([{id:'a',title:'One'},{id:'a',title:'Two'}],source([]))).toThrow(/duplicate/);
  });
});

it('includes only reviewed matching external facts and preserves their source', () => {
  const catalog = [{id:'a',title:'Course Vol.1',magician:['Alice']}];
  const evidence = {title:'Course Vol.1',creators:['Alice'],status:'reviewed_source_match',summary:'Coin routines',props:['Coins'],tricks:[{name:'Example Trick',creator:'Bob'}],url:'https://www.penguinmagic.com/p/1'};
  const accepted = prepareEmbeddingCatalog(catalog, source([]), {}, {a:evidence});
  expect(accepted.documents[0].text).toContain('Example Trick (Bob)');
  expect(accepted.records[0].externalEvidence.url).toBe(evidence.url);
  const rejected = prepareEmbeddingCatalog(catalog, source([]), {}, {a:{...evidence,title:'Course Vol.2'}});
  expect(rejected.records[0].externalEvidence).toBeNull();
  expect(rejected.documents[0].text).not.toContain('Example Trick');
});
