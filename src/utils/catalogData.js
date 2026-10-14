import { normalizeDVD, normalizeTitle, normalizeList } from './dvd.js';

export function enrichCatalogDVD(raw, overlay = {}) {
  const dvd = normalizeDVD(raw);
  const candidate = overlay[dvd.id];
  const data =
    candidate && normalizeTitle(candidate.title) === normalizeTitle(dvd.title)
      ? candidate
      : {};
  return {
    ...dvd,
    catalogNotes: data.notes || [],
    catalogAliases: data.aliases || [],
    catalogMagicians: normalizeList(data.magician),
    catalogTypes: normalizeList(data.magicType),
    catalogProducers: normalizeList(data.producer),
    catalogPerformers: normalizeList(data.otherFeatures),
    catalogSources: data.sources || [],
  };
}
