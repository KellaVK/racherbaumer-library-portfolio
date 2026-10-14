import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
const state = vi.hoisted(() => ({ user: null, setDoc: vi.fn(), snapshot: null }));
vi.mock('./AuthContext', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('../firebase/config', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: (...parts) => parts.slice(1).join('/'), doc: (...parts) => parts.slice(1).join('/'),
  serverTimestamp: () => 'server-time', setDoc: state.setDoc,
  onSnapshot: (_, callback) => { state.snapshot = callback; callback({ docs: [] }); return () => {}; },
}));
import { LibraryProvider, useLibrary } from './LibraryContext';
function Controls() {
  const { entries, setFlag, error } = useLibrary();
  return <><span>{JSON.stringify(entries)}</span><button onClick={() => setFlag('dvd1', 'favorite', true)}>Save</button><p role="alert">{error}</p></>;
}
beforeEach(() => { state.user = null; localStorage.clear(); state.setDoc.mockReset(); });
it('persists guest choices across mounts without any account write', async () => {
  const view = render(<LibraryProvider><Controls /></LibraryProvider>);
  await userEvent.click(screen.getByText('Save'));
  expect(screen.getByText(/"favorite":true/)).toBeInTheDocument();
  view.unmount();
  render(<LibraryProvider><Controls /></LibraryProvider>);
  expect(screen.getByText(/"favorite":true/)).toBeInTheDocument();
  expect(state.setDoc).not.toHaveBeenCalled();
});
it('writes only the changed flag to the signed-in owner and reports failure', async () => {
  state.user = { uid: 'alice' };
  state.setDoc.mockRejectedValue(new Error('permission denied'));
  render(<LibraryProvider><Controls /></LibraryProvider>);
  await userEvent.click(screen.getByText('Save'));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Could not save'));
  expect(state.setDoc).toHaveBeenCalledWith('users/alice/library/dvd1', { favorite: true, updatedAt: 'server-time' }, { merge: true });
  expect(screen.queryByText(/"favorite":true/)).not.toBeInTheDocument();
});
it('does not carry guest saves into a signed-in account', async () => {
  localStorage.setItem('racherbaumer-library-guest-v1', JSON.stringify({ secret: { favorite: true } }));
  const view = render(<LibraryProvider><Controls /></LibraryProvider>);
  expect(screen.getByText(/secret/)).toBeInTheDocument();
  state.user = { uid: 'bob' };
  view.rerender(<LibraryProvider><Controls /></LibraryProvider>);
  expect(screen.queryByText(/secret/)).not.toBeInTheDocument();
});
