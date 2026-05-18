const AUTH_TOKEN = 'underwriter889';

const INTERNAL_KEYS = new Set([
  '__rowId',
  'decision',
  'confidence',
  'confidencePercent',
  'shapValues',
]);

const UNDERWRITING_REMOTE_BASE = 'https://ml-market-backend-underwriter.azurewebsites.net';

const underwritingRequest = async (path, options) => {
  let response;
  try {
    response = await fetch(path, options);
  } catch (_) {
    response = null;
  }

  if (!response || response.status === 404 || !(response.headers.get('content-type') || '').includes('application/json')) {
    const directUrl = `${UNDERWRITING_REMOTE_BASE}${path}`;
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

export const fetchUnderwritingAccounts = async () => {
  const response = await underwritingRequest('/api/uw/generate?n=5', {
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
  return rows.map((row, idx) => ({ ...row, __rowId: `${row['Applicant_ID'] || 'app'}-${idx}` }));
};

const transformPredictionResult = (apiResult) => {
  const confidence = Number(apiResult.confidence);
  return {
    decision: apiResult.decision,
    confidence: Number.isFinite(confidence) ? confidence : null,
    confidencePercent: Number.isFinite(confidence) ? confidence * 100 : null,
    shapValues: apiResult.shap_values || [],
  };
};

export const predictUnderwritingAccounts = async (rows, useDefaultFive = false) => {
  const payload = rows.map(stripOutputKeys);
  const endpoint = useDefaultFive ? '/api/uw/predict?n=5' : '/api/uw/predict';

  const response = await underwritingRequest(endpoint, {
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

  // Backend response has no application identifier, so merge by returned order.
  return rows.map((row, idx) => ({ ...row, ...(transformed[idx] || {}) }));
};
