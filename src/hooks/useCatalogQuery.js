import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { filterDVDs } from '../utils/dvd';
import { createDiscoveryIndex, searchCatalog } from '../utils/discovery';
import { enrichCatalogDVD } from '../utils/catalogData';
import enrichment from '../data/catalog-enrichment.json';

export function useCatalogQuery(rawDvds = []) {
  const [searchParams, setSearchParams] = useSearchParams();

  const normalizedDvds = useMemo(() => {
    return rawDvds.map((d) => enrichCatalogDVD(d, enrichment));
  }, [rawDvds]);

  // Read state from URL search params
  const state = useMemo(
    () => ({
      query: searchParams.get('q') || '',
      availability: searchParams.get('availability') || 'all',
      type: searchParams.get('type') || 'all',
      magician: searchParams.get('magician') || 'all',
      era: searchParams.get('era') || 'all',
      sort: searchParams.get('sort') || 'title',
      view: searchParams.get('view') || 'grid',
      letter: searchParams.get('letter') || 'all',
    }),
    [searchParams],
  );

  // Update a single or multiple parameters in URL
  const updateParams = useCallback(
    (newParams, replace = true) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(newParams).forEach(([key, val]) => {
            if (
              !val ||
              val === 'all' ||
              val === '' ||
              (key === 'view' && val === 'grid') ||
              (key === 'sort' && val === 'title')
            ) {
              next.delete(key);
            } else {
              next.set(key, val);
            }
          });
          return next;
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  const setSearch = useCallback(
    (q) => {
      updateParams({ q: q.trim() ? q : '' });
    },
    [updateParams],
  );

  const setFilter = useCallback(
    (key, value) => {
      updateParams({ [key]: value });
    },
    [updateParams],
  );

  const removeFilter = useCallback(
    (key) => {
      updateParams({ [key]: 'all' });
    },
    [updateParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams();
        // preserve view preference if set
        const view = prev.get('view');
        if (view && view !== 'grid') next.set('view', view);
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const setView = useCallback(
    (view) => {
      updateParams({ view });
    },
    [updateParams],
  );

  const setSort = useCallback(
    (sort) => {
      updateParams({ sort });
    },
    [updateParams],
  );

  const discoveryIndex = useMemo(() => createDiscoveryIndex(normalizedDvds), [normalizedDvds]);

  // Calculate faceted counts and available values
  const facets = useMemo(() => {
    const typesMap = new Map();
    const erasMap = new Map();
    let availableCount = 0;

    normalizedDvds.forEach((dvd) => {
      if (!dvd.checkedOutBy) {
        availableCount += 1;
      }

      // Types
      const dvdTypes = Array.isArray(dvd.magicType) ? dvd.magicType : [];
      dvdTypes.forEach((t) => {
        if (t) typesMap.set(t, (typesMap.get(t) || 0) + 1);
      });

      // Eras
      const year = Number(dvd.year);
      if (year) {
        let era = 'Other';
        if (year < 1980) era = 'pre-1980';
        else if (year < 1990) era = '1980s';
        else if (year < 2000) era = '1990s';
        else if (year < 2010) era = '2000s';
        else if (year < 2020) era = '2010s';
        else era = '2020s';
        erasMap.set(era, (erasMap.get(era) || 0) + 1);
      }
    });

    const types = Array.from(typesMap.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

    const eras = [
      { value: '2020s', label: '2020s' },
      { value: '2010s', label: '2010s' },
      { value: '2000s', label: '2000s' },
      { value: '1990s', label: '1990s' },
      { value: '1980s', label: '1980s' },
      { value: 'pre-1980', label: 'Before 1980' },
    ]
      .map((e) => ({ ...e, count: erasMap.get(e.value) || 0 }))
      .filter((e) => e.count > 0);

    return {
      types,
      eras,
      availableCount,
      totalCount: normalizedDvds.length,
    };
  }, [normalizedDvds]);

  // Filter and sort results
  const results = useMemo(() => {
    let list = normalizedDvds;

    // If search term is present, use the enriched index to rank
    if (state.query.trim()) {
      list = searchCatalog(discoveryIndex, state.query);
    }

    // Apply structured filters
    return filterDVDs(list, {
      availability: state.availability,
      type: state.type,
      magician: state.magician,
      era: state.era,
      letter: state.letter,
      sort: state.query.trim() ? undefined : state.sort, // if searched, preserve relevance ranking
    });
  }, [normalizedDvds, state, discoveryIndex]);

  const activeFilterCount =
    (state.availability !== 'all' ? 1 : 0) +
    (state.type !== 'all' ? 1 : 0) +
    (state.era !== 'all' ? 1 : 0) +
    (state.magician !== 'all' ? 1 : 0) +
    (state.letter !== 'all' ? 1 : 0);

  return {
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
  };
}
