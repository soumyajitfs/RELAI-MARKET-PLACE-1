import {
  PERSONAL_LOAN_EAD_FIELD_RULES,
  PERSONAL_LOAN_EAD_SHAP_DISPLAY_ORDER,
  PERSONAL_LOAN_EAD_SHAP_FEATURE_ALIASES,
} from '../data/personalLoanEadFieldRules';
import { resolvePredictedKFactor } from './personalLoanEadApi';
import { formatShapFeatureValueForUi } from './shapDisplayFormat';

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

  Object.entries(PERSONAL_LOAN_EAD_FIELD_RULES).forEach(([key, rule]) => {
    add(key, key);
    if (rule?.label) add(rule.label, key);
  });

  Object.entries(PERSONAL_LOAN_EAD_SHAP_FEATURE_ALIASES).forEach(([canonical, aliases]) => {
    add(canonical, canonical);
    (aliases || []).forEach((a) => add(a, canonical));
  });

  return index;
};

const CANONICAL_INDEX = buildCanonicalIndex();

const resolveCanonicalKey = (rawFeature) => {
  if (!rawFeature) return null;
  return CANONICAL_INDEX.get(normKey(rawFeature)) ?? null;
};

const getRowField = (row, key) => {
  if (!row || key == null) return null;

  const direct = row[key];
  if (direct != null && direct !== '') return direct;

  const rule = PERSONAL_LOAN_EAD_FIELD_RULES[key];
  if (rule?.label) {
    const byLabel = row[rule.label];
    if (byLabel != null && byLabel !== '') return byLabel;
  }

  const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  const pascal = camel.charAt(0).toUpperCase() + camel.slice(1);
  for (const alt of [camel, pascal, key.toUpperCase()]) {
    const v = row[alt];
    if (v != null && v !== '') return v;
  }

  return null;
};

const formatRowValueForShap = (key, rawVal) => {
  if (rawVal == null || rawVal === '') return '—';

  const rule = PERSONAL_LOAN_EAD_FIELD_RULES[key];

  if (rule?.type === 'discrete' && rule.optionLabels) {
    const n = Number(rawVal);
    if (Number.isFinite(n) && rule.optionLabels[n] != null) return rule.optionLabels[n];
  }

  if (key === 'employment_type') return String(rawVal);

  if (key === 'interest_rate') {
    const n = Number(rawVal);
    if (Number.isFinite(n)) return n.toFixed(4);
  }

  return formatValue(rawVal);
};

const formatInr = (n) => {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n));
};

const collectShapDrivers = (row) => {
  const fromTop = Array.isArray(row.top_shap_drivers) ? row.top_shap_drivers : [];
  const fromShap = Array.isArray(row.shap_values)
    ? row.shap_values
    : Array.isArray(row.shape_values)
      ? row.shape_values
      : [];
  const fromUi = Array.isArray(row.shapValues) ? row.shapValues : [];

  const normalizeEntry = (d) => {
    if (!d?.feature) return null;
    const impact = Number(d.shap_impact ?? d.shap_value ?? d.impact ?? d.contribution);
    return {
      feature: d.feature,
      shap_impact: Number.isFinite(impact) ? impact : 0,
    };
  };

  return [...fromTop, ...fromShap, ...fromUi]
    .map((d) =>
      normalizeEntry(
        typeof d === 'object' && d != null
          ? { feature: d.feature, shap_impact: d.shap_impact ?? d.impact }
          : null,
      ),
    )
    .filter(Boolean);
};

const buildImpactIndex = (drivers) => {
  const byNorm = new Map();
  drivers.forEach((d) => {
    const nk = normKey(d.feature);
    if (nk && nk !== 'const' && nk !== 'intercept') byNorm.set(nk, d);
  });

  PERSONAL_LOAN_EAD_SHAP_DISPLAY_ORDER.forEach((canonical) => {
    const aliases = [
      canonical,
      ...(PERSONAL_LOAN_EAD_SHAP_FEATURE_ALIASES[canonical] || []),
      PERSONAL_LOAN_EAD_FIELD_RULES[canonical]?.label,
    ].filter(Boolean);
    for (const alias of aliases) {
      const d = byNorm.get(normKey(alias));
      if (d) {
        byNorm.set(normKey(canonical), d);
        break;
      }
    }
  });

  return byNorm;
};

const findDriverImpact = (byNorm, canonicalKey) => {
  const aliases = [
    canonicalKey,
    ...(PERSONAL_LOAN_EAD_SHAP_FEATURE_ALIASES[canonicalKey] || []),
    PERSONAL_LOAN_EAD_FIELD_RULES[canonicalKey]?.label,
  ].filter(Boolean);
  for (const alias of aliases) {
    const d = byNorm.get(normKey(alias));
    if (d) return Number(d.shap_impact);
  }
  const d = byNorm.get(normKey(canonicalKey));
  return d != null ? Number(d.shap_impact) : 0;
};

export const buildPersonalLoanEadShapData = (row) => {
  if (!row || typeof row !== 'object') return null;

  const drivers = collectShapDrivers(row);
  const byNorm = buildImpactIndex(drivers);

  const features = PERSONAL_LOAN_EAD_SHAP_DISPLAY_ORDER.map((key) => {
    const impact = findDriverImpact(byNorm, key);
    const rawVal = getRowField(row, key);
    const rule = PERSONAL_LOAN_EAD_FIELD_RULES[key];

    return {
      name: rule?.label ?? key,
      impact: Number.isFinite(impact) ? impact : 0,
      value: formatRowValueForShap(key, rawVal),
    };
  });

  const kFactor = resolvePredictedKFactor(row);
  const kLabel = kFactor != null && Number.isFinite(kFactor) ? kFactor.toFixed(4) : '—';
  const eadDisplay = formatInr(row.predicted_ead);

  return {
    facsNumber: row.loan_id != null ? String(row.loan_id) : '—',
    features,
    predictedCategory: 'Medium',
    themeCategory: 'Medium',
    categoryDisplayLabel: 'Medium',
    chartHeaderLabel: `K-FACTOR ${kLabel}`,
    probability: Number.isFinite(kFactor) ? kFactor : 0,
    probabilityDisplay: eadDisplay,
    categoryContextLabel: 'Personal Loan EAD Prediction',
    factorContextLabel: '',
    legendHighText: 'Increases predicted K (higher EAD)',
    legendLowText: 'Decreases predicted K (lower EAD)',
    impactLabelsOnRight: true,
    headerLabels: { left: 'Features', center: 'Shap Values', right: 'Feature Values' },
  };
};

export default buildPersonalLoanEadShapData;
