import Fuse from 'fuse.js';
import { normalizeDVD, filterDVDs } from './dvd.js';

export const INTERESTS = [
  ['cards', 'Cards'],
  ['coins', 'Coins'],
  ['mentalism', 'Mentalism'],
  ['rings', 'Linking rings'],
  ['ropes', 'Ropes'],
  ['bands', 'Rubber bands'],
  ['sponge', 'Sponge balls'],
  ['cups', 'Cups and balls'],
  ['comedy', 'Comedy'],
];
export const LEVELS = [
  ['beginner', 'Beginner'],
  ['intermediate', 'Intermediate'],
  ['advanced', 'Advanced'],
];
export const SETTINGS = [
  ['closeup', 'Close-up'],
  ['restaurant', 'Restaurant / walkaround'],
  ['stage', 'Stage / parlor'],
  ['children', 'Children / family'],
];
const CONCEPTS = {
  cards: ['card', 'cards', 'deck', 'decks', 'playing cards'],
  coins: ['coin', 'coins', 'coinage'],
  mentalism: [
    'mentalism',
    'mentalist',
    'mind reading',
    'mindreading',
    'mental magic',
    'prediction',
    'predictions',
  ],
  rings: ['linking rings', 'ring', 'rings'],
  ropes: ['rope', 'ropes'],
  bands: [
    'rubber band',
    'rubber bands',
    'rubberband',
    'rubberbands',
    'elastic',
  ],
  sponge: ['sponge ball', 'sponge balls', 'sponge'],
  cups: ['cups and balls', 'cup', 'cups', 'chop cup'],
  comedy: ['comedy', 'comic', 'funny', 'humor', 'humour'],
  beginner: [
    'beginner',
    'beginners',
    'basic',
    'basics',
    'fundamental',
    'fundamentals',
    'easy',
    'self working',
    'selfworking',
  ],
  intermediate: ['intermediate'],
  advanced: ['advanced', 'expert', 'difficult'],
  closeup: ['close up', 'closeup', 'close-up'],
  restaurant: [
    'restaurant',
    'resturaunt',
    'resturuant',
    'table hopping',
    'walkaround',
    'walk around',
    'strolling',
  ],
  stage: ['stage', 'parlor', 'parlour', 'cabaret'],
  children: ['children', 'kids', 'child', 'family'],
};
const STOP = new Set(
  'a an the and or of for to in on with by from at as is are be can i my me you your some how do does want looking learn learning find show perform performance magic trick tricks dvd video instruction instructional collection includes featuring routine routines'.split(
    ' ',
  ),
);
const plain = (value) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
const stem = (word) =>
  word.length > 4 && word.endsWith('s') && !word.endsWith('ss')
    ? word.slice(0, -1)
    : word;
const tokens = (text) =>
  plain(text)
    .split(' ')
    .filter((s) => s && !STOP.has(s))
    .map(stem);
const contains = (text, phrase) => ` ${text} `.includes(` ${plain(phrase)} `);
const concepts = (text) =>
  Object.entries(CONCEPTS)
    .filter(([, terms]) => terms.some((term) => contains(text, term)))
    .map(([key]) => key);
const join = (value) =>
  Array.isArray(value) ? value.join('; ') : String(value || '');

function fieldsFor(dvd) {
  return [
    ['Title', [dvd.title, ...(dvd.catalogAliases || [])].join('; '), 12],
    ['Creator', [join(dvd.magician), join(dvd.catalogMagicians)].join('; '), 9],
    [
      'Catalog notes',
      [
        dvd.notes,
        join(dvd.catalogNotes),
        join(dvd.magicType),
        join(dvd.catalogTypes),
      ]
        .filter(Boolean)
        .join('; '),
      6,
    ],
    [
      'Featured performers',
      [join(dvd.otherFeatures), join(dvd.catalogPerformers)].join('; '),
      5,
    ],
    [
      'Producer',
      [dvd.producer, join(dvd.catalogProducers)].filter(Boolean).join('; '),
      3,
    ],
    ['Published source notes', dvd.externalEvidence ? [dvd.externalEvidence.summary, ...dvd.externalEvidence.subjects, ...dvd.externalEvidence.props, ...dvd.externalEvidence.tricks.map(t => `${t.name} ${t.creator || ''}`)].join('; ') : '', 6],
    ['AI description', dvd.aiSummary, 1.2],
  ]
    .filter(([, text]) => text && plain(text))
    .map(([source, text, weight]) => ({
      source,
      text,
      weight,
      normalized: plain(text),
      words: new Set(tokens(text)),
      concepts: new Set(concepts(plain(text))),
    }));
}

export function createDiscoveryIndex(raw = []) {
  const docs = raw.filter(Boolean).map((rawDVD) => {
    const dvd = normalizeDVD(rawDVD),
      fields = fieldsFor(dvd);
    const direct = new Set(
      fields
        .filter((f) => f.source !== 'AI description')
        .flatMap((f) => [...f.concepts]),
    );
    // A known card/coin disagreement is a quality signal, not a reason to learn an incorrect category.
    const summary = fields.find((f) => f.source === 'AI description');
    if (
      summary &&
      ((direct.has('coins') &&
        !direct.has('cards') &&
        summary.concepts.has('cards') &&
        !summary.concepts.has('coins')) ||
        (direct.has('cards') &&
          !direct.has('coins') &&
          summary.concepts.has('coins') &&
          !summary.concepts.has('cards')))
    ) {
      fields.splice(fields.indexOf(summary), 1);
    }
    const vocabulary = new Set(fields.flatMap((f) => [...f.words]));
    return { dvd, fields, vocabulary };
  });
  const frequency = new Map();
  docs.forEach((d) =>
    d.vocabulary.forEach((word) =>
      frequency.set(word, (frequency.get(word) || 0) + 1),
    ),
  );
  const idf = new Map(
    [...frequency].map(([word, count]) => [
      word,
      1 + Math.log((1 + docs.length) / (1 + count)),
    ]),
  );
  const vocabulary = [...frequency.keys()];
  const fuzzy = new Fuse(vocabulary, {
    threshold: 0.25,
    includeScore: true,
    ignoreLocation: true,
  });
  for (const doc of docs) {
    doc.vector = new Map();
    for (const f of doc.fields)
      for (const word of f.words)
        doc.vector.set(
          word,
          Math.max(doc.vector.get(word) || 0, f.weight * idf.get(word)),
        );
    doc.norm = Math.sqrt(
      [...doc.vector.values()].reduce((sum, n) => sum + n * n, 0),
    );
  }
  return { docs, idf, fuzzy };
}

function queryGroups(index, query) {
  let remainder = plain(query).slice(0, 240);
  const groups = [];
  for (const [key, terms] of Object.entries(CONCEPTS)) {
    const matches = terms
      .filter((term) => contains(remainder, term))
      .sort((a, b) => b.length - a.length);
    if (!matches.length) continue;
    const alternatives = matches
      .filter((t) => !t.includes(' ') && t.length >= 5)
      .flatMap((t) =>
        index.fuzzy.search(stem(t), { limit: 3 }).map((r) => r.item),
      );
    groups.push({ concept: key, words: alternatives });
    for (const term of matches)
      remainder = ` ${remainder} `.replaceAll(` ${plain(term)} `, ' ').trim();
  }
  for (const word of [...new Set(tokens(remainder))].slice(0, 16)) {
    const alternatives =
      word.length < 4
        ? []
        : index.fuzzy.search(word, { limit: 2 }).map((r) => r.item);
    groups.push({ words: [word, ...alternatives] });
  }
  return groups;
}

function matchField(field, group) {
  if (group.concept && field.concepts.has(group.concept)) return true;
  return group.words.some((word) => field.words.has(word));
}
function snippet(field, groups) {
  const lower = field.text.toLowerCase();
  const terms = groups.flatMap((g) =>
    g.concept ? CONCEPTS[g.concept] : g.words,
  );
  const positions = terms.map((t) => lower.indexOf(t)).filter((p) => p >= 0);
  const start = Math.max(
    0,
    (positions.length ? Math.min(...positions) : 0) - 35,
  );
  const text = field.text.slice(start, start + 180);
  return `${start ? '…' : ''}${text}${start + 180 < field.text.length ? '…' : ''}`;
}

export function searchCatalog(index, query) {
  const text = plain(query).slice(0, 240);
  if (!text) return index.docs.map((d) => d.dvd);
  const groups = queryGroups(index, text);
  if (!groups.length)
    return index.docs
      .filter(
        (doc) =>
          plain(doc.dvd.title) === text ||
          (text.split(' ').length > 1 && contains(plain(doc.dvd.title), text)),
      )
      .map(({ dvd }) => ({
        ...dvd,
        discoveryScore: 600,
        discoveryMatch: { source: 'Title', snippet: dvd.title },
      }));
  const results = [];
  for (const doc of index.docs) {
    let score = 0,
      matched = 0,
      best = null,
      bestScore = -1;
    for (const group of groups) {
      let weight = 0;
      for (const field of doc.fields)
        if (matchField(field, group)) {
          weight = Math.max(weight, field.weight);
        }
      if (weight) {
        matched++;
        score +=
          weight * (group.concept ? 2 : index.idf.get(group.words[0]) || 2);
      }
    }
    const exact =
      plain(doc.dvd.title) === text ||
      doc.fields.some(
        (f) => f.source === 'Creator' && contains(f.normalized, text),
      );
    if (!exact && matched < Math.max(1, Math.ceil(groups.length * 0.7)))
      continue;
    for (const field of doc.fields) {
      const count = groups.filter((g) => matchField(field, g)).length;
      const fieldScore = count * field.weight;
      if (count && fieldScore > bestScore) {
        best = field;
        bestScore = fieldScore;
      }
    }
    if (!best) continue;
    score *= matched / groups.length;
    if (plain(doc.dvd.title) === text) score += 500;
    else if (contains(plain(doc.dvd.title), text)) score += 100;
    if (exact) score += 100;
    results.push({
      ...doc.dvd,
      discoveryScore: score,
      discoveryMatch: { source: best.source, snippet: snippet(best, groups) },
    });
  }
  return results.sort(
    (a, b) =>
      b.discoveryScore - a.discoveryScore || a.title.localeCompare(b.title),
  );
}

function cosine(a, b) {
  if (!a.norm || !b.norm) return 0;
  let sum = 0;
  for (const [word, value] of a.vector)
    sum += value * (b.vector.get(word) || 0);
  return sum / (a.norm * b.norm);
}

export function recommendCatalog(
  index,
  preferences = {},
  filters = {},
  limit = 3,
  options = {},
) {
  const wanted = [
    ...(preferences.interests || []),
    preferences.level,
    preferences.setting,
  ].filter((key) => CONCEPTS[key]);
  const reference = index.docs.find(
    (d) => d.dvd.id === preferences.referenceId,
  );
  const references = reference ? [reference] : index.docs.filter(d => (options.favoriteIds || []).includes(d.dvd.id));
  const excluded = new Set([...(options.excludeIds || []), ...references.map(d => d.dvd.id)]);
  if (!wanted.length && !references.length) return [];
  const allowed = new Set(
    filterDVDs(
      index.docs.map((d) => d.dvd),
      { ...filters, query: '', sort: undefined },
    ).map((d) => d.id),
  );
  const labels = Object.fromEntries([...INTERESTS, ...LEVELS, ...SETTINGS]);
  const ranked = index.docs
    .filter((d) => allowed.has(d.dvd.id) && !excluded.has(d.dvd.id))
    .map((doc) => {
      let score = 0;
      const reasons = [];
      let subjectMatch = false;
      let settingMatch = false;
      for (const key of wanted) {
        const field = doc.fields.find((f) => f.concepts.has(key));
        if (!field) continue;
        subjectMatch ||= (preferences.interests || []).includes(key);
        settingMatch ||= key === preferences.setting;
        const weight = key === preferences.level ? 1 : 3;
        score += weight * (field.source === 'AI description' ? 0.4 : 1);
        reasons.push(
          `${labels[key]} · ${field.source === 'AI description' ? 'mentioned in AI description' : 'catalog match'}`,
        );
      }
      const related = references.map(seed => ({ seed, similarity: cosine(doc, seed) }))
        .sort((a, b) => b.similarity - a.similarity)[0];
      if (related?.similarity >= 0.12) {
        score += related.similarity * 8;
        reasons.push(`Related catalog content to “${related.seed.dvd.title}”`);
      }
      return {
        ...doc.dvd,
        recommendationScore: score,
        // Prefer broad task fit before evidence strength; missing metadata is not a veto.
        recommendationFit: Number(subjectMatch) + Number(settingMatch),
        recommendationReasons: reasons.slice(0, 3),
      };
    })
    .filter((d) => d.recommendationScore > 0)
    .sort(
      (a, b) =>
        b.recommendationFit - a.recommendationFit ||
        b.recommendationScore - a.recommendationScore ||
        a.title.localeCompare(b.title),
    );
  const selected = [];
  const performers = new Set();
  const series = new Set();
  while (ranked.length && selected.length < limit) {
    const top = ranked[0];
    const seriesKey = dvd => dvd.title.toLowerCase().replace(/\bvol(?:ume)?s?\.?\s*\d+.*$/i, '').trim();
    const fresh = ranked.findIndex(d => d.recommendationFit === top.recommendationFit &&
      d.recommendationScore >= top.recommendationScore * .8 &&
      !d.magician.some(name => performers.has(name.toLowerCase())) && !series.has(seriesKey(d)));
    const [next] = ranked.splice(fresh < 0 ? 0 : fresh, 1);
    selected.push(next);
    next.magician.forEach(name => performers.add(name.toLowerCase()));
    series.add(seriesKey(next));
  }
  return selected;
}
