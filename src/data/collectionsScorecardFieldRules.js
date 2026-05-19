const L = (s) => s;

/** Inputs per collections_scorecard_model_acceptable_values_summary.txt */
export const COLLECTIONS_SCORECARD_FIELD_RULES = {
  cust_id: { type: 'text', editable: false, label: L('Customer ID') },
  num_on_time_6m: { type: 'int', min: 0, max: 6, label: L('On-Time Payments (6M)') },
  num_partial_6m: { type: 'int', min: 0, max: 6, label: L('Partial Payments (6M)') },
  num_missed_6m: { type: 'int', min: 0, max: 6, label: L('Missed Payments (6M)') },
  avg_pay_ratio_6m: { type: 'float', min: 0, max: 1.4, label: L('Avg Payment Ratio (6M)') },
  days_since_last_pay: { type: 'int', min: 0, max: 200, label: L('Days Since Last Pay') },
  current_dpd_bucket: {
    type: 'discrete',
    allowed: [30, 60, 89],
    label: L('Current DPD Bucket'),
  },
  current_outstanding: {
    type: 'float',
    min: 5000,
    max: 2500000,
    label: L('Current Outstanding (INR)'),
  },
  months_in_bucket: { type: 'int', min: 1, max: 3, label: L('Months in DPD Bucket') },
  cycles_delq_12m: { type: 'int', min: 1, max: 12, label: L('Delinquency Cycles (12M)') },
  contact_attempts_30d: { type: 'int', min: 0, max: 40, label: L('Contact Attempts (30D)') },
  rpc_count_30d: { type: 'int', min: 0, max: 30, label: L('RPC Count (30D)') },
  ptp_broken_12m: { type: 'int', min: 0, max: 8, label: L('PTP Broken (12M)') },
  ptp_kept_12m: { type: 'int', min: 0, max: 10, label: L('PTP Kept (12M)') },
  cust_initiated_contact_30d: {
    type: 'discrete',
    allowed: [0, 1],
    optionLabels: { 0: L('No (0)'), 1: L('Yes (1)') },
    label: L('Customer-Initiated Contact (30D)'),
  },
  salary_credit_regular: {
    type: 'discrete',
    allowed: [0, 1],
    optionLabels: { 0: L('No (0)'), 1: L('Yes (1)') },
    label: L('Salary Credit Regular'),
  },
  num_nsf_6m: { type: 'int', min: 0, max: 12, label: L('NSF Events (6M)') },
  cibil_now: { type: 'int', min: 300, max: 850, label: L('CIBIL Score (Current)') },
  cibil_change_since_dlq: { type: 'float', min: -200, max: 30, label: L('CIBIL Change Since DLQ') },
  num_new_tl_6m: { type: 'int', min: 0, max: 6, label: L('New Tradelines (6M)') },
  num_new_enq_3m: { type: 'int', min: 0, max: 12, label: L('New Bureau Enquiries (3M)') },
  original_amt: { type: 'float', min: 50000, max: 3000000, label: L('Original Amount (INR)') },
  original_tenor: {
    type: 'discrete',
    allowed: [24, 36, 48, 60],
    label: L('Original Tenor (Months)'),
  },
  months_on_book: { type: 'int', min: 6, max: 60, label: L('Months on Book') },
  vintage_year: {
    type: 'discrete',
    allowed: [2020, 2021, 2022, 2023, 2024],
    label: L('Vintage Year'),
  },
  restructured: {
    type: 'discrete',
    allowed: [0, 1],
    optionLabels: { 0: L('No (0)'), 1: L('Yes (1)') },
    label: L('Restructured'),
  },
  co_applicant: {
    type: 'discrete',
    allowed: [0, 1],
    optionLabels: { 0: L('No (0)'), 1: L('Yes (1)') },
    label: L('Co-Applicant'),
  },
};

export const COLLECTIONS_SCORECARD_INPUT_COLUMN_ORDER = [
  'current_dpd_bucket',
  'current_outstanding',
  'months_in_bucket',
  'cycles_delq_12m',
  'num_on_time_6m',
  'num_partial_6m',
  'num_missed_6m',
  'avg_pay_ratio_6m',
  'days_since_last_pay',
  'contact_attempts_30d',
  'rpc_count_30d',
  'ptp_broken_12m',
  'ptp_kept_12m',
  'cust_initiated_contact_30d',
  'salary_credit_regular',
  'num_nsf_6m',
  'cibil_now',
  'cibil_change_since_dlq',
  'num_new_tl_6m',
  'num_new_enq_3m',
  'original_amt',
  'original_tenor',
  'months_on_book',
  'vintage_year',
  'restructured',
  'co_applicant',
];

export const COLLECTIONS_SCORECARD_PREDICT_KEYS = [
  'cust_id',
  ...COLLECTIONS_SCORECARD_INPUT_COLUMN_ORDER,
];

export const COLLECTIONS_SCORECARD_SHAP_FEATURE_ALIASES = {
  num_on_time_6m: ['On-Time Payments (6m)', 'On-Time Payments (6M)'],
  cibil_now: ['CIBIL Score (Current)', 'CIBIL Score'],
  num_missed_6m: ['Missed Payments (6m)', 'Missed Payments (6M)'],
  avg_pay_ratio_6m: ['Avg Payment Ratio (6m)', 'Avg Payment Ratio (6M)'],
  current_dpd_bucket: ['Current DPD Bucket'],
  cibil_change_since_dlq: ['CIBIL Change Since DLQ'],
  days_since_last_pay: ['Days Since Last Pay'],
  ptp_broken_12m: ['PTP Broken (12m)', 'PTP Broken (12M)'],
  months_in_bucket: ['Months in DPD Bucket'],
  contact_attempts_30d: ['Contact Attempts (30d)', 'Contact Attempts (30D)'],
  salary_credit_regular: ['Salary Credit Regular'],
  ptp_kept_12m: ['PTP Kept (12m)', 'PTP Kept (12M)'],
  num_nsf_6m: ['NSF Events (6m)', 'NSF Events (6M)'],
  num_new_enq_3m: ['New Bureau Enquiries (3m)', 'New Bureau Enquiries (3M)'],
  cust_initiated_contact_30d: ['Customer-Initiated Contact (30d)', 'Customer-Initiated Contact (30D)'],
  rpc_count_30d: ['RPC Count (30d)', 'RPC Count (30D)'],
  num_new_tl_6m: ['New Tradelines (6m)', 'New Tradelines (6M)'],
};

export const resolveCollectionsScorecardFieldRules = () => {
  const out = {};
  Object.keys(COLLECTIONS_SCORECARD_FIELD_RULES).forEach((k) => {
    out[k] = {
      ...COLLECTIONS_SCORECARD_FIELD_RULES[k],
      editable: COLLECTIONS_SCORECARD_FIELD_RULES[k].editable !== false,
    };
  });
  return out;
};

export const validateCollectionsScorecardValue = (
  field,
  value,
  rules = COLLECTIONS_SCORECARD_FIELD_RULES,
) => {
  const rule = rules[field];
  if (!rule || rule.editable === false) return null;
  if (rule.type === 'text') return null;

  if (rule.type === 'discrete' && Array.isArray(rule.allowed)) {
    const n = Number(value);
    if (!Number.isFinite(n)) return `"${rule.label}" must be a valid value.`;
    if (!rule.allowed.some((a) => Number(a) === n)) {
      const opts = rule.optionLabels
        ? rule.allowed.map((a) => rule.optionLabels[a] ?? a).join(', ')
        : rule.allowed.join(', ');
      return `"${rule.label}" must be one of: ${opts}.`;
    }
    return null;
  }

  const n = Number(value);
  if (!Number.isFinite(n)) return `"${rule.label}" must be a valid number.`;
  if (rule.min != null && n < rule.min) return `"${rule.label}" must be >= ${rule.min}.`;
  if (rule.max != null && n > rule.max) return `"${rule.label}" must be <= ${rule.max}.`;
  if (rule.type === 'int' && !Number.isInteger(n)) return `"${rule.label}" must be an integer.`;

  return null;
};

export const validateCollectionsScorecardRowCrossFields = () => null;
