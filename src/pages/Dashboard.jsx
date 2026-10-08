import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, FileText } from 'lucide-react';
import NairobiMap from '../components/NairobiMap';
import Legend from '../components/Legend';
import Portfolios from '../components/Portfolios';
import { api, hotspotsWithRisk } from '../api';
import { severityOf, SEVERITY } from '../utils';

export default function Dashboard() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const open = pathname === '/portfolios';
  const [hotspots, setHotspots] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');

  const loadHistory = () => api.portfolios().then(setHistory).catch((e) => setError(e.message));
  useEffect(() => { hotspotsWithRisk().then(setHotspots).catch((e) => setError(e.message)); loadHistory(); }, []);

  const counts = Object.keys(SEVERITY).map((k) => [k, hotspots.filter((h) => severityOf(h) === k).length]);

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><span>Nairobi</span> flood risk</div>
        <button className="btn red wide" onClick={() => nav('/portfolios')}><Plus size={16} />Create portfolio</button>
        <h3>Portfolio history</h3>
        <ul className="history">
          {history.length === 0 && <li className="empty">Nothing here yet. Create your first portfolio to start.</li>}
          {history.map((p) => (
            <li key={p.id}>
              <button onClick={() => nav(p.status === 'analyzed' ? `/results/${p.id}` : '/portfolios')}>
                <FileText size={15} />
                <span><b>{p.name}</b><small>{p.created_at ? new Date(p.created_at).toLocaleDateString('en-KE') : ''} · {p.status}</small></span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="main">
        <Portfolios open={open} onClose={() => nav('/dashboard')} onChanged={loadHistory} />
        <header className="top">
          <div><h1>Flood hotspots across Nairobi</h1><p>Each circle is a hotspot area, coloured by how severe the flooding risk is.</p></div>
          <div className="counts">{counts.map(([k, n]) => <span key={k}><i style={{ background: SEVERITY[k] }} />{n} {k}</span>)}</div>
        </header>
        {error && <p className="error banner">{error}</p>}
        <div className="mapbox"><NairobiMap hotspots={hotspots} /><Legend /></div>
      </main>
    </div>
  );
}
