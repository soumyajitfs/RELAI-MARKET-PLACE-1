// Collectability backend API
// In development, requests to /api/collectability are proxied via setupProxy.js

const AUTH_TOKEN = '997hhEo876NHJo2AMbXl1i78895deK';

const INTERNAL_KEYS = new Set([
  '__rowId',
  'probability',
  'probabilityPercent',
  'category',
  'shapValues',
]);

const COLLECTABILITY_REMOTE_BASE = 'https://ml-market-backend-collectability.azurewebsites.net';

const collectabilityRequest = async (path, options) => {
  let response;
  try {
    response = await fetch(path, options);
  } catch (_) {
    response = null;
  }

  if (!response || response.status === 404 || !(response.headers.get('content-type') || '').includes('application/json')) {
    const directUrl = `${COLLECTABILITY_REMOTE_BASE}${path}`;
    response = await fetch(directUrl, options);
  }

  return response;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (path, options, retries = 2) => {
  let lastResponse = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await collectabilityRequest(path, options);
    lastResponse = response;
    if (response.status !== 502 && response.status !== 503 && response.status !== 504) {
      return response;
    }
    if (attempt < retries) {
      await sleep(700 * (attempt + 1));
    }
  }
  return lastResponse;
};

const stripOutputKeys = (row) => {
  const payload = {};
  Object.keys(row).forEach((key) => {
    if (!INTERNAL_KEYS.has(key)) payload[key] = row[key];
  });
  return payload;
};

/**
 * GET /api/collectability/accounts/generate?n=5
 */
export const fetchCollectabilityAccounts = async () => {
  const response = await fetchWithRetry('/api/collectability/accounts/generate?n=5', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error('Collectability backend is temporarily unavailable (gateway error). Please retry in a moment.');
    }
    if (response.status === 404) {
      throw new Error('Collectability API route not found. Restart the app server and try again.');
    }
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  if (json.Response?.StatusCode !== 200) {
    throw new Error(json.Response?.Message || 'API returned an error');
  }

  const rows = (json.Response.ResponseInfo?.data || []).slice(0, 5);
  return rows.map((row, idx) => ({ ...row, __rowId: `${row['CLIENT REFERENCE NUMBER']}-${idx}` }));
};

const transformPredictionResult = (apiResult) => {
  const pct = String(apiResult.probability_percent || '').replace('%', '');
  const probabilityPercent = pct ? parseFloat(pct) : null;

  return {
    acct_id: apiResult.acct_id,
    probability: apiResult.probability,
    probabilityPercent,
    category: apiResult.category,
    shapValues: apiResult.shap_values || [],
  };
};

/**
 * POST /api/collectability/accounts/predict
 */
export const predictCollectabilityAccounts = async (rows) => {
  const payload = rows.map(stripOutputKeys);

  const response = await fetchWithRetry('/api/collectability/accounts/predict', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error('Collectability backend is temporarily unavailable (gateway error). Please retry in a moment.');
    }
    if (response.status === 404) {
      throw new Error('Collectability API route not found. Restart the app server and try again.');
    }
    let detail = response.statusText;
    try {
      const errBody = await response.json();
      if (errBody.detail) {
        detail = Array.isArray(errBody.detail)
          ? errBody.detail.map(d => d.msg || JSON.stringify(d)).join('; ')
          : String(errBody.detail);
      }
    } catch (_) {
      // ignore parse issues
    }
    throw new Error(`Prediction failed (${response.status}): ${detail}`);
  }

  const json = await response.json();
  if (json.Response?.StatusCode !== 200) {
    throw new Error(json.Response?.Message || 'Prediction API returned an error');
  }

  const raw = json.Response.ResponseInfo?.data || [];
  const transformed = raw.map(transformPredictionResult);

  const queues = new Map();
  transformed.forEach((item) => {
    if (!queues.has(item.acct_id)) queues.set(item.acct_id, []);
    queues.get(item.acct_id).push(item);
  });

  return rows.map((row) => {
    const id = row['CLIENT REFERENCE NUMBER'];
    const queue = queues.get(id);
    const pred = queue && queue.length ? queue.shift() : null;
    return pred ? { ...row, ...pred } : row;
  });
};
