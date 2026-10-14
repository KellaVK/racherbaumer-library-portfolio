import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CatalogEvidence from './CatalogEvidence';
it('shows distinct notes with a brief disclaimer and no spreadsheet references', () => {
  render(
    <CatalogEvidence
      dvd={{
        notes: 'Coin routine',
        catalogNotes: ['Coin routine', 'Uses a purse frame'],
        catalogPerformers: ['Guest Magician'],
        catalogSources: [{ tab: 'DVD List', row: 7 }],
      }}
    />,
  );
  expect(screen.getByText('Uses a purse frame')).toBeInTheDocument();
  expect(screen.queryByText('Coin routine')).not.toBeInTheDocument();
  expect(screen.getByText('Categories and notes have not been independently verified.')).toBeInTheDocument();
  expect(screen.queryByText(/spreadsheet|DVD List|row 7/i)).not.toBeInTheDocument();
});
