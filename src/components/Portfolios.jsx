import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Upload, Loader2, Pencil, Save, CheckCircle2, XCircle,
  Play, Download, FileText,
} from 'lucide-react';
import { api } from '../api';
import WordViewer from './WordViewer';

const COLS = [
  ['loc_id', 'Location ID'],
  ['lat', 'Latitude'],
  ['lon', 'Longitude'],
  ['housing_class', 'Housing class'],
  ['tiv_kes', 'TIV (KSh)'],
];

export default function Portfolios({ open, onClose, onChanged }) {
  const [files, setFiles] = useState([]);
  const pick = (list) =>
      setFiles((p) => [...p, ...[...list].map((f) => ({ key: crypto.randomUUID(), file: f }))]);

  return (
      <section className={`sheet ${open ? 'open' : ''}`} aria-hidden={!open}>
        <header>
          <div>
            <h2>Portfolios</h2>
            <p>Upload as many files as you need. Each approved portfolio is saved to your history.</p>
          </div>
          <button className="icon" onClick={onClose} aria-label="Close portfolios"><X size={18} /></button>
        </header>
        <div className="sheet-body">
          <label
              className="drop"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files); }}
          >
            <Upload size={22} />
            <b>Drop files here or choose from your computer</b>
            <span>PDF, Word (.docx) or CSV</span>
            <input
                type="file"
                multiple
                accept=".pdf,.docx,.csv"
                onChange={(e) => { pick(e.target.files); e.target.value = ''; }}
            />
          </label>
          {files.length === 0 && (
              <p className="empty">No files yet. Add one above, or close this panel to keep exploring.</p>
          )}
          {files.map((f) => <Card key={f.key} file={f.file} onSaved={onChanged} />)}
        </div>
      </section>
  );
}

function Card({ file, onSaved }) {
  const nav = useNavigate();
  const [stage, setStage] = useState('draft'); // draft | processing | ready | approved | failed
  const [name, setName] = useState(file.name.replace(/\.[^.]+$/, ''));
  const [id, setId] = useState(null);
  const [rows, setRows] = useState([]);
  const [edit, setEdit] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showWord, setShowWord] = useState(false);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);

  const fail = (m) => { setErr(m); setStage((s) => (s === 'processing' ? 'failed' : s)); };

  const poll = (pid) =>
      api.portfolio(pid).then((p) => {
        if (p.status === 'ready' || p.status === 'approved') {
          setName(p.name || name);
          setRows(p.rows || []);
          setStage(p.status);
        } else if (p.status === 'failed') {
          fail(p.message || 'We could not read this file.');
        } else {
          timer.current = setTimeout(() => poll(pid), 2000);
        }
      }).catch((e) => fail(e.message));

  const upload = async () => {
    setErr(''); setStage('processing');
    try { const r = await api.upload(file, name); setId(r.id); poll(r.id); }
    catch (e) { fail(e.message); }
  };

  const act = async (fn) => {
    setBusy(true); setErr('');
    try { await fn(); } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const save = () => act(async () => {
    await api.saveRows(id, { name, rows });
    setDirty(false); setEdit(false);
  });

  const approve = () => act(async () => {
    await api.approve(id);
    setStage('approved');
    onSaved();
  });

  const disapprove = () => {
    setEdit(true);
    setStage('ready');
    setErr('');
  };

  const analyze = () => act(async () => {
    await api.analyze(id);
    nav(`/results/${id}`);
  });

  const setCell = (i, k, v) => {
    setRows((r) => r.map((row, j) => (j === i ? { ...row, [k]: v } : row)));
    setDirty(true);
  };

  return (
      <article className="pcard">
        <div className="pcard-head">
          <input
              className="name"
              value={name}
              onChange={(e) => { setName(e.target.value); setDirty(true); }}
              disabled={stage === 'processing' || stage === 'approved'}
              aria-label="Portfolio name"
          />
          <span className={`tag ${stage}`}>
          {{ draft: 'Not uploaded', processing: 'Cleaning', ready: 'Ready to review',
            approved: 'Approved', failed: 'Failed' }[stage]}
        </span>
        </div>
        <p className="file">{file.name}</p>

        {stage === 'draft' && (
            <button className="btn red" style={{ width: 'fit-content' }} onClick={upload}>
              <Upload size={15} />Upload and clean
            </button>
        )}

        {stage === 'processing' && (
            <div className="loading">
              <Loader2 className="spin" size={18} />Reading your file and preparing the table…
            </div>
        )}

        {(stage === 'ready' || stage === 'approved') && (
            <>
              <div className="tablewrap">
                <table>
                  <thead>
                  <tr>{COLS.map(([, l]) => <th key={l}>{l}</th>)}</tr>
                  </thead>
                  <tbody>
                  {rows.map((r, i) => (
                      <tr key={i}>
                        {COLS.map(([k]) => (
                            <td key={k}>
                              {edit
                                  ? <input value={r[k] ?? ''} onChange={(e) => setCell(i, k, e.target.value)} />
                                  : (k === 'tiv_kes' ? Number(r[k]).toLocaleString('en-KE') : r[k])}
                            </td>
                        ))}
                      </tr>
                  ))}
                  </tbody>
                </table>
              </div>

              <div className="actions">
                {stage === 'ready' && (
                    <>
                      <button className="btn ghost" onClick={() => setEdit((e) => !e)} disabled={busy}>
                        <Pencil size={15} />{edit ? 'Stop editing' : 'Edit'}
                      </button>
                      <button className="btn blue" onClick={save} disabled={busy || !dirty}>
                        <Save size={15} />Save changes
                      </button>
                      <button className="btn red" onClick={approve} disabled={busy || dirty}>
                        <CheckCircle2 size={15} />Approve
                      </button>
                      <button className="btn ghost" onClick={disapprove} disabled={busy}>
                        <XCircle size={15} />Disapprove
                      </button>
                    </>
                )}
                {stage === 'approved' && (
                    <button className="btn red" onClick={analyze} disabled={busy}>
                      <Play size={15} />Run analysis
                    </button>
                )}
                <button className="btn ghost" onClick={() => setShowWord(true)} disabled={!id}>
                  <FileText size={15} />View Word
                </button>
                <a className="btn ghost" href={api.exportUrl(id, 'csv')}>
                  <Download size={15} />CSV
                </a>
                <a className="btn ghost" href={api.exportUrl(id, 'docx')}>
                  <Download size={15} />Word
                </a>
              </div>

              {stage === 'ready' && dirty && (
                  <p className="hint">Save your changes before approving.</p>
              )}
            </>
        )}

        {err && <p className="error">{err}</p>}

        {showWord && id && (
            <WordViewer
                url={api.exportUrl(id, 'docx')}
                onClose={() => setShowWord(false)}
            />
        )}
      </article>
  );
}