import { it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useCatalogQuery } from './useCatalogQuery';
it('finds long-description concepts with live availability filters and URL state', () => {
  const dvds = [
    { id: 'a', title: 'Thoughts', notes: 'Mentalism', year: '1975' },
    {
      id: 'b',
      title: 'Predictions',
      notes: 'Mentalism',
      checkedOutBy: 'someone',
      year: '1975',
    },
  ];
  const wrapper = ({ children }) => (
    <MemoryRouter
      initialEntries={['/?q=mind+reading&availability=available&era=pre-1980']}
    >
      {children}
    </MemoryRouter>
  );
  const { result } = renderHook(() => useCatalogQuery(dvds), { wrapper });
  expect(result.current.results.map((d) => d.id)).toEqual(['a']);
  act(() => result.current.setSearch('astronaut'));
  expect(result.current.results).toEqual([]);
  act(() => result.current.clearFilters());
  expect(result.current.results).toHaveLength(2);
});
