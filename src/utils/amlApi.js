// AML (Alert Prioritization) backend API
// In development, requests to /api/aml are proxied to the Azure AML backend via setupProxy.js

const AUTH_TOKEN = '997hhEo876NHJo2AMbXl1i78895deK';
const AML_REMOTE_BASE = 'https://ml-market-backend-aml.azurewebsites.net';

/**
 * Make AML request via local proxy first.
 * If proxy is stale/missing (404), fallback to direct AML backend URL.
 */
const amlRequest = async (path, options) => {
  let response;
  try {
    response = await fetch(path, options);
  } catch (_) {
    response = null;
  }

  if (!response || response.status === 404 || !(response.headers.get('content-type') || '').includes('application/json')) {
    const directUrl = `${AML_REMOTE_BASE}${path}`;
    response = await fetch(directUrl, options);
  }

  return response;
};

const toNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const toInt = (v, fallback = 0) => Math.trunc(toNumber(v, fallback));

/**
 * Convert edited frontend row values into the API payload shape.
 * API expects mixed camelCase and snake_case keys exactly as defined here.
 */
export const transformAmlAccountToApi = (account) => ({
  accountId: toInt(account.accountId),
  kycRiskScore: toInt(account.kycRiskScore),
  income: toNumber(account.income),
  tenureMonths: toInt(account.tenureMonths),
  creditScore: toInt(account.creditScore),
  nbrPurchases90d: toInt(account.nbrPurchases90d),
  avgTxnSize90d: toNumber(account.avgTxnSize90d),
  totalSpend90d: toNumber(account.totalSpend90d),
  nbrDistinctMerch90d: toInt(account.nbrDistinctMerch90d),
  nbrMerchCredits90d: toInt(account.nbrMerchCredits90d),
  nbrMerchCreditsRndDollarAmt90d: toInt(account.nbrMerchCreditsRndDollarAmt90d),
  totalMerchCred90d: toNumber(account.totalMerchCred90d),
  nbrMerchCreditsWoOffsettingPurch: toInt(account.nbrMerchCreditsWoOffsettingPurch),
  nbrPayments90d: toInt(account.nbrPayments90d),
  totalPaymentAmt90d: toNumber(account.totalPaymentAmt90d),
  overpaymentAmt90d: toNumber(account.overpaymentAmt90d),
  indCustReqRefund90d: toInt(account.indCustReqRefund90d),
  totalRefundsToCust90d: toNumber(account.totalRefundsToCust90d),
  nbrPaymentsCashLike90d: toInt(account.nbrPaymentsCashLike90d),
  maxRevolveLine: toNumber(account.maxRevolveLine),
  indOwnsHome: toInt(account.indOwnsHome),
  nbrInquiries1y: toInt(account.nbrInquiries1y),
  nbrCollections3y: toInt(account.nbrCollections3y),
  nbrPointRed90d: toInt(account.nbrPointRed90d),
  PEP: toInt(account.PEP),
  txn_per_month: toNumber(account.txn_per_month),
  credit_utilization: toNumber(account.credit_utilization),
  risk_score_income_ratio: toNumber(account.risk_score_income_ratio),
  high_value_txn_ind: toInt(account.high_value_txn_ind),
  frequent_logins: toInt(account.frequent_logins),
});

/**
 * GET /api/aml/accounts/generate?
 * Fetches AML sample accounts. Backend defaults to 5 rows when n is omitted.
 */
export const fetchAmlAccounts = async () => {
  const response = await amlRequest('/api/aml/accounts/generate?', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  if (json.Response?.StatusCode !== 200) {
    throw new Error(json.Response?.Message || 'API returned an error');
  }

  const rows = json.Response.ResponseInfo?.data || [];
  return rows.map((row, idx) => ({ ...row, __rowId: `${row.accountId}-${idx}` }));
};

const transformPredictionResult = (apiResult) => {
  const probabilityPercentRaw = String(apiResult.probability_percent || '').replace('%', '');
  const probabilityPercent = probabilityPercentRaw ? parseFloat(probabilityPercentRaw) : null;

  return {
    accountId: apiResult.acct_id,
    probability: apiResult.probability,
    probabilityPercent,
    category: apiResult.category,
    shapValues: apiResult.shap_values || [],
  };
};

/**
 * POST /api/aml/accounts/predict
 * Sends AML accounts to backend and merges output onto original input rows.
 */
export const predictAmlAccounts = async (accounts) => {
  const apiPayload = accounts.map(transformAmlAccountToApi);

  const response = await amlRequest('/api/aml/accounts/predict', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
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
    } catch (_) {
      // Ignore parse errors and keep generic status detail
    }
    throw new Error(`Prediction failed (${response.status}): ${detail}`);
  }

  const json = await response.json();
  if (json.Response?.StatusCode !== 200) {
    throw new Error(json.Response?.Message || 'Prediction API returned an error');
  }

  const rawResults = json.Response.ResponseInfo?.data || [];
  const transformed = rawResults.map(transformPredictionResult);

  // Keep duplicate accountId rows safe by queueing predictions per accountId.
  const predictionQueues = new Map();
  transformed.forEach((result) => {
    const key = result.accountId;
    if (!predictionQueues.has(key)) predictionQueues.set(key, []);
    predictionQueues.get(key).push(result);
  });

  return accounts.map((acc) => {
    const queue = predictionQueues.get(acc.accountId);
    const nextPrediction = queue && queue.length > 0 ? queue.shift() : null;
    return nextPrediction ? { ...acc, ...nextPrediction } : acc;
  });
};
