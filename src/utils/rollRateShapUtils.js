import {
  ROLL_RATE_FIELD_RULES,
  ROLL_RATE_SHAP_FEATURE_ALIASES,
} from '../data/rollRateFieldRules';
import { formatPrimaryProbPct, ragColor, resolvePrimaryProb, resolveRagRating } from './rollRateApi';
import { formatShapFeatureValueForUi } from './shapDisplayFormat';

const SHAP_FACTOR_LIMIT = 6;

const formatValue = (val) => formatShapFeatureValueForUi(val);

const normKey = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .replace(/[()]/g, '');

const buildCanonicalIndex = () => {
  const index = new Map();
  const add = (alias, canonical) => {
    const nk = normKey(alias);
    if (nk && !index.has(nk)) index.set(nk, canonical);
  };
  Object.entries(ROLL_RATE_FIELD_RULES).forEach(([key, rule]) => {
    add(key, key);
    if (rule?.label) add(rule.label, key);
  });
  Object.entries(ROLL_RATE_SHAP_FEATURE_ALIASES).forEach(([canonical, aliases]) => {
    add(canonical, canonical);
    (aliases || []).forEach((a) => add(a, canonical));
  });
  return index;
};

const CANONICAL_INDEX = buildCanonicalIndex();

const resolveCanonicalKey = (rawFeature) => {
  if (!rawFeature) return null;
  const nk = normKey(rawFeature);
  if (CANONICAL_INDEX.has(nk)) return CANONICAL_INDEX.get(nk);
  return null;
};

const getRowField = (row, key) => {
  if (!row || key == null) return null;
  const direct = row[key];
  if (direct != null && direct !== '') return direct;
  const rule = ROLL_RATE_FIELD_RULES[key];
  if (rule?.label) {
    const byLabel = row[rule.label];
    if (byLabel != null && byLabel !== '') return byLabel;
  }
  return null;
};

const formatRowValueForShap = (key, rawVal, driver) => {
  if (driver?.feature_value != null && driver.feature_value !== '') {
    return formatValue(driver.feature_value);
  }
  if (rawVal == null || rawVal === '') return '—';
  const rule = ROLL_RATE_FIELD_RULES[key];
  if (rule?.type === 'discrete' && rule.optionLabels) {
    const n = Number(rawVal);
    if (Number.isFinite(n) && rule.optionLabels[n] != null) return rule.optionLabels[n];
  }
  if (rule?.type === 'enum') return String(rawVal);
  return formatValue(rawVal);
};

const collectShapDrivers = (row) => {
  const fromTop = Array.isArray(row.top_shap_drivers) ? row.top_shap_drivers : [];
  const fromShap = Array.isArray(row.shap_values) ? row.shap_values : [];
  const fromUi = Array.isArray(row.shapValues) ? row.shapValues : [];

  const normalizeEntry = (d) => {
    if (!d?.feature) return null;
    const impact = Number(d.shap_impact ?? d.shap_value ?? d.impact ?? d.contribution);
    return {
      feature: d.feature,
      shap_impact: Number.isFinite(impact) ? impact : 0,
      feature_value: d.feature_value ?? d.value,
      direction: d.direction,
    };
  };

  const merged = [...fromTop, ...fromShap, ...fromUi]
    .map((d) =>
      normalizeEntry(
        typeof d === 'object' && d != null
          ? {
              feature: d.feature,
              shap_impact: d.shap_impact ?? d.impact,
              feature_value: d.feature_value,
              direction: d.direction,
            }
          : null,
      ),
    )
    .filter(Boolean);

  const byFeature = new Map();
  merged.forEach((d) => {
    const nk = normKey(d.feature);
    const prev = byFeature.get(nk);
    if (!prev || Math.abs(d.shap_impact) > Math.abs(prev.shap_impact)) {
      byFeature.set(nk, d);
    }
  });

  return [...byFeature.values()].sort((a, b) => Math.abs(b.shap_impact) - Math.abs(a.shap_impact));
};

const ragToTheme = (rag) => {
  const r = String(rag || '').toLowerCase();
  if (r === 'green') {
    return { predictedCategory: 'High', themeCategory: 'High', categoryDisplayLabel: 'Green' };
  }
  if (r === 'red') {
    return { predictedCategory: 'Low', themeCategory: 'Low', categoryDisplayLabel: 'Red' };
  }
  return { predictedCategory: 'Medium', themeCategory: 'Medium', categoryDisplayLabel: rag || 'Amber' };
};

const buildTopFeatures = (row, drivers) => {
  const seen = new Set();
  const features = [];

  for (const d of drivers) {
    if (features.length >= SHAP_FACTOR_LIMIT) break;
    const canonical = resolveCanonicalKey(d.feature);
    const dedupeKey = canonical ?? normKey(d.feature);
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const rawVal = canonical ? getRowField(row, canonical) : null;
    const rule = canonical ? ROLL_RATE_FIELD_RULES[canonical] : null;

    features.push({
      name: rule?.label ?? String(d.feature),
      impact: d.shap_impact,
      value: canonical ? formatRowValueForShap(canonical, rawVal, d) : formatValue(d.feature_value),
    });
  }

  return features;
};

export const buildRollRateShapData = (row) => {
  if (!row || typeof row !== 'object') return null;

  const drivers = collectShapDrivers(row);
  if (drivers.length === 0) return null;

  const features = buildTopFeatures(row, drivers);
  if (features.length === 0) return null;

  const rag = resolveRagRating(row);
  const theme = ragToTheme(rag);
  const probDisplay = formatPrimaryProbPct(row);
  const prob = resolvePrimaryProb(row);
  const bucket = row.starting_dpd_bucket;

  return {
    facsNumber: row.account_id != null ? String(row.account_id) : '—',
    features,
    predictedCategory: theme.predictedCategory,
    themeCategory: theme.themeCategory,
    categoryDisplayLabel: theme.categoryDisplayLabel,
    chartHeaderLabel: rag ? `${String(rag).toUpperCase()} RAG` : 'ROLL RATE',
    probability: prob != null && Number.isFinite(prob) ? prob : 0,
    probabilityDisplay: probDisplay,
    categoryContextLabel: 'Roll Rate Prediction Score',
    factorContextLabel: bucket != null ? `(Bucket ${bucket})` : '',
    legendHighText: 'Decreases roll-forward risk (positive signal)',
    legendLowText: 'Increases roll-forward risk (negative signal)',
    invertShapImpactColors: true,
    headerLabels: { left: 'Features', center: 'Shap Values', right: 'Feature Values' },
    ragColor: ragColor(rag),
  };
};

export default buildRollRateShapData;
