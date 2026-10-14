import { describe, it, expect } from 'vitest';
import { reconcileCatalog } from './reconcileCatalog.js';
import { enrichCatalogDVD } from '../../src/utils/catalogData.js';

describe('catalog reconciliation', () => {
  const live = [
    { id: 'a', title: 'Cards - Vol.1', magician: ['Alex'] },
    { id: 'b', title: 'Cards - Vol.2', magician: ['Alex'] },
  ];
  it('combines duplicate descriptive rows, preserving provenance and live identity', () => {
    const rows = [
      {
        title: 'Cards - Vol.1',
        notes: 'Coin matrix',
        source: 'DVD List',
        row: 2,
      },
      { title: 'Cards - Vol.1', notes: 'Lecture', source: 'CD List', row: 3 },
    ];
    const result = reconcileCatalog(live, rows);
    expect(result.overlay.a.notes).toEqual(['Coin matrix', 'Lecture']);
    expect(result.overlay.a.sources).toHaveLength(2);
    expect(result.overlay.b).toBeUndefined();
  });
  it('does not guess ambiguous titles or other volumes', () => {
    expect(
      reconcileCatalog(live, [{ title: 'Cards - Vol.3' }]).unmatched,
    ).toHaveLength(1);
    expect(
      reconcileCatalog(
        [...live, { id: 'c', title: 'Cards - Vol.1' }],
        [{ title: 'Cards - Vol.1' }],
      ).unmatched,
    ).toHaveLength(1);
  });
  it('allows only reviewed aliases and strips private fields', () => {
    const result = reconcileCatalog(
      live,
      [
        {
          title: 'Cardz Vol 1',
          notes: '?',
          phone: 'private',
          checkedOutBy: 'private',
        },
      ],
      { 'Cardz Vol 1': 'a' },
    );
    expect(result.overlay.a.notes).toEqual([]);
    expect(JSON.stringify(result)).not.toContain('private');
  });
  it('quarantines matching titles with different creators', () => {
    const result = reconcileCatalog(live, [
      {
        title: 'Cards - Vol.1',
        magician: 'Different Person',
        notes: 'Wrong work',
      },
    ]);
    expect(result.overlay.a).toBeUndefined();
    expect(result.conflicts).toHaveLength(1);
  });
  it('preserves live data and rejects stale enrichment', () => {
    const overlay = {
      a: { title: 'Cards - Vol.1', notes: ['New notes'], sources: [] },
    };
    expect(
      enrichCatalogDVD({ ...live[0], checkedOutBy: 'person' }, overlay)
        .checkedOutBy,
    ).toBe('person');
    expect(
      enrichCatalogDVD({ id: 'a', title: 'Unrelated' }, overlay).catalogNotes,
    ).toEqual([]);
    expect(enrichCatalogDVD(live[0], overlay).catalogNotes).toEqual([
      'New notes',
    ]);
  });
});
