import { Link } from 'react-router-dom';
import { useLibrary } from '../../contexts/LibraryContext';
export default function LibraryActions({ dvd, compact = false }) {
  const { entries, setFlag, pending, loading, error, isGuest } = useLibrary();
  const entry = entries[dvd.id] || {};
  return <section className="library-actions" aria-label="Save this DVD">
    <div className="library-action-buttons">
      {[['wantToWatch', 'Want to watch'], ['favorite', '☆ Favorite'], ['watched', 'Watched']].map(([flag, label]) =>
        <button key={flag} type="button" className="btn-secondary" aria-pressed={!!entry[flag]} disabled={pending || loading} onClick={() => setFlag(dvd.id, flag, !entry[flag])}>{flag === 'favorite' && entry.favorite ? '★ Favorite' : label}</button>)}
      <Link className="btn-ghost" to={`/?similar=${encodeURIComponent(dvd.id)}`}>More like this →</Link>
    </div>
    {!compact && <small>{isGuest ? 'Saved in this browser. ' : 'Private to your account. '}Saving does not reserve a DVD. <Link to="/library">My Library</Link></small>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
