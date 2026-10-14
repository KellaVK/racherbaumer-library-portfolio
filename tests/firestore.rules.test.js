// @vitest-environment node
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, it, expect } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
let env;
const enabled = !!process.env.FIRESTORE_EMULATOR_HOST;
beforeAll(async () => {
  if (!enabled) return;
  env = await initializeTestEnvironment({ projectId: 'demo-library-test', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
  await env.withSecurityRulesDisabled(async context => setDoc(doc(context.firestore(), 'dvds', 'dvd1'), { title: 'Test' }));
});
afterAll(async () => { if (env) await env.cleanup(); });
it.skipIf(!enabled)('enforces owner-only shelves, valid fields and real DVD references', async () => {
  const alice = env.authenticatedContext('alice').firestore();
  const bob = env.authenticatedContext('bob').firestore();
  const guest = env.unauthenticatedContext().firestore();
  await assertSucceeds(setDoc(doc(alice, 'users/alice/library/dvd1'), { favorite: true, updatedAt: serverTimestamp() }));
  await assertSucceeds(getDoc(doc(alice, 'users/alice/library/dvd1')));
  await assertFails(getDoc(doc(bob, 'users/alice/library/dvd1')));
  await assertFails(getDoc(doc(guest, 'users/alice/library/dvd1')));
  await assertFails(setDoc(doc(bob, 'users/alice/library/dvd1'), { watched: true, updatedAt: serverTimestamp() }));
  await assertFails(setDoc(doc(alice, 'users/alice/library/missing'), { favorite: true, updatedAt: serverTimestamp() }));
  await assertFails(setDoc(doc(alice, 'users/alice/library/dvd1'), { favorite: 'yes', updatedAt: serverTimestamp() }));
  await assertFails(setDoc(doc(alice, 'users/alice/library/dvd1'), { role: 'admin', updatedAt: serverTimestamp() }));
  expect(true).toBe(true);
});
