import external from '../data/external-enrichment.json';
import machine from '../data/machine-enrichment.json';
import { normalizeDVD, normalizeTitle, normalizeList } from './dvd.js';
const researchCatalog = { ...machine, ...external };

export function enrichCatalogDVD(raw, overlay = {}, researchOverlay = researchCatalog) {
  const dvd = normalizeDVD(raw);
  const candidate = overlay[dvd.id];
  const data =
    candidate && normalizeTitle(candidate.title) === normalizeTitle(dvd.title)
      ? candidate
      : {};
  const research = researchOverlay[dvd.id];
  const externalEvidence = ['reviewed_source_match', 'machine_matched_source'].includes(research?.status) && normalizeTitle(research.title) === normalizeTitle(dvd.title) && research.creators.some(name => dvd.magician.some(creator => normalizeTitle(creator) === normalizeTitle(name))) ? research : null;
  const reviewedLinks = {};
  for (const source of externalEvidence?.sources || []) {
    const host = new URL(source.url).hostname.replace(/^www\./, '');
    const field = { 'vanishingincmagic.com': 'vanishingIncUrl', 'penguinmagic.com': 'penguinUrl', 'conjuringarchive.com': 'conjuringArchiveUrl' }[host];
    if (field) reviewedLinks[field] = source.url;
  }
  return {
    ...dvd,
    ...reviewedLinks,
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
