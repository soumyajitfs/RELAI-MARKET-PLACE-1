/**
 * Compact SHAP impact labels (some backends return large raw contributions).
 */
export function formatShapImpactLabel(x) {
  if (x == null || typeof x !== 'number' || !Number.isFinite(x)) return '—';
  const ax = Math.abs(x);
  const sign = x < 0 ? '−' : '+';
  let body;
  if (ax >= 1e6) body = `${(ax / 1e6).toFixed(2)}M`;
  else if (ax >= 1000) body = `${(ax / 1000).toFixed(1)}k`;
  else body = ax.toFixed(2);
  return `${sign}${body}`;
}

/**
 * Feature values beside SHAP (currency, ratios) — grouping + bounded length for layout.
 */
export function formatShapFeatureValueForUi(val) {
  if (val == null || val === '' || val === '—') return '—';
  const s = String(val).trim();
  const n = Number(s.replace(/,/g, ''));
  if (!Number.isFinite(n)) return s;
  const abs = Math.abs(n);
  if (abs >= 1e7) return n.toExponential(3);
  if (abs >= 1000) {
    return n.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
    });
  }
  if (Number.isInteger(n)) return String(n);
  const rounded = Math.round(n * 10000) / 10000;
  return String(rounded);
}

/** ~zero SHAP (treat as neutral styling). */
export const negligibleShapImpact = (v) =>
  v == null || (typeof v === 'number' && (!Number.isFinite(v) || Math.abs(v) < 1e-9));

/** Raw direction: positive vs negative contribution. */
export const rawShapImpactTone = (impact) => {
  if (negligibleShapImpact(impact)) return 'neutral';
  return impact > 0 ? 'pos' : 'neg';
};

/**
 * Map SHAP value to bar/badge palette key.
 * When invertRiskColors (EWS), positive contributions use the “risk” (red) palette.
 */
export const chartVisualTone = (impact, invertRiskColors) => {
  const r = rawShapImpactTone(impact);
  if (r === 'neutral' || !invertRiskColors) return r;
  return r === 'pos' ? 'neg' : 'pos';
};
