import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Sparkles, FileText } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import NairobiMap from '../components/NairobiMap';
import Legend from '../components/Legend';
import Chat from '../components/Chat';
import TopNav from '../components/TopNav';
import PipelineSteps from '../components/PipelineSteps';
import { api } from '../api';
import { kes } from '../utils';

export default function Results() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [hotspots, setHotspots] = useState([]);
    const [text, setText] = useState('');
    const [explaining, setExplaining] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let t;
        let stop = false;

        const load = () =>
            api.results(id)
                .then((d) => {
                    if (stop) return;
                    setData(d);
                    if (d.explanation) setText((p) => p || d.explanation);
                    if (d.status === 'running') t = setTimeout(load, 2500);
                })
                .catch((e) => setError(e.message));

        load();

        api.hotspots()
            .then((rows) => setHotspots(rows.map((h) => ({ ...h, severity: 'red' }))))
            .catch(() => {});

        return () => { stop = true; clearTimeout(t); };
    }, [id]);

    const explain = async () => {
        setExplaining(true);
        setError('');
        try { setText((await api.explain(id)).explanation); }
        catch (e) { setError(e.message); }
        setExplaining(false);
    };

    const back = (
        <Link to="/dashboard" className="back">
            <ArrowLeft size={16} />Back to dashboard
        </Link>
    );

    if (error && !data) {
        return (
            <div className="page">
                <TopNav />
                {back}
                <p className="error banner">{error}</p>
            </div>
        );
    }

    if (!data || data.status === 'running') {
        return (
            <div className="page center">
                <Loader2 className="spin" size={28} />
                <p>Running the flood loss model. This can take a minute.</p>
            </div>
        );
    }

    if (data.status === 'failed') {
        return (
            <div className="page">
                <TopNav />
                {back}
                <p className="error banner">The analysis failed. Check the portfolio and run it again.</p>
            </div>
        );
    }

    const locs = data.locations || [];
    const ratio = data.total_tiv
        ? ((data.total_loss / data.total_tiv) * 100).toFixed(1)
        : '—';

    return (
        <div className="page">
            <TopNav />
            {back}

            <div className="results-head">
                <h1>{data.name || 'Portfolio results'}</h1>
                <Link to={`/results/${id}/report`} className="btn red">
                    <FileText size={15} />Open report
                </Link>
            </div>

            <div className="stats">
                <div><small>Total portfolio loss</small><b className="red-text">{kes(data.total_loss)}</b></div>
                <div><small>Total insured value</small><b>{kes(data.total_tiv)}</b></div>
                <div><small>Loss as share of TIV</small><b>{ratio}%</b></div>
                <div><small>Locations</small><b>{locs.length.toLocaleString()}</b></div>
            </div>

            <PipelineSteps steps={data.pipeline} />

            <div className="mapbox tall">
                <NairobiMap hotspots={hotspots} buildings={locs} />
                <Legend showSize />
            </div>

            <div className="grid2">
                <section className="panel">
                    <h3>Exceedance probability curve</h3>
                    <div style={{ height: 280 }}>
                        <ResponsiveContainer>
                            <LineChart data={data.ep_curve || []} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                                <CartesianGrid stroke="#DCEBF5" strokeDasharray="3 3" />
                                <XAxis dataKey="return_period" tickFormatter={(v) => `1-in-${v}`} fontSize={12} />
                                <YAxis tickFormatter={(v) => kes(v)} fontSize={12} width={80} />
                                <Tooltip
                                    formatter={(v) => kes(v, false)}
                                    labelFormatter={(v) => `Return period: 1-in-${v} years`}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="loss"
                                    stroke="#D7263D"
                                    strokeWidth={2.5}
                                    dot={{ r: 4, fill: '#D7263D' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                <section className="panel">
                    <h3>Assumptions</h3>
                    <dl className="assume">
                        {(data.assumptions || []).map((a, i) =>
                            typeof a === 'string'
                                ? <div key={i}><dd>{a}</dd></div>
                                : <div key={i}><dt>{a.label}</dt><dd>{a.value}</dd></div>
                        )}
                    </dl>
                </section>
            </div>

            <section className="panel">
                <h3>Loss by building <small>(damage ratio × TIV)</small></h3>
                <div className="tablewrap tallrows">
                    <table>
                        <thead>
                        <tr>
                            <th>Location ID</th><th>Lat</th><th>Long</th>
                            <th>TIV</th><th>Damage ratio</th><th>Loss</th>
                        </tr>
                        </thead>
                        <tbody>
                        {[...locs].sort((a, b) => b.loss_kes - a.loss_kes).map((l) => (
                            <tr key={l.loc_id}>
                                <td><b>{l.loc_id}</b></td>
                                <td>{Number(l.lat).toFixed(5)}</td>
                                <td>{Number(l.lon).toFixed(5)}</td>
                                <td>{kes(l.tiv_kes, false)}</td>
                                <td>{(l.damage_ratio * 100).toFixed(1)}%</td>
                                <td className="red-text">{kes(l.loss_kes, false)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="panel ai">
                <div className="ai-head">
                    <h3>Explain these results</h3>
                    <button className="btn red" onClick={explain} disabled={explaining}>
                        {explaining ? <Loader2 className="spin" size={15} /> : <Sparkles size={15} />}
                        {text ? 'Explain again' : 'Explain in plain language'}
                    </button>
                </div>
                {text
                    ? <p className="explain">{text}</p>
                    : <p className="empty">
                        The model outputs above are sent to the language model,
                        which writes a short explanation for the reinsurer.
                    </p>}
                {error && <p className="error">{error}</p>}
            </section>

            <Chat id={id} />
        </div>
    );
}