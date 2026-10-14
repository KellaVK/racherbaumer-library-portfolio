import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { searchCollections } from '../../utils/collections';
export default function CollectionSearchResults({ index, state }) {
  const matches = useMemo(() => searchCollections(index, state.query, state), [index, state]);
  if (!matches.length) return null;
  function destination(key) {
    const params = new URLSearchParams({ collection: key });
    // Opening a collection clears the text query but preserves explicit filters.
    for (const field of ['availability', 'type', 'era', 'magician', 'letter', 'view', 'sort']) {
      if (state[field] && state[field] !== 'all') params.set(field, state[field]);
    }
    return `/?${params}`;
  }
  return <section className="collection-search-results" aria-label="Matching collections">
    <h2>Collections</h2>
    <div className="collection-shortcuts">
      {matches.map(group => <Link key={group.key} to={destination(group.key)}>
        {group.title} <span>· {group.items.length} {group.items.length === 1 ? 'title' : 'titles'} →</span>
      </Link>)}
    </div>
  </section>;
}
