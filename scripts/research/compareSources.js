import { createHash } from 'node:crypto';
const key = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const hosts = new Set(['penguinmagic.com', 'vanishingincmagic.com', 'conjuringarchive.com']);
export function compareSources(record) {
  const ids = new Set();
  for (const source of record.sources) {
    if (!source.id || ids.has(source.id)) throw new Error('Duplicate or missing source ID');
    ids.add(source.id);
    if (source.url) {
      const url = new URL(source.url);
      if (url.protocol !== 'https:' || !hosts.has(url.hostname.replace(/^www\./, '')) || url.username || url.password) throw new Error('Unsupported source');
    }
    if (source.status === 'reviewed_match' && (!source.url || !source.scope)) throw new Error('Reviewed source needs URL and edition scope');
  }
  const matched = record.sources.filter(s => s.status === 'reviewed_match');
  const tricks = new Map(), props = new Map();
  for (const source of matched) {
    for (const trick of source.tricks || []) {
      if (!trick.name?.trim()) throw new Error('Trick requires name');
      const id = key(trick.name);
      if (!tricks.has(id)) tricks.set(id, { name: trick.name, evidence: [] });
      tricks.get(id).evidence.push({ sourceId: source.id, creator: trick.creator || '', description: trick.description || '' });
    }
    for (const prop of source.props || []) {
      if (!prop.trim()) throw new Error('Empty prop');
      const id = key(prop);
      if (!props.has(id)) props.set(id, { value: prop, sourceIds: [] });
      if (!props.get(id).sourceIds.includes(source.id)) props.get(id).sourceIds.push(source.id);
    }
  }
  const contents = [...tricks.values()].map(trick => {
    const credits = [...new Map(trick.evidence.filter(e => e.creator).map(e => [key(e.creator), e.creator])).values()];
    const sourceIds = [...new Set(trick.evidence.map(e => e.sourceId))];
    return { ...trick, creator: credits.length === 1 ? credits[0] : '',
      description: trick.evidence.find(e => e.description)?.description || '',
      sourceIds, creditConflict: credits.length > 1,
      agreement: sourceIds.length > 1 ? 'listed_by_multiple_sources' : 'listed_by_one_source' };
  });
  const conflicts = contents.filter(t => t.creditConflict).map(t => ({ name: t.name, reason: 'creator_credit_disagreement', evidence: t.evidence }));
  return { dvdId: record.dvdId, title: record.title, creators: record.creators,
    status: record.reviewed && matched.length ? 'reviewed_source_match' : 'needs_review',
    summary: record.summary || '', subjects: record.subjects || [], editionNote: record.editionNote || '',
    sources: record.sources, tricks: contents, props: [...props.values()], conflicts,
    independentlyVerified: false,
    comparisonNote: 'Missing entries are not contradictions. Retailers may reuse publisher copy; multiple listings are not independent verification.',
  };
}
export function publishRecord(result, reviewedAt) {
  if (result.status !== 'reviewed_source_match' || result.conflicts.length) return null;
  const sources = result.sources.filter(s => s.status === 'reviewed_match').map(({id,label,url,scope}) => ({id,label,url,scope}));
  return { title:result.title,creators:result.creators,summary:result.summary,subjects:result.subjects,
    props:result.props.map(p=>p.value),tricks:result.tricks.map(({name,creator,description,sourceIds})=>({name,creator,description,sourceIds})),
    sources,sourceLabel:sources[0].label,url:sources[0].url,editionNote:result.editionNote,
    reviewedAt,status:result.status,independentlyVerified:false };
}
export function embeddingDocuments(result) {
  if (result.status !== 'reviewed_source_match' || result.conflicts.length) return [];
  return result.tricks.map(trick => {
    const text = [`DVD: ${result.title}`, `Magicians: ${result.creators.join('; ')}`, `Trick: ${trick.name}`,
      trick.creator && `Credit: ${trick.creator}`, trick.description && `Description: ${trick.description}`].filter(Boolean).join('\n');
    return { documentId: `${result.dvdId}:trick:${createHash('sha256').update(key(trick.name)).digest('hex').slice(0,12)}`,
      dvdId: result.dvdId, text, sourceUrls: result.sources.filter(s=>trick.sourceIds.includes(s.id)).map(s=>s.url),
      contentHash:createHash('sha256').update(text).digest('hex'), independentlyVerified:false };
  });
}
