const L = (s) => s;

/** 19 model inputs per EAD_loan_acceptable_values_summary.txt */
export const PERSONAL_LOAN_EAD_FIELD_RULES = {
  loan_id: { type: 'text', editable: false, label: L('Loan ID') },
  credit_score: { type: 'float', min: 300, max: 900, label: L('Credit Score') },
  income: { type: 'float', min: 15000, max: 250000, label: L('Income (INR)') },
  age: { type: 'int', min: 21, max: 65, label: L('Age') },
  employment_type: {
    type: 'enum',
    values: ['Salaried', 'SelfEmployed', 'Contract', 'Unemployed'],
    label: L('Employment Type'),
  },
  original_loan_amount: { type: 'float', min: 50000, max: 1000000, label: L('Original Loan Amount (INR)') },
  interest_rate: {
    type: 'float',
    min: 0.06,
    max: 0.35,
    label: L('Interest Rate'),
    hint: 'Decimal (e.g. 0.152 not 15.2%)',
  },
  original_tenure_months: {
    type: 'discrete',
    allowed: [24, 36, 48, 60, 72, 84],
    label: L('Original Tenure (Months)'),
  },
  topup_flag: {
    type: 'discrete',
    allowed: [0, 1],
    optionLabels: { 0: L('No (0)'), 1: L('Yes (1)') },
    label: L('Top-Up Flag'),
  },
  restructured_flag: {
    type: 'discrete',
    allowed: [0, 1],
    optionLabels: { 0: L('No (0)'), 1: L('Yes (1)') },
    label: L('Restructured Flag'),
  },
  prior_delinquencies: { type: 'int', min: 0, max: 10, label: L('Prior Delinquencies') },
  months_since_orig: { type: 'int', min: 0, max: 83, label: L('Months Since Origination') },
  outstanding: { type: 'float', min: 0, label: L('Outstanding Balance (INR)') },
  dpd: { type: 'int', min: 0, max: 360, label: L('Days Past Due (DPD)') },
  missed_running: { type: 'int', min: 0, label: L('Cumulative Missed EMIs') },
  emis_missed_6m: { type: 'int', min: 0, max: 6, label: L('EMIs Missed (6M)') },
  unemployment: { type: 'float', min: 0, max: 25, label: L('Unemployment (%)') },
  gdp_growth: { type: 'float', label: L('GDP Growth (%)') },
  inflation: { type: 'float', label: L('Inflation (%)') },
  policy_rate: { type: 'float', label: L('Policy Rate (%)') },
};

export const PERSONAL_LOAN_EAD_INPUT_COLUMN_ORDER = [
  'credit_score',
  'income',
  'age',
  'employment_type',
  'original_loan_amount',
  'interest_rate',
  'original_tenure_months',
  'topup_flag',
  'restructured_flag',
  'prior_delinquencies',
  'months_since_orig',
  'outstanding',
  'dpd',
  'missed_running',
  'emis_missed_6m',
  'unemployment',
  'gdp_growth',
  'inflation',
  'policy_rate',
];

export const PERSONAL_LOAN_EAD_PREDICT_KEYS = [
  'loan_id',
  ...PERSONAL_LOAN_EAD_INPUT_COLUMN_ORDER,
];

/** Always shown in SHAP — static / loan-setup input columns. */
export const PERSONAL_LOAN_EAD_SHAP_DISPLAY_ORDER = [
  'income',
  'interest_rate',
  'original_tenure_months',
  'topup_flag',
];

/** Map API / model SHAP feature labels → row keys (for impact lookup). */
export const PERSONAL_LOAN_EAD_SHAP_FEATURE_ALIASES = {
  income: ['Income', 'Income (INR)', 'Annual Income'],
  age: ['Borrower Age', 'Age'],
  employment_type: ['Employment Type'],
  original_loan_amount: ['Original Loan Amount', 'Original Loan Amount (INR)'],
  interest_rate: ['Interest Rate'],
  original_tenure_months: ['Original Tenure (Months)', 'Original Tenure'],
  topup_flag: ['Top-Up Flag', 'Top Up Flag'],
  restructured_flag: ['Restructured Flag'],
  prior_delinquencies: ['Prior Delinquencies'],
  months_since_orig: ['Months Since Origination', 'Months Since Orig'],
  utilisation: ['Loan Utilisation', 'Loan Utilization'],
  dpd: ['Days Past Due', 'Days Past Due (DPD)', 'DPD'],
  missed_running: ['Cumulative Missed EMIs'],
  outstanding: ['Outstanding Balance'],
};

export const resolvePersonalLoanEadFieldRules = () => {
  const out = {};
  Object.keys(PERSONAL_LOAN_EAD_FIELD_RULES).forEach((k) => {
    out[k] = { ...PERSONAL_LOAN_EAD_FIELD_RULES[k], editable: PERSONAL_LOAN_EAD_FIELD_RULES[k].editable !== false };
  });
  return out;
};

export const validatePersonalLoanEadValue = (field, value, rules = PERSONAL_LOAN_EAD_FIELD_RULES) => {
  const rule = rules[field];
  if (!rule || rule.editable === false) return null;

  if (rule.type === 'text') return null;

  if (rule.type === 'enum' && Array.isArray(rule.values)) {
    const s = value == null ? '' : String(value).trim();
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

  if (field === 'interest_rate' && (n > 1 || n < 0)) {
    return `"${rule.label}" must be a decimal rate (e.g. 0.152), not a percentage.`;
  }

  return null;
};

export const validatePersonalLoanEadRowCrossFields = (row) => {
  if (!row) return null;
  const orig = Number(row.original_loan_amount);
  const out = Number(row.outstanding);
  if (Number.isFinite(orig) && Number.isFinite(out) && out > orig * 1.5) {
    return 'Outstanding balance is unusually high versus original loan amount.';
  }
  return null;
};
