import { describe, it, expect } from 'vitest';
import {
  createDiscoveryIndex,
  searchCatalog,
  recommendCatalog,
} from './discovery.js';

const dvds = [
  {
    id: 'coins',
    title: 'A Master of Muscle Pass',
    magician: ['Shoot Ogawa'],
    notes: 'Various Coin Moves',
    aiSummary: 'A beginner card magic course.',
  },
  {
    id: 'rings',
    title: 'Three Ring Concerto',
    magician: ['Aldo Colombini'],
    catalogNotes: ['Linking Rings routine for close-up performance'],
  },
  {
    id: 'mind',
    title: 'Thoughts',
    magician: ['Alex'],
    notes: 'Mentalism predictions for stage audiences',
  },
  {
    id: 'easy',
    title: 'First Steps',
    notes: 'Self-working card tricks for beginners',
    checkedOutBy: 'borrower',
  },
  {
    id: 'deep',
    title: 'Pocket Lessons',
    aiSummary:
      'An instructional collection. '.repeat(30) +
      'Includes a rubber band routine for restaurant table hopping.',
  },
];
const index = createDiscoveryIndex(dvds);

describe('enriched search', () => {
  it('ranks exact titles and creators ahead of description matches', () => {
    expect(searchCatalog(index, 'Three Ring Concerto')[0].id).toBe('rings');
    expect(searchCatalog(index, 'shoot ogawa')[0].id).toBe('coins');
  });
  it('finds notes from the spreadsheet and concepts in natural queries', () => {
    expect(searchCatalog(index, 'linking rings')[0].id).toBe('rings');
    expect(searchCatalog(index, 'mind reading for a stage show')[0].id).toBe(
      'mind',
    );
  });
  it('handles misspellings and terms deep in AI descriptions', () => {
    expect(searchCatalog(index, 'colombni')[0].id).toBe('rings');
    const result = searchCatalog(index, 'rubber bands restaurant')[0];
    expect(result.id).toBe('deep');
    expect(result.discoveryMatch.source).toBe('AI description');
    expect(result.discoveryMatch.snippet).toContain('rubber band');
  });
  it('does not use contradictory AI props to outrank direct catalog evidence', () => {
    expect(searchCatalog(index, 'beginner card tricks')[0].id).toBe('easy');
    expect(searchCatalog(index, 'coin moves')[0].id).toBe('coins');
  });
  it('corrects typos in both source notes and queries even when another record uses the spelling', () => {
    const idx = createDiscoveryIndex([
      {
        id: 'photo',
        title: 'Optical Delusion',
        notes: 'Card Prediciton in Photo Effect',
      },
      { id: 'glenn', title: 'Glenn Miller Hypnosis Show' },
      { id: 'glen', title: 'Glen Smith Cards' },
    ]);
    expect(searchCatalog(idx, 'card prediction photo')[0].id).toBe('photo');
    expect(searchCatalog(idx, 'Glen Miller hypnosis')[0].id).toBe('glenn');
  });
  it('finds exact titles made entirely of common search words', () => {
    const idx = createDiscoveryIndex([
      { id: 'magic', title: 'Magic' },
      { id: 'show', title: 'The Magic Show' },
    ]);
    expect(searchCatalog(idx, 'Magic')[0].id).toBe('magic');
    expect(searchCatalog(idx, 'The Magic Show')[0].id).toBe('show');
  });
  it('does not return irrelevant results or crash on missing data', () => {
    expect(searchCatalog(index, 'astronaut telescope')).toEqual([]);
    expect(
      searchCatalog(createDiscoveryIndex([null, { id: 'blank' }]), 'coins'),
    ).toEqual([]);
  });
});

describe('preference suggestions', () => {
  it('explains matches and respects availability', () => {
    const results = recommendCatalog(
      index,
      { interests: ['cards'], level: 'beginner' },
      { availability: 'available' },
    );
    expect(results.some((x) => x.id === 'easy')).toBe(false);
    const all = recommendCatalog(index, {
      interests: ['cards'],
      level: 'beginner',
    });
    expect(all[0].id).toBe('easy');
    expect(all[0].recommendationReasons.length).toBeGreaterThan(0);
  });
  it('returns no fabricated recommendations when preferences have no evidence', () => {
    expect(recommendCatalog(index, {})).toEqual([]);
    expect(
      recommendCatalog(index, { interests: ['unknown-interest'] }),
    ).toEqual([]);
  });
  it('excludes the chosen reference and leaves originals unchanged', () => {
    const copy = JSON.stringify(dvds);
    const results = recommendCatalog(index, { referenceId: 'rings' });
    expect(results.every((x) => x.id !== 'rings')).toBe(true);
    expect(JSON.stringify(dvds)).toBe(copy);
  });
});

it('ranks task matches first, fills with partial matches, and returns only three', () => {
  const idx = createDiscoveryIndex([
    { id: 'both', title: 'Family Coins', notes: 'Coin magic for children' },
    { id: 'family', title: 'Family Magic', notes: 'Magic for children' },
    { id: 'coin', title: 'Coin Course', notes: 'Beginner coin magic' },
    { id: 'card', title: 'Card Course', notes: 'Beginner card magic' },
  ]);
  const results = recommendCatalog(idx, { interests: ['coins'], setting: 'children', level: 'beginner' });
  expect(results.map(d => d.id)).toEqual(['both', 'coin', 'family']);
  const sparse = recommendCatalog(idx, { interests: ['ropes'], setting: 'children' });
  expect(sparse.map(d => d.id)).toEqual(['both', 'family']);
  expect(sparse.every(d => d.recommendationReasons.every(reason => !reason.includes('Ropes')))).toBe(true);
});

it('uses favorites as seeds, excludes hidden titles, and diversifies comparable results', () => {
  const idx = createDiscoveryIndex([
    { id: 'seed', title: 'Coin Course Vol.1', magician: ['One'], notes: 'coin vanish palm transfer' },
    { id: 'same', title: 'Coin Course Vol.2', magician: ['One'], notes: 'coin vanish palm transfer' },
    { id: 'other', title: 'Coin Workshop', magician: ['Two'], notes: 'coin vanish palm transfer' },
    { id: 'third', title: 'Coin Lessons', magician: ['Three'], notes: 'coin vanish palm transfer' },
  ]);
  const personalized = recommendCatalog(idx, {}, {}, 3, { favoriteIds: ['seed'], excludeIds: ['same'] });
  expect(personalized.map(d => d.id).sort()).toEqual(['other', 'third']);
  const varied = recommendCatalog(idx, { interests: ['coins'] });
  expect(new Set(varied.map(d => d.magician[0])).size).toBe(3);
});
