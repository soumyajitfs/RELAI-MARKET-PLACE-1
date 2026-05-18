// Real backend API for Patient Collectability
// In development, requests to /api are proxied to the Azure backend via setupProxy.js
// This avoids CORS issues when calling from localhost
const HCC_REMOTE_BASE = 'https://ml-market-backend-hcc.azurewebsites.net';
const AUTH_TOKEN = '997hhEo876NHJo2AMbXl1i78895deK';

/**
 * Transform a single account from the API's snake_case format
 * to the app's camelCase format used by DataTable and other components.
 */
const transformAccount = (apiAccount) => ({
  facsNumber: apiAccount.facs_number,
  zip5: apiAccount.zip5,
  fc: apiAccount.fc,
  initBal: apiAccount.init_bal,
  ptMs: apiAccount.pt_ms,
  tuScore: apiAccount.tu_score,
  bnkcrdAvlble: apiAccount.bnkcrd_avlble,
  serviceType: apiAccount.service_type,
  ptRepCode: apiAccount.pt_rep_code,
  serviceArea: apiAccount.service_area,
  serviceDescr: apiAccount.service_descr,
  age: apiAccount.age,
  ageOfAccount: apiAccount.age_of_account,
});

/**
 * Transform a single account from app's camelCase format
 * back to the API's snake_case format (needed for the predict endpoint).
 */
export const transformAccountToApi = (account) => ({
  facs_number: account.facsNumber,
  zip5: account.zip5,
  fc: account.fc,
  init_bal: account.initBal,
  pt_ms: account.ptMs,
  tu_score: account.tuScore,
  bnkcrd_avlble: account.bnkcrdAvlble,
  service_type: account.serviceType,
  pt_rep_code: account.ptRepCode,
  service_area: account.serviceArea,
  service_descr: account.serviceDescr,
  age: account.age,
  age_of_account: account.ageOfAccount,
});

/**
 * GET /api/accounts/generate
 * Fetches sample patient accounts from the real backend.
 * When called without n, the backend defaults to 5 records.
 */
export const fetchAccountsFromAPI = async () => {
  const path = '/api/accounts/generate';
  let response;
  try {
    response = await fetch(path, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (_) {
    response = null;
  }
  if (!response || response.status === 404 || !(response.headers.get('content-type') || '').includes('application/json')) {
    response = await fetch(`${HCC_REMOTE_BASE}${path}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  if (json.Response.StatusCode !== 200) {
    throw new Error(json.Response.Message || 'API returned an error');
  }

  const data = json.Response.ResponseInfo.data;
  return data.map(transformAccount);
};

/**
 * Transform a single prediction result from the API response format
 * to the app's format used by DataTable and ShapAnalysis.
 *
 * API returns:
 *   facs: "27765417"
 *   predicted_payment_propensity: "14.36%"
 *   category: "High"
 *   priority: "H1"
 *   amount_predicted: "$375"
 *   shap_values: [{ feature: "Age of Account", impact: 1.0349 }, ...]
 *
 * App expects:
 *   predictedPropensity: 14.36 (number)
 *   category: "High"
 *   priority: "H1"
 *   amountPredicted: 375 (number)
 *   shapValues: [{ feature: "Age of Account", impact: 1.0349 }, ...]
 */
const transformPredictionResult = (apiResult) => {
  // Parse "14.36%" → 14.36
  const propensityStr = apiResult.predicted_payment_propensity.replace('%', '');
  const predictedPropensity = parseFloat(propensityStr);

  // Parse "$375" → 375, also handles "$1,652" → 1652
  const amountStr = apiResult.amount_predicted.replace(/[$,]/g, '');
  const amountPredicted = parseFloat(amountStr);

  return {
    facsNumber: apiResult.facs,
    predictedPropensity,
    category: apiResult.category,
    priority: apiResult.priority,
    amountPredicted,
    shapValues: apiResult.shap_values || [],
  };
};

/**
 * POST /api/accounts/predict
 * Sends accounts to the real backend for prediction.
 * Returns prediction results merged with original account data.
 */
export const predictAccountsFromAPI = async (accounts) => {
  const apiPayload = accounts.map(transformAccountToApi);

  const path = '/api/accounts/predict';
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(apiPayload),
  };
  let response;
  try {
    response = await fetch(path, options);
  } catch (_) {
    response = null;
  }
  if (!response || response.status === 404 || !(response.headers.get('content-type') || '').includes('application/json')) {
    response = await fetch(`${HCC_REMOTE_BASE}${path}`, options);
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  if (json.Response.StatusCode !== 200) {
    throw new Error(json.Response.Message || 'Prediction API returned an error');
  }

  const rawResults = json.Response.ResponseInfo.data;

  // Transform API results and merge with original account data
  const predictionMap = new Map(
    rawResults.map(r => [r.facs, transformPredictionResult(r)])
  );

  // Merge: overlay prediction output onto original account input fields
  const mergedResults = accounts.map(acc => {
    const prediction = predictionMap.get(acc.facsNumber);
    if (prediction) {
      return { ...acc, ...prediction };
    }
    return acc;
  });

  return mergedResults;
};

const api = {
  fetchAccountsFromAPI,
  predictAccountsFromAPI,
  transformAccountToApi,
};

export default api;

