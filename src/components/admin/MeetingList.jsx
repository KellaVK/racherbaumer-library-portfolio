import { useState } from 'react';
export default function MeetingList({ pending = [], active = [] }) {
  const [open, setOpen] = useState(false);
  return <section className="meeting-list">
    <button className="btn-secondary" aria-expanded={open} onClick={() => setOpen(!open)}>Meeting pickup & return list</button>
    {open && <div className="meeting-print-area">
      <h2 className="section-heading">Meeting checklist</h2>
      <p className="discovery-help">Requests below still need approval. Check the physical DVDs before handing them out.</p>
      {[['Requested — confirm before bringing', pending], ['Currently borrowed — check returns', active]].map(([label, items]) => <section key={label}>
        <h3>{label}</h3>
        {!items.length ? <p>None.</p> : <ul>{items.map(item => <li key={item.id}>□ {item.dvdTitle} — {item.requesterName || 'Member'}</li>)}</ul>}
      </section>)}
      <button className="btn-ghost no-print" onClick={() => window.print()}>Print checklist</button>
    </div>}
  </section>;
}
