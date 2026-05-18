/**
 * SHAP utilities for Customer Churn use case.
 */

const CHURN_FEATURE_TO_KEY = {
  'Avg Articles/Week': 'avg_articles_per_week',
  'Days Since Last Login': 'days_since_last_login',
  'Auto Renew': 'auto_renew',
  'Discount Used Last Renewal': 'discount_used_last_renewal',
  'Plan Type': 'plan_type',
  'Sentiment Score': 'sentiment_score',
  'Support Tickets (90d)': 'support_tickets_last_90d',
  'Campaign CTR': 'campaign_ctr',
  'Customer Age': 'customer_age',
  'Completion Rate': 'completion_rate',
  'NPS Score': 'nps_score',
  'Tenure (Days)': 'tenure_days',
  'CSAT Score': 'csat_score',
  'Email Open Rate': 'email_open_rate',
  region_Others: 'region',
};

const formatValue = (val) => {
  if (val == null || val === '') return '—';
  if (typeof val === 'number') return val % 1 === 0 ? String(val) : val.toFixed(3);
  return String(val);
};

export const buildChurnShapData = (customer) => {
  if (!customer || !customer.shapValues || customer.shapValues.length === 0) return null;

  const features = customer.shapValues.map((sv) => {
    const key = CHURN_FEATURE_TO_KEY[sv.feature];
    const rawValue = key ? customer[key] : null;
    return {
      name: sv.feature,
      impact: sv.impact,
      value: formatValue(rawValue),
    };
  });

  features.sort((a, b) => {
    if (a.impact >= 0 && b.impact < 0) return -1;
    if (a.impact < 0 && b.impact >= 0) return 1;
    return Math.abs(b.impact) - Math.abs(a.impact);
  });

  let predictedCategory = 'Low';
  if (customer.churn_risk === 'High') predictedCategory = 'High';
  else if (customer.churn_risk === 'Medium') predictedCategory = 'Medium';

  const probability = customer.probabilityPercent != null
    ? customer.probabilityPercent / 100
    : (customer.probability ?? 0);

  return {
    facsNumber: customer.user_id,
    features,
    predictedCategory,
    probability,
    categoryContextLabel: 'Churn Risk',
    legendHighText: 'Increases probability toward High Churn Risk',
    legendLowText: 'Increases probability toward Low Churn Risk',
  };
};

export default buildChurnShapData;
