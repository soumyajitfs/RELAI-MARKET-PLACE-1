import {
  APPLICATION_SCORECARD_FIELD_RULES,
  APPLICATION_SCORECARD_SHAP_FEATURE_ALIASES,
} from '../data/applicationScorecardFieldRules';
import { formatScorecardScore, resolveScorecardScore } from './applicationScorecardApi';
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
  Object.entries(APPLICATION_SCORECARD_FIELD_RULES).forEach(([key, rule]) => {
    add(key, key);
    if (rule?.label) add(rule.label, key);
  });
  Object.entries(APPLICATION_SCORECARD_SHAP_FEATURE_ALIASES).forEach(([canonical, aliases]) => {
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
  const rule = APPLICATION_SCORECARD_FIELD_RULES[key];
  if (rule?.label) {
    const byLabel = row[rule.label];
    if (byLabel != null && byLabel !== '') return byLabel;
  }
  return null;
};

const formatRowValueForShap = (key, rawVal) => {
  if (rawVal == null || rawVal === '') return '—';
  const rule = APPLICATION_SCORECARD_FIELD_RULES[key];
  if (rule?.type === 'discrete' && rule.optionLabels) {
    const n = Number(rawVal);
    if (Number.isFinite(n) && rule.optionLabels[n] != null) return rule.optionLabels[n];
  }
  if (key === 'dti') {
    const n = Number(rawVal);
    if (Number.isFinite(n)) return n.toFixed(4);
  }
  if (key === 'cibil' && Number(rawVal) === -1) return 'No-hit (-1)';
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
    };
  };

  const merged = [...fromShap, ...fromTop, ...fromUi]
    .map((d) =>
      normalizeEntry(
        typeof d === 'object' && d != null
          ? { feature: d.feature, shap_impact: d.shap_impact ?? d.impact }
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

const decisionToTheme = (decision) => {
  const d = String(decision || '').toLowerCase();
  if (d.includes('decline')) {
    return { predictedCategory: 'Low', themeCategory: 'Low', categoryDisplayLabel: 'Decline' };
  }
  if (d.includes('prime') || d.includes('approve')) {
    return { predictedCategory: 'High', themeCategory: 'High', categoryDisplayLabel: decision || 'Approve' };
  }
  if (d.includes('refer')) {
    return { predictedCategory: 'Medium', themeCategory: 'Medium', categoryDisplayLabel: 'Refer' };
  }
  return { predictedCategory: 'Medium', themeCategory: 'Medium', categoryDisplayLabel: decision || 'Medium' };
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
    const rule = canonical ? APPLICATION_SCORECARD_FIELD_RULES[canonical] : null;

    features.push({
      name: rule?.label ?? String(d.feature),
      impact: d.shap_impact,
      value: canonical ? formatRowValueForShap(canonical, rawVal) : '—',
    });
  }

  return features;
};

export const buildApplicationScorecardShapData = (row) => {
  if (!row || typeof row !== 'object') return null;

  const drivers = collectShapDrivers(row);
  if (drivers.length === 0) return null;

  const features = buildTopFeatures(row, drivers);
  if (features.length === 0) return null;

  const score = resolveScorecardScore(row);
  const scoreDisplay = formatScorecardScore(row);
  const decision = row.decision != null ? String(row.decision).trim() : '';
  const theme = decisionToTheme(decision);

  return {
    facsNumber: row.app_id != null ? String(row.app_id) : '—',
    features,
    predictedCategory: theme.predictedCategory,
    themeCategory: theme.themeCategory,
    categoryDisplayLabel: theme.categoryDisplayLabel,
    chartHeaderLabel: scoreDisplay !== '—' ? `${scoreDisplay} SCORE` : 'SCORECARD SCORE',
    probability: score != null && Number.isFinite(score) ? score / 900 : 0,
    probabilityDisplay: scoreDisplay,
    categoryContextLabel: 'Application Scorecard',
    factorContextLabel: '',
    legendHighText: 'Increases score (lower risk)',
    legendLowText: 'Decreases score (higher risk)',
    invertShapImpactColors: true,
    headerLabels: { left: 'Features', center: 'Shap Values', right: 'Feature Values' },
  };
};

export default buildApplicationScorecardShapData;
