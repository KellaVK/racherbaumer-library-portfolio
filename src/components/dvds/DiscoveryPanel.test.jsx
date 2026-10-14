import { it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import DiscoveryPanel from './DiscoveryPanel';
import { createDiscoveryIndex } from '../../utils/discovery';
beforeEach(() => localStorage.clear());
it('lets visitors choose interests, see reasons, and reset stored preferences', async () => {
  const user = userEvent.setup();
  const index = createDiscoveryIndex([
    { id: 'a', title: 'Coin Course', notes: 'Coin moves for beginners' },
  ]);
  render(
    <MemoryRouter>
      <DiscoveryPanel index={index} filters={{}} />
    </MemoryRouter>,
  );
  await user.click(screen.getByText('Find something for you'));
  await user.click(screen.getByRole('checkbox', { name: 'Coins' }));
  expect(screen.getByRole('link', { name: 'Coin Course' })).toHaveAttribute(
    'href',
    '/dvd/a',
  );
  expect(screen.getByRole('link', { name: 'Coin Course' })).toContainElement(screen.getByText('Coins · catalog match'));
  expect(screen.getByRole('link', { name: 'Coin Course' })).toContainElement(screen.getByText('View DVD')); 
  await user.click(screen.getByRole('button', { name: 'Reset preferences' }));
  expect(screen.getByRole('checkbox', { name: 'Coins' })).not.toBeChecked();
  expect(
    screen.queryByRole('link', { name: 'Coin Course' }),
  ).not.toBeInTheDocument();
});
