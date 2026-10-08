// Every call below is a backend endpoint. Change paths here only.
const API_PREFIX = import.meta.env.VITE_API_PREFIX || "/api/v1";
const BACKEND = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");
// Dev: relative URLs, so the Vite proxy handles them. Production: the full backend URL if set, otherwise relative (Vercel rewrite).
const BASE = (import.meta.env.PROD ? BACKEND : "") + API_PREFIX;

async function req(path, opts = {}) {
  const isForm = opts.body instanceof FormData;
  const res = await fetch(BASE + path, {
    ...opts,
    headers: isForm ? undefined : { 'Content-Type': 'application/json' },
    body: isForm || opts.body === undefined ? opts.body : JSON.stringify(opts.body),
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try { msg = (await res.json()).message || msg; } catch { /* keep default */ }
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  // Page 1
  hotspots: () => req('/hotspots'),                                   // [{id,name,lat,lon,severity|risk_score}]
  portfolios: () => req('/portfolios'),                               // history [{id,name,status,created_at}]
  // Page 2 (portfolios sheet)
  upload: (file, name) => {                                           // -> {id}
    const f = new FormData(); f.append('file', file); f.append('name', name);
    return req('/portfolios/upload', { method: 'POST', body: f });
  },
  portfolio: (id) => req(`/portfolios/${id}`),                        // {id,name,status:processing|ready|approved|failed,rows,message}
  saveRows: (id, body) => req(`/portfolios/${id}/rows`, { method: 'PUT', body }),
  approve: (id) => req(`/portfolios/${id}/approve`, { method: 'POST' }), // saves to database
  exportUrl: (id, format) => `${BASE}/portfolios/${id}/export?format=${format}`, // csv | docx
  analyze: (id) => req(`/portfolios/${id}/analyze`, { method: 'POST' }),
  // Page 3 (results)
  results: (id) => req(`/portfolios/${id}/results`),                  // see Results.jsx for shape
  explain: (id) => req(`/portfolios/${id}/explain`, { method: 'POST' }), // -> {explanation}
};

// Hotspots from the backend have no severity, so colour them from nearby locations.
const km = (a, b) => Math.hypot((a.lat - b.lat) * 111, (a.lon - b.lon) * 111 * Math.cos((a.lat * Math.PI) / 180));

export async function hotspotsWithRisk() {
  const hs = await api.hotspots();
  if (hs.some((h) => h.severity || h.risk_score != null)) return hs;
  const locs = await req('/locations');
  const sums = new Map(hs.map((h) => [h.id, { s: 0, n: 0 }]));
  for (const l of locs) {
    let best = null; let d = Infinity;
    for (const h of hs) { const x = km(l, h); if (x < d) { d = x; best = h; } }
    if (best && d <= 3) { const a = sums.get(best.id); a.s += Number(l.hazard_severity) || 0; a.n += 1; }
  }
  const scored = hs.map((h) => { const a = sums.get(h.id); return { ...h, risk_score: a.n ? a.s / a.n : 0 }; });
  const ranked = [...scored].sort((a, b) => a.risk_score - b.risk_score);
  return scored.map((h) => {
    const r = ranked.indexOf(h) / Math.max(1, ranked.length - 1);
    return { ...h, severity: r >= 0.75 ? 'red' : r >= 0.5 ? 'orange' : r >= 0.25 ? 'yellow' : 'green' };
  });
}
