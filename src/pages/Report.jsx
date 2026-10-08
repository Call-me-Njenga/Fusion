import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    ArrowLeft, Loader2, Printer, FileDown, Pencil, Save,
    Sparkles, Plus, Trash2,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import TopNav from '../components/TopNav';
import { api } from '../api';
import { SEVERITY, severityOf, tivSize, kes } from '../utils';

const norm = (a) =>
    typeof a === 'string'
        ? { label: '', value: a }
        : { label: a.label || '', value: a.value || '' };

const esc = (s) =>
    String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function ReportMap({ hotspots, buildings }) {
    const W = 700, H = 440, pad = 28;
    const pts = [...hotspots, ...buildings];
    if (!pts.length) return null;

    const lons = pts.map((p) => p.lon);
    const lats = pts.map((p) => p.lat);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const s = Math.min(
        (W - 2 * pad) / ((maxLon - minLon) || 1),
        (H - 2 * pad) / ((maxLat - minLat) || 1)
    );
    const ox = (W - (maxLon - minLon) * s) / 2;
    const oy = (H - (maxLat - minLat) * s) / 2;
    const X = (lon) => ox + (lon - minLon) * s;
    const Y = (lat) => oy + (maxLat - lat) * s;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="rmap" role="img" aria-label="Map of Nairobi hotspots and buildings">
            <rect width={W} height={H} fill="#EEF6FB" rx="8" />

            {hotspots.map((h) => {
                const c = SEVERITY[severityOf(h)];
                return (
                    <g key={`h${h.id}`}>
                        <circle cx={X(h.lon)} cy={Y(h.lat)} r="22" fill={c} fillOpacity=".3" stroke={c} strokeWidth="1.5" />
                        <text x={X(h.lon)} y={Y(h.lat) + 34} fontSize="9" textAnchor="middle" fill="#5E7387">
                            {h.name}
                        </text>
                    </g>
                );
            })}

            {buildings.map((b) => (
                <circle
                    key={b.loc_id}
                    cx={X(b.lon)}
                    cy={Y(b.lat)}
                    r={tivSize(b.tiv_kes) / 2}
                    fill="#D7263D"
                    stroke="#fff"
                    strokeWidth="1.5"
                />
            ))}
        </svg>
    );
}

function downloadWord(name, data, assumptions, explanation, top) {
    const rows = top
        .map((l) => `<tr><td>${esc(l.loc_id)}</td><td>${kes(l.tiv_kes, false)}</td><td>${(l.damage_ratio * 100).toFixed(1)}%</td><td>${kes(l.loss_kes, false)}</td></tr>`)
        .join('');
    const as = assumptions
        .map((a) => `<tr><td>${esc(a.label)}</td><td>${esc(a.value)}</td></tr>`)
        .join('');
    const ep = (data.ep_curve || [])
        .map((p) => `<tr><td>1-in-${p.return_period}</td><td>${kes(p.loss, false)}</td></tr>`)
        .join('');

    const html = `<html><head><meta charset="utf-8"><title>${esc(name)}</title></head><body style="font-family:Calibri,Arial">
<h1>${esc(name)}</h1>
<p>Total portfolio loss: <b>${kes(data.total_loss, false)}</b> · Total insured value: ${kes(data.total_tiv, false)}</p>
<h2>Summary</h2>
<p>${esc(explanation).replace(/\n/g, '<br>')}</p>
<h2>Assumptions</h2>
<table border="1" cellpadding="6">${as}</table>
<h2>Exceedance probability</h2>
<table border="1" cellpadding="6"><tr><th>Return period</th><th>Loss</th></tr>${ep}</table>
<h2>Largest building losses</h2>
<table border="1" cellpadding="6"><tr><th>Location</th><th>TIV</th><th>Damage ratio</th><th>Loss</th></tr>${rows}</table>
</body></html>`;

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff', html], { type: 'application/msword' }));
    a.download = `${name}.doc`;
    a.click();
    URL.revokeObjectURL(a.href);
}

export default function Report() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [hotspots, setHotspots] = useState([]);
    const [assumptions, setAssumptions] = useState([]);
    const [explanation, setExplanation] = useState('');
    const [edit, setEdit] = useState(false);
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        let t;
        let stop = false;
        let first = true;

        const load = () =>
            api.results(id)
                .then((d) => {
                    if (stop) return;
                    setData(d);
                    if (first && d.status !== 'running') {
                        first = false;
                        setAssumptions((d.assumptions || []).map(norm));
                        setExplanation(d.explanation || '');
                    }
                    if (d.status === 'running') t = setTimeout(load, 2500);
                })
                .catch((e) => setError(e.message));

        load();

        api.hotspots()
            .then((rows) => setHotspots(rows.map((h) => ({ ...h, severity: 'red' }))))
            .catch(() => {});

        return () => { stop = true; clearTimeout(t); };
    }, [id]);

    const run = async (fn, done) => {
        setBusy(true);
        setError('');
        setNote('');
        try {
            await fn();
            if (done) setNote(done);
        } catch (e) {
            setError(e.message);
        }
        setBusy(false);
    };

    const save = () =>
        run(async () => {
            await api.saveReport(id, { assumptions, explanation });
            setEdit(false);
        }, 'Report saved.');

    const explain = () =>
        run(async () => setExplanation((await api.explain(id)).explanation));

    const setA = (i, k, v) =>
        setAssumptions((a) => a.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

    const back = (
        <Link to={`/results/${id}`} className="back no-print">
            <ArrowLeft size={16} />Back to results
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
                <p>Preparing the report…</p>
            </div>
        );
    }

    if (data.status === 'failed') {
        return (
            <div className="page">
                <TopNav />
                {back}
                <p className="error banner">The analysis failed, so there is no report yet.</p>
            </div>
        );
    }

    const locs = data.locations || [];
    const top = [...locs].sort((a, b) => b.loss_kes - a.loss_kes).slice(0, 10);
    const name = data.name || 'Portfolio report';
    const ratio = data.total_tiv
        ? ((data.total_loss / data.total_tiv) * 100).toFixed(1)
        : '—';

    return (
        <div className="page reportwrap">
            <TopNav />
            {back}

            <div className="toolbar no-print">
                <button className="btn ghost" onClick={() => setEdit((e) => !e)} disabled={busy}>
                    <Pencil size={15} />{edit ? 'Stop editing' : 'Edit report'}
                </button>
                <button className="btn blue" onClick={save} disabled={busy}>
                    <Save size={15} />Save report
                </button>
                <button className="btn ghost" onClick={explain} disabled={busy}>
                    <Sparkles size={15} />{explanation ? 'Rewrite summary with AI' : 'Write summary with AI'}
                </button>
                <button className="btn red" onClick={() => window.print()}>
                    <Printer size={15} />Print or save as PDF
                </button>
                <button
                    className="btn ghost"
                    onClick={() => downloadWord(name, data, assumptions, explanation, top)}
                >
                    <FileDown size={15} />Word
                </button>
            </div>

            {note && <p className="hint no-print">{note}</p>}
            {error && <p className="error banner no-print">{error}</p>}

            <article className="report">
                <header>
                    <h1>{name}</h1>
                    <p className="sub">
                        Nairobi flood loss report · {new Date().toLocaleDateString('en-KE', { dateStyle: 'long' })}
                    </p>
                </header>

                <div className="stats">
                    <div><small>Total portfolio loss</small><b className="red-text">{kes(data.total_loss)}</b></div>
                    <div><small>Total insured value</small><b>{kes(data.total_tiv)}</b></div>
                    <div><small>Loss as share of TIV</small><b>{ratio}%</b></div>
                    <div><small>Locations</small><b>{locs.length.toLocaleString()}</b></div>
                </div>

                <h2>Summary</h2>
                {edit
                    ? <textarea
                        className="summary"
                        rows={8}
                        value={explanation}
                        onChange={(e) => setExplanation(e.target.value)}
                        aria-label="Summary text"
                    />
                    : <p className="explain">
                        {explanation || 'No summary yet. Use "Write summary with AI" or edit the report to write your own.'}
                    </p>}

                <h2>Where the losses sit</h2>
                <ReportMap hotspots={hotspots} buildings={locs} />
                <p className="cap">Hotspot circles are red. Building dots grow with insured value.</p>

                <h2>Exceedance probability curve</h2>
                <LineChart
                    width={700}
                    height={250}
                    data={data.ep_curve || []}
                    margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
                >
                    <CartesianGrid stroke="#DCEBF5" strokeDasharray="3 3" />
                    <XAxis dataKey="return_period" tickFormatter={(v) => `1-in-${v}`} fontSize={12} />
                    <YAxis tickFormatter={(v) => kes(v)} fontSize={12} width={80} />
                    <Line
                        type="monotone"
                        dataKey="loss"
                        stroke="#D7263D"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#D7263D' }}
                        isAnimationActive={false}
                    />
                </LineChart>

                <h2>Assumptions</h2>
                <table className="rtable">
                    <tbody>
                    {assumptions.map((a, i) => (
                        <tr key={i}>
                            <td>
                                {edit
                                    ? <input value={a.label} onChange={(e) => setA(i, 'label', e.target.value)} aria-label="Assumption name" />
                                    : a.label}
                            </td>
                            <td>
                                {edit
                                    ? <input value={a.value} onChange={(e) => setA(i, 'value', e.target.value)} aria-label="Assumption value" />
                                    : a.value}
                            </td>
                            {edit && (
                                <td className="no-print">
                                    <button
                                        className="icon"
                                        onClick={() => setAssumptions((r) => r.filter((_, j) => j !== i))}
                                        aria-label="Remove assumption"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                    </tbody>
                </table>

                {edit && (
                    <button
                        className="btn ghost no-print"
                        onClick={() => setAssumptions((r) => [...r, { label: '', value: '' }])}
                    >
                        <Plus size={15} />Add assumption
                    </button>
                )}

                <h2>Largest building losses</h2>
                <table className="rtable">
                    <thead>
                    <tr><th>Location</th><th>TIV</th><th>Damage ratio</th><th>Loss</th></tr>
                    </thead>
                    <tbody>
                    {top.map((l) => (
                        <tr key={l.loc_id}>
                            <td><b>{l.loc_id}</b></td>
                            <td>{kes(l.tiv_kes, false)}</td>
                            <td>{(l.damage_ratio * 100).toFixed(1)}%</td>
                            <td className="red-text">{kes(l.loss_kes, false)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </article>
        </div>
    );
}