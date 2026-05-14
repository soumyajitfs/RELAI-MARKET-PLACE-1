import { PD_FIELD_RULES } from '../data/pdFieldRules';
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
  for (const [key, rule] of Object.entries(PD_FIELD_RULES)) {
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

export const buildPdShapData = (row) => {
  if (!row || typeof row !== 'object') return null;

  const fromTop = Array.isArray(row.top_shap_drivers) ? row.top_shap_drivers : [];
  const fromShap = Array.isArray(row.shap_values) ? row.shap_values : [];
  const list =
    fromTop.length > 0
      ? fromTop.map((d) => ({
          feature: d.feature,
          shap_impact: Number(d.shap_impact ?? d.shap_value ?? 0),
          feature_value: d.feature_value ?? d.value ?? row[d.feature],
        }))
      : fromShap.map((d) => ({
          feature: d.feature,
          shap_impact: Number(d.shap_impact ?? d.shap_value ?? 0),
          feature_value: d.feature_value ?? d.value ?? row[d.feature],
        }));

  if (!Array.isArray(list) || list.length === 0) return null;

  const tier = String(row.riskTier || '').toUpperCase();
  let predictedCategory = 'Medium';
  let themeCategory = 'Medium';
  if (tier === 'GREEN') {
    predictedCategory = 'High';
    themeCategory = 'High';
  } else if (tier === 'RED') {
    predictedCategory = 'Low';
    themeCategory = 'Low';
  }

  const features = list.map((d) => {
    const raw = d.feature;
    const impact = Number(d.shap_impact);
    const rawVal = d.feature_value != null && d.feature_value !== '' ? d.feature_value : row[raw];
    return {
      name: resolveDriverLabel(raw),
      impact: Number.isFinite(impact) ? impact : 0,
      value: formatValue(rawVal),
    };
  });

  features.sort((a, b) => {
    if (a.impact >= 0 && b.impact < 0) return -1;
    if (a.impact < 0 && b.impact >= 0) return 1;
    return Math.abs(b.impact) - Math.abs(a.impact);
  });

  const tierLabels = { GREEN: 'Green', AMBER: 'Amber', RED: 'Red' };
  const categoryDisplayLabel = tierLabels[tier] || tier || '—';

  const probability =
    row.confidence != null
      ? row.confidence
      : row.pd_probability != null
        ? Number(row.pd_probability)
        : (row.confidencePercent || 0) / 100;

  return {
    facsNumber: row.account_id,
    features,
    predictedCategory,
    themeCategory,
    categoryDisplayLabel,
    probability: Number.isFinite(probability) ? probability : 0,
    categoryContextLabel: 'Borrower Default Prediction',
    factorContextLabel: '',
    legendHighText: 'Increases probability of default',
    legendLowText: 'Decreases probability of default',
  };
};

export default buildPdShapData;
