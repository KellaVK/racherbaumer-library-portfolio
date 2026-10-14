import { it, expect } from 'vitest';
import { canonicalPhrase, consolidateDescriptions } from './catalogVocabulary.js';
it('groups equivalent subject and format labels', () => {
  expect(['Decks', 'playing cards', 'Card Magic', 'card effects'].map(canonicalPhrase)).toEqual(['Cards','Cards','Cards','Cards']);
  expect(['Moves', 'sleights', 'techniques'].map(canonicalPhrase)).toEqual(['Techniques','Techniques','Techniques']);
});
it('merges repeated generic descriptions while retaining useful distinctions', () => {
  const result = consolidateDescriptions(['Decks; Card Magic', 'Playing cards', 'Deck switch', 'Card switch', 'No cards required']);
  expect(result.map(g => g.text)).toEqual(['Cards', 'Deck switch', 'Card switch', 'No cards required']);
  expect(result[0].variants).toEqual(['Decks','Card Magic','Playing cards']);
});
it('keeps unknown concepts and different props intact', () => {
  expect(canonicalPhrase('Finger rings')).toBe('Finger rings');
  expect(canonicalPhrase('Linking rings')).toBe('Linking rings');
  expect(canonicalPhrase('Coin matrix with four borrowed coins')).toBe('Coin matrix with four borrowed coins');
});

it('combines reordered generic multi-subject descriptions without losing subjects', () => {
  const groups = consolidateDescriptions(['Card and Coin Effects', 'Coins & Cards', 'Cards and Coins']);
  expect(groups).toHaveLength(1);
  expect(groups[0].text).toBe('Cards and Coins');
  expect(groups[0].variants).toHaveLength(3);
});
