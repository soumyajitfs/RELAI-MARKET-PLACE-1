/**
 * SHAP utilities for Sales Optimization use case.
 */

const FEATURE_TO_KEY = {
  sentimentscore: 'sentimentscore',
  'Num of existing product': 'Num of existing product',
  seasonal_factor: 'seasonal_factor',
  primaryproductoffered: 'primaryproductoffered',
  pitchtype: 'pitchtype',
  escalation_flag: 'escalation_flag',
  compliancescore: 'compliancescore',
  Services: 'Services',
  time_of_day_bucket: 'time_of_day_bucket',
  last_nps: 'last_nps',
  number_of_prior_calls_90d: 'number_of_prior_calls_90d',
  time_since_last_success: 'time_since_last_success',
};

const formatValue = (val) => {
  if (val == null || val === '') return '—';
  if (typeof val === 'number') return val % 1 === 0 ? String(val) : val.toFixed(3);
  return String(val);
};

export const buildSalesShapData = (row) => {
  if (!row || !row.shapValues || row.shapValues.length === 0) return null;

  const features = row.shapValues.map((sv) => {
    const key = FEATURE_TO_KEY[sv.feature] || sv.feature;
    return {
      name: sv.feature,
      impact: sv.impact,
      value: formatValue(row[key]),
    };
  });

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
    facsNumber: row.Customer_Account,
    features,
    predictedCategory,
    probability,
    categoryContextLabel: 'Conversion Likelihood',
    legendHighText: 'Increases probability toward High Conversion Likelihood',
    legendLowText: 'Increases probability toward Low Conversion Likelihood',
  };
};

export default buildSalesShapData;
