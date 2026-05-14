const AUTH_TOKEN = '997hhEo876NHJo2AMbXl1i78895deK';
const EAD_REMOTE_BASE = 'https://ml-market-backend-ead.azurewebsites.net';

/** Keys sent to POST /api/creditcard/accounts/predict (Postman order). */
const EAD_PREDICT_KEYS = [
  'Customer_ID',
  'Credit_Score',
  'Utilization_Rate',
  'Months_on_Book',
  'Past_Delinquencies',
  'Payment_to_Income_Ratio',
  'Current_Exposure',
  'Undrawn_Limit',
];

const eadRequest = async (path, options) => {
  let response;
  try {
    response = await fetch(path, options);
  } catch (_) {
    response = null;
  }
  /**
   * Azure often returns 5xx with text/html. We must not fall back to a cross-origin fetch in that case:
   * the browser blocks it (CORS) and surfaces "Failed to fetch" instead of the real 503 from Postman.
   */
  if (response != null && response.status >= 400) {
    return response;
  }
  if (!response || response.status === 404 || !(response.headers.get('content-type') || '').includes('application/json')) {
    response = await fetch(`${EAD_REMOTE_BASE}${path}`, options);
  }
  return response;
};

const firstArray = (...candidates) => {
  for (const c of candidates) {
    if (Array.isArray(c) && c.length >= 0) return c;
  }
  return null;
};

const extractDataArray = (json) => {
  if (!json || typeof json !== 'object') return [];
  if (Array.isArray(json)) return json;

  const direct = firstArray(
    json.data,
    json.results,
    json.predictions,
    json.accounts,
    json.records,
    json.items,
    json.rows,
    json.output,
    json.data?.values,
    json.data?.accounts,
  );
  if (direct) return direct;

  const ri = json.Response?.ResponseInfo;
  if (ri != null && typeof ri === 'object') {
    const d = ri.data;
    const nested = firstArray(d, d?.records, d?.items, d?.rows, d?.results, d?.predictions);
    if (nested) return nested;
    if (Array.isArray(d)) return d;
  }

  return [];
};

const assertOkWrapper = (json) => {
  if (json?.Response != null && json.Response.StatusCode != null && json.Response.StatusCode !== 200) {
    throw new Error(json.Response.Message || 'API returned an error');
  }
};

const flattenPredictionPayload = (apiResult) => {
  if (!apiResult || typeof apiResult !== 'object') return apiResult;
  const out = { ...apiResult };
  ['model_output', 'output', 'prediction', 'result', 'response', 'Model_Output', 'modelOutput'].forEach((nk) => {
    const inner = apiResult[nk];
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) Object.assign(out, inner);
  });
  return out;
};

const parseNum = (raw) => {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'string' && raw.endsWith('%')) {
    const n = Number(raw.replace('%', ''));
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const pickExpectedCcf = (flat) => {
  const keys = [
    'Expected_CCF',
    'expected_ccf',
    'ExpectedCCF',
    'expectedCCF',
    'ccf_probability',
    'CCF_Probability',
    'confidence',
  ];
  for (const k of keys) {
    const raw = flat[k];
    if (raw == null || raw === '') continue;
    const n = parseNum(raw);
    if (n == null) continue;
    if (n >= 0 && n <= 1) return n;
    if (n > 1 && n <= 100) return n / 100;
  }
  return null;
};

const pickEadPredicted = (flat) => {
  const keys = ['EAD_Predicted', 'ead_predicted', 'EAD', 'ead', 'Predicted_EAD', 'predicted_ead'];
  for (const k of keys) {
    const raw = flat[k];
    if (raw == null || raw === '') continue;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
};

const transformPrediction = (apiResult) => {
  const flat = flattenPredictionPayload(apiResult);

  let confidencePercent = null;
  const pctRaw =
    flat.expected_ccf_percent ??
    flat.Expected_CCF_Percent ??
    flat.ccf_probability_percent ??
    flat.prob_percent;
  if (pctRaw != null && pctRaw !== '') {
    const pctStr = String(pctRaw).replace('%', '').trim();
    const p = parseFloat(pctStr);
    if (Number.isFinite(p)) confidencePercent = p;
  }

  let confidence = pickExpectedCcf(flat);
  if (confidence == null && confidencePercent != null) {
    confidence = confidencePercent / 100;
  }
  if (confidencePercent == null && confidence != null && confidence <= 1 && confidence >= 0) {
    confidencePercent = confidence * 100;
  }

  const eadPredicted = pickEadPredicted(flat);

  const buildTopShapDrivers = () => {
    const rawTop = flat.top_shap_drivers ?? apiResult?.top_shap_drivers;
    if (Array.isArray(rawTop) && rawTop.length > 0) {
      return rawTop.map((d) => ({
        feature: d.feature,
        shap_impact: Number(d.shap_impact ?? d.shap_value ?? 0),
        feature_value: d.feature_value ?? d.value,
        direction: d.direction,
      }));
    }
    /** Backend typo: `shape_values`; items use `shap_value`. */
    const rawShap =
      flat.shap_values ??
      apiResult?.shap_values ??
      flat.shape_values ??
      apiResult?.shape_values ??
      flat.Shape_Values ??
      apiResult?.Shape_Values;
    if (Array.isArray(rawShap) && rawShap.length > 0) {
      return rawShap.map((d) => ({
        feature: d.feature,
        shap_impact: Number(d.shap_impact ?? d.shap_value ?? d.SHAP_value ?? 0),
        feature_value: d.feature_value ?? d.value,
        direction: d.direction,
      }));
    }
    return [];
  };

  const top_shap_drivers = buildTopShapDrivers();
  const shapValues = top_shap_drivers.map((d) => ({
    feature: d.feature,
    impact: Number.isFinite(d.shap_impact) ? d.shap_impact : 0,
  }));

  return {
    riskTier: '',
    confidence,
    confidencePercent,
    expected_ccf_percent_display:
      flat.expected_ccf_percent ?? flat.Expected_CCF_Percent ?? flat.ccf_probability_percent ?? null,
    EAD_Predicted: flat.EAD_Predicted ?? flat.ead_predicted ?? eadPredicted,
    ead_predicted: eadPredicted ?? flat.EAD_Predicted ?? flat.ead_predicted,
    shapValues,
    top_shap_drivers,
  };
};

/** Remove prediction outputs so a partial POST response cannot leave stale values on other rows. */
const EAD_OUTPUT_KEYS_TO_CLEAR = [
  'riskTier',
  'confidence',
  'confidencePercent',
  'expected_ccf_percent_display',
  'EAD_Predicted',
  'ead_predicted',
  'shapValues',
  'top_shap_drivers',
  'shap_values',
  'shape_values',
];

const stripEadPredictionOutputs = (row) => {
  const o = { ...row };
  EAD_OUTPUT_KEYS_TO_CLEAR.forEach((k) => {
    if (k in o) delete o[k];
  });
  return o;
};

/**
 * Backend sometimes omits Expected_CCF; derive from EAD = Current_Exposure + CCF × Undrawn_Limit.
 */
const enrichRowWithDerivedCcf = (row) => {
  if (row == null || typeof row !== 'object') return row;
  if (row.confidence != null && Number.isFinite(Number(row.confidence))) return row;
  const ead = row.ead_predicted ?? row.EAD_Predicted;
  const nEad = Number(ead);
  const nCe = Number(row.Current_Exposure);
  const nUl = Number(row.Undrawn_Limit);
  if (!Number.isFinite(nEad) || !Number.isFinite(nCe) || !Number.isFinite(nUl) || nUl <= 0) return row;
  const ccf = (nEad - nCe) / nUl;
  if (!Number.isFinite(ccf)) return row;
  const clamped = Math.max(0, Math.min(1, ccf));
  return {
    ...row,
    confidence: clamped,
    confidencePercent: clamped * 100,
  };
};

const EAD_INT_KEYS = new Set(['Customer_ID', 'Credit_Score', 'Months_on_Book', 'Past_Delinquencies']);

const rowToPredictPayload = (row) => {
  const out = {};
  for (const k of EAD_PREDICT_KEYS) {
    const v = row[k];
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n)) {
      out[k] = v;
    } else {
      out[k] = EAD_INT_KEYS.has(k) ? Math.round(n) : n;
    }
  }
  return out;
};

export const fetchEadAccounts = async () => {
  const response = await eadRequest('/api/creditcard/accounts/generate', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error(`API error: ${response.status} ${response.statusText}`);
  const json = await response.json();
  assertOkWrapper(json);
  const rows = extractDataArray(json).slice(0, 5);
  return rows.map((row, idx) => {
    const Customer_ID = row.Customer_ID ?? row.customer_id ?? row.CustomerId;
    const account_id = Customer_ID != null && Customer_ID !== '' ? String(Customer_ID) : `row-${idx}`;
    return {
      ...row,
      Customer_ID,
      account_id,
      __rowId: `ead-${Customer_ID ?? 'row'}-${idx}`,
    };
  });
};

export const predictEadAccounts = async (rows) => {
  const payload = rows.map(rowToPredictPayload);
  if (payload.length === 0 || !payload.every((p) => p.Customer_ID != null && p.Customer_ID !== '')) {
    throw new Error('No valid credit card accounts to score');
  }

  const response = await eadRequest('/api/creditcard/accounts/predict', {
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
      /* ignore */
    }
    throw new Error(`Prediction failed (${response.status}): ${detail}`);
  }

  const json = await response.json();
  assertOkWrapper(json);

  const raw = extractDataArray(json);
  const transformed = raw.map(transformPrediction);

  const byId = new Map();
  raw.forEach((r, i) => {
    const id = r.Customer_ID ?? r.customer_id;
    if (id != null) byId.set(String(id), transformed[i]);
  });

  return rows.map((row) => {
    const id = row.Customer_ID != null ? String(row.Customer_ID) : null;
    const pred = id && byId.has(id) ? byId.get(id) : null;
    if (pred == null) {
      return stripEadPredictionOutputs(row);
    }
    return enrichRowWithDerivedCcf({ ...row, ...pred });
  });
};
