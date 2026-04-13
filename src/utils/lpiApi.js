const AUTH_TOKEN = '997hhEo876NHJo2AMbXl1i78895deK';

const INTERNAL_KEYS = new Set([
  '__rowId',
  'probability',
  'probabilityPercent',
  'category',
  'shapValues',
]);

const LPI_REMOTE_BASE = 'https://ml-market-backend-ml-late-payment-interest.azurewebsites.net';

const lpiRequest = async (path, options) => {
  let response;
  try {
    response = await fetch(path, options);
  } catch (_) {
    response = null;
  }

  if (!response || response.status === 404 || !(response.headers.get('content-type') || '').includes('application/json')) {
    const directUrl = `${LPI_REMOTE_BASE}${path}`;
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

const parseProbabilityPercent = (value) => {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  const pct = String(value).replace('%', '').trim();
  const parsed = parseFloat(pct);
  return Number.isFinite(parsed) ? parsed : null;
};

const transformPredictionResult = (apiResult) => ({
  clmId: apiResult.clmId ?? apiResult.claimId ?? apiResult.clm_id ?? null,
  probability: apiResult.probability ?? null,
  probabilityPercent: parseProbabilityPercent(
    apiResult.probability_percent ?? apiResult.probabilityPercent
  ),
  category:
    apiResult.category ??
    apiResult.risk_category ??
    apiResult.predicted_category ??
    apiResult.classification ??
    null,
  shapValues: apiResult.shap_values ?? apiResult.shapValues ?? [],
});

/**
 * GET /api/lpi/accounts/generate?n=5
 */
export const fetchLpiAccounts = async () => {
  const response = await lpiRequest('/api/lpi/accounts/generate?n=5', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('LPI API route not found. Restart the app server and try again.');
    }
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  if (json.Response?.StatusCode !== 200) {
    throw new Error(json.Response?.Message || 'API returned an error');
  }

  const rows = (json.Response.ResponseInfo?.data || []).slice(0, 5);
  return rows.map((row, idx) => ({
    ...row,
    __rowId: `${row.clmId ?? row.claimId ?? 'claim'}-${idx}`,
  }));
};

/**
 * POST /api/lpi/accounts/predict?n=5
 */
export const predictLpiAccounts = async (rows) => {
  const payload = rows.map(stripOutputKeys);

  const response = await lpiRequest('/api/lpi/accounts/predict?n=5', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('LPI API route not found. Restart the app server and try again.');
    }
    let detail = response.statusText;
    try {
      const errBody = await response.json();
      if (errBody.detail) {
        detail = Array.isArray(errBody.detail)
          ? errBody.detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
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
    const key = String(item.clmId ?? '');
    if (!queues.has(key)) queues.set(key, []);
    queues.get(key).push(item);
  });

  return rows.map((row) => {
    const claimId = String(row.clmId ?? row.claimId ?? '');
    const queue = queues.get(claimId);
    const pred = queue && queue.length ? queue.shift() : null;
    return pred ? { ...row, ...pred } : row;
  });
};
