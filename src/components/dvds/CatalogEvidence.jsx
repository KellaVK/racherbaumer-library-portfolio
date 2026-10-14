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
          Categories and notes have not been independently verified.
        </small>
      </div>
    </details>
  );
}
