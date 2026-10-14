import { useMemo, useState, useEffect } from 'react';
import { useLibrary } from '../../contexts/LibraryContext';
import { Link, useLocation } from 'react-router-dom';
import {
  INTERESTS,
  LEVELS,
  SETTINGS,
  recommendCatalog,
} from '../../utils/discovery';
import {
  readPreferences,
  writePreferences,
  cleanPreferences,
} from '../../utils/discoveryPreferences';

export default function DiscoveryPanel({ index, filters }) {
  const [preferences, setPreferences] = useState(readPreferences);
  const [storageFailed, setStorageFailed] = useState(false);
  const location = useLocation();
  const { entries, setFlag, pending, error } = useLibrary();
  const [seen, setSeen] = useState([]);
  const [hideWatched, setHideWatched] = useState(true);
  const [lastHidden, setLastHidden] = useState(null);
  const similarId = new URLSearchParams(location.search).get('similar');
  useEffect(() => { if (similarId) setPreferences({ ...cleanPreferences(), referenceId: similarId }); }, [similarId]);
  const favoriteIds = Object.keys(entries).filter(id => entries[id].favorite);
  const excluded = Object.keys(entries).filter(id => entries[id].dismissed || (hideWatched && entries[id].watched));
  const recommendations = useMemo(
    () => recommendCatalog(index, preferences, filters, 3, { favoriteIds, excludeIds: [...excluded, ...seen] }),
    [index, preferences, filters, entries, hideWatched, seen],
  );
  const titles = useMemo(
    () =>
      [...index.docs].sort((a, b) => a.dvd.title.localeCompare(b.dvd.title)),
    [index],
  );
  const hasPreferences =
    preferences.interests.length ||
    preferences.level ||
    preferences.setting ||
    preferences.referenceId || favoriteIds.length;
  function update(next) {
    const value = cleanPreferences({ ...preferences, ...next });
    setSeen([]);
    setPreferences(value);
    setStorageFailed(!writePreferences(value));
  }
  return (
    <details className="discovery-panel" open={similarId ? true : undefined}>
      <summary>Find something for you</summary>
      <div className="discovery-body">
        <p className="discovery-help">
          Pick what interests you for up to three suggestions. Close matches come first; partial matches help you explore.
        </p>
        <fieldset className="discovery-interests">
          <legend>What would you like to explore?</legend>
          <div className="discovery-chips">
            {INTERESTS.map(([key, label]) => (
              <label key={key} className="discovery-chip">
                <input
                  type="checkbox"
                  checked={preferences.interests.includes(key)}
                  onChange={(event) =>
                    update({
                      interests: event.target.checked
                        ? [...preferences.interests, key]
                        : preferences.interests.filter((v) => v !== key),
                    })
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="discovery-selects">
          <label htmlFor="discovery-level">
            Experience level
            <select
              id="discovery-level"
              value={preferences.level}
              onChange={(e) => update({ level: e.target.value })}
            >
              <option value="">Any level</option>
              {LEVELS.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="discovery-setting">
            Performance setting
            <select
              id="discovery-setting"
              value={preferences.setting}
              onChange={(e) => update({ setting: e.target.value })}
            >
              <option value="">Any setting</option>
              {SETTINGS.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="discovery-reference">
            A DVD you enjoy
            <select
              id="discovery-reference"
              value={preferences.referenceId}
              onChange={(e) => update({ referenceId: e.target.value })}
            >
              <option value="">Choose a title (optional)</option>
              {titles.map(({ dvd }) => (
                <option key={dvd.id} value={dvd.id}>
                  {dvd.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="discovery-actions">
          <label><input type="checkbox" checked={hideWatched} onChange={e => { setHideWatched(e.target.checked); setSeen([]); }} /> Hide watched DVDs</label>
          <small>Starred favorites also help shape suggestions.</small>
        </div>
        <div className="discovery-actions">
          <small>
            {storageFailed
              ? 'Preferences work for this visit; your browser could not save them.'
              : 'Preferences stay in this browser.'}
          </small>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => update(cleanPreferences())}
          >
            Reset preferences
          </button>
        </div>
        <div aria-live="polite" aria-atomic="true" className="discovery-help">
          {!hasPreferences
            ? 'Choose an interest, setting, or favorite DVD to see suggestions.'
            : recommendations.length
              ? `${recommendations.length} suggestions. Categories and notes have not been independently verified.`
              : 'No matches found in the available descriptions. Try another interest or favorite DVD, or clear a catalog filter.'}
        </div>
        {recommendations.length > 0 && (
          <ul className="discovery-suggestions">
            {recommendations.map((dvd) => (
              <li key={dvd.id}>
                <Link
                  className="discovery-result-link"
                  aria-label={dvd.title}
                  to={`/dvd/${dvd.id}`}
                  state={{ from: `${location.pathname}${location.search}` }}
                >
                  <span className="discovery-result-title">{dvd.title}</span>
                <p>{dvd.magician.join(', ')}</p>
                <ul>
                  {dvd.recommendationReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <span className="discovery-result-action">View DVD <span aria-hidden="true">→</span></span>
                </Link>
                <div className="suggestion-feedback">
                  <button className="btn-ghost" onClick={() => update({ ...cleanPreferences(), referenceId: dvd.id })}>More like this</button>
                  <button className="btn-ghost" disabled={pending} onClick={async () => { if (await setFlag(dvd.id, 'dismissed', true)) setLastHidden(dvd.id); }}>Not for me</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {recommendations.length > 0 && <button className="btn-secondary" onClick={() => setSeen(ids => [...ids, ...recommendations.map(d => d.id)])}>Show three more</button>}
        {seen.length > 0 && <button className="btn-ghost" onClick={() => setSeen([])}>Start over</button>}
        {lastHidden && <p role="status">Suggestion hidden. <button className="btn-ghost" disabled={pending} onClick={async () => { if (await setFlag(lastHidden, 'dismissed', false)) setLastHidden(null); }}>Undo</button></p>}
        {error && <p role="alert">{error}</p>}
      </div>
    </details>
  );
}
