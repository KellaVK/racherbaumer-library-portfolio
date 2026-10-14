export default function ExternalEvidence({ dvd }) {
  const data = dvd.externalEvidence;
  if (!data) return null;
  const sources = data.sources || [{ url: data.url, label: data.sourceLabel }];
  return <details className="external-evidence"><summary>Contents & props</summary>
    <p>{data.summary}</p>
    {data.props.length > 0 && <p><strong>Props mentioned:</strong> {data.props.join(', ')}. This is not a complete requirements list.</p>}
    {data.tricks.length > 0 && <ul>{data.tricks.map(trick => <li key={trick.name}>
      {trick.name}{trick.creator && ` — ${trick.creator}`}
      {trick.description && <p>{trick.description}</p>}
    </li>)}</ul>}
    <p>{data.editionNote}</p>
    <small>Sources: {sources.map((source, index) => <span key={source.url}>
      {index > 0 && ' · '}<a href={source.url} target="_blank" rel="noreferrer">{source.label}</a>
    </span>)}. Contents and requirements have not been independently verified.</small>
  </details>;
}
