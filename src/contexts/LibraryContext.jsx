import { createContext, useContext, useEffect, useState } from 'react';
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';

const KEY = 'racherbaumer-library-guest-v1';
export const LIBRARY_FLAGS = ['wantToWatch', 'favorite', 'watched', 'dismissed'];
export function cleanLibraryEntry(entry = {}) {
  return Object.fromEntries(LIBRARY_FLAGS.map(key => [key, entry[key] === true]));
}
function readGuest() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '{}');
    return Object.fromEntries(Object.entries(data).filter(([id]) => id && !id.includes('/')).map(([id, entry]) => [id, cleanLibraryEntry(entry || {})]));
  } catch { return {}; }
}
const LibraryContext = createContext({ entries: {}, loading: false, error: '', pending: false, setFlag: async () => false });
export const useLibrary = () => useContext(LibraryContext);
export function LibraryProvider({ children }) {
  const { user } = useAuth();
  const owner = user?.uid || 'guest';
  const [snapshot, setSnapshot] = useState({ owner: 'guest', entries: readGuest() });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const entries = snapshot.owner === owner ? snapshot.entries : {};
  useEffect(() => {
    setError('');
    setSnapshot({ owner, entries: owner === 'guest' ? readGuest() : {} });
    if (owner === 'guest') { setLoading(false); return; }
    setLoading(true);
    return onSnapshot(collection(db, 'users', owner, 'library'), snap => {
      setSnapshot({ owner, entries: Object.fromEntries(snap.docs.map(d => [d.id, cleanLibraryEntry(d.data())])) });
      setLoading(false);
    }, () => {
      setLoading(false);
      setError('Your saved library could not be loaded. Please try again later.');
    });
  }, [owner]);
  async function setFlag(id, flag, value) {
    if (!id || id.includes('/') || !LIBRARY_FLAGS.includes(flag) || typeof value !== 'boolean' || pending || loading) return false;
    setPending(true); setError('');
    try {
      if (owner === 'guest') {
        const next = { ...entries, [id]: { ...cleanLibraryEntry(entries[id]), [flag]: value } };
        localStorage.setItem(KEY, JSON.stringify(next));
        setSnapshot({ owner, entries: next });
      } else {
        // Merge only the changed flag so simultaneous device updates do not overwrite others.
        await setDoc(doc(db, 'users', owner, 'library', id), { [flag]: value, updatedAt: serverTimestamp() }, { merge: true });
      }
      return true;
    } catch {
      setError('Could not save that change. Please try again.');
      return false;
    } finally { setPending(false); }
  }
  return <LibraryContext.Provider value={{ entries, loading, error, pending, setFlag, isGuest: owner === 'guest' }}>{children}</LibraryContext.Provider>;
}
