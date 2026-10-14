import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { buildCollections } from '../../utils/collections';
import CollectionShelf from './CollectionShelf';
export default function CollectionBrowse({index}) {
 const shelves = useMemo(()=>buildCollections(index),[index]);
 return <div className="collection-browse">
   <nav className="collection-shortcuts" aria-label="Explore collections">{shelves.slice(0,4).map(s=><Link key={s.key} to={`/?collection=${encodeURIComponent(s.key)}`}>{s.title}</Link>)}<Link to="/?view=list">All titles</Link></nav>
   {shelves.map(s=><CollectionShelf key={s.key} title={s.title} description={s.description} items={s.items} collectionKey={s.key}/>)}
 </div>;
}
