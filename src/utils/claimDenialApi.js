const AUTH_TOKEN = '997hhEo876NHJo2AMbXl1i78895deK';

const INTERNAL_KEYS = new Set([
  '__rowId',
  'probability',
  'probabilityPercent',
  'category',
  'shapValues',
  'clmId',
]);

const CLAIM_DENIAL_REMOTE_BASE = 'https://ml-market-backend-propensity-to-deny.azurewebsites.net';

const claimDenialRequest = async (path, options) => {
  let response;
  try {
    response = await fetch(path, options);
  } catch (_) {
    response = null;
  }

  if (!response || response.status === 404 || !(response.headers.get('content-type') || '').includes('application/json')) {
    const directUrl = `${CLAIM_DENIAL_REMOTE_BASE}${path}`;
    response = await fetch(directUrl, options);
  }

  return response;
};

const stripOutputKeys = (row) => {
  const payload = {};
  Object.keys(row).forEach((key) => {
    if (!INTERNAL_KEYS.has(key)) payload[key] = row[key];
  });
  return payload;
};

export const fetchClaimDenialAccounts = async () => {
  const response = await claimDenialRequest('/api/claim-denial/accounts/generate?n=5', {
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

  const rows = (json.Response.ResponseInfo?.data || []).slice(0, 5);
  return rows.map((row, idx) => ({ ...row, __rowId: `${row.Claim_ID || 'claim'}-${idx}` }));
};

const transformPredictionResult = (apiResult) => {
  const pct = String(apiResult.probability_percent || '').replace('%', '');
  const probabilityPercent = pct ? parseFloat(pct) : null;
  return {
    clmId: apiResult.clmId,
    probability: apiResult.probability,
    probabilityPercent,
    category: apiResult.category,
    shapValues: apiResult.shap_values || [],
  };
};

export const predictClaimDenialAccounts = async (rows, useDefaultFive = false) => {
  const payload = rows.map(stripOutputKeys);
  const endpoint = useDefaultFive
    ? '/api/claim-denial/accounts/predict?n=5'
    : '/api/claim-denial/accounts/predict';

  const response = await claimDenialRequest(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const errBody = await response.json();
      if (errBody.detail) {
        detail = Array.isArray(errBody.detail)
          ? errBody.detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
          : String(errBody.detail);
      }
    } catch (_) {
      // Ignore JSON parse issues for non-JSON responses.
    }
    throw new Error(`Prediction failed (${response.status}): ${detail}`);
  }

  const json = await response.json();
  if (json.Response?.StatusCode !== 200) {
    throw new Error(json.Response?.Message || 'Prediction API returned an error');
  }

  const raw = json.Response.ResponseInfo?.data || [];
  const transformed = raw.map(transformPredictionResult);
  const predictionMap = new Map(transformed.map((item) => [item.clmId, item]));

  return rows.map((row) => {
    const pred = predictionMap.get(row.Claim_ID);
    return pred ? { ...row, ...pred } : row;
  });
};
