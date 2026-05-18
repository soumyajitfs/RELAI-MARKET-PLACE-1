const r6 = (x) => Math.round(x * 1e6) / 1e6;

export const PAYMENT_REG_6M_VALUES = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1].map(r6);

export const PAYMENT_REG_12M_VALUES = [
  -1,
  0,
  1 / 12,
  2 / 12,
  3 / 12,
  4 / 12,
  5 / 12,
  6 / 12,
  7 / 12,
  8 / 12,
  9 / 12,
  10 / 12,
  11 / 12,
  1,
].map(r6);

const near = (a, b, eps = 1e-5) => Math.abs(Number(a) - Number(b)) < eps;

const inDiscrete = (n, set) => set.some((v) => near(n, v, 0.02));

const EMPLOYER_CATEGORY = ['Government', 'PSU', 'Large_Private', 'Small_Private', 'Self_Employed', 'Informal'];
const CITY_TIER = ['Tier_1', 'Tier_2', 'Tier_3'];
const RESIDENCE_TYPE = ['Owned', 'Rented', 'Parental', 'Company_Provided'];
const EMPLOYER_INDUSTRY = [
  'IT',
  'Banking',
  'Manufacturing',
  'Retail',
  'Hospitality',
  'Healthcare',
  'Education',
  'Construction',
  'Agriculture',
  'Self_Employed_Services',
  'Self_Employed_Trade',
  'Other',
];

const INTERNAL_DERIVED = new Set([
  'flag_has_12m_history',
  'flag_has_cibil_12m',
  'flag_cross_sell_offer',
  'balance_coverage_at_emi',
  'stress_signal_count',
  'cibil_monthly_velocity',
  'emi_cashflow_coverage_gap',
  'salary_stress_flag',
]);

const label = (text) => text;

/** @type {Record<string, any>} */
export const EWS_FIELD_RULES = {
  account_id: { type: 'text', editable: false, label: label('Account ID') },

  loan_amount: { type: 'float', min: 50000, max: 2500000, label: label('Loan Amount (INR)') },
  tenure_months: { type: 'int', min: 6, max: 60, label: label('Tenure (Months)') },
  months_on_book: { type: 'int', min: 6, max: 54, label: label('Months on Book') },
  months_to_maturity: { type: 'int', min: 6, max: 54, label: label('Months to Maturity') },
  loan_age_pct: { type: 'float', min: 0.1, max: 0.9, label: label('Loan Age (% of Tenure)') },
  interest_rate: { type: 'float', min: 10, max: 28, label: label('Interest Rate (%)') },
  emi_amount: { type: 'float', min: 0.0001, max: 500000, label: label('Monthly EMI (INR)') },
  outstanding_balance: { type: 'float', min: 0, max: 2500000, label: label('Outstanding Balance (INR)') },
  product_subtype: { type: 'enum', values: ['Personal_Loan'], label: label('Product Subtype') },

  borrower_age: { type: 'int', min: 21, max: 65, label: label('Borrower Age') },
  employer_category: { type: 'enum', values: EMPLOYER_CATEGORY, label: label('Employer Category') },
  employer_tenure_months: { type: 'int', min: 0, max: 600, label: label('Employer Tenure (Months)') },
  monthly_income_at_origination: { type: 'float', min: 20000, max: 300000, label: label('Monthly Income at Origination (INR)') },
  salary_account_flag: { type: 'binary', label: label('Salary Account with This Bank') },
  city_tier: { type: 'enum', values: CITY_TIER, label: label('City Tier') },
  residence_type: { type: 'enum', values: RESIDENCE_TYPE, label: label('Residence Type') },
  residence_stability_months: { type: 'int', min: 0, max: 600, label: label('Residence Stability (Months)') },

  days_since_last_payment: { type: 'int', min: 1, max: 31, label: label('Days Since Last Payment') },
  last_payment_on_time_flag: { type: 'binary', label: label('Last Payment Was On Time') },
  last_payment_to_emi_ratio: { type: 'float', min: 0.81, max: 1.16, label: label('Last Payment to EMI Ratio') },

  bounce_count_3m: { type: 'int', min: 0, max: 3, label: label('EMI Bounces (Last 3 Months)') },
  bounce_count_12m: { type: 'int', sentinel: -1, min: 0, max: 7, label: label('EMI Bounces (Last 12 Months)') },
  n_payments_after_due_date_6m: { type: 'int', min: 0, max: 6, label: label('Late Payments — Caught Up (Last 6 Months)') },
  avg_days_late_6m: { type: 'float', min: -16.37, max: 37.96, label: label('Average Days Late on Payment (6M)') },
  max_days_late_6m: { type: 'int', min: 0, max: 29, label: label('Maximum Days Late on Payment (6M)') },
  late_payment_trend_6m_vs_12m: {
    type: 'float',
    sentinel: -1,
    min: -8.6,
    max: 7.21,
    label: label('Late Payment Trend (6M vs 12M)'),
  },
  nach_mandate_active: { type: 'binary', label: label('NACH Auto-Debit Mandate Active') },
  n_nach_mandate_changes_12m: { type: 'int', sentinel: -1, min: 0, max: 3, label: label('NACH Mandate Changes (Last 12 Months)') },
  payment_regularity_6m: { type: 'discrete', allowed: PAYMENT_REG_6M_VALUES, label: label('Payment Regularity (Last 6 Months)') },
  payment_regularity_12m: { type: 'discrete', allowed: PAYMENT_REG_12M_VALUES, label: label('Payment Regularity (Last 12 Months)') },

  salary_credited_last_month_flag: { type: 'tribool', label: label('Salary Credited Last Month') },
  n_months_salary_credited_6m: { type: 'int', sentinel: -1, min: 0, max: 6, label: label('Months with Salary Credit (Last 6 Months)') },
  n_months_salary_credited_12m: { type: 'int', sentinel: -1, min: 0, max: 12, label: label('Months with Salary Credit (Last 12 Months)') },
  salary_credit_trend_6m_vs_12m: { type: 'float', sentinel: -1, min: -1, max: 1, label: label('Salary Credit Trend (6M vs 12M)') },
  avg_salary_credit_amount_6m: { type: 'float', sentinel: -1, min: 20000, max: 300000, label: label('Average Salary Credit Amount — 6M (INR)') },
  salary_credit_volatility_6m: { type: 'float', sentinel: -1, min: 0, max: 2, label: label('Salary Credit Volatility (Last 6 Months)') },
  days_since_last_salary_credit: { type: 'int', min: 0, max: 120, label: label('Days Since Last Salary Credit') },

  avg_balance_at_emi_due_3m: { type: 'float', min: 0, max: 5000000, label: label('Avg Balance at EMI Due (3M, INR)') },
  min_balance_at_emi_due_3m: { type: 'float', min: 279.74, max: 378574.22, label: label('Minimum Balance on EMI Due Date (3M, INR)') },
  n_account_debits_bounced_6m: { type: 'int', min: 0, max: 6, label: label('Bounced Debits on Bank Account (Last 6 Months)') },
  ratio_emi_to_avg_credit_inflow_3m: { type: 'float', min: 0.001, max: 3, label: label('EMI to Avg Credit Inflow Ratio (3M)') },

  cibil_score_at_origination: { type: 'int', min: 300, max: 900, label: label('CIBIL Score at Origination') },
  cibil_score_at_observation: { type: 'int', min: 300, max: 900, label: label('Current CIBIL Score') },
  cibil_change_since_origination: { type: 'int', min: -600, max: 600, label: label('CIBIL Score Change Since Loan Origination') },
  cibil_change_3m: { type: 'int', min: -600, max: 600, label: label('CIBIL Score Change (Last 3 Months)') },
  cibil_change_6m: { type: 'int', min: -600, max: 600, label: label('CIBIL Score Change (Last 6 Months)') },
  cibil_change_12m: { type: 'int', sentinel: -1, min: -600, max: 600, label: label('CIBIL Score Change (Last 12 Months)') },
  cibil_trend_flag_deteriorating: { type: 'binary', label: label('CIBIL Score on Deteriorating Trend') },
  cibil_volatility_12m: { type: 'float', sentinel: -1, min: 0.6, max: 75.65, label: label('CIBIL Score Volatility (Last 12 Months)') },

  n_active_tradelines: { type: 'int', min: 1, max: 15, label: label('Number of Active Loan/Credit Accounts') },
  n_new_tradelines_6m: { type: 'int', min: 0, max: 5, label: label('New Credit Accounts Opened (Last 6 Months)') },
  n_delinquent_elsewhere_30plus: { type: 'int', min: 0, max: 10, label: label('Accounts 30+ DPD at Other Lenders') },
  n_delinquent_elsewhere_30plus_3m_change: { type: 'int', min: -2, max: 2, label: label('Change in Other-Lender Delinquencies (3M)') },

  bureau_total_outstanding: { type: 'float', min: 16038, max: 2674966, label: label('Total Outstanding Across All Lenders (INR)') },
  bureau_total_outstanding_change_3m: { type: 'float', min: -186405, max: 316401, label: label('Change in Total Outstanding (Last 3 Months, INR)') },
  bureau_utilization: { type: 'float', min: 0, max: 1, label: label('Revolving Credit Utilization (Bureau)') },
  bureau_utilization_change_3m: { type: 'float', min: -1, max: 1, label: label('Revolving Utilization Change (Last 3 Months)') },
  credit_card_utilization: { type: 'float', min: 0, max: 1, label: label('Credit Card Utilization') },
  credit_card_utilization_change_3m: { type: 'float', min: -1, max: 1, label: label('Credit Card Utilization Change (Last 3 Months)') },

  n_inquiries_3m: { type: 'int', min: 0, max: 8, label: label('Credit Inquiries (Last 3 Months)') },
  n_inquiries_6m: { type: 'int', min: 0, max: 10, label: label('Credit Inquiries (Last 6 Months)') },
  n_inquiries_12m: { type: 'int', min: 0, max: 11, label: label('Credit Inquiries (Last 12 Months)') },

  bureau_overdue_amount_at_observation: { type: 'float', min: 0, max: 56621, label: label('Total Overdue Amount Across Bureau (INR)') },
  bureau_overdue_change_3m: { type: 'float', min: -8062, max: 31538, label: label('Change in Bureau Overdue Amount (Last 3 Months, INR)') },
  oldest_tradeline_months: { type: 'int', min: 7, max: 146, label: label('Age of Oldest Credit Account (Months)') },

  foir_at_origination: { type: 'float', min: 0.2, max: 0.7, label: label('Fixed Obligation to Income Ratio at Origination') },
  current_foir: { type: 'float', min: 0.01, max: 0.85, label: label('Current Fixed Obligation to Income Ratio') },
  foir_change_since_origination: { type: 'float', min: -1, max: 1, label: label('FOIR Change Since Origination') },
  emi_burden_ratio: { type: 'float', min: 0.01, max: 7.15, label: label("This Loan's EMI as % of Income") },
  outstanding_to_income_ratio: { type: 'float', min: 0.14, max: 90.15, label: label('Outstanding Balance to Monthly Income Ratio') },

  n_product_holdings: { type: 'int', min: 1, max: 8, label: label('Number of Products Held with This Bank') },
  cross_sell_acceptance_rate_12m: { type: 'float', min: 0, max: 1, label: label('Cross-sell Acceptance Rate (12M)') },
  digital_banking_engagement_score: { type: 'float', min: 0, max: 1, label: label('Digital Banking Engagement Score') },
  n_customer_service_complaints_6m: { type: 'int', min: 0, max: 5, label: label('Customer Service Complaints (Last 6 Months)') },
  n_disputes_raised_12m: { type: 'int', sentinel: -1, min: 0, max: 3, label: label('Disputes Raised (Last 12 Months)') },

  employer_industry: { type: 'enum', values: EMPLOYER_INDUSTRY, label: label('Employer Industry') },
  employer_industry_stress_flag: { type: 'binary', label: label('Employer Industry Under Stress') },
  employer_distress_news_flag_6m: { type: 'binary', label: label('Employer Distress News in Last 6 Months') },

  region_unemployment_rate: { type: 'float', min: 0, max: 25, label: label('Region Unemployment Rate (%)') },
  days_since_last_bank_interaction: { type: 'int', min: 1, max: 37, label: label('Days Since Last Bank Interaction') },
  n_transactions_last_30d: { type: 'int', min: 0, max: 200, label: label('Bank Transactions (Last 30 Days)') },
  n_transactions_change_3m: { type: 'int', min: -100, max: 50, label: label('Transaction Count Change (Last 3 Months)') },
  address_change_flag_12m: { type: 'binary', label: label('Address Changed in Last 12 Months') },
  mobile_change_flag_12m: { type: 'tribool', label: label('Mobile Number Changed in Last 12 Months') },
  unemployment_rate_national: { type: 'float', min: 0, max: 25, label: label('National Unemployment Rate (%)') },
  inflation_rate: { type: 'float', min: 2, max: 10, label: label('Inflation Rate (%)') },
  downturn_period_flag: { type: 'binary', label: label('Macro Downturn Period') },
};

INTERNAL_DERIVED.forEach((key) => {
  if (!EWS_FIELD_RULES[key]) {
    EWS_FIELD_RULES[key] = { type: 'float', editable: false, label: label(key) };
  } else {
    EWS_FIELD_RULES[key] = { ...EWS_FIELD_RULES[key], editable: false };
  }
});

export const resolveEwsFieldRules = () => {
  const out = {};
  Object.keys(EWS_FIELD_RULES).forEach((k) => {
    out[k] = { ...EWS_FIELD_RULES[k], editable: EWS_FIELD_RULES[k].editable !== false };
  });
  return out;
};

export const validateEwsValue = (field, value, rules = EWS_FIELD_RULES) => {
  const rule = rules[field];
  if (!rule || rule.editable === false) return null;

  if (rule.type === 'text') return null;

  if (rule.type === 'enum') {
    const str = String(value);
    if (!rule.values.includes(str)) {
      return `"${rule.label}" must be one of: ${rule.values.join(', ')}.`;
    }
    return null;
  }

  if (rule.type === 'binary') {
    const n = Number(value);
    if (n !== 0 && n !== 1) {
      return `"${rule.label}" must be 0 or 1.`;
    }
    return null;
  }

  if (rule.type === 'tribool') {
    const n = Number(value);
    if (n !== -1 && n !== 0 && n !== 1) {
      return `"${rule.label}" must be -1, 0, or 1.`;
    }
    return null;
  }

  if (rule.type === 'discrete') {
    const n = Number(value);
    if (!Number.isFinite(n)) return `"${rule.label}" must be a number.`;
    if (!inDiscrete(n, rule.allowed)) {
      return `"${rule.label}" must match an allowed payment regularity value.`;
    }
    return null;
  }

  const n = Number(value);
  if (!Number.isFinite(n)) {
    return `"${rule.label}" must be a valid number.`;
  }

  if (rule.sentinel != null && near(n, rule.sentinel)) {
    return null;
  }

  if (rule.min != null && n < rule.min) {
    return `"${rule.label}" must be >= ${rule.min}.`;
  }
  if (rule.max != null && n > rule.max) {
    return `"${rule.label}" must be <= ${rule.max}.`;
  }

  if (rule.type === 'int' && !Number.isInteger(n)) {
    return `"${rule.label}" must be an integer.`;
  }

  return null;
};

export const validateEwsRowCrossFields = (row) => {
  const n3 = Number(row.n_inquiries_3m);
  const n6 = Number(row.n_inquiries_6m);
  const n12 = Number(row.n_inquiries_12m);
  if (Number.isFinite(n3) && Number.isFinite(n6) && n6 < n3) {
    return 'Credit inquiries (6M) must be >= inquiries (3M).';
  }
  if (Number.isFinite(n6) && Number.isFinite(n12) && n12 < n6) {
    return 'Credit inquiries (12M) must be >= inquiries (6M).';
  }

  const mob = Number(row.months_on_book);
  const oldest = Number(row.oldest_tradeline_months);
  if (Number.isFinite(mob) && Number.isFinite(oldest) && oldest < mob) {
    return 'Age of oldest tradeline (months) must be >= months on book.';
  }

  const loanAmt = Number(row.loan_amount);
  const ob = Number(row.outstanding_balance);
  if (Number.isFinite(loanAmt) && Number.isFinite(ob) && ob > loanAmt) {
    return 'Outstanding balance must be <= loan amount.';
  }

  const bureauTot = Number(row.bureau_total_outstanding);
  if (Number.isFinite(bureauTot) && Number.isFinite(ob) && bureauTot < ob) {
    return 'Total bureau outstanding must be >= this loan outstanding balance.';
  }

  const age = Number(row.borrower_age);
  const maxStable = Math.max(0, (age - 18) * 12);
  const et = Number(row.employer_tenure_months);
  const rs = Number(row.residence_stability_months);
  if (Number.isFinite(age) && Number.isFinite(et) && et > maxStable) {
    return 'Employer tenure cannot exceed (borrower age − 18) × 12 months.';
  }
  if (Number.isFinite(age) && Number.isFinite(rs) && rs > maxStable) {
    return 'Residence stability cannot exceed (borrower age − 18) × 12 months.';
  }

  return null;
};
