// Customer Lifecycle generate API — proxied via setupProxy.js as /api/customers/...

const REMOTE_BASE = 'https://ml-market-backend-customer-lifecycle.azurewebsites.net';
const AUTH_TOKEN = '997hhEo876NHJo2AMbXl1i78895deK';

const lifecycleRequest = async (path, options) => {
  let response;
  try {
    response = await fetch(path, options);
  } catch {
    response = null;
  }

  if (
    !response ||
    response.status === 404 ||
    !(response.headers.get('content-type') || '').includes('application/json')
  ) {
    response = await fetch(`${REMOTE_BASE}${path}`, options);
  }

  return response;
};

/**
 * GET /api/customers/generate/{generateKey}
 * @param {string} generateKey e.g. customer_acquisition, customer_collection
 * @returns {Promise<object[]>} Up to 5 customer rows (shape varies by model)
 */
export async function fetchLifecycleGenerateData(generateKey) {
  const path = `/api/customers/generate/${encodeURIComponent(generateKey)}`;
  const response = await lifecycleRequest(path, {
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

  const data = json.Response?.ResponseInfo?.data;
  if (!Array.isArray(data)) {
    throw new Error('Invalid response: expected data array');
  }

  return data.slice(0, 5);
}

/**
 * POST /api/customers/predict — single endpoint for all lifecycle models.
 * @param {string} modelKey e.g. customer_acquisition, customer_value
 * @param {object[]} dataRows Input feature rows (from GET / generate), max 5
 * @returns {Promise<object[]>} ResponseInfo.data from backend
 */
export async function predictLifecycleCustomers(modelKey, dataRows) {
  const path = '/api/customers/predict';
  /* Backend accepts the lifecycle model id; sample payloads use key "model" */
  const payload = {
    model: modelKey,
    data: dataRows.slice(0, 5),
  };

  const response = await lifecycleRequest(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    let msg = `API error: ${response.status}`;
    try {
      const errJson = JSON.parse(text);
      msg = errJson.detail || errJson.message || errJson.Response?.Message || msg;
    } catch {
      if (text) msg = text.slice(0, 200);
    }
    throw new Error(msg);
  }

  const json = await response.json();
  if (json.Response?.StatusCode !== 200) {
    throw new Error(json.Response?.Message || 'Prediction API returned an error');
  }

  const data = json.Response?.ResponseInfo?.data;
  if (!Array.isArray(data)) {
    throw new Error('Invalid prediction response: expected data array');
  }

  return data.slice(0, 5);
}

/** Backend may use alternate keys; normalize so the UI shows one column each. */
const CATEGORY_ALIASES = [
  'Category',
  'CATEGORY',
  'category_label',
  'predicted_category',
  'class_label',
  'Class',
  'CLASS',
];
const PREDICTED_VALUE_ALIASES = ['Predicted_Value', 'PREDICTED_VALUE', 'prediction_value', 'Prediction_Value'];

/**
 * Merge prediction aliases into canonical `category` and `predicted_value` keys.
 * @param {object} row
 * @returns {object}
 */
export function normalizeLifecyclePredictionRow(row) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };

  if (out.category == null || out.category === '') {
    for (const a of CATEGORY_ALIASES) {
      if (Object.prototype.hasOwnProperty.call(out, a) && out[a] != null && out[a] !== '') {
        out.category = out[a];
        break;
      }
    }
  }

  const predEmpty =
    out.predicted_value == null ||
    out.predicted_value === '' ||
    (typeof out.predicted_value === 'number' && Number.isNaN(out.predicted_value));
  if (predEmpty) {
    for (const a of PREDICTED_VALUE_ALIASES) {
      if (Object.prototype.hasOwnProperty.call(out, a) && out[a] != null && out[a] !== '') {
        out.predicted_value = out[a];
        break;
      }
    }
  }

  for (const a of CATEGORY_ALIASES) {
    if (a in out && out.category != null && out.category !== '') delete out[a];
  }
  for (const a of PREDICTED_VALUE_ALIASES) {
    if (a in out && out.predicted_value != null && out.predicted_value !== '') delete out[a];
  }

  return out;
}
