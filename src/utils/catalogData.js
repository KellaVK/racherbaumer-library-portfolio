import external from '../data/external-enrichment.json';
import { normalizeDVD, normalizeTitle, normalizeList } from './dvd.js';

export function enrichCatalogDVD(raw, overlay = {}) {
  const dvd = normalizeDVD(raw);
  const candidate = overlay[dvd.id];
  const data =
    candidate && normalizeTitle(candidate.title) === normalizeTitle(dvd.title)
      ? candidate
      : {};
  const research = external[dvd.id];
  const externalEvidence = research?.status === 'reviewed_source_match' && normalizeTitle(research.title) === normalizeTitle(dvd.title) && research.creators.some(name => dvd.magician.some(creator => normalizeTitle(creator) === normalizeTitle(name))) ? research : null;
  return {
    ...dvd,
    externalEvidence,
    catalogNotes: data.notes || [],
    catalogAliases: data.aliases || [],
    catalogMagicians: normalizeList(data.magician),
    catalogTypes: normalizeList(data.magicType),
    catalogProducers: normalizeList(data.producer),
    catalogPerformers: normalizeList(data.otherFeatures),
    catalogSources: data.sources || [],
  };
}
