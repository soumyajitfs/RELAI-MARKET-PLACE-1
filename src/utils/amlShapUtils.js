/**
 * SHAP utilities for AML Alert Prioritization.
 * Builds the shapData object consumed by <ShapAnalysis />.
 */

const AML_FEATURE_TO_KEY = {
  'Credit Utilization': 'credit_utilization',
  'Total Spend': 'totalSpend90d',
  'Transactions per Month': 'txn_per_month',
  Purchases: 'nbrPurchases90d',
  KYC: 'kycRiskScore',
  'Merchant Credits': 'nbrMerchCredits90d',
  'Credit Score': 'creditScore',
  Tenure: 'tenureMonths',
  'Total Merchant Credits': 'totalMerchCred90d',
  Rebates: 'nbrPointRed90d',
  'Total Payment Amount': 'totalPaymentAmt90d',
  'Cash-like Payments': 'nbrPaymentsCashLike90d',
  Inquiries: 'nbrInquiries1y',
  'Owns Home': 'indOwnsHome',
  'Distinct Merchants': 'nbrDistinctMerch90d',
};

const formatValue = (val) => {
  if (val == null || val === '') return '—';
  if (typeof val === 'number') return val % 1 === 0 ? String(val) : val.toFixed(3);
  return String(val);
};

const toNumeric = (val) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
};

/**
 * Build shapData from predicted AML row.
 */
export const buildAmlShapData = (account) => {
  if (!account || !account.shapValues || account.shapValues.length === 0) return null;

  // AML-specific rule:
  // Keep only SHAP features that map to table columns and have numeric values.
  const features = account.shapValues
    .map((sv) => {
      const key = AML_FEATURE_TO_KEY[sv.feature];
      if (!key) return null;

      const numericValue = toNumeric(account[key]);
      if (numericValue == null) return null;

      return {
        name: sv.feature,
        impact: sv.impact,
        value: formatValue(numericValue),
      };
    })
    .filter(Boolean);

  if (features.length === 0) return null;

  features.sort((a, b) => {
    if (a.impact >= 0 && b.impact < 0) return -1;
    if (a.impact < 0 && b.impact >= 0) return 1;
    return Math.abs(b.impact) - Math.abs(a.impact);
  });

  let predictedCategory = 'Low';
  if (account.category === 'High') predictedCategory = 'High';
  else if (account.category === 'Medium') predictedCategory = 'Medium';

  const probability = account.probabilityPercent != null
    ? account.probabilityPercent / 100
    : (account.probability ?? 0);

  return {
    facsNumber: account.accountId,
    features,
    predictedCategory,
    probability,
    categoryContextLabel: 'AML Alert Risk',
    legendHighText: 'Increases probability toward High AML Alert Risk',
    legendLowText: 'Increases probability toward Low AML Alert Risk',
  };
};

export default buildAmlShapData;
