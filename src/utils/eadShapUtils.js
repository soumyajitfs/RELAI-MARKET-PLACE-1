import { EAD_FIELD_RULES, EAD_SHAP_DISPLAY_ORDER } from '../data/eadFieldRules';
import { formatShapFeatureValueForUi } from './shapDisplayFormat';

const formatValue = (val) => formatShapFeatureValueForUi(val);

const prettifyFeatureName = (feature) => {
  if (!feature) return '—';
  return String(feature).replace(/_/g, ' ');
};

const normKey = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

const resolveDriverLabel = (rawFeature) => {
  if (!rawFeature) return '—';
  const nk = normKey(rawFeature);
  if (nk === 'const' || nk === 'intercept') return 'Intercept';
  for (const [key, rule] of Object.entries(EAD_FIELD_RULES)) {
    if (!rule?.label) continue;
    if (normKey(key) === nk) return rule.label;
    const prefix = `${normKey(key)}_`;
    if (nk.startsWith(prefix)) {
      const suffix = rawFeature.slice(key.length + 1).replace(/_/g, ' ');
      return `${rule.label} (${suffix})`;
    }
  }
  return prettifyFeatureName(rawFeature);
};

export const buildEadShapData = (row) => {
  if (!row || typeof row !== 'object') return null;

  const fromTop = Array.isArray(row.top_shap_drivers) ? row.top_shap_drivers : [];
  const fromShap = Array.isArray(row.shap_values)
    ? row.shap_values
    : Array.isArray(row.shape_values)
      ? row.shape_values
      : [];
  const list =
    fromTop.length > 0
      ? fromTop.map((d) => ({
          feature: d.feature,
          shap_impact: Number(d.shap_impact ?? d.shap_value ?? d.SHAP_value ?? 0),
          feature_value: d.feature_value ?? d.value ?? row[d.feature],
        }))
      : fromShap.map((d) => ({
          feature: d.feature,
          shap_impact: Number(d.shap_impact ?? d.shap_value ?? d.SHAP_value ?? 0),
          feature_value: d.feature_value ?? d.value ?? row[d.feature],
        }));

  if (!Array.isArray(list) || list.length === 0) return null;

  const byNorm = new Map();
  list.forEach((d) => {
    const nk = normKey(d.feature);
    if (nk && nk !== 'const' && nk !== 'intercept') byNorm.set(nk, d);
  });

  const usedNorm = new Set();

  const features = EAD_SHAP_DISPLAY_ORDER.map((key) => {
    const nk = normKey(key);
    usedNorm.add(nk);
    const d = byNorm.get(nk);
    const impact = d != null ? Number(d.shap_impact) : 0;
    const rawVal = d?.feature_value != null && d.feature_value !== '' ? d.feature_value : row[key];
    return {
      name: resolveDriverLabel(key),
      impact: Number.isFinite(impact) ? impact : 0,
      value: formatValue(rawVal),
    };
  });

  list.forEach((d) => {
    const nk = normKey(d.feature);
    if (!nk || nk === 'const' || nk === 'intercept') return;
    if (usedNorm.has(nk)) return;
    usedNorm.add(nk);
    const impact = Number(d.shap_impact);
    const rawVal = d.feature_value != null && d.feature_value !== '' ? d.feature_value : row[d.feature];
    features.push({
      name: resolveDriverLabel(d.feature),
      impact: Number.isFinite(impact) ? impact : 0,
      value: formatValue(rawVal),
    });
  });

  const probability =
    row.confidence != null
      ? row.confidence
      : row.expected_ccf != null
        ? Number(row.expected_ccf)
        : (row.confidencePercent || 0) / 100;

  const pctStr = Number.isFinite(probability) && probability >= 0 ? (probability * 100).toFixed(2) : null;

  /** Match other use cases: tier-style label for badge + TOP … FACTORS (not the raw % string). */
  const categoryDisplayLabel = 'Medium';
  const themeCategory = 'Medium';
  const predictedCategory = 'Medium';

  /** ShapChart center header (same role as PD tier name in uppercase). */
  const chartHeaderLabel = pctStr != null ? `${pctStr}% EXPECTED CCF` : 'EXPECTED CCF';

  return {
    facsNumber: row.Customer_ID != null ? String(row.Customer_ID) : '—',
    features,
    predictedCategory,
    themeCategory,
    categoryDisplayLabel,
    chartHeaderLabel,
    probability: Number.isFinite(probability) ? probability : 0,
    categoryContextLabel: 'Credit Card EAD Prediction',
    factorContextLabel: '',
    legendHighText: 'Increases predicted CCF contribution',
    legendLowText: 'Decreases predicted CCF contribution',
    /** SHAP pills to the right of x=0 so small negatives do not sit on the axis line. */
    impactLabelsOnRight: true,
    headerLabels: { left: 'Features', center: 'Shap Values', right: 'Feature Values' },
  };
};
