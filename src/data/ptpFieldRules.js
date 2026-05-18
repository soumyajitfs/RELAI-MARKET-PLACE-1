const L = (s) => s;

const PRODUCT_SUBTYPE = ['Balance_Transfer_Loan', 'Flexi_Loan', 'Personal_Loan', 'Top_Up_Loan'];
const EMPLOYER_CATEGORY = ['Government', 'Informal', 'Large_Private', 'PSU', 'Self_Employed', 'Small_Private', 'Unemployed'];
const LAST_PTP_OUTCOME = ['Broken', 'Full_Kept', 'Late_Kept', 'No_Prior_PTP', 'Partial_Kept'];
const PTP_COMMITMENT = ['Conditional', 'Firm', 'Vague'];
const REASON_DELINQ = [
  'Business_Loss',
  'Dispute',
  'Family',
  'Forgot',
  'Job_Loss',
  'Liquidity',
  'Medical',
  'Not_Disclosed',
  'Other',
];
const CONTACT_CHANNEL = ['Call', 'Email', 'Field_Visit', 'IVR', 'SMS', 'WhatsApp'];
const CALL_DURATION_BUCKET = ['Long', 'Medium', 'Non_Voice', 'Short', 'Very_Long', 'Very_Short'];
const PREFERRED_CHANNEL = ['Call', 'Email', 'Field_Visit', 'SMS', 'Unknown', 'WhatsApp'];
const IVR_OUTCOME = ['Agent_Transfer', 'Hang_Up', 'No_IVR', 'Self_Service_Paid', 'Self_Service_Promise'];

/** @type {Record<string, any>} */
export const PTP_FIELD_RULES = {
  ptp_id: { type: 'text', editable: false, label: L('PTP ID') },

  is_restructured_flag: { type: 'binary', label: L('Loan Restructured') },
  moratorium_exited_flag: { type: 'binary', label: L('Moratorium Exited') },
  is_cosigner_on_loan_flag: { type: 'binary', label: L('Co-signer on Loan') },
  salary_account_flag: { type: 'binary', label: L('Salary Account') },
  roll_rate_flag_current_to_next_bucket: { type: 'binary', label: L('Roll Rate to Next DPD Bucket') },
  never_cured_flag_12m: { type: 'binary', label: L('Never Cured Delinquency (12M)') },
  nach_mandate_active: { type: 'binary', label: L('NACH Mandate Active') },
  digital_payment_enabled_flag: { type: 'binary', label: L('Digital Payment Enabled') },
  first_time_ptp_flag: { type: 'binary', label: L('First-Time PTP') },
  ptp_aligned_with_salary: { type: 'binary', label: L('PTP Aligned with Salary Date') },
  ptp_amount_rounded_flag: { type: 'binary', label: L('PTP Amount Rounded') },
  right_party_contact_flag: { type: 'binary', label: L('Right Party Contact') },
  digital_payment_link_sent_flag: { type: 'binary', label: L('Digital Payment Link Sent') },
  digital_payment_link_clicked_flag: { type: 'binary', label: L('Digital Payment Link Clicked') },
  salary_credited_flag_last_30d: { type: 'binary', label: L('Salary Credited (Last 30D)') },
  salary_date_passed_flag: { type: 'binary', label: L('Salary Date Passed This Month') },
  is_month_end_flag: { type: 'binary', label: L('PTP in Last 5 Days of Month') },
  is_festival_period_flag: { type: 'binary', label: L('Festival Period PTP') },

  sequence_number: { type: 'int', min: 1, max: 12, label: L('Sequential PTP Number') },
  contact_hour: { type: 'int', min: 9, max: 20, label: L('Contact Hour (24h)') },
  days_to_ptp_date: { type: 'int', min: 1, max: 30, label: L('Days to PTP Date') },
  months_on_book: { type: 'int', min: 3, max: 39, label: L('Months on Book') },
  borrower_age: { type: 'int', min: 24, max: 61, label: L('Borrower Age') },
  salary_date_day_of_month: { type: 'int', min: 0, max: 31, label: L('Salary Day of Month') },
  dpd_days: { type: 'int', min: 0, max: 364, label: L('DPD Days') },
  dpd_bucket: { type: 'int', min: 0, max: 5, label: L('DPD Bucket') },
  max_dpd_6m: { type: 'int', min: 0, max: 421, label: L('Max DPD (6M)') },
  consecutive_months_delinq: { type: 'int', min: 0, max: 12, label: L('Consecutive Months Delinquent') },
  dpd_cycles_in_current_delinquency: { type: 'int', min: 0, max: 13, label: L('DPD Cycles (Current Episode)') },
  bounce_count_6m: { type: 'int', min: 0, max: 6, label: L('Bounces (6M)') },
  days_since_last_payment: { type: 'int', min: 0, max: 257, label: L('Days Since Last Payment') },
  n_payments_last_6m: { type: 'int', min: 0, max: 6, label: L('Payments (Last 6M)') },
  prev_ptp_count_lifetime: { type: 'int', min: 0, max: 11, label: L('Prior PTPs (Lifetime)') },
  hist_ptp_count_3m: { type: 'int', min: 0, max: 4, label: L('PTPs (Last 3M)') },
  hist_ptp_count_12m: { type: 'int', min: 0, max: 10, label: L('PTPs (Last 12M)') },
  consecutive_broken_ptps: { type: 'int', min: 0, max: 10, label: L('Consecutive Broken PTPs') },
  avg_days_to_ptp_hist: { type: 'int', min: 1, max: 30, label: L('Avg Days to Fulfil PTP (Hist.)') },
  ptp_day_of_week: { type: 'int', min: 0, max: 6, label: L('PTP Day of Week (0=Mon)') },
  contact_attempt_number: { type: 'int', min: 1, max: 23, label: L('Contact Attempt Number') },
  call_duration_sec: { type: 'int', min: 0, max: 3996, label: L('Call Duration (sec)'), sentinel: 999 },
  n_contacts_last_30d: { type: 'int', min: 1, max: 33, label: L('Contacts (Last 30D)') },
  n_successful_contacts_last_30d: { type: 'int', min: 1, max: 18, label: L('Successful Contacts (30D)') },
  n_unsuccessful_contacts_last_30d: { type: 'int', min: 0, max: 26, label: L('Unsuccessful Contacts (30D)') },
  rpc_count_last_30d: { type: 'int', min: 0, max: 13, label: L('RPC Count (30D)') },
  days_since_last_rpc: { type: 'int', min: 1, max: 9999, label: L('Days Since Last RPC') },
  cumulative_call_minutes_last_30d: { type: 'int', min: 0, max: 329, label: L('Call Minutes (30D)') },
  credit_score: { type: 'int', min: 408, max: 900, label: L('Credit Score (CIBIL)') },
  cibil_change_6m: { type: 'int', min: -82, max: 46, label: L('CIBIL Change (6M)') },
  cibil_change_since_origination: { type: 'int', min: -160, max: 63, label: L('CIBIL Change Since Origination') },
  n_delinquent_elsewhere: { type: 'int', min: 0, max: 8, label: L('Other Delinquent Loans') },
  n_new_enquiries_3m: { type: 'int', min: 0, max: 8, label: L('New Enquiries (3M)') },
  agent_experience_months: { type: 'int', min: 7, max: 109, label: L('Agent Experience (Months)') },
  agent_tenure_on_this_account_months: { type: 'int', min: 0, max: 14, label: L('Agent Tenure on Account') },
  n_agents_worked_this_account_12m: { type: 'int', min: 0, max: 7, label: L('Agents on Account (12M)') },
  month_of_year: { type: 'int', min: 1, max: 12, label: L('Month of Year') },
  days_since_salary_credit: { type: 'int', min: 1, max: 9999, label: L('Days Since Salary Credit') },

  emi_amount: { type: 'float', min: 1112.04, max: 160593.88, label: L('EMI Amount (INR)') },
  outstanding_balance: { type: 'float', min: 2681.65, max: 2009139.37, label: L('Outstanding Balance (INR)') },
  monthly_income: { type: 'float', min: 20000, max: 300000, label: L('Monthly Income (INR)') },
  ptp_amount: { type: 'float', min: 1000, max: 175938.96, label: L('PTP Amount (INR)') },
  payment_regularity: { type: 'float', min: 0, max: 1, label: L('Payment Regularity') },
  hist_ptp_kept_rate_lifetime: { type: 'float', min: 0, max: 1, label: L('PTP Kept Rate (Lifetime)') },
  hist_ptp_kept_rate_3m: { type: 'float', min: 0, max: 1, label: L('PTP Kept Rate (3M)') },
  hist_ptp_kept_rate_12m: { type: 'float', min: 0, max: 1, label: L('PTP Kept Rate (12M)') },
  ptp_partial_kept_rate_hist: { type: 'float', min: 0, max: 1, label: L('Partial PTP Kept Rate (Hist.)') },
  avg_ptp_amount_to_emi_hist: { type: 'float', min: 0.68, max: 1.26, label: L('Avg PTP Amount / EMI (Hist.)') },
  ptp_to_emi_ratio: { type: 'float', min: 0.63, max: 1.29, label: L('PTP / EMI Ratio') },
  ptp_to_outstanding_ratio: { type: 'float', min: 0.02, max: 1.18, label: L('PTP / Outstanding Ratio') },
  ptp_day_of_week_sin: { type: 'float', min: -0.97, max: 0.97, label: L('PTP DOW (sin)') },
  ptp_day_of_week_cos: { type: 'float', min: -0.9, max: 1.0, label: L('PTP DOW (cos)') },
  borrower_sentiment_score: { type: 'float', min: 0, max: 1, label: L('Borrower Sentiment Score') },
  contactability_score_3m: { type: 'float', min: 0, max: 1, label: L('Contactability Score (3M)') },
  response_rate_to_sms_last_6m: { type: 'float', min: -1, max: 0.96, label: L('SMS Response Rate (6M)') },
  current_foir: { type: 'float', min: 0.08, max: 1.5, label: L('Current FOIR') },
  income_to_emi_ratio: { type: 'float', min: 0.19, max: 100.51, label: L('Income / EMI Ratio') },
  outstanding_to_income_ratio: { type: 'float', min: 0.04, max: 63.37, label: L('Outstanding / Income Ratio') },
  bureau_overdue_amount_change_3m: { type: 'float', min: -69415.96, max: 89738.34, label: L('Bureau Overdue Change (3M, INR)') },
  agent_ptp_kept_rate_overall: { type: 'float', min: 0.3, max: 0.75, label: L('Agent PTP Kept Rate (Overall)') },
  agent_ptp_kept_rate_on_similar_borrowers: { type: 'float', min: 0.05, max: 0.95, label: L('Agent Kept Rate (Similar)') },
  unemployment_rate_state: { type: 'float', min: 3, max: 12, label: L('State Unemployment Rate (%)') },

  product_subtype: { type: 'enum', values: PRODUCT_SUBTYPE, label: L('Product Subtype') },
  employer_category: { type: 'enum', values: EMPLOYER_CATEGORY, label: L('Employer Category') },
  last_ptp_outcome: { type: 'enum', values: LAST_PTP_OUTCOME, label: L('Last PTP Outcome') },
  ptp_commitment_strength: { type: 'enum', values: PTP_COMMITMENT, label: L('PTP Commitment Strength') },
  reason_for_delinquency: { type: 'enum', values: REASON_DELINQ, label: L('Reason for Delinquency') },
  contact_channel: { type: 'enum', values: CONTACT_CHANNEL, label: L('Contact Channel') },
  call_duration_bucket: { type: 'enum', values: CALL_DURATION_BUCKET, label: L('Call Duration Bucket') },
  preferred_contact_channel: { type: 'enum', values: PREFERRED_CHANNEL, label: L('Preferred Contact Channel') },
  ivr_response_outcome: { type: 'enum', values: IVR_OUTCOME, label: L('IVR Response Outcome') },
};

export const resolvePtpFieldRules = () => {
  const out = {};
  Object.keys(PTP_FIELD_RULES).forEach((k) => {
    out[k] = { ...PTP_FIELD_RULES[k], editable: PTP_FIELD_RULES[k].editable !== false };
  });
  return out;
};

const near = (a, b, eps = 1e-9) => Math.abs(Number(a) - Number(b)) < eps;

export const validatePtpValue = (field, value, rules = PTP_FIELD_RULES) => {
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
    if (n !== 0 && n !== 1) return `"${rule.label}" must be 0 or 1.`;
    return null;
  }

  const n = Number(value);
  if (!Number.isFinite(n)) return `"${rule.label}" must be a valid number.`;

  if (field === 'days_since_salary_credit' || field === 'days_since_last_rpc') {
    if (n === 9999) return null;
    if (n < 1 || n > 365) return `"${rule.label}" must be 1–365 or 9999 (not applicable).`;
    return null;
  }

  if (field === 'call_duration_sec' && rule.sentinel != null) {
    if (near(n, rule.sentinel)) return null;
  }

  if (field === 'response_rate_to_sms_last_6m') {
    if (near(n, -1)) return null;
    if (n < 0 || n > 0.96) return `"${rule.label}" must be -1 (no SMS) or between 0 and 0.96.`;
    return null;
  }

  if (rule.sentinel != null && near(n, rule.sentinel)) return null;

  if (rule.min != null && n < rule.min) return `"${rule.label}" must be >= ${rule.min}.`;
  if (rule.max != null && n > rule.max) return `"${rule.label}" must be <= ${rule.max}.`;

  if (rule.type === 'int' && !Number.isInteger(n)) {
    return `"${rule.label}" must be an integer.`;
  }

  return null;
};

export const validatePtpRowCrossFields = (row) => {
  const nc = Number(row.n_contacts_last_30d);
  const ns = Number(row.n_successful_contacts_last_30d);
  if (Number.isFinite(nc) && Number.isFinite(ns) && ns > nc) {
    return 'Successful contacts (30D) cannot exceed total contacts (30D).';
  }
  const h3 = Number(row.hist_ptp_count_3m);
  const h12 = Number(row.hist_ptp_count_12m);
  if (Number.isFinite(h3) && Number.isFinite(h12) && h3 > h12) {
    return 'PTP count (3M) cannot exceed PTP count (12M).';
  }
  return null;
};
