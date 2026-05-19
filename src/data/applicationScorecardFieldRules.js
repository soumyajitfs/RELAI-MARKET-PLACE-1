const L = (s) => s;

/** Application inputs per column_acceptable_values_summary_application_scorecard.txt */
export const APPLICATION_SCORECARD_FIELD_RULES = {
  app_id: { type: 'text', editable: false, label: L('Application ID') },
  gender: { type: 'enum', values: ['M', 'F'], label: L('Gender') },
  age: { type: 'int', min: 21, max: 65, label: L('Age') },
  marital: {
    type: 'enum',
    values: ['Single', 'Married', 'Other'],
    label: L('Marital Status'),
  },
  education: {
    type: 'enum',
    values: ['Postgrad', 'Graduate', 'Diploma', 'HSC', 'SSC'],
    label: L('Education'),
  },
  dependents: { type: 'int', min: 0, max: 6, label: L('Dependents') },
  residence: {
    type: 'enum',
    values: ['Owned', 'Rented', 'Parental', 'Company'],
    label: L('Residence'),
  },
  city_tier: {
    type: 'enum',
    values: ['Tier-1', 'Tier-2', 'Tier-3'],
    label: L('City Tier'),
  },
  emp_type: {
    type: 'enum',
    values: ['Salaried', 'Self-Emp', 'Govt', 'Pensioner'],
    label: L('Employment Type'),
  },
  employer_cat: {
    type: 'enum',
    values: ['CatA', 'CatB', 'CatC', 'SelfEmp'],
    label: L('Employer Category'),
  },
  emp_tenure: { type: 'float', min: 0, max: 35, label: L('Employment Tenure (Years)') },
  salary_with_us: {
    type: 'discrete',
    allowed: [0, 1],
    optionLabels: { 0: L('No (0)'), 1: L('Yes (1)') },
    label: L('Salary With Us'),
  },
  monthly_income: { type: 'float', min: 18000, max: 800000, label: L('Monthly Income (INR)') },
  existing_emi: { type: 'float', min: 0, label: L('Existing EMI (INR)') },
  dti: {
    type: 'float',
    min: 0,
    max: 1,
    editable: false,
    label: L('DTI Ratio'),
    hint: 'Computed: existing_emi ÷ monthly_income (0–1)',
  },
  savings_balance: { type: 'float', min: 1000, max: 5000000, label: L('Savings Balance (INR)') },
  avg_balance_6m: { type: 'float', min: 0, max: 5000000, label: L('Avg Balance 6M (INR)') },
  banking_rel_months: { type: 'int', min: 0, max: 240, label: L('Banking Relationship (Months)') },
  cibil: {
    type: 'int',
    min: 300,
    max: 900,
    label: L('CIBIL Score'),
    hint: 'Use -1 for no-hit / thin file',
  },
  total_tl: { type: 'int', min: 0, max: 25, label: L('Total Tradelines') },
  active_tl: { type: 'int', min: 0, max: 25, label: L('Active Tradelines') },
  oldest_tl_months: { type: 'int', min: 0, max: 240, label: L('Oldest TL (Months)') },
  max_dpd_24m: { type: 'int', min: 0, max: 180, label: L('Max DPD (24M)') },
  num_enq_3m: { type: 'int', min: 0, max: 15, label: L('Enquiries (3M)') },
  num_enq_6m: { type: 'int', min: 0, max: 15, label: L('Enquiries (6M)') },
  num_writeoff: { type: 'int', min: 0, max: 2, label: L('Write-offs') },
  loan_amount: { type: 'float', min: 50000, max: 3000000, label: L('Loan Amount (INR)') },
  tenor: {
    type: 'discrete',
    allowed: [12, 24, 36, 48, 60],
    label: L('Tenor (Months)'),
  },
  loan_purpose: {
    type: 'enum',
    values: [
      'Debt-Consol',
      'Wedding',
      'Education',
      'Medical',
      'Travel',
      'Home-Reno',
      'Other',
    ],
    label: L('Loan Purpose'),
  },
};

export const APPLICATION_SCORECARD_INPUT_COLUMN_ORDER = [
  'gender',
  'age',
  'marital',
  'education',
  'dependents',
  'residence',
  'city_tier',
  'emp_type',
  'employer_cat',
  'emp_tenure',
  'salary_with_us',
  'monthly_income',
  'existing_emi',
  'dti',
  'savings_balance',
  'avg_balance_6m',
  'banking_rel_months',
  'cibil',
  'total_tl',
  'active_tl',
  'oldest_tl_months',
  'max_dpd_24m',
  'num_enq_3m',
  'num_enq_6m',
  'num_writeoff',
  'loan_amount',
  'tenor',
  'loan_purpose',
];

/** POST body keys (matches Postman — dti is computed server-side, not sent). */
export const APPLICATION_SCORECARD_PREDICT_KEYS = [
  'app_id',
  'age',
  'gender',
  'marital',
  'education',
  'dependents',
  'residence',
  'city_tier',
  'emp_type',
  'employer_cat',
  'emp_tenure',
  'salary_with_us',
  'monthly_income',
  'existing_emi',
  'savings_balance',
  'avg_balance_6m',
  'banking_rel_months',
  'cibil',
  'total_tl',
  'active_tl',
  'oldest_tl_months',
  'max_dpd_24m',
  'num_enq_3m',
  'num_enq_6m',
  'num_writeoff',
  'loan_amount',
  'tenor',
  'loan_purpose',
];

export const APPLICATION_SCORECARD_SHAP_DISPLAY_ORDER = [
  'cibil',
  'max_dpd_24m',
  'dti',
  'monthly_income',
  'existing_emi',
  'emp_tenure',
  'loan_amount',
  'tenor',
  'num_enq_3m',
  'oldest_tl_months',
];

export const APPLICATION_SCORECARD_SHAP_FEATURE_ALIASES = {
  cibil: ['CIBIL Score', 'cibil score', 'CIBIL'],
  max_dpd_24m: ['Max DPD (24m)', 'Max DPD (24M)', 'max dpd'],
  dti: ['Debt-to-Income Ratio', 'DTI', 'Debt to Income'],
  monthly_income: ['Monthly Income', 'monthly income'],
  existing_emi: ['Existing EMI', 'existing emi'],
  emp_tenure: ['Employment Tenure', 'employment tenure'],
  loan_amount: ['Loan Amount', 'loan amount'],
  tenor: ['Tenor', 'Tenor (Months)'],
  num_enq_3m: ['Enquiries (3M)', 'Bureau Enquiries 3M'],
  oldest_tl_months: ['Oldest TL (Months)', 'oldest tradeline'],
};

export const resolveApplicationScorecardFieldRules = () => {
  const out = {};
  Object.keys(APPLICATION_SCORECARD_FIELD_RULES).forEach((k) => {
    out[k] = { ...APPLICATION_SCORECARD_FIELD_RULES[k], editable: APPLICATION_SCORECARD_FIELD_RULES[k].editable !== false };
  });
  return out;
};

export const validateApplicationScorecardValue = (field, value, rules = APPLICATION_SCORECARD_FIELD_RULES) => {
  const rule = rules[field];
  if (!rule || rule.editable === false) return null;
  if (rule.type === 'text') return null;

  if (field === 'cibil') {
    const n = Number(value);
    if (!Number.isFinite(n)) return `"${rule.label}" must be a valid number.`;
    if (n === -1) return null;
    if (n < 300 || n > 900) return `"${rule.label}" must be -1 (no-hit) or between 300 and 900.`;
    if (!Number.isInteger(n)) return `"${rule.label}" must be an integer.`;
    return null;
  }

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

  return null;
};

export const validateApplicationScorecardRowCrossFields = (row) => {
  if (!row) return null;
  const e3 = Number(row.num_enq_3m);
  const e6 = Number(row.num_enq_6m);
  if (Number.isFinite(e3) && Number.isFinite(e6) && e6 < e3) {
    return 'Enquiries (6M) must be greater than or equal to Enquiries (3M).';
  }
  const inc = Number(row.monthly_income);
  const emi = Number(row.existing_emi);
  if (Number.isFinite(inc) && Number.isFinite(emi) && inc > 0 && emi > inc * 0.6) {
    return 'Existing EMI is unusually high versus monthly income (> 60%).';
  }
  if (row.emp_type === 'Salaried' && row.salary_with_us == null) {
    return null;
  }
  return null;
};
