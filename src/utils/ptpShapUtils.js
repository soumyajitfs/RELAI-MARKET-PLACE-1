import { PTP_FIELD_RULES } from '../data/ptpFieldRules';
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

/**
 * Display label: match full column key, or base categorical + encoded suffix (e.g. ptp_commitment_strength_Vague).
 */
const resolveDriverLabel = (rawFeature) => {
  if (!rawFeature) return '—';
  const nk = normKey(rawFeature);
  for (const [key, rule] of Object.entries(PTP_FIELD_RULES)) {
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

/**
 * Same pattern as mortgage / EWS SHAP: only backend driver rows (here `top_shap_drivers`),
 * with values and impacts exactly as returned by the API.
 */
export const buildPtpShapData = (row) => {
  if (!row || typeof row !== 'object') return null;

  const list = row.top_shap_drivers;
  if (!Array.isArray(list) || list.length === 0) return null;

  const tier = String(row.riskTier || '').toUpperCase();
  /**
   * Match ShapAnalysis layout: Amber uses Medium (3 strongest toward + 3 strongest against).
   * Green / Red use High / Low so we show up to 6 same-direction drivers in a 3+3 grid
   * (Medium alone would leave an empty column when all SHAP impacts share one sign).
   */
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
    return {
      name: resolveDriverLabel(raw),
      impact: Number.isFinite(impact) ? impact : 0,
      value: formatValue(d.feature_value),
    };
  });

  features.sort((a, b) => {
    if (a.impact >= 0 && b.impact < 0) return -1;
    if (a.impact < 0 && b.impact >= 0) return 1;
    return Math.abs(b.impact) - Math.abs(a.impact);
  });

  const tierLabels = { GREEN: 'Green', AMBER: 'Amber', RED: 'Red' };
  const categoryDisplayLabel = tierLabels[tier] || tier || '—';

  const probability = row.confidence != null ? row.confidence : ((row.confidencePercent || 0) / 100);

  return {
    facsNumber: row.ptp_id,
    features,
    predictedCategory,
    themeCategory,
    categoryDisplayLabel,
    probability: Number.isFinite(probability) ? probability : 0,
    categoryContextLabel: 'PTP Adherence',
    factorContextLabel: '',
    legendHighText: 'Increases PTP kept likelihood',
    legendLowText: 'Decreases PTP kept likelihood',
  };
};

export default buildPtpShapData;
