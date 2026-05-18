import { LGD_FIELD_RULES, LGD_SHAP_DISPLAY_ORDER } from '../data/lgdFieldRules';
import { formatShapFeatureValueForUi } from './shapDisplayFormat';

const SHAP_FEATURE_ALIASES = {
  ltv: [
    'ltv',
    'LTV',
    'Loan-to-Value Ratio',
    'Loan To Value Ratio',
    'loan_to_value',
    'loan_to_value_ratio',
  ],
  loan_purpose: ['loan_purpose', 'LoanPurpose', 'Loan Purpose', 'loan purpose'],
};

const formatValue = (val) => formatShapFeatureValueForUi(val);

const normKey = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');

const resolveDriverLabel = (rawFeature) => {
  if (!rawFeature) return '—';
  const nk = normKey(rawFeature);
  for (const [key, rule] of Object.entries(LGD_FIELD_RULES)) {
    if (!rule?.label) continue;
    if (normKey(key) === nk) return rule.label;
    const aliases = SHAP_FEATURE_ALIASES[key] || [];
    if (aliases.some((a) => normKey(a) === nk)) return rule.label;
  }
  return String(rawFeature).replace(/_/g, ' ');
};

const formatLoanPurposeDisplay = (val) => {
  const n = Number(val);
  if (n === 0) return 'Purchase (0)';
  if (n === 1) return 'Refinance (1)';
  return formatValue(val);
};

export const buildLgdShapData = (row) => {
  if (!row || typeof row !== 'object') return null;

  const fromTop = Array.isArray(row.top_shap_drivers) ? row.top_shap_drivers : [];
  const fromShap = Array.isArray(row.shap_values) ? row.shap_values : [];
  const fromUiShap = Array.isArray(row.shapValues) ? row.shapValues : [];
  const normalizeEntry = (d) => {
    if (!d?.feature) return null;
    const impact = Number(d.shap_impact ?? d.shap_value ?? d.impact ?? d.contribution);
    return {
      feature: d.feature,
      shap_impact: Number.isFinite(impact) ? impact : 0,
      feature_value: d.feature_value ?? d.value,
    };
  };

  const list = [...fromTop, ...fromShap, ...fromUiShap]
    .map((d) =>
      normalizeEntry(
        typeof d === 'object' && d != null
          ? { feature: d.feature, shap_impact: d.shap_impact ?? d.impact, feature_value: d.feature_value ?? d.value }
          : null
      )
    )
    .filter(Boolean);

  const byNorm = new Map();
  list.forEach((d) => {
    const nk = normKey(d.feature);
    if (nk && nk !== 'const' && nk !== 'intercept') byNorm.set(nk, d);
  });
  /** Also index by canonical input keys via alias table. */
  LGD_SHAP_DISPLAY_ORDER.forEach((canonical) => {
    const aliases = SHAP_FEATURE_ALIASES[canonical] || [canonical];
    for (const alias of aliases) {
      const d = byNorm.get(normKey(alias));
      if (d) byNorm.set(normKey(canonical), d);
    }
  });

  const findDriver = (canonicalKey) => {
    const aliases = SHAP_FEATURE_ALIASES[canonicalKey] || [canonicalKey];
    for (const alias of aliases) {
      const d = byNorm.get(normKey(alias));
      if (d) return d;
    }
    for (const [nk, d] of byNorm) {
      if (aliases.some((a) => normKey(a) === nk)) return d;
    }
    return null;
  };

  /** Only model input features (LTV, loan purpose) — same columns as the edit table. */
  const features = LGD_SHAP_DISPLAY_ORDER.map((key) => {
    const d = findDriver(key) ?? byNorm.get(normKey(key));
    const impact = d != null ? Number(d.shap_impact) : 0;
    let rawVal = d?.feature_value != null && d.feature_value !== '' ? d.feature_value : row[key];
    if (key === 'loan_purpose') rawVal = formatLoanPurposeDisplay(rawVal ?? row.loan_purpose);
    else rawVal = formatValue(rawVal ?? row[key]);
    return {
      name: resolveDriverLabel(key),
      impact: Number.isFinite(impact) ? impact : 0,
      value: rawVal,
    };
  });

  const probability =
    row.lgd_predicted != null
      ? Number(row.lgd_predicted)
      : row.confidence != null
        ? Number(row.confidence)
        : (row.confidencePercent || 0) / 100;

  let pctStr = null;
  if (row.lgd_percent != null && String(row.lgd_percent).trim() !== '') {
    const s = String(row.lgd_percent).trim();
    pctStr = s.includes('%') ? s : `${s}%`;
  } else if (Number.isFinite(probability) && probability >= 0) {
    pctStr = `${(probability * 100).toFixed(2)}%`;
  }

  const chartHeaderLabel = pctStr != null ? `${pctStr} PREDICTED LGD` : 'PREDICTED LGD';

  return {
    facsNumber: row.account_id != null ? String(row.account_id) : '—',
    features,
    predictedCategory: 'Medium',
    themeCategory: 'Medium',
    categoryDisplayLabel: 'Medium',
    chartHeaderLabel,
    probability: Number.isFinite(probability) ? probability : 0,
    categoryContextLabel: 'Mortgage LGD Prediction',
    factorContextLabel: '',
    legendHighText: 'Increases predicted LGD',
    legendLowText: 'Decreases predicted LGD',
    impactLabelsOnRight: true,
    headerLabels: { left: 'Features', center: 'Shap Values', right: 'Feature Values' },
    /** Tighter chart + factor panel when only LTV + loan purpose. */
    compactShap: true,
  };
};

export default buildLgdShapData;
