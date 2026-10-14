// Shared vocabulary for data preparation. Only whole, generic labels are collapsed;
// specific effects such as a deck switch and a card switch retain their wording.
export const CATEGORY_GROUPS = [
  { label: 'Cards', aliases: ['card', 'cards', 'deck', 'decks', 'playing cards', 'card magic', 'deck magic', 'card tricks', 'card effects', 'playing card magic'] },
  { label: 'Coins', aliases: ['coin', 'coins', 'coinage', 'coin magic', 'coin tricks', 'coin effects'] },
  { label: 'Rubber bands', aliases: ['rubber band', 'rubber bands', 'rubberband', 'rubberbands', 'rubber band magic'] },
  { label: 'Ropes', aliases: ['rope', 'ropes', 'rope magic', 'rope tricks', 'rope effects'] },
  { label: 'Mentalism', aliases: ['mentalism', 'mental magic', 'mind reading', 'mindreading'] },
  { label: 'Close-up', aliases: ['close up', 'closeup', 'close-up', 'close up magic', 'close-up magic'] },
  { label: 'Restaurant / walkaround', aliases: ['restaurant magic', 'walkaround', 'walk around', 'walkaround magic', 'table hopping', 'strolling magic'] },
  { label: 'Stage / parlor', aliases: ['stage magic', 'parlor magic', 'parlour magic', 'cabaret magic'] },
  { label: 'Techniques', aliases: ['move', 'moves', 'sleight', 'sleights', 'technique', 'techniques'] },
  { label: 'Routine', aliases: ['routine', 'routines'] },
  { label: 'Effects', aliases: ['effect', 'effects', 'trick', 'tricks'] },
  { label: 'Masterclass', aliases: ['masterclass', 'master class', 'masterclasses', 'master classes'] },
  { label: 'Performance', aliases: ['performance', 'performances'] },
  { label: 'Interview', aliases: ['interview', 'interviews'] },
];
const key = text => text.toLowerCase().replace(/[.!]+$/, '').replace(/\s+/g, ' ').trim();
const aliases = new Map(CATEGORY_GROUPS.flatMap(group => group.aliases.map(alias => [key(alias), group.label])));
export function canonicalPhrase(text) {
  const direct = aliases.get(key(text));
  if (direct) return direct;
  const parts = text.split(/\s+(?:and|&)\s+/i);
  const subjects = new Set(['Cards', 'Coins', 'Rubber bands', 'Ropes', 'Mentalism']);
  const labels = parts.map(part => aliases.get(key(part)));
  if (parts.length > 1 && labels.every(label => subjects.has(label))) {
    return [...new Set(labels)].sort().join(' and ');
  }
  return text.trim();
}
export function consolidateDescriptions(values) {
  const groups = new Map();
  for (const value of values) {
    // Semicolons delimit catalog facts; do not split commas inside effects or names.
    for (const part of value.split(';').map(v => v.trim()).filter(Boolean)) {
      const normalized = canonicalPhrase(part);
      const signature = key(normalized);
      if (!groups.has(signature)) groups.set(signature, { text: normalized, variants: [] });
      if (!groups.get(signature).variants.includes(part)) groups.get(signature).variants.push(part);
    }
  }
  return [...groups.values()];
}
