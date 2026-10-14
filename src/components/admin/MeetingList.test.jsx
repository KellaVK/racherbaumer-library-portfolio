import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MeetingList from './MeetingList';
it('keeps the private checklist collapsed and distinguishes requests from borrowed items', async () => {
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  render(<MeetingList pending={[{id:'p',dvdTitle:'Pending DVD',requesterName:'Alice'}]} active={[{id:'a',dvdTitle:'Borrowed DVD',requesterName:'Bob'}]} />);
  expect(screen.queryByText(/Alice/)).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button',{name:'Meeting pickup & return list'}));
  expect(screen.getByText(/Requests below still need approval/)).toBeInTheDocument();
  expect(screen.getByText(/Pending DVD — Alice/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button',{name:'Print checklist'}));
  expect(print).toHaveBeenCalledOnce();
  print.mockRestore();
});
