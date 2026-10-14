import {
  normalizeTitle,
  normalizeList,
  isPlaceholder,
} from '../../src/utils/dvd.js';

const fields = ['magician', 'notes', 'magicType', 'producer', 'otherFeatures'];
const clean = (value) =>
  (Array.isArray(value) ? value : [value])
    .filter((v) => !isPlaceholder(v))
    .map((v) => String(v).trim());

// No fuzzy auto-merges: reviewed aliases explicitly bind a source title to a live ID.
export function reconcileCatalog(catalog, rows, aliases = {}) {
  const titles = new Map();
  const byId = new Map(catalog.map((dvd) => [dvd.id, dvd]));
  for (const dvd of catalog) {
    const key = normalizeTitle(dvd.title);
    titles.set(key, [...(titles.get(key) || []), dvd]);
  }
  const overlay = {},
    unmatched = [],
    conflicts = [];
  for (const row of rows) {
    const key = normalizeTitle(row.title);
    const candidates = titles.get(key) || [];
    const dvd = aliases[row.title]
      ? byId.get(aliases[row.title])
      : candidates.length === 1
        ? candidates[0]
        : null;
    const source = { tab: row.source || '', row: row.row || null };
    if (!dvd || isPlaceholder(row.title)) {
      unmatched.push({
        title: row.title || '',
        ...source,
        reason: candidates.length > 1 ? 'ambiguous title' : 'no reviewed match',
      });
      continue;
    }
    if (clean(row.magician).length && normalizeList(dvd.magician).length) {
      const a = normalizeList(row.magician).map(normalizeTitle),
        b = normalizeList(dvd.magician).map(normalizeTitle);
      if (!a.some((name) => b.includes(name))) {
        conflicts.push({
          id: dvd.id,
          title: dvd.title,
          field: 'magician',
          sourceValue: row.magician,
          catalogValue: dvd.magician,
          ...source,
        });
        continue;
      }
    }
    const entry = (overlay[dvd.id] ||= {
      title: dvd.title,
      aliases: [],
      magician: [],
      notes: [],
      magicType: [],
      producer: [],
      otherFeatures: [],
      sources: [],
    });
    if (row.title !== dvd.title && !entry.aliases.includes(row.title))
      entry.aliases.push(row.title);
    entry.sources.push(source);
    for (const field of fields) {
      for (const value of clean(row[field])) {
        if (!entry[field].some((v) => v.toLowerCase() === value.toLowerCase()))
          entry[field].push(value);
      }
    }
  }
  return {
    overlay,
    unmatched,
    conflicts,
    stats: {
      sourceRows: rows.length,
      matchedRows: Object.values(overlay).reduce(
        (n, d) => n + d.sources.length,
        0,
      ),
      enrichedTitles: Object.keys(overlay).length,
      catalogTitles: catalog.length,
    },
  };
}
