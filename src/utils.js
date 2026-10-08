export const SEVERITY = { red: '#D7263D', orange: '#F28C28', yellow: '#F2C94C', green: '#3FA66B' };

export function severityOf(h) {
  if (SEVERITY[h.severity]) return h.severity;
  const s = Number(h.risk_score) || 0;
  return s >= 0.75 ? 'red' : s >= 0.5 ? 'orange' : s >= 0.25 ? 'yellow' : 'green';
}

// 2M and below -> 6px, 50M and above -> 28px, linear in between
export function tivSize(tiv) {
  const t = Math.min(1, Math.max(0, (Number(tiv) - 2e6) / 48e6));
  return Math.round(6 + t * 22);
}

export function kes(v, compact = true) {
  if (v == null || isNaN(v)) return '—';
  const n = Number(v);
  if (!compact) return `KSh ${n.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
  if (n >= 1e9) return `KSh ${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `KSh ${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `KSh ${(n / 1e3).toFixed(0)}K`;
  return `KSh ${n.toFixed(0)}`;
}

export const NAIROBI_CENTER = { longitude: 36.82, latitude: -1.29, zoom: 10.8 };
export const NAIROBI_BOUNDS = [[36.6, -1.45], [37.05, -1.1]];
