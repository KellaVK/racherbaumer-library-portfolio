export default function CatalogEvidence({ dvd }) {
  const notes = (dvd.catalogNotes || []).filter(
    (note) =>
      note.toLowerCase() !==
      String(dvd.notes || '')
        .trim()
        .toLowerCase(),
  );
  const performers = dvd.catalogPerformers || [];
  if (!notes.length && !performers.length) return null;
  return (
    <details style={{ marginBottom: '1.25rem' }} open>
      <summary>Additional collection notes</summary>
      <div className="catalog-evidence">
        {notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
        {performers.length > 0 && <p>Also featured: {performers.join(', ')}</p>}
        <small>
          From the collection spreadsheet:{' '}
          {(dvd.catalogSources || [])
            .map((source) => `${source.tab}, row ${source.row}`)
            .join('; ')}
          . These are catalog notes, not independently verified descriptions.
        </small>
      </div>
    </details>
  );
}
