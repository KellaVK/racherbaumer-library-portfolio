import CollectionSearchResults from '../components/dvds/CollectionSearchResults';
import CollectionBrowse from '../components/dvds/CollectionBrowse';
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useCatalogQuery } from '../hooks/useCatalogQuery';
import CatalogFilters from '../components/dvds/CatalogFilters';
import DiscoveryPanel from '../components/dvds/DiscoveryPanel';
import DVDCard from '../components/DVDCard';
import DVDListRow from '../components/dvds/DVDListRow';

const PAGE_SIZE = 48;

export default function Home() {
  const [dvds, setDvds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    document.title = 'Jon Racherbaumer Magic DVD Library';
    const timeout = setTimeout(() => setLoading(false), 3500);
    const unsub = onSnapshot(
      collection(db, 'dvds'),
      (snap) => {
        clearTimeout(timeout);
        setDvds(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
        setLoadError(null);
      },
      (err) => {
        clearTimeout(timeout);
        console.error('Firestore snapshot error on DVDs:', err);
        setLoadError(
          'The catalog could not be loaded from the library archive. Please check your connection and reload.',
        );
        setLoading(false);
      },
    );
    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, []);

  const {
    state,
    discoveryIndex,
    results,
    facets,
    activeFilterCount,
    setSearch,
    setFilter,
    removeFilter,
    clearFilters,
    setView,
    setSort,
  } = useCatalogQuery(dvds);

  // Reset pagination limit when search or filters change
  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [
    state.query,
    state.availability,
    state.type,
    state.era,
    state.magician,
    state.letter,
    state.sort,
    state.collection,
  ]);

  const showShelves = !state.query.trim() && !activeFilterCount && !state.collection && state.view !== 'list' && state.sort === 'discovery';
  const visibleResults = results.slice(0, visibleLimit);
  const hasMore = visibleLimit < results.length;

  return (
    <div className="page-enter catalog-page">
      <header className="catalog-header">
        <h1>Jon Racherbaumer <span>Magic DVD Library</span></h1>
        <p>Explore the collection. Find a trick, a magician, or your next inspiration.</p>
      </header>

      {/* Error state */}
      {loadError && (
        <div className="notice notice-danger" style={{ marginBottom: '2rem' }}>
          <strong>Error loading catalog</strong>
          <p style={{ marginTop: '0.25rem', fontSize: '0.8rem' }}>
            {loadError}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary"
            style={{ marginTop: '0.75rem', fontSize: '0.7rem' }}
          >
            Reload Page
          </button>
        </div>
      )}

      {/* Catalog Filters & Controls */}
      <CatalogFilters
        state={state}
        facets={facets}
        totalResults={results.length}
        activeFilterCount={activeFilterCount}
        setSearch={setSearch}
        setFilter={setFilter}
        removeFilter={removeFilter}
        clearFilters={clearFilters}
        setView={setView}
        setSort={setSort}
      />

      {!loading && !loadError && !state.collection && <CollectionSearchResults index={discoveryIndex} state={state} />}

      {!loading && !loadError && <DiscoveryPanel index={discoveryIndex} filters={state} />}

      {state.collection && <div className="collection-selection"><h2>{state.collection.startsWith('magician:') ? state.collection.slice(9) : ({cards:'Card magic', coins:'Coin magic', mentalism:'Mentalism', collaborations:'Collaborations & compilations'}[state.collection] || 'Collection')}</h2><button className="btn-ghost" onClick={()=>setFilter('collection','')}>← All collections</button></div>}
      {/* Results View */}
      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '12px',
          }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="card"
              style={{ height: '10rem', opacity: 0.4 }}
            >
              <div style={{ display: 'flex', height: '100%' }}>
                <div
                  style={{ width: '3px', backgroundColor: 'var(--border)' }}
                />
                <div
                  style={{
                    flex: 1,
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div
                    style={{
                      height: '0.875rem',
                      backgroundColor: 'var(--border)',
                      width: '75%',
                      animation: 'pulse 2s infinite',
                    }}
                  />
                  <div
                    style={{
                      height: '0.625rem',
                      backgroundColor: 'var(--border)',
                      width: '50%',
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : showShelves ? (
        <CollectionBrowse index={discoveryIndex} />
      ) : results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem 0' }}>
          <div className="deco-divider">
            <span>◆</span>
          </div>
          <p
            style={{
              color: 'var(--text-muted)',
              fontFamily: "'Josefin Sans', sans-serif",
              fontSize: '0.85rem',
              letterSpacing: '0.08em',
            }}
          >
            No DVDs found matching your search or filters.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="btn-ghost"
            style={{
              marginTop: '1rem',
              fontSize: '0.75rem',
              color: 'var(--gold)',
            }}
          >
            Reset all filters
          </button>
        </div>
      ) : state.view === 'list' ? (
        <div className="catalog-list">
          {visibleResults.map((dvd) => (
            <DVDListRow key={dvd.id} dvd={dvd} />
          ))}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '12px',
          }}
        >
          {visibleResults.map((dvd) => (
            <DVDCard key={dvd.id} dvd={dvd} />
          ))}
        </div>
      )}

      {/* Progressive Load More button */}
      {!loading && !showShelves && hasMore && (
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <p
            style={{
              fontFamily: "'Josefin Sans', sans-serif",
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
              color: 'var(--text-dim)',
              textTransform: 'uppercase',
              marginBottom: '1rem',
            }}
          >
            Showing {visibleResults.length} of {results.length} titles
          </p>
          <button
            type="button"
            onClick={() => setVisibleLimit((prev) => prev + PAGE_SIZE)}
            className="btn-secondary"
            style={{ padding: '0.6rem 2rem', fontSize: '0.75rem' }}
          >
            Load More Titles
          </button>
        </div>
      )}
    </div>
  );
}
