import {
  RETAIL_LOAN_LGD_FIELD_RULES,
  RETAIL_LOAN_LGD_SHAP_DISPLAY_ORDER,
  RETAIL_LOAN_LGD_SHAP_FEATURE_ALIASES,
} from '../data/retailLoanLgdFieldRules';
import { resolveFinalBaselLgd, formatFinalBaselLgdPercent, resolvePcure } from './retailLoanLgdApi';
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
  Object.entries(RETAIL_LOAN_LGD_FIELD_RULES).forEach(([key, rule]) => {
    add(key, key);
    if (rule?.label) add(rule.label, key);
  });
  Object.entries(RETAIL_LOAN_LGD_SHAP_FEATURE_ALIASES).forEach(([canonical, aliases]) => {
    add(canonical, canonical);
    (aliases || []).forEach((a) => add(a, canonical));
  });
  return index;
};

const CANONICAL_INDEX = buildCanonicalIndex();

const getRowField = (row, key) => {
  if (!row || key == null) return null;
  const direct = row[key];
  if (direct != null && direct !== '') return direct;
  const rule = RETAIL_LOAN_LGD_FIELD_RULES[key];
  if (rule?.label) {
    const byLabel = row[rule.label];
    if (byLabel != null && byLabel !== '') return byLabel;
  }
  return null;
};

const formatRowValueForShap = (key, rawVal) => {
  if (rawVal == null || rawVal === '') return '—';
  const rule = RETAIL_LOAN_LGD_FIELD_RULES[key];
  if (rule?.type === 'discrete' && rule.optionLabels) {
    const n = Number(rawVal);
    if (Number.isFinite(n) && rule.optionLabels[n] != null) return rule.optionLabels[n];
  }
  if (key === 'employment_type') return String(rawVal);
  if (key === 'interest_rate' || key === 'dti' || key === 'contactability_score') {
    const n = Number(rawVal);
    if (Number.isFinite(n)) return n.toFixed(4);
  }
  return formatValue(rawVal);
};

const collectShapDrivers = (row) => {
  const fromTop = Array.isArray(row.top_shap_drivers) ? row.top_shap_drivers : [];
  const fromStage2 = Array.isArray(row.shap_stage2) ? row.shap_stage2 : [];
  const fromStage1 = Array.isArray(row.shap_stage1) ? row.shap_stage1 : [];
  const fromShap = Array.isArray(row.shap_values) ? row.shap_values : [];
  const fromUi = Array.isArray(row.shapValues) ? row.shapValues : [];

  const normalizeEntry = (d) => {
    if (!d?.feature) return null;
    const impact = Number(d.shap_impact ?? d.shap_value ?? d.impact ?? d.contribution);
    return { feature: d.feature, shap_impact: Number.isFinite(impact) ? impact : 0 };
  };

  const list = [...fromTop, ...fromStage2, ...fromStage1, ...fromShap, ...fromUi]
    .map((d) =>
      normalizeEntry(
        typeof d === 'object' && d != null
          ? { feature: d.feature, shap_impact: d.shap_impact ?? d.impact }
          : null,
      ),
    )
    .filter(Boolean);

  return list;
};

const buildImpactIndex = (drivers) => {
  const byNorm = new Map();
  drivers.forEach((d) => {
    const nk = normKey(d.feature);
    if (nk && nk !== 'const' && nk !== 'intercept') byNorm.set(nk, d);
  });

  RETAIL_LOAN_LGD_SHAP_DISPLAY_ORDER.forEach((canonical) => {
    const aliases = [
      canonical,
      ...(RETAIL_LOAN_LGD_SHAP_FEATURE_ALIASES[canonical] || []),
      RETAIL_LOAN_LGD_FIELD_RULES[canonical]?.label,
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
    ...(RETAIL_LOAN_LGD_SHAP_FEATURE_ALIASES[canonicalKey] || []),
    RETAIL_LOAN_LGD_FIELD_RULES[canonicalKey]?.label,
  ].filter(Boolean);
  for (const alias of aliases) {
    const d = byNorm.get(normKey(alias));
    if (d) return Number(d.shap_impact);
  }
  return 0;
};

export const buildRetailLoanLgdShapData = (row) => {
  if (!row || typeof row !== 'object') return null;

  const drivers = collectShapDrivers(row);
  const byNorm = buildImpactIndex(drivers);

  const features = RETAIL_LOAN_LGD_SHAP_DISPLAY_ORDER.map((key) => {
    const impact = findDriverImpact(byNorm, key);
    const rawVal = getRowField(row, key);
    const rule = RETAIL_LOAN_LGD_FIELD_RULES[key];
    return {
      name: rule?.label ?? key,
      impact: Number.isFinite(impact) ? impact : 0,
      value: formatRowValueForShap(key, rawVal),
    };
  });

  const lgd = resolveFinalBaselLgd(row);
  const lgdPct = formatFinalBaselLgdPercent(row);
  const pCure = resolvePcure(row);
  const pCureLabel = pCure != null && Number.isFinite(pCure) ? `${(pCure * 100).toFixed(2)}%` : null;

  return {
    facsNumber: row.loan_id != null ? String(row.loan_id) : '—',
    features,
    predictedCategory: 'Medium',
    themeCategory: 'Medium',
    categoryDisplayLabel: 'Medium',
    chartHeaderLabel: lgdPct !== '—' ? `${lgdPct} PREDICTED LGD` : 'PREDICTED LGD',
    probability: lgd != null && Number.isFinite(lgd) ? lgd : 0,
    probabilityDisplay: lgdPct,
    categoryContextLabel: 'Retail Loan LGD Prediction',
    factorContextLabel: pCureLabel ? `(P cure ${pCureLabel})` : '',
    legendHighText: 'Increases predicted LGD',
    legendLowText: 'Decreases predicted LGD',
    impactLabelsOnRight: true,
    headerLabels: { left: 'Features', center: 'Shap Values', right: 'Feature Values' },
  };
};

export default buildRetailLoanLgdShapData;
