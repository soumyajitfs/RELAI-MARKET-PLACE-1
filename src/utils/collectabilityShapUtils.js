/**
 * SHAP utilities for Collectability use case.
 */

const FEATURE_TO_KEY = {
  PLACEMENT_AGE: 'PLACEMENT AGE',
  DAYS_OF_HOSP: 'Days of Hosp',
  ADJ_PLACEMENT_AMOUNT: 'ADJ PLACEMENT AMOUNT',
  INSURANCE_LEVEL_1: 'INSURANCE LEVEL 1',
  FINANCIAL_CLASS: 'FINANCIAL CLASS',
};

const formatValue = (val) => {
  if (val == null || val === '') return '—';
  if (typeof val === 'number') return val % 1 === 0 ? String(val) : val.toFixed(3);
  return String(val);
};

const resolveFeatureValue = (row, feature) => {
  if (row[feature] != null) return row[feature];

  const normalized = feature.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '').toUpperCase();
  const mappedKey = FEATURE_TO_KEY[normalized];
  if (mappedKey && row[mappedKey] != null) return row[mappedKey];

  return null;
};

export const buildCollectabilityShapData = (row) => {
  if (!row || !row.shapValues || row.shapValues.length === 0) return null;

  const features = row.shapValues.map((sv) => ({
    name: sv.feature,
    impact: sv.impact,
    value: formatValue(resolveFeatureValue(row, sv.feature)),
  }));

  features.sort((a, b) => {
    if (a.impact >= 0 && b.impact < 0) return -1;
    if (a.impact < 0 && b.impact >= 0) return 1;
    return Math.abs(b.impact) - Math.abs(a.impact);
  });

  let predictedCategory = 'Low';
  if (row.category === 'High') predictedCategory = 'High';
  else if (row.category === 'Medium') predictedCategory = 'Medium';

  const probability = row.probabilityPercent != null
    ? row.probabilityPercent / 100
    : (row.probability ?? 0);

  return {
    facsNumber: row['CLIENT REFERENCE NUMBER'],
    features,
    predictedCategory,
    probability,
    categoryContextLabel: 'Collectability',
    legendHighText: 'Increases probability toward High Collectability',
    legendLowText: 'Increases probability toward Low Collectability',
  };
};

export default buildCollectabilityShapData;
