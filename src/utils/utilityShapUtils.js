/**
 * Utility SHAP data builder.
 * Converts the raw API SHAP values into the format expected by the ShapAnalysis component.
 */

// Mapping from API SHAP feature names → account field keys
const UTILITY_FEATURE_TO_KEY = {
  'TU Score':              'tuScore',
  'Arrears Balance':       'arrearsBalance',
  'Complaint Count':       'complaintCount',
  'RPC Success Ratio':     'rpcSuccessRatio',
  'PTP Broken Count':      'ptpBrokenCount',
  'PTP Kept Count':        'ptpKeptCount',
  'Delinquency Count':     'delinquencyCount12m',
  'Budget Billing':        'budgetBillingFlag',
  'Max Days Past Due':     'maxDpd12m',
  'Arrangement Enrolled':  'arrangementEnrolledFlag',
  'Low Income':            'lowIncomeFlag',
  'Payment Channel':       'paymentChannelPrimary',
  'On-Time Payments':      'pctOnTimePayments12m',
};

// Format display value for utility features
const formatUtilityValue = (key, rawValue) => {
  if (rawValue == null) return '—';
  if (key === 'arrearsBalance') return `$${Number(rawValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (key === 'pctOnTimePayments12m' || key === 'rpcSuccessRatio') return `${(rawValue * 100).toFixed(0)}%`;
  return String(rawValue);
};

/**
 * Build shapData object for a utility account (after model output is available).
 *
 * @param {Object} account - Utility account with prediction output + shapValues
 * @returns {Object|null} shapData matching the ShapAnalysis component props shape:
 *   { facsNumber, predictedCategory, probability, features, baseValue, shapSum, logOdds }
 */
export const buildUtilityShapData = (account) => {
  if (!account || account.probabilityPercent == null) return null;
  if (!account.shapValues || account.shapValues.length === 0) return null;

  // Build features array from API SHAP values
  let features = account.shapValues.map(sv => {
    const fieldKey = UTILITY_FEATURE_TO_KEY[sv.feature] || null;
    const rawValue = fieldKey ? account[fieldKey] : '';
    return {
      name: sv.feature,             // Already a display-friendly name from API
      impact: sv.impact,
      value: fieldKey ? formatUtilityValue(fieldKey, rawValue) : String(rawValue),
    };
  });

  // Sort by absolute impact descending, keep top 12
  features.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  features = features.slice(0, 12);

  // Sort: green (positive) first descending, then red (negative) by absolute impact descending
  features.sort((a, b) => {
    if (a.impact >= 0 && b.impact < 0) return -1;
    if (a.impact < 0 && b.impact >= 0) return 1;
    return Math.abs(b.impact) - Math.abs(a.impact);
  });

  // Always derive from probabilityPercent so the SHAP card matches the data table exactly
  const probability = account.probabilityPercent / 100;
  const shapSum = features.reduce((sum, f) => sum + f.impact, 0);

  const clampedP = Math.min(0.99, Math.max(0.01, probability));
  const targetLogOdds = Math.log(clampedP / (1 - clampedP));
  const baseValue = targetLogOdds - shapSum;
  const logOdds = baseValue + shapSum;

  return {
    facsNumber: account.acctId,    // ShapAnalysis uses "facsNumber" for display
    predictedCategory: account.category,
    baseValue: Math.round(baseValue * 1000) / 1000,
    shapSum: Math.round(shapSum * 1000) / 1000,
    logOdds: Math.round(logOdds * 1000) / 1000,
    probability,
    features,
  };
};

export default buildUtilityShapData;

