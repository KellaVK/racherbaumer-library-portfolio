export default function ExternalEvidence({dvd}) {
 const data=dvd.externalEvidence;
 if (!data) return null;
 return <details className="external-evidence"><summary>Contents & props</summary>
  <p>{data.summary}</p>
  {data.props.length>0 && <p><strong>Props mentioned:</strong> {data.props.join(', ')}. This is not a complete requirements list.</p>}
  {data.tricks.length>0 && <ul>{data.tricks.map(t=><li key={t.name}>{t.name}{t.creator && ` — ${t.creator}`}</li>)}</ul>}
  <p>{data.editionNote}</p>
  <small>Based on <a href={data.url} target="_blank" rel="noreferrer">{data.sourceLabel}</a>. Contents and requirements have not been independently verified.</small>
 </details>;
}
