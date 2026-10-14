import { createHash } from 'node:crypto';
import { canonicalPhrase, consolidateDescriptions } from './catalogVocabulary.js';
import { reconcileCatalog } from './reconcileCatalog.js';
export const SCHEMA_VERSION = '1.2';
const hash = value => createHash('sha256').update(value).digest('hex');
export function cleanText(value) {
  if (typeof value !== 'string') return '';
  const text = value.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return /^(?:n\/?a|null|undefined|none|unknown|[-—]+)$/i.test(text) ? '' : text;
}
const list = value => [...new Set((Array.isArray(value) ? value : [value]).map(cleanText).filter(Boolean))];
const unique = values => [...new Map(values.map(v => [v.toLowerCase(), v])).values()];
// Limited, auditable typo repairs; display titles and names are never rewritten.
const REPAIRS = { prediciton: 'prediction', resturaunt: 'restaurant', resturuant: 'restaurant', resturuants: 'restaurants', perfomance: 'performance', reveleations: 'revelations', cieling: 'ceiling' };
export function normalizeDescription(text) {
  return cleanText(text).replace(/\b(prediciton|resturaunt|resturuant|resturuants|perfomance|reveleations|cieling)\b/gi, word => REPAIRS[word.toLowerCase()]);
}
const TAXONOMY = {
  subjects: {
    cards: ['cards?', 'playing cards?', 'decks?'], coins: ['coins?', 'coinage'],
    mentalism: ['mentalism', 'mind[- ]reading', 'mental magic'],
    'linking rings': ['linking rings?', 'three ring', '3 ring', 'ring concerto'],
    ropes: ['ropes?'], 'rubber bands': ['rubber ?bands?'], 'sponge balls': ['sponge balls?'],
    'cups and balls': ['cups? and balls?', 'chop cups?'],
    'bills and money': ['bill(?:s)?', 'banknotes?', 'paper money'],
    'finger rings': ['finger rings?', 'borrowed rings?'], comedy: ['comedy', 'comedic', 'humou?r'],
  },
  settings: {
    'close-up': ['close[- ]?up'], 'restaurant / walkaround': ['restaurants?', 'walk[- ]?around', 'table hopping', 'strolling'],
    'stage / parlor': ['stage', 'parlou?r', 'cabaret'], 'children / family': ['children', 'kids', 'family', 'school show'],
  },
  formats: {
    lecture: ['lectures?'], masterclass: ['master ?class'], tutorial: ['tutorials?', 'instructional', 'teaching'],
    performance: ['performances?'], interview: ['interviews?'], biography: ['biograph(?:y|ical)', 'documentary'],
    effects: ['effects?', 'tricks?'], routine: ['routines?'], techniques: ['moves?', 'sleights?', 'techniques?'],
  },
  levels: { beginner: ['beginners?'], intermediate: ['intermediate'], advanced: ['advanced'] },
};
function classify(fields) {
  const tags = Object.fromEntries(Object.keys(TAXONOMY).map(key => [key, []]));
  for (const [group, definitions] of Object.entries(TAXONOMY)) {
    for (const [label, patterns] of Object.entries(definitions)) {
      const evidence = [];
      for (const field of fields) {
        // Marketing titles such as Expert Coin Magic Made Easy are not difficulty evidence.
        if (group === 'levels' && !field.field.endsWith('notes')) continue;
        const pattern = new RegExp(`\\b(?:${patterns.join('|')})\\b`, 'gi');
        for (const match of field.text.matchAll(pattern)) {
          const prefix = field.text.slice(Math.max(0, match.index - 35), match.index);
          if (/\b(?:not|no|without|unsuitable|except)\b[^.;!?]*$/i.test(prefix)) continue;
          evidence.push({ field: field.field, phrase: match[0] });
        }
      }
      if (evidence.length) tags[group].push({ label, status: 'unverified_source_mention', evidence });
    }
  }
  return tags;
}
function chunks(text, max = 1400) {
  const words = text.split(/\s+/); const result = []; let current = '';
  for (const word of words) {
    if (current && current.length + word.length + 1 > max) { result.push(current); current = ''; }
    current += (current ? ' ' : '') + word;
  }
  if (current) result.push(current);
  return result;
}
export function prepareEmbeddingCatalog(catalog, source, aliases = {}, external = {}) {
  const reconciled = reconcileCatalog(catalog, source.rows, aliases);
  const records = []; const documents = [];
  const seen = new Set();
  for (const dvd of [...catalog].sort((a, b) => a.id.localeCompare(b.id))) {
    if (!dvd.id || seen.has(dvd.id)) throw new Error('Missing or duplicate catalog ID');
    seen.add(dvd.id);
    const overlay = reconciled.overlay[dvd.id] || {};
    // Explicit allowlist: never serialize the source or live catalog object wholesale.
    const title = cleanText(dvd.title);
    const creators = unique([...list(dvd.magician), ...list(overlay.magician)]);
    const descriptionGroups = consolidateDescriptions(unique([...list(dvd.notes), ...list(overlay.notes)].map(normalizeDescription)));
    const notes = descriptionGroups.map(group => group.text);
    const rawCategories = unique([...list(dvd.magicType), ...list(overlay.magicType)]);
    const fields = [{ field: 'catalog.title', text: normalizeDescription(title) },
      ...list(dvd.notes).map(text => ({ field: 'catalog.notes', text: normalizeDescription(text) })),
      ...list(overlay.notes).map(text => ({ field: 'spreadsheet.notes', text: normalizeDescription(text) })),
      ...rawCategories.map(text => ({ field: 'source.category', text }))];
    const candidate = external[dvd.id];
    const same = (a, b) => cleanText(a).toLowerCase() === cleanText(b).toLowerCase();
    const eligible = ['reviewed_source_match', 'machine_matched_source'].includes(candidate?.status) && same(candidate.title, title)
      && list(candidate.creators).some(name => list(dvd.magician).some(creator => same(name, creator)));
    const evidence = eligible ? {
      status: candidate.status, matchedAt: cleanText(candidate.matchedAt), summary: cleanText(candidate.summary), props: list(candidate.props), subjects: list(candidate.subjects),
      tricks: (candidate.tricks || []).map(trick => ({ name: cleanText(trick.name), creator: cleanText(trick.creator), description: cleanText(trick.description) })),
      sources: (candidate.sources || []).map(s => ({ label: cleanText(s.label), url: cleanText(s.url), scope: cleanText(s.scope) })),
      url: cleanText(candidate.url), sourceLabel: cleanText(candidate.sourceLabel),
      reviewedAt: cleanText(candidate.reviewedAt), editionNote: cleanText(candidate.editionNote), independentlyVerified: false,
    } : null;
    const researchText = evidence ? [evidence.summary, ...evidence.props, ...evidence.subjects,
      ...evidence.tricks.map(t => `${t.name}${t.creator ? ` (${t.creator})` : ''}${t.description ? `: ${t.description}` : ''}`)].filter(Boolean).join('; ') : '';
    if (researchText) fields.push({ field: 'published.notes', text: researchText });
    const tags = classify(fields);
    const seriesMatch = title.match(/\bvol(?:ume)?s?\.?\s*(\d+(?:\s*[&–-]\s*\d+)?)/i);
    const record = {
      schemaVersion: SCHEMA_VERSION, id: dvd.id, title, creators,
      titleAliases: unique([...list(overlay.aliases), ...(normalizeDescription(title) !== title ? [normalizeDescription(title)] : [])]),
      externalEvidence: evidence,
      notes, descriptionGroups, rawCategories, normalizedCategories: unique(rawCategories.flatMap(value => value.split(/[;\/]/).map(canonicalPhrase))), categories: tags,
      publishers: unique([...list(dvd.producer), ...list(overlay.producer)]),
      contributorNotes: unique([...list(dvd.otherFeatures), ...list(overlay.otherFeatures)]),
      series: seriesMatch ? { title: title.slice(0, seriesMatch.index).replace(/[\s—–-]+$/, ''), volume: seriesMatch[1] } : null,
      provenance: { sourceSnapshotDate: source.retrievedAt, spreadsheetRows: overlay.sources || [] },
      qualityFlags: [!overlay.sources?.length && 'no_reconciled_spreadsheet_row', !notes.length && 'no_descriptive_notes',
        !creators.length && 'missing_creator', /^(?:untitled|unlabeled|various|audio)(?:\s|$)/i.test(title) && 'ambiguous_title',
        tags.levels.length > 1 && 'conflicting_level_mentions'].filter(Boolean),
      aiDescription: cleanText(dvd.aiSummary) ? { text: cleanText(dvd.aiSummary), status: 'unverified_ai_generated', includedInDefaultEmbeddings: false } : null,
      originalNotes: unique([...list(dvd.notes), ...list(overlay.notes)]),
    };
    const header = [`Title: ${title}`, creators.length && `Magicians: ${creators.join('; ')}`].filter(Boolean).join('\n');
    const body = [record.titleAliases.length && `Alternate title: ${record.titleAliases.join('; ')}`,
      researchText && `Published source notes (not independently verified): ${researchText}`,
      notes.length && `Collection notes: ${notes.join('; ')}`,
      record.normalizedCategories.length && `Categories: ${record.normalizedCategories.join('; ')}`,
      ...Object.entries(tags).filter(([, values]) => values.length).map(([group, values]) => `${group}: ${values.map(v => v.label).join('; ')}`),
      record.contributorNotes.length && `Additional contributors or features: ${record.contributorNotes.join('; ')}`].filter(Boolean).join('\n');
    record.embeddingText = [header, body].filter(Boolean).join('\n');
    record.contentHash = hash(record.embeddingText);
    records.push(record);
    for (const [i, part] of chunks(body || 'No additional descriptive notes.').entries()) {
      const text = header + '\n' + part;
      documents.push({ documentId: `${dvd.id}:catalog:${i}`, dvdId: dvd.id, kind: 'catalog', text, contentHash: hash(text), schemaVersion: SCHEMA_VERSION });
    }
  }
  return { records, documents, report: {
    schemaVersion: SCHEMA_VERSION, sourceSnapshotDate: source.retrievedAt,
    records: records.length, embeddingDocuments: documents.length,
    reconciliation: reconciled.stats, unmatched: reconciled.unmatched, conflicts: reconciled.conflicts,
    coverage: Object.fromEntries(Object.keys(TAXONOMY).map(group => [group, records.filter(r => r.categories[group].length).length])),
    reviewQueue: records.filter(r => r.qualityFlags.length).map(r => ({ id: r.id, title: r.title, flags: r.qualityFlags })),
    policy: 'Source mentions are unverified, not suitability guarantees. AI descriptions are retained separately and excluded from embedding documents. No private fields are copied.',
  } };
}
