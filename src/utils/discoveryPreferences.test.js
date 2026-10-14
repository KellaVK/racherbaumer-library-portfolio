import { describe, it, expect } from 'vitest';
import {
  readPreferences,
  writePreferences,
  cleanPreferences,
} from './discoveryPreferences.js';

describe('local discovery preferences', () => {
  it('handles malformed or unavailable browser storage', () => {
    expect(readPreferences({ getItem: () => '{broken' }).interests).toEqual([]);
    expect(
      readPreferences({
        getItem: () => {
          throw new Error('blocked');
        },
      }).interests,
    ).toEqual([]);
    expect(
      writePreferences(
        {},
        {
          setItem: () => {
            throw new Error('blocked');
          },
        },
      ),
    ).toBe(false);
  });
  it('validates saved data and strips unknown properties', () => {
    expect(
      cleanPreferences({
        interests: ['coins', 'coins', 'invalid'],
        level: 'wizard',
        setting: 'stage',
        secret: 'x',
      }),
    ).toEqual({
      interests: ['coins'],
      level: '',
      setting: 'stage',
      referenceId: '',
    });
  });
});
