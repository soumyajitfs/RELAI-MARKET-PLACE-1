// RPC (Right Party Contact) backend API
// In development, requests to /api/amex are proxied to the Azure RPC backend via setupProxy.js

const AUTH_TOKEN = '997hhEo876NHJo2AMbXl1i78895deK';
const RPC_REMOTE_BASE = 'https://ml-market-backend-rpc.azurewebsites.net';

const rpcRequest = async (path, options) => {
  let response;
  try {
    response = await fetch(path, options);
  } catch (_) {
    response = null;
  }

  if (!response || response.status === 404 || !(response.headers.get('content-type') || '').includes('application/json')) {
    const directUrl = `${RPC_REMOTE_BASE}${path}`;
    response = await fetch(directUrl, options);
  }

  return response;
};

/**
 * Column display labels for the RPC data table.
 * The API uses PascalCase keys — we keep them as-is to avoid transformation bugs.
 */
export const RPC_COLUMNS = [
  { key: 'AcctID',                          label: 'Account ID' },
  { key: 'PlaceDate',                       label: 'Place Date' },
  { key: 'LastPayPreCharge_sql04',           label: 'Last Pay Pre-Charge' },
  { key: 'LastOutboundCallDate',             label: 'Last Outbound Call' },
  { key: 'LastEmailSentDate',               label: 'Last Email Sent' },
  { key: 'LastWebActivityDate',             label: 'Last Web Activity' },
  { key: 'PlaceAmt',                        label: 'Place Amount ($)' },
  { key: 'Decile',                          label: 'Decile' },
  { key: 'FICOScore_sql04',                 label: 'FICO Score' },
  { key: 'HasValidNumber',                  label: 'Has Valid Number' },
  { key: 'RPC_Flag',                        label: 'RPC Flag' },
  { key: 'Connect_Flag',                    label: 'Connect Flag' },
  { key: 'PageFlag',                        label: 'Page Flag' },
  { key: 'PageWebFlag',                     label: 'Page Web Flag' },
  { key: 'PartyGrouping_mapped',            label: 'Party Grouping' },
  { key: 'BestDayToCall',                   label: 'Best Day to Call' },
  { key: 'ResultCodeFlag',                  label: 'Result Code Flag' },
  { key: 'PhoneInService_mapped',           label: 'Phone In-Service' },
  { key: 'Phone1ContactabilityScore_mapped', label: 'Contactability Score' },
  { key: 'CallWindow_avg',                  label: 'Call Window (avg)' },
  { key: 'SecondBestCallWindow_avg',        label: '2nd Best Call Window' },
  { key: 'NumPhoneNumbersDialed',           label: 'Phone Numbers Dialed' },
  { key: 'ValidCalls',                      label: 'Valid Calls' },
  { key: 'Totalemailscount',               label: 'Total Emails' },
  { key: 'InitialAmexPScore_sql04',         label: 'Initial Amex P-Score' },
  { key: 'CMCity',                          label: 'City' },
  { key: 'AccountType',                     label: 'Account Type' },
  { key: 'Clientid',                        label: 'Client ID' },
  { key: 'AmexProductType',                 label: 'Product Type' },
  { key: 'StatusCode',                      label: 'Status Code' },
  { key: 'AmexTenure_sql04',               label: 'Amex Tenure' },
  { key: 'Level',                           label: 'Level' },
  { key: 'Channel',                         label: 'Channel' },
  { key: 'DateOfBirth',                     label: 'Date of Birth' },
  { key: 'CardOpenDate',                    label: 'Card Open Date' },
  { key: 'ChargeOffDate',                   label: 'Charge-Off Date' },
];

/**
 * Format a date string for display (strip time component).
 * "2026-02-11T18:00:40.682773" → "2026-02-11"
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return dateStr.split('T')[0];
};

/**
 * GET /api/amex/accounts/generate
 * Fetches sample RPC accounts from the backend.
 * By default returns 5 records (no n parameter).
 */
export const fetchRpcAccounts = async () => {
  const response = await rpcRequest('/api/amex/accounts/generate?', {
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

  // Return data as-is — API keys are PascalCase, we keep them unchanged
  return json.Response.ResponseInfo.data;
};

/**
 * Transform prediction result from the API response.
 * Predict returns extra output fields alongside some input fields.
 *
 * Output fields:
 *   Model_Score: 0.9999 (raw float)
 *   Model_Score_Percent: "100.0%" (formatted string)
 *   Account_Priority: "SH" / "L" / etc.
 *   Scoring_Date: "2026-02-16"
 *   shap_values: [{ feature: "RPC_Flag", impact: 11.0488 }, ...]
 */
const transformPredictionResult = (apiResult) => {
  const result = { AcctID: apiResult.AcctID };

  if (apiResult.Model_Score != null) {
    result.Model_Score = apiResult.Model_Score;
  }

  if (apiResult.Model_Score_Percent != null) {
    const pctStr = String(apiResult.Model_Score_Percent).replace('%', '');
    result.modelScorePercent = parseFloat(pctStr);
  }

  if (apiResult.Account_Priority != null) {
    result.accountPriority = apiResult.Account_Priority;
  }

  if (apiResult.Scoring_Date != null) {
    result.scoringDate = apiResult.Scoring_Date;
  }

  if (apiResult.shap_values) {
    result.shapValues = apiResult.shap_values;
  }

  return result;
};

/**
 * POST /api/amex/accounts/predict
 * Sends accounts to the backend for prediction.
 * The predict API accepts the SAME PascalCase keys as the generate response.
 */
export const predictRpcAccounts = async (accounts) => {
  // Send accounts as-is — same keys the generate API returned
  const response = await rpcRequest('/api/amex/accounts/predict', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(accounts),
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
    } catch (_) { /* ignore */ }
    throw new Error(`Prediction failed (${response.status}): ${detail}`);
  }

  const json = await response.json();

  if (json.Response?.StatusCode !== 200) {
    throw new Error(json.Response?.Message || 'Prediction API returned an error');
  }

  const rawResults = json.Response.ResponseInfo.data;

  // Build lookup from prediction results
  const predictionMap = new Map(
    rawResults.map(r => [r.AcctID, transformPredictionResult(r)])
  );

  // Merge: overlay prediction output onto original account input fields
  return accounts.map(acc => {
    const prediction = predictionMap.get(acc.AcctID);
    if (prediction) {
      return { ...acc, ...prediction };
    }
    return acc;
  });
};

