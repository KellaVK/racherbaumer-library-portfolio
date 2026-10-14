import { INTERESTS, LEVELS, SETTINGS } from './discovery.js';
const KEY = 'racherbaumer.discovery.v1';
const allowed = (options, value) =>
  options.some(([key]) => key === value) ? value : '';
export function cleanPreferences(raw = {}) {
  const value = raw && typeof raw === 'object' ? raw : {};
  return {
    interests: [
      ...new Set(
        (Array.isArray(value.interests) ? value.interests : []).filter((v) =>
          allowed(INTERESTS, v),
        ),
      ),
    ],
    level: allowed(LEVELS, value.level),
    setting: allowed(SETTINGS, value.setting),
    referenceId:
      typeof value.referenceId === 'string'
        ? value.referenceId.slice(0, 128)
        : '',
  };
}
export function readPreferences(storage) {
  try {
    return cleanPreferences(
      JSON.parse((storage || window.localStorage).getItem(KEY) || '{}'),
    );
  } catch {
    return cleanPreferences();
  }
}
export function writePreferences(value, storage) {
  try {
    (storage || window.localStorage).setItem(
      KEY,
      JSON.stringify(cleanPreferences(value)),
    );
    return true;
  } catch {
    return false;
  }
}
