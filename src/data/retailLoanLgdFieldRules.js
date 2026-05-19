const L = (s) => s;

/** Model inputs per Basel_LGD_loan_model_acceptable_values_summary.txt */
export const RETAIL_LOAN_LGD_FIELD_RULES = {
  loan_id: { type: 'text', editable: false, label: L('Loan ID') },
  unemployment: { type: 'float', min: 0, max: 30, label: L('Unemployment (%)') },
  gdp_growth: { type: 'float', min: -20, max: 20, label: L('GDP Growth (%)') },
  inflation: { type: 'float', min: -5, max: 30, label: L('Inflation (%)') },
  policy_rate: { type: 'float', min: 0, max: 25, label: L('Policy Rate (%)') },
  consumer_confidence: { type: 'float', min: 0, max: 200, label: L('Consumer Confidence') },
  bureau_score: { type: 'float', min: 300, max: 900, label: L('Bureau Score') },
  income: { type: 'float', min: 15000, max: 250000, label: L('Income (INR)') },
  age: { type: 'int', min: 21, max: 69, label: L('Age') },
  employment_type: {
    type: 'enum',
    values: ['Salaried', 'SelfEmployed', 'Contract', 'Unemployed'],
    label: L('Employment Type'),
  },
  prior_delinquencies: { type: 'int', min: 0, max: 10, label: L('Prior Delinquencies') },
  dti: {
    type: 'float',
    min: 0,
    max: 1,
    label: L('DTI Ratio'),
    hint: 'Decimal 0–1 (e.g. 0.356 not 35.6%)',
  },
  loan_amount: { type: 'float', min: 50000, max: 1000000, label: L('Loan Amount (INR)') },
  interest_rate: {
    type: 'float',
    min: 0.06,
    max: 0.35,
    label: L('Interest Rate'),
    hint: 'Decimal (e.g. 0.1525 not 15.25%)',
  },
  tenure_months: { type: 'int', min: 12, max: 83, label: L('Tenure (Months)') },
  seasoning_months: { type: 'int', min: 1, max: 84, label: L('Seasoning (Months)') },
  restructured_flag: {
    type: 'discrete',
    allowed: [0, 1],
    optionLabels: { 0: L('No (0)'), 1: L('Yes (1)') },
    label: L('Restructured Flag'),
  },
  dpd: { type: 'int', min: 90, max: 719, label: L('Days Past Due (DPD)') },
  broken_ptps: { type: 'int', min: 0, max: 15, label: L('Broken PTPs') },
  legal_flag: {
    type: 'discrete',
    allowed: [0, 1],
    optionLabels: { 0: L('No (0)'), 1: L('Yes (1)') },
    label: L('Legal Flag'),
  },
  agency_score: { type: 'float', min: 0, max: 100, label: L('Agency Score') },
  contactability_score: { type: 'float', min: 0, max: 1, label: L('Contactability Score') },
  months_in_collection: { type: 'int', min: 1, max: 35, label: L('Months in Collection') },
};

export const RETAIL_LOAN_LGD_INPUT_COLUMN_ORDER = [
  'unemployment',
  'gdp_growth',
  'inflation',
  'policy_rate',
  'consumer_confidence',
  'bureau_score',
  'income',
  'age',
  'employment_type',
  'prior_delinquencies',
  'dti',
  'loan_amount',
  'interest_rate',
  'tenure_months',
  'seasoning_months',
  'restructured_flag',
  'dpd',
  'broken_ptps',
  'legal_flag',
  'agency_score',
  'contactability_score',
  'months_in_collection',
];

export const RETAIL_LOAN_LGD_PREDICT_KEYS = ['loan_id', ...RETAIL_LOAN_LGD_INPUT_COLUMN_ORDER];

export const RETAIL_LOAN_LGD_SHAP_DISPLAY_ORDER = [
  'bureau_score',
  'income',
  'dti',
  'loan_amount',
  'interest_rate',
  'dpd',
  'legal_flag',
  'contactability_score',
];

export const RETAIL_LOAN_LGD_SHAP_FEATURE_ALIASES = {
  bureau_score: ['Bureau Score', 'bureau score'],
  income: ['Income', 'Income (INR)'],
  dti: ['DTI', 'Debt-to-Income', 'dti ratio'],
  loan_amount: ['Loan Amount', 'Loan Amount (INR)', 'loan principal'],
  interest_rate: ['Interest Rate'],
  dpd: ['Days Past Due', 'DPD'],
  legal_flag: ['Legal Flag'],
  contactability_score: ['Contactability Score', 'contactability'],
  broken_ptps: ['Broken PTPs', 'broken_ptps'],
  agency_score: ['Agency Score'],
  unemployment: ['Unemployment', 'Unemployment Rate'],
};

export const resolveRetailLoanLgdFieldRules = () => {
  const out = {};
  Object.keys(RETAIL_LOAN_LGD_FIELD_RULES).forEach((k) => {
    out[k] = { ...RETAIL_LOAN_LGD_FIELD_RULES[k], editable: RETAIL_LOAN_LGD_FIELD_RULES[k].editable !== false };
  });
  return out;
};

export const validateRetailLoanLgdValue = (field, value, rules = RETAIL_LOAN_LGD_FIELD_RULES) => {
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
    return `"${rule.label}" must be a decimal rate (e.g. 0.1525), not a percentage.`;
  }
  if (field === 'dti' && (n > 1 || n < 0)) {
    return `"${rule.label}" must be a decimal ratio between 0 and 1.`;
  }

  return null;
};

export const validateRetailLoanLgdRowCrossFields = () => null;
