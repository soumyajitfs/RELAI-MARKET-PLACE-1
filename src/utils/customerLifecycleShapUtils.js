/**
 * Build shapData for Customer Lifecycle from backend row + shap_values object.
 * Shape matches PatientCollectability ShapAnalysis / ShapChart contract.
 */

import { getLifecycleColumnLabel } from '../data/customerLifecycleFieldConfig';

const CAT_ORDER = ['Super High', 'High', 'Medium', 'Low'];

const formatNumber = (val) => {
  if (val === null || val === undefined || val === '') return '—';
  const n = Number(val);
  if (!Number.isFinite(n)) return String(val);
  if (Number.isInteger(n)) return String(n);
  const s = n.toFixed(6).replace(/\.?0+$/, '');
  return s || String(n);
};

const formatCell = (val) => {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return '—';
    return Number.isInteger(val) ? String(val) : String(Math.round(val * 1e6) / 1e6);
  }
  if (typeof val === 'object') return '—';
  return String(val);
};

function resolveRowValue(row, shapKey) {
  if (!row || shapKey == null) return '';
  const tryGet = (k) => {
    if (!Object.prototype.hasOwnProperty.call(row, k)) return undefined;
    const v = row[k];
    if (v !== undefined && v !== null && v !== '') return v;
    return undefined;
  };
  let v = tryGet(shapKey);
  if (v !== undefined) return v;
  const key = String(shapKey).trim();
  v = tryGet(key.replace(/ /g, '_'));
  if (v !== undefined) return v;
  v = tryGet(key.replace(/_/g, ' '));
  if (v !== undefined) return v;
  return '';
}

function normalizePredictedCategory(row) {
  const raw = row.category ?? row.prediction ?? row.predicted_class;
  if (raw === null || raw === undefined || raw === '') return 'Medium';

  if (typeof raw === 'number') {
    if (raw === 1) return 'High';
    if (raw === 0) return 'Low';
    return 'Medium';
  }

  const c = String(raw).trim();
  if (CAT_ORDER.includes(c)) return c;
  const lower = c.toLowerCase();
  if (lower.includes('super') && lower.includes('high')) return 'Super High';
  if (lower === 'high' || lower.endsWith(' high')) return 'High';
  if (lower === 'low' || lower.endsWith(' low')) return 'Low';
  if (lower === 'medium' || lower.includes('medium')) return 'Medium';
  return 'Medium';
}

/**
 * @param {object} row - Merged prediction row (inputs + outputs + shap_values)
 * @param {{ contextLabel?: string, generateKey?: string }} [options]
 * @returns {object|null} shapData for ShapAnalysis-style UI
 */
export function buildLifecycleShapData(row, options = {}) {
  const { contextLabel = 'Customer Lifecycle', generateKey } = options;

  if (!row?.shap_values || typeof row.shap_values !== 'object') return null;

  const entries = Object.entries(row.shap_values).filter(
    ([, v]) => v !== null && v !== undefined && v !== ''
  );

  const features = entries
    .map(([name, impact]) => {
      const n = Number(impact);
      if (!Number.isFinite(n)) return null;
      const rawVal = resolveRowValue(row, name);
      return {
        name: getLifecycleColumnLabel(generateKey, name),
        impact: n,
        value: formatCell(rawVal),
      };
    })
    .filter(Boolean);

  if (!features.length) return null;

  features.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  const top = features.slice(0, 12);
  top.sort((a, b) => {
    if (a.impact >= 0 && b.impact < 0) return -1;
    if (a.impact < 0 && b.impact >= 0) return 1;
    return Math.abs(b.impact) - Math.abs(a.impact);
  });

  const accountId = String(row.Customer_Account ?? row.customer_account ?? '');
  const predictedCategory = normalizePredictedCategory(row);

  let probability = 0.5;
  let primaryMetric = null;
  let probabilityLabel = 'Prediction probability';

  const probRaw = row.probability;
  const hasProb = probRaw !== null && probRaw !== undefined && probRaw !== '';

  if (hasProb) {
    let p = Number(probRaw);
    if (p > 1 && p <= 100) p /= 100;
    if (Number.isFinite(p)) {
      probability = Math.min(1, Math.max(0, p));
    }
    primaryMetric = null;
  } else if (row.predicted_value !== null && row.predicted_value !== undefined && row.predicted_value !== '') {
    const pv = row.predicted_value;
    primaryMetric = {
      label: 'Predicted value',
      value: formatNumber(pv),
    };
    probabilityLabel = 'Predicted value';
  } else {
    primaryMetric = { label: 'Output', value: '—' };
  }

  return {
    facsNumber: accountId,
    predictedCategory,
    categoryDisplayLabel: predictedCategory,
    categoryContextLabel: contextLabel,
    factorContextLabel: '',
    probability,
    primaryMetric,
    probabilityLabel,
    features: top,
    legendHighText: 'Increases predicted output',
    legendLowText: 'Decreases predicted output',
  };
}

export default buildLifecycleShapData;
