import { useMemo, useState } from 'react';
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
  const recommendations = useMemo(
    () => recommendCatalog(index, preferences, filters),
    [index, preferences, filters],
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
    preferences.referenceId;
  function update(next) {
    const value = cleanPreferences({ ...preferences, ...next });
    setPreferences(value);
    setStorageFailed(!writePreferences(value));
  }
  return (
    <details className="discovery-panel">
      <summary>Find something for you</summary>
      <div className="discovery-body">
        <p className="discovery-help">
          Choose what interests you, or a DVD you enjoy. Suggestions use catalog
          notes and descriptions, and follow your current catalog filters.
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
          <small>
            {storageFailed
              ? 'Preferences work for this visit; your browser could not save them.'
              : 'Preferences stay in this browser. They are not added to your account.'}
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
            ? 'Choose an interest to see suggestions.'
            : recommendations.length
              ? `${recommendations.length} suggestions. Preferences are ranking hints; check each description for suitability.`
              : 'No supported suggestions match these preferences and filters. Try another interest or relax a catalog filter.'}
        </div>
        {recommendations.length > 0 && (
          <ul className="discovery-suggestions">
            {recommendations.map((dvd) => (
              <li key={dvd.id}>
                <Link
                  to={`/dvd/${dvd.id}`}
                  state={{ from: `${location.pathname}${location.search}` }}
                >
                  {dvd.title}
                </Link>
                <p>{dvd.magician.join(', ')}</p>
                <ul>
                  {dvd.recommendationReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
