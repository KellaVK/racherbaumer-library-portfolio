import { useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
export default function CollectionShelf({ title, description, items, collectionKey, showAvailability = true }) {
  const rail = useRef(null);
  const location = useLocation();
  if (!items.length) return null;
  function move(direction) { rail.current?.scrollBy({ left: direction * rail.current.clientWidth * .8, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
  return <section className="collection-shelf" aria-label={title}>
    <div className="shelf-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>
      <div className="shelf-navigation">{collectionKey && <Link to={`/?collection=${encodeURIComponent(collectionKey)}`}>View all ({items.length})</Link>}
        <button className="btn-ghost" aria-label={`Previous ${title} titles`} onClick={()=>move(-1)}>←</button>
        <button className="btn-ghost" aria-label={`Next ${title} titles`} onClick={()=>move(1)}>→</button>
      </div>
    </div>
    <div className="shelf-rail" ref={rail} tabIndex={0} aria-label={`${title} titles`}>
      {items.slice(0,12).map(dvd=><Link key={dvd.id} to={`/dvd/${dvd.id}`} state={{from:location.pathname+location.search}} className="shelf-title">
        <span className="shelf-creator">{dvd.magician.join(', ') || 'From the collection'}</span>
        <h3>{dvd.title}</h3>
        <span className="shelf-status">{showAvailability ? (dvd.checkedOutBy ? 'On loan' : 'Available to borrow') : 'View DVD'} <span aria-hidden="true">↗</span></span>
      </Link>)}
    </div>
  </section>;
}
