import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../firebase/config';
import { useLibrary } from '../contexts/LibraryContext';
import LibraryActions from '../components/dvds/LibraryActions';
const TABS = [['wantToWatch', 'Want to watch'], ['favorite', 'Favorites'], ['watched', 'Watched'], ['dismissed', 'Hidden suggestions']];
export default function MyLibrary() {
  const { entries, isGuest, error, loading, pending, setFlag } = useLibrary();
  const [tab, setTab] = useState('wantToWatch');
  const [dvds, setDvds] = useState(null);
  const [catalogError, setCatalogError] = useState(false);
  useEffect(() => {
    document.title = 'My Library — Racherbaumer';
    return onSnapshot(collection(db, 'dvds'), snap => setDvds(Object.fromEntries(snap.docs.map(d => [d.id, { id: d.id, ...d.data() }]))), () => setCatalogError(true));
  }, []);
  const selected = Object.entries(entries).filter(([, entry]) => entry[tab]);
  return <div className="catalog-page">
    <header className="catalog-header"><h1>My Library</h1><p>{isGuest ? 'Your personal shelves, saved in this browser. Guest saves stay here when you sign in.' : 'Your private shelves, synced to your account.'}</p></header>
    <nav className="library-tabs" aria-label="Personal shelves">{TABS.map(([key, label]) => <button className="btn-ghost" key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>{label} ({Object.values(entries).filter(e => e[key]).length})</button>)}</nav>
    <p className="discovery-help"><Link to="/profile">My loans and requests →</Link></p>
    {(error || catalogError) && <p role="alert">{error || 'Could not load DVD titles. Please reload to try again.'}</p>}
    {(loading || !dvds) && !catalogError ? <p>Loading your shelves…</p> : selected.length === 0 ? <p className="discovery-help">Nothing here yet. Save a DVD while <Link to="/">browsing the collection</Link>.</p> : <ul className="personal-shelf">{selected.map(([id]) => <li key={id}>
      <Link to={`/dvd/${id}`}>{dvds?.[id]?.title || 'Unavailable catalog record'}</Link>
      {tab === 'dismissed' ? <button className="btn-ghost" disabled={pending} onClick={() => setFlag(id, 'dismissed', false)}>Restore suggestion</button> : <LibraryActions dvd={{id}} compact />}
    </li>)}</ul>}
  </div>;
}
