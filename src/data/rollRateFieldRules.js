const L = (s) => s;

const BINARY_OPTION_LABELS = { 0: L('No (0)'), 1: L('Yes (1)') };

const DPD_BUCKET_LABELS = {
  0: L('0 — Current (0 DPD)'),
  1: L('1 — 1–30 DPD'),
  2: L('2 — 31–60 DPD'),
  3: L('3 — 61–90 DPD'),
  4: L('4 — 90+ DPD'),
};

const intRule = (label, min, max) => ({ type: 'int', min, max, label: L(label) });
const floatRule = (label, min, max) => ({ type: 'float', min, max, label: L(label) });
const binaryRule = (label) => ({
  type: 'discrete',
  allowed: [0, 1],
  optionLabels: BINARY_OPTION_LABELS,
  label: L(label),
});
const enumRule = (label, values) => ({ type: 'enum', values, label: L(label) });

/** Per column_acceptable_values_summary_roll_rate.txt */
export const ROLL_RATE_FIELD_RULES = {
  account_id: { type: 'text', editable: false, label: L('Account ID') },
  snapshot_date: { type: 'text', editable: false, label: L('Snapshot Date') },

  starting_dpd_bucket: {
    type: 'discrete',
    allowed: [0, 1, 2, 3, 4],
    optionLabels: DPD_BUCKET_LABELS,
    label: L('Starting DPD Bucket'),
  },

  is_restructured_flag: binaryRule('Restructured'),
  moratorium_exited_recently_flag: binaryRule('Moratorium Exited Recently'),
  salary_account_flag: binaryRule('Salary Account'),
  ever_90plus_flag: binaryRule('Ever 90+ DPD'),
  partial_payment_flag: binaryRule('Partial Payment (Last Month)'),
  nach_mandate_active: binaryRule('NACH Mandate Active'),
  salary_credited_this_month_flag: binaryRule('Salary Credited This Month'),
  active_ptp_open_flag: binaryRule('Active PTP Open'),
  legal_notice_issued_flag: binaryRule('Legal Notice Issued'),
  is_festival_month_flag: binaryRule('Festival Month'),
  is_march_flag: binaryRule('March Snapshot'),

  months_on_book: intRule('Months on Book', 3, 46),
  months_to_maturity: intRule('Months to Maturity', 2, 57),
  loan_amount: intRule('Loan Amount (INR)', 100000, 1170000),
  tenure_months: intRule('Tenure (Months)', 12, 60),
  borrower_age: intRule('Borrower Age', 21, 65),
  salary_date_day_of_month: intRule('Salary Day of Month', 0, 28),
  monthly_income: intRule('Monthly Income (INR)', 20000, 177400),
  dpd_days: intRule('DPD Days', 0, 199),
  months_in_current_bucket: intRule('Months in Current Bucket', 1, 47),
  dpd_1m_ago: intRule('DPD 1M Ago', 0, 199),
  dpd_2m_ago: intRule('DPD 2M Ago', 0, 199),
  dpd_3m_ago: intRule('DPD 3M Ago', 0, 199),
  max_dpd_3m: intRule('Max DPD (3M)', 0, 199),
  max_dpd_6m: intRule('Max DPD (6M)', 0, 199),
  max_dpd_12m: intRule('Max DPD (12M)', 0, 199),
  consecutive_months_delinq: intRule('Consecutive Months Delinquent', 0, 19),
  n_times_delinquent_12m: intRule('Times Delinquent (12M)', 0, 12),
  n_times_rolled_forward_12m: intRule('Times Rolled Forward (12M)', 0, 7),
  n_times_cured_12m: intRule('Times Cured (12M)', 0, 5),
  months_in_bucket_0_lifetime: intRule('Months in Bucket 0 (Lifetime)', 1, 47),
  n_partial_payments_6m: intRule('Partial Payments (6M)', 0, 6),
  days_since_last_payment: intRule('Days Since Last Payment', 1, 9999),
  avg_days_late_6m: intRule('Avg Days Late (6M)', 0, 99),
  bounce_count_6m: intRule('Bounce Count (6M)', 0, 6),
  days_since_salary_credit: intRule('Days Since Salary Credit', 0, 9999),
  n_bank_account_debits_bounced_30d: intRule('Debit Bounces (30D)', 0, 9),
  credit_score: intRule('Credit Score', 416, 886),
  credit_score_at_origination: intRule('Credit Score at Origination', 481, 871),
  n_delinquent_elsewhere: intRule('Delinquent Elsewhere', 0, 9),
  n_inquiries_6m: intRule('Bureau Enquiries (6M)', 0, 8),
  new_tradelines_opened_3m: intRule('New Tradelines (3M)', 0, 5),
  n_calls_this_month: intRule('Calls This Month', 0, 30),
  n_rpc_this_month: intRule('RPC This Month', 0, 10),
  n_rpc_6m: intRule('RPC (6M)', 0, 25),
  n_contact_attempts_6m: intRule('Contact Attempts (6M)', 0, 50),
  days_since_last_collections_action: intRule('Days Since Collections Action', 1, 9999),
  n_ptp_captured_6m: intRule('PTP Captured (6M)', 0, 10),
  n_ptp_broken_6m: intRule('PTP Broken (6M)', 0, 7),
  n_distinct_treatment_channels_30d: intRule('Treatment Channels (30D)', 0, 3),
  month_of_year: intRule('Month of Year', 1, 12),

  dpd_6m_ago: intRule('DPD 6M Ago', -1, 199),
  dpd_velocity_1m: intRule('DPD Velocity (1M)', -199, 139),
  dpd_velocity_3m: intRule('DPD Velocity (3M)', -199, 196),
  dpd_acceleration: intRule('DPD Acceleration', -308, 255),
  days_late_on_last_payment: intRule('Days Late on Last Payment', -5, 199),
  credit_score_delta_1m: intRule('Credit Score Delta (1M)', -127, 174),
  credit_score_delta_6m: intRule('Credit Score Delta (6M)', -192, 115),

  emi_amount: floatRule('EMI Amount (INR)', 2027.64, 96223.89),
  outstanding_balance: floatRule('Outstanding Balance (INR)', 5132.97, 1099719.06),
  principal_repaid: floatRule('Principal Repaid (INR)', -173176.12, 1060064.99),
  balance_to_original_ratio: floatRule('Balance to Original Ratio', 0.0483, 1.2384),
  avg_pmt_to_emi_3m: floatRule('Avg Pmt/EMI (3M)', 0, 1.15),
  avg_pmt_to_emi_6m: floatRule('Avg Pmt/EMI (6M)', 0, 1.1),
  pmt_to_emi_trend: floatRule('Pmt/EMI Trend', -0.85, 0.6142),
  last_payment_to_emi_ratio: floatRule('Last Payment/EMI', 0, 1.2),
  payment_regularity: floatRule('Payment Regularity', 0, 1),
  avg_balance_at_emi_due_date_3m: floatRule('Avg Balance at EMI Due (3M)', 100, 257274.65),
  current_foir: floatRule('Current FOIR', 0.0276, 2.8469),
  emi_burden_ratio: floatRule('EMI Burden Ratio', 0.0234, 2.8469),
  outstanding_to_income_ratio: floatRule('Outstanding/Income', 0.0552, 41.7693),
  bureau_utilization: floatRule('Bureau Utilization', 0.0006, 0.9922),
  bureau_overdue_amount_delta_3m: floatRule('Bureau Overdue Delta (3M)', -64825.13, 74326.51),
  rpc_rate_6m: floatRule('RPC Rate (6M)', 0, 1),
  ptp_keep_rate_6m: floatRule('PTP Keep Rate (6M)', 0, 1),
  unemployment_rate_state: floatRule('State Unemployment Rate', 3.5, 11),
  repo_rate: floatRule('Repo Rate', 4, 6.5),

  vintage_maturity_band: enumRule('Vintage Maturity Band', ['0-6m', '6-12m', '12-24m', '24m+']),
  product_subtype: enumRule('Product Subtype', [
    'Balance_Transfer',
    'Flexi_Loan',
    'Personal_Loan',
    'Top_Up_Loan',
  ]),
  employer_category: enumRule('Employer Category', [
    'Government',
    'Informal',
    'Large_Private',
    'PSU',
    'Self_Employed',
    'Small_Private',
    'Unemployed',
  ]),
  city_tier: enumRule('City Tier', ['Tier_1', 'Tier_2', 'Tier_3']),
  collections_treatment_strategy: enumRule('Collections Treatment', [
    'Agency_Assigned',
    'Digital_Only',
    'Field_Visit',
    'Legal_Notice',
    'No_Action',
    'Tele_Calling',
  ]),
};

/** Columns returned by GET /api/rollrate/accounts/generate (excluding account_id). */
export const ROLL_RATE_INPUT_COLUMN_ORDER = [
  'snapshot_date',
  'dpd_days',
  'months_in_current_bucket',
  'product_subtype',
  'employer_category',
  'city_tier',
  'monthly_income',
  'outstanding_balance',
  'credit_score',
  'n_times_rolled_forward_12m',
  'ptp_keep_rate_6m',
  'consecutive_months_delinq',
  'starting_dpd_bucket',
];

export const ROLL_RATE_SHAP_FEATURE_ALIASES = {
  credit_score: ['Credit Score', 'CIBIL'],
  months_to_maturity: ['Months to Maturity'],
  credit_score_at_origination: ['Credit Score at Origination'],
  n_times_delinquent_12m: ['Times Delinquent (12M)'],
  max_dpd_12m: ['Max DPD (12M)'],
  bureau_utilization: ['Bureau Utilization'],
  emi_amount: ['EMI Amount (INR)'],
  max_dpd_6m: ['Max DPD (6M)'],
  loan_amount: ['Loan Amount (INR)'],
  monthly_income: ['Monthly Income (INR)'],
  is_restructured_flag: ['Restructured'],
  starting_dpd_bucket: ['Starting DPD Bucket'],
  dpd_days: ['DPD Days'],
  outstanding_balance: ['Outstanding Balance (INR)'],
};

export const resolveRollRateFieldRules = () => {
  const out = {};
  Object.keys(ROLL_RATE_FIELD_RULES).forEach((k) => {
    out[k] = {
      ...ROLL_RATE_FIELD_RULES[k],
      editable: ROLL_RATE_FIELD_RULES[k].editable !== false,
    };
  });
  return out;
};

export const validateRollRateValue = (field, value, rules = ROLL_RATE_FIELD_RULES) => {
  const rule = rules[field];
  if (!rule || rule.editable === false) return null;
  if (rule.type === 'text') return null;

  if (rule.type === 'enum' && Array.isArray(rule.values)) {
    const s = String(value ?? '').trim();
    if (!s) return `"${rule.label}" cannot be empty.`;
    if (!rule.values.includes(s)) {
      return `"${rule.label}" must be one of: ${rule.values.join(', ')}.`;
    }
    return null;
  }

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

export const validateRollRateRowCrossFields = () => null;

export const formatDpdBucketLabel = (bucket) => {
  const n = Number(bucket);
  if (!Number.isFinite(n)) return bucket ?? '—';
  return DPD_BUCKET_LABELS[n] ?? String(bucket);
};
