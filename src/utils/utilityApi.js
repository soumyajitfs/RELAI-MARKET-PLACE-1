// Utility backend API for Customer Propensity to Pay
// In development, requests to /api/utilities are proxied to the Azure utility backend via setupProxy.js

const AUTH_TOKEN = '997hhEo876NHJo2AMbXl1i78895deK';
const UTILITY_REMOTE_BASE = 'https://ml-market-backend-utility.azurewebsites.net';

const utilityRequest = async (path, options) => {
  let response;
  try {
    response = await fetch(path, options);
  } catch (_) {
    response = null;
  }

  if (!response || response.status === 404 || !(response.headers.get('content-type') || '').includes('application/json')) {
    const directUrl = `${UTILITY_REMOTE_BASE}${path}`;
    response = await fetch(directUrl, options);
  }

  return response;
};

/**
 * Column display labels for the Utility data table.
 * Maps API snake_case keys → human-readable column headers.
 */
export const UTILITY_COLUMNS = [
  { key: 'acctId',                label: 'Account ID' },
  { key: 'budgetBillingFlag',     label: 'Budget Billing' },
  { key: 'lowIncomeFlag',         label: 'Low Income' },
  { key: 'pctOnTimePayments12m',  label: 'On-Time Payments (12m)' },
  { key: 'paymentChannelPrimary', label: 'Payment Channel' },
  { key: 'arrearsBalance',        label: 'Arrears Balance ($)' },
  { key: 'maxDpd12m',             label: 'Max DPD (12m)' },
  { key: 'delinquencyCount12m',   label: 'Delinquency Count (12m)' },
  { key: 'rpcSuccessRatio',       label: 'RPC Success Ratio' },
  { key: 'ptpKeptCount',          label: 'PTP Kept' },
  { key: 'ptpBrokenCount',        label: 'PTP Broken' },
  { key: 'arrangementEnrolledFlag', label: 'Arrangement Enrolled' },
  { key: 'tuScore',               label: 'TU Score' },
  { key: 'complaintCount',        label: 'Complaints' },
];

/**
 * Transform a single account from API snake_case → app camelCase.
 */
const transformUtilityAccount = (apiAccount) => ({
  acctId:                 apiAccount.acct_id,
  budgetBillingFlag:      apiAccount.budget_billing_flag,
  lowIncomeFlag:          apiAccount.low_income_flag,
  pctOnTimePayments12m:   apiAccount.pct_on_time_payments_12m,
  paymentChannelPrimary:  apiAccount.payment_channel_primary,
  arrearsBalance:         apiAccount.arrears_balance,
  maxDpd12m:              apiAccount.max_dpd_12m,
  delinquencyCount12m:    apiAccount.delinquency_count_12m,
  rpcSuccessRatio:        apiAccount.rpc_success_ratio,
  ptpKeptCount:           apiAccount.ptp_kept_count,
  ptpBrokenCount:         apiAccount.ptp_broken_count,
  arrangementEnrolledFlag: apiAccount.arrangement_enrolled_flag,
  tuScore:                apiAccount.tu_score,
  complaintCount:         apiAccount.complaint_count,
});

/**
 * Transform a single account from app camelCase → API snake_case (for predict endpoint).
 *
 * IMPORTANT — The backend Pydantic schema requires EXACT types:
 *   int  : acct_id, max_dpd_12m, delinquency_count_12m, ptp_kept_count,
 *          ptp_broken_count, tu_score, complaint_count
 *   float: pct_on_time_payments_12m, arrears_balance, rpc_success_ratio
 *   str  : budget_billing_flag ("Yes"/"No"), low_income_flag ("Yes"/"No"),
 *          arrangement_enrolled_flag ("Yes"/"No"),
 *          payment_channel_primary ("Online"/"Agent"/"IVR"/"Cash")
 *
 * Helpers guarantee correct JSON types even when values come from edited <input> fields
 * (which can store strings or empty values).
 */
const safeInt = (v, fallback = 0) => { const n = parseInt(v, 10); return isNaN(n) ? fallback : n; };
const safeFloat = (v, fallback = 0) => { const n = parseFloat(v); return isNaN(n) ? fallback : n; };
const clampInt = (v, min, max, fallback = 0) => Math.min(max, Math.max(min, safeInt(v, fallback)));
const clampFloat = (v, min, max, fallback = 0) => Math.min(max, Math.max(min, safeFloat(v, fallback)));

const transformUtilityAccountToApi = (account) => ({
  acct_id:                   clampInt(account.acctId, 10000, 40000, 10000),
  budget_billing_flag:       String(account.budgetBillingFlag || 'No'),
  low_income_flag:           String(account.lowIncomeFlag || 'No'),
  pct_on_time_payments_12m:  clampFloat(account.pctOnTimePayments12m, 0, 1),
  payment_channel_primary:   String(account.paymentChannelPrimary || 'Online'),
  arrears_balance:           clampFloat(account.arrearsBalance, 0, 100000),
  max_dpd_12m:               clampInt(account.maxDpd12m, 0, 60),
  delinquency_count_12m:     clampInt(account.delinquencyCount12m, 0, 12),
  rpc_success_ratio:         clampFloat(account.rpcSuccessRatio, 0, 1),
  ptp_kept_count:            clampInt(account.ptpKeptCount, 0, 12),
  ptp_broken_count:          clampInt(account.ptpBrokenCount, 0, 12),
  arrangement_enrolled_flag: String(account.arrangementEnrolledFlag || 'No'),
  tu_score:                  clampInt(account.tuScore, 300, 850, 300),
  complaint_count:           clampInt(account.complaintCount, 0, 10),
});

/**
 * Transform a single prediction result from the API response.
 *
 * Actual API response fields:
 *   acct_id: 30253
 *   probability: 0.148
 *   probability_percent: "14.8%"
 *   category: "High"
 *   tu_score: 700
 *   shap_values: [{ feature: "TU Score", impact: 2.831 }, ...]
 */
const transformPredictionResult = (apiResult) => {
  const result = {
    acctId: apiResult.acct_id,
  };

  // probability: 0.148 (raw float)
  if (apiResult.probability != null) {
    result.probability = apiResult.probability;
  }

  // probability_percent: "14.8%" → 14.8
  if (apiResult.probability_percent != null) {
    const pctStr = String(apiResult.probability_percent).replace('%', '');
    result.probabilityPercent = parseFloat(pctStr);
  }

  // category: "High" / "Medium" / "Low"
  if (apiResult.category != null) {
    result.category = apiResult.category;
  }

  // shap_values (if present)
  if (apiResult.shap_values) {
    result.shapValues = apiResult.shap_values;
  }

  return result;
};

/**
 * GET /api/utilities/accounts/generate
 * Fetches sample utility customer accounts from the backend.
 * By default returns 5 records.
 */
export const fetchUtilityAccounts = async () => {
  const response = await utilityRequest('/api/utilities/accounts/generate?', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  if (json.Response.StatusCode !== 200) {
    throw new Error(json.Response.Message || 'API returned an error');
  }

  const data = json.Response.ResponseInfo.data;
  return data.map(transformUtilityAccount);
};

/**
 * POST /api/utilities/accounts/predict
 * Sends accounts to the backend for prediction.
 * Returns prediction results merged with original account data.
 */
export const predictUtilityAccounts = async (accounts) => {
  const apiPayload = accounts.map(transformUtilityAccountToApi);

  const response = await utilityRequest('/api/utilities/accounts/predict', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(apiPayload),
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const errBody = await response.json();
      if (errBody.detail) {
        detail = Array.isArray(errBody.detail)
          ? errBody.detail.map(d => d.msg || JSON.stringify(d)).join('; ')
          : String(errBody.detail);
      }
    } catch (_) { /* ignore parse errors */ }
    throw new Error(`Prediction failed (${response.status}): ${detail}`);
  }

  const json = await response.json();

  if (json.Response?.StatusCode !== 200) {
    throw new Error(json.Response?.Message || 'Prediction API returned an error');
  }

  const rawResults = json.Response.ResponseInfo.data;

  // Transform API results and merge with original account data
  const predictionMap = new Map(
    rawResults.map(r => [r.acct_id, transformPredictionResult(r)])
  );

  // Merge: overlay prediction output onto original account input fields
  const mergedResults = accounts.map(acc => {
    const prediction = predictionMap.get(acc.acctId);
    if (prediction) {
      return { ...acc, ...prediction };
    }
    return acc;
  });

  return mergedResults;
};
