import { EWS_FIELD_RULES } from '../data/ewsFieldRules';

const formatValue = (val) => {
  if (val == null || val === '') return '—';
  if (typeof val === 'number') return val % 1 === 0 ? String(val) : val.toFixed(4);
  return String(val);
};

const prettifyFeatureName = (feature) => {
  if (!feature) return '—';
  return String(feature).replace(/_/g, ' ');
};

const OUTPUT_UI_KEYS = new Set(['__rowId', 'riskTier', 'confidence', 'confidencePercent', 'shapValues']);

const normKey = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

/** snake_case row key → row key (for SHAP feature string lookup). */
const buildNormToRowKey = (row) => {
  const map = new Map();
  if (!row || typeof row !== 'object') return map;
  for (const k of Object.keys(row)) {
    if (OUTPUT_UI_KEYS.has(k)) continue;
    map.set(normKey(k), k);
  }
  return map;
};

/**
 * Map a SHAP `feature` string from the API to a row column key (same approach as mortgage underwriting).
 */
const resolveRowKeyForShapFeature = (row, featureRaw, normToKey) => {
  if (row == null || featureRaw == null) return null;
  const fr = String(featureRaw).trim();
  if (fr === '') return null;

  if (Object.prototype.hasOwnProperty.call(row, fr) && row[fr] !== undefined) {
    return fr;
  }

  const n = normKey(fr);
  if (normToKey.has(n)) return normToKey.get(n);

  const underscored = normKey(fr.replace(/\s+/g, '_'));
  if (normToKey.has(underscored)) return normToKey.get(underscored);

  const tokens = n.split('_').filter(Boolean);
  for (let len = tokens.length; len >= 1; len -= 1) {
    const prefix = tokens.slice(0, len).join('_');
    if (normToKey.has(prefix)) return normToKey.get(prefix);
  }

  return null;
};

const readShapImpact = (sv) => {
  const n = Number(sv?.impact ?? sv?.shap_value ?? sv?.ShapValue ?? sv?.shap);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Same contract as mortgage / RPC: only SHAP rows returned by the API, sorted like other use cases.
 * Display names prefer `EWS_FIELD_RULES` labels when the SHAP feature resolves to a row key.
 */
export const buildEwsShapData = (row) => {
  if (!row || !Array.isArray(row.shapValues) || row.shapValues.length === 0) return null;

  const normToKey = buildNormToRowKey(row);

  const features = row.shapValues.map((sv) => {
    const rawFeature = sv?.feature ?? sv?.Feature ?? sv?.name;
    const rowKey = resolveRowKeyForShapFeature(row, rawFeature, normToKey);
    const impact = readShapImpact(sv);
    const label =
      rowKey && EWS_FIELD_RULES[rowKey]?.label
        ? EWS_FIELD_RULES[rowKey].label
        : prettifyFeatureName(rawFeature);
    const cellValue = rowKey != null ? row[rowKey] : null;

    return {
      name: label,
      impact,
      value: formatValue(cellValue),
    };
  });

  features.sort((a, b) => {
    if (a.impact >= 0 && b.impact < 0) return -1;
    if (a.impact < 0 && b.impact >= 0) return 1;
    return Math.abs(b.impact) - Math.abs(a.impact);
  });

  const tier = String(row.riskTier || '').toUpperCase();
  let predictedCategory = 'Medium';
  if (tier === 'GREEN') predictedCategory = 'High';
  if (tier === 'RED') predictedCategory = 'Low';

  const tierLabels = { GREEN: 'Green', AMBER: 'Amber', RED: 'Red' };
  const categoryDisplayLabel = tierLabels[tier] || tier || '—';

  const probability = row.confidence != null ? row.confidence : ((row.confidencePercent || 0) / 100);

  return {
    facsNumber: row.account_id,
    features,
    predictedCategory,
    categoryDisplayLabel,
    probability: Number.isFinite(probability) ? probability : 0,
    categoryContextLabel: 'EWS Risk Tier',
    factorContextLabel: '',
    /** EWS: positive SHAP = higher stress → red; negative = lower stress → green. */
    invertShapImpactColors: true,
    legendHighText: 'Green increases probability of low risk',
    legendLowText: 'Red increases probability of high risk',
  };
};

export default buildEwsShapData;
