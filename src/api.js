// Every call below is a backend endpoint. Change paths here only.
const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api/v1';
const BACKEND = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
const BASE = (import.meta.env.PROD ? BACKEND : '') + API_PREFIX;

// Set false once /api/v1/portfolios/* is live on the backend.
const USE_MOCK = true;

async function req(path, opts = {}) {
  const isForm = opts.body instanceof FormData;
  const res = await fetch(BASE + path, {
    ...opts,
    headers: isForm ? undefined : { 'Content-Type': 'application/json' },
    body: isForm || opts.body === undefined ? opts.body : JSON.stringify(opts.body),
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      msg = j.message || (typeof j.detail === 'string' ? j.detail : msg);
    } catch { /* keep default */ }
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

// ---------------------------------------------------------------------------
// Mock data — used only when USE_MOCK === true
// ---------------------------------------------------------------------------
const MOCK_LOCS = [
  { loc_id: 'L001', lat: -1.2921, lon: 36.8219, tiv_kes: 5_000_000,  damage_ratio: 0.35, loss_kes: 1_750_000, housing_class: 'Residential' },
  { loc_id: 'L002', lat: -1.2760, lon: 36.8000, tiv_kes: 12_000_000, damage_ratio: 0.28, loss_kes: 3_360_000, housing_class: 'Commercial' },
  { loc_id: 'L003', lat: -1.3100, lon: 36.8500, tiv_kes: 3_000_000,  damage_ratio: 0.42, loss_kes: 1_260_000, housing_class: 'Residential' },
  { loc_id: 'L004', lat: -1.2600, lon: 36.8300, tiv_kes: 55_000_000, damage_ratio: 0.15, loss_kes: 8_250_000, housing_class: 'Industrial' },
  { loc_id: 'L005', lat: -1.3000, lon: 36.7800, tiv_kes: 22_000_000, damage_ratio: 0.22, loss_kes: 4_840_000, housing_class: 'Commercial' },
  { loc_id: 'L006', lat: -1.2450, lon: 36.8900, tiv_kes: 8_000_000,  damage_ratio: 0.33, loss_kes: 2_640_000, housing_class: 'Residential' },
  { loc_id: 'L007', lat: -1.3300, lon: 36.7700, tiv_kes: 1_800_000,  damage_ratio: 0.50, loss_kes:   900_000, housing_class: 'Residential' },
  { loc_id: 'L008', lat: -1.2850, lon: 36.8500, tiv_kes: 40_000_000, damage_ratio: 0.18, loss_kes: 7_200_000, housing_class: 'Industrial' },
];

const MOCK_TOTAL_TIV  = MOCK_LOCS.reduce((s, l) => s + l.tiv_kes, 0);
const MOCK_TOTAL_LOSS = MOCK_LOCS.reduce((s, l) => s + l.loss_kes, 0);

const MOCK = {
  portfolios: [{
    id: 'demo',
    name: 'Westlands Demo Portfolio',
    status: 'analyzed',
    created_at: new Date().toISOString(),
  }],

  upload: { id: 'demo' },

  portfolio: {
    id: 'demo',
    name: 'Westlands Demo Portfolio',
    status: 'ready',
    rows: MOCK_LOCS.map((l) => ({
      loc_id: l.loc_id,
      lat: l.lat,
      lon: l.lon,
      housing_class: l.housing_class,
      tiv_kes: l.tiv_kes,
    })),
  },

  results: {
    id: 'demo',
    status: 'done',
    name: 'Westlands Demo Portfolio',
    total_tiv: MOCK_TOTAL_TIV,
    total_loss: MOCK_TOTAL_LOSS,
    pipeline: [
      { step: 'Data ingestion',           detail: 'Extracted 8 locations from upload' },
      { step: 'Exposure from LLM',        detail: 'Inferred housing class and structure type' },
      { step: 'ML exposure estimate',     detail: 'Refined TIV per building' },
      { step: 'CAT model',                detail: 'Vulnerability function applied per class' },
      { step: 'Loss metrics',             detail: 'Damage ratio × TIV, portfolio loss, EP curve' },
      { step: 'LLM explanation',          detail: 'Drafted summary for the reinsurer' },
    ],
    assumptions: [
      { label: 'Flood depth model', value: 'JBA 30m return-period grid' },
      { label: 'Damage function',   value: 'HAZUS flood, residential' },
      { label: 'Currency',          value: 'KES' },
      { label: 'Portfolio as-of',   value: new Date().toLocaleDateString('en-KE') },
    ],
    explanation:
        'This is a demo explanation. The Westlands portfolio carries the largest single loss because building L004 has the highest insured value in the book. Losses concentrate in the three low-lying clusters near the Nairobi River.',
    ep_curve: [
      { return_period: 10,  loss: 1_200_000 },
      { return_period: 25,  loss: 3_500_000 },
      { return_period: 50,  loss: 8_100_000 },
      { return_period: 100, loss: 14_500_000 },
      { return_period: 200, loss: 22_000_000 },
      { return_period: 500, loss: 30_500_000 },
    ],
    locations: MOCK_LOCS,
  },

  reply:
      'Based on the demo portfolio, L004 dominates the loss because of its 55M TIV. Focus underwriting attention on L004 and L007 — the latter has the highest damage ratio at 50%.',
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export const api = {
  hotspots: () => req('/hotspots'),

  portfolios: () => USE_MOCK ? Promise.resolve(MOCK.portfolios) : req('/portfolios'),

  upload: (file, name) => {
    if (USE_MOCK) return Promise.resolve(MOCK.upload);
    const f = new FormData();
    f.append('file', file);
    f.append('name', name);
    return req('/portfolios/upload', { method: 'POST', body: f });
  },

  portfolio: (id) => USE_MOCK ? Promise.resolve(MOCK.portfolio) : req(`/portfolios/${id}`),

  saveRows: (id, body) =>
      USE_MOCK ? Promise.resolve() : req(`/portfolios/${id}/rows`, { method: 'PUT', body }),

  approve: (id) =>
      USE_MOCK ? Promise.resolve() : req(`/portfolios/${id}/approve`, { method: 'POST' }),

  exportUrl: (id, format) => `${BASE}/portfolios/${id}/export?format=${format}`,

  analyze: (id) =>
      USE_MOCK ? Promise.resolve() : req(`/portfolios/${id}/analyze`, { method: 'POST' }),

  results: (id) =>
      USE_MOCK ? Promise.resolve(MOCK.results) : req(`/portfolios/${id}/results`),

  explain: (id) =>
      USE_MOCK
          ? Promise.resolve({ explanation: MOCK.results.explanation })
          : req(`/portfolios/${id}/explain`, { method: 'POST' }),

  saveReport: (id, body) =>
      USE_MOCK ? Promise.resolve() : req(`/portfolios/${id}/report`, { method: 'PUT', body }),

  chat: (id, messages) =>
      USE_MOCK
          ? Promise.resolve({ reply: MOCK.reply })
          : req(`/portfolios/${id}/chat`, { method: 'POST', body: { messages } }),
};