import { SEVERITY } from '../utils';

export default function Legend({ showSize }) {
  return (
    <div className="legend">
      {Object.keys(SEVERITY).map((k) => (
        <span key={k}><i style={{ background: SEVERITY[k] }} />{k === 'red' ? 'Red: highest' : k === 'green' ? 'Green: lowest' : k[0].toUpperCase() + k.slice(1)}</span>
      ))}
      {showSize && <span><i className="dot sm" />TIV 2M or less<i className="dot lg" />TIV 50M or more</span>}
    </div>
  );
}
