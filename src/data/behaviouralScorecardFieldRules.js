const L = (s) => s;

/** Inputs per behavioural_scorecard_pl_acceptable_values_summary.txt */
export const BEHAVIOURAL_SCORECARD_FIELD_RULES = {
  cust_id: { type: 'text', editable: false, label: L('Customer ID') },
  on_time_pay_pct_6m: {
    type: 'float',
    min: 0,
    max: 1,
    label: L('On-Time Pay % (6M)'),
  },
  num_emi_paid_6m: { type: 'int', min: 0, max: 6, label: L('Full EMIs Paid (6M)') },
  num_partial_pay_6m: { type: 'int', min: 0, max: 6, label: L('Partial Payments (6M)') },
  max_dpd_6m: { type: 'int', min: 0, max: 59, label: L('Max DPD (6M)') },
  avg_dpd_6m: { type: 'float', min: 0, max: 59, label: L('Avg DPD (6M)') },
  num_dpd30_6m: { type: 'int', min: 0, max: 6, label: L('Months 30+ DPD (6M)') },
  salary_credit_regular: {
    type: 'discrete',
    allowed: [0, 1],
    optionLabels: { 0: L('No (0)'), 1: L('Yes (1)') },
    label: L('Salary Credit Regular'),
  },
  avg_balance_3m: {
    type: 'float',
    min: 200,
    label: L('Avg Bank Balance (3M, INR)'),
  },
  num_nsf_6m: { type: 'int', min: 0, max: 8, label: L('NSF / Bounce Events (6M)') },
  salary_drop_pct: { type: 'float', min: -10, max: 60, label: L('Salary Drop %') },
  cibil_now: { type: 'int', min: 300, max: 900, label: L('CIBIL Score (Current)') },
  cibil_change_6m: { type: 'float', min: -180, max: 60, label: L('CIBIL Change (6M)') },
  num_new_tl_6m: { type: 'int', min: 0, max: 8, label: L('New Tradelines (6M)') },
  num_new_enq_3m: { type: 'int', min: 0, max: 12, label: L('New Bureau Enquiries (3M)') },
  restructured: {
    type: 'discrete',
    allowed: [0, 1],
    optionLabels: { 0: L('No (0)'), 1: L('Yes (1)') },
    label: L('Restructured'),
  },
};

export const BEHAVIOURAL_SCORECARD_INPUT_COLUMN_ORDER = [
  'on_time_pay_pct_6m',
  'num_emi_paid_6m',
  'num_partial_pay_6m',
  'max_dpd_6m',
  'avg_dpd_6m',
  'num_dpd30_6m',
  'salary_credit_regular',
  'avg_balance_3m',
  'num_nsf_6m',
  'salary_drop_pct',
  'cibil_now',
  'cibil_change_6m',
  'num_new_tl_6m',
  'num_new_enq_3m',
  'restructured',
];

export const BEHAVIOURAL_SCORECARD_PREDICT_KEYS = [
  'cust_id',
  ...BEHAVIOURAL_SCORECARD_INPUT_COLUMN_ORDER,
];

export const BEHAVIOURAL_SCORECARD_SHAP_FEATURE_ALIASES = {
  on_time_pay_pct_6m: ['On-Time Pay % (6M)', 'On Time Pay Pct 6m'],
  cibil_now: ['CIBIL Score (Current)', 'CIBIL Score'],
  num_emi_paid_6m: ['Full EMIs Paid (6M)', 'Num Emi Paid 6m'],
  num_nsf_6m: ['NSF / Bounce Events (6M)', 'NSF Events (6M)'],
  num_partial_pay_6m: ['Partial Payments (6M)'],
  cibil_change_6m: ['CIBIL Change (6M)'],
  salary_credit_regular: ['Salary Credit Regular'],
  num_new_enq_3m: ['New Bureau Enquiries (3M)', 'New Bureau Enquiries (3m)'],
  num_dpd30_6m: ['Months 30+ DPD (6M)'],
  salary_drop_pct: ['Salary Drop %'],
  num_new_tl_6m: ['New Tradelines (6M)'],
  restructured: ['Restructured'],
  max_dpd_6m: ['Max DPD (6M)'],
  avg_dpd_6m: ['Avg DPD (6M)'],
  avg_balance_3m: ['Avg Bank Balance (3M, INR)', 'Avg Balance 3m'],
};

export const resolveBehaviouralScorecardFieldRules = () => {
  const out = {};
  Object.keys(BEHAVIOURAL_SCORECARD_FIELD_RULES).forEach((k) => {
    out[k] = {
      ...BEHAVIOURAL_SCORECARD_FIELD_RULES[k],
      editable: BEHAVIOURAL_SCORECARD_FIELD_RULES[k].editable !== false,
    };
  });
  return out;
};

export const validateBehaviouralScorecardValue = (
  field,
  value,
  rules = BEHAVIOURAL_SCORECARD_FIELD_RULES,
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

export const validateBehaviouralScorecardRowCrossFields = (row) => {
  if (!row) return null;
  const maxDpd = Number(row.max_dpd_6m);
  if (Number.isFinite(maxDpd) && maxDpd >= 60) {
    return '"Max DPD (6M)" must be less than 60 (eligibility rule).';
  }
  const avgDpd = Number(row.avg_dpd_6m);
  if (Number.isFinite(maxDpd) && Number.isFinite(avgDpd) && avgDpd > maxDpd) {
    return '"Avg DPD (6M)" cannot exceed "Max DPD (6M)".';
  }
  return null;
};
