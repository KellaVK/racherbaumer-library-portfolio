import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createDiscoveryIndex } from '../../utils/discovery';
import CollectionSearchResults from './CollectionSearchResults';
it('opens a matching collection without carrying the text query and preserves availability',()=>{
 const index=createDiscoveryIndex([{id:'a',title:'Coin magic',magician:['Alice']}]);
 render(<MemoryRouter><CollectionSearchResults index={index} state={{query:'coin collection',availability:'available',view:'grid',sort:'discovery'}} /></MemoryRouter>);
 const link=screen.getByRole('link',{name:/Coin magic/});
 const url=new URL(link.getAttribute('href'),'https://library.test');
 expect(url.searchParams.get('collection')).toBe('coins');
 expect(url.searchParams.get('availability')).toBe('available');
 expect(url.searchParams.has('q')).toBe(false);
 expect(link).toHaveTextContent('1 title');
});
