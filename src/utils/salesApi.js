// Sales Optimization backend API
// In development, requests to /api/sales are proxied via setupProxy.js

const AUTH_TOKEN = '997hhEo876NHJo2AMbXl1i78895deK';

const INTERNAL_KEYS = new Set([
  '__rowId',
  'probability',
  'probabilityPercent',
  'category',
  'shapValues',
  'recommended_products',
  'recommendation_reason',
]);

const SALES_REMOTE_BASE = 'https://ml-market-backend-sales-optimization.azurewebsites.net';

const salesRequest = async (path, options) => {
  let response;
  try {
    response = await fetch(path, options);
  } catch (_) {
    response = null;
  }

  if (!response || response.status === 404 || !(response.headers.get('content-type') || '').includes('application/json')) {
    const directUrl = `${SALES_REMOTE_BASE}${path}`;
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

/**
 * GET /api/sales/accounts/generate?n=5
 */
export const fetchSalesAccounts = async () => {
  const response = await salesRequest('/api/sales/accounts/generate?n=5', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Sales API route not found. Restart the app server and try again.');
    }
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  if (json.Response?.StatusCode !== 200) {
    throw new Error(json.Response?.Message || 'API returned an error');
  }

  const rows = (json.Response.ResponseInfo?.data || []).slice(0, 5);
  return rows.map((row, idx) => ({ ...row, __rowId: `${row.Customer_Account}-${idx}` }));
};

const transformPredictionResult = (apiResult) => {
  const pct = String(apiResult.probability_percent || '').replace('%', '');
  const probabilityPercent = pct ? parseFloat(pct) : null;

  return {
    Customer_Account: String(apiResult.Customer_Account),
    probability: apiResult.probability,
    probabilityPercent,
    category: apiResult.category,
    shapValues: apiResult.shap_values || [],
    recommended_products: apiResult.recommended_products || [],
    recommendation_reason: apiResult.recommendation_reason || '',
  };
};

/**
 * POST /api/sales/accounts/predict?n=5
 */
export const predictSalesAccounts = async (rows) => {
  const payload = rows.map(stripOutputKeys);

  const response = await salesRequest('/api/sales/accounts/predict?n=5', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Sales API route not found. Restart the app server and try again.');
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
      // ignore parse errors
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
    const key = String(item.Customer_Account);
    if (!queues.has(key)) queues.set(key, []);
    queues.get(key).push(item);
  });

  return rows.map((row) => {
    const account = String(row.Customer_Account);
    const queue = queues.get(account);
    const pred = queue && queue.length ? queue.shift() : null;
    return pred ? { ...row, ...pred } : row;
  });
};
