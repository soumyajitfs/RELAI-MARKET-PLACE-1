const AUTH_TOKEN = '997hhEo876NHJo2AMbXl1i78895deK';
const PD_REMOTE_BASE = 'https://ml-market-backend-pd.azurewebsites.net';

/** Keys sent to POST /api/pd/accounts/predict (same order as Postman). */
const PD_PREDICT_KEYS = [
  'account_id',
  'interest_rate',
  'months_on_book',
  'avg_monthly_credit_6m',
  'current_foir',
  'bureau_utilization',
  'n_delinquent_elsewhere',
  'n_times_30plus_prior_12m',
  'bounce_count_prior_12m',
];

const pdRequest = async (path, options) => {
  let response;
  try {
    response = await fetch(path, options);
  } catch (_) {
    response = null;
  }
  if (!response || response.status === 404 || !(response.headers.get('content-type') || '').includes('application/json')) {
    response = await fetch(`${PD_REMOTE_BASE}${path}`, options);
  }
  return response;
};

const firstArray = (...candidates) => {
  for (const c of candidates) {
    if (Array.isArray(c) && c.length >= 0) return c;
  }
  return null;
};

/**
 * PD backends may wrap the row list differently; normalize to an array of row objects.
 */
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

const normalizePdTier = (raw) => {
  if (raw == null) return '';
  const s = String(raw).trim().toUpperCase().replace(/\s+/g, '_');
  if (s === 'GREEN' || s === 'YELLOW' || s === 'LOW_RISK' || s === 'LOW') return 'GREEN';
  if (s === 'AMBER' || s === 'ORANGE' || s === 'MEDIUM_RISK' || s === 'MEDIUM') return 'AMBER';
  if (s === 'RED' || s === 'DARK_RED' || s === 'HIGH_RISK' || s === 'HIGH') return 'RED';
  return s;
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

const pickProbability = (flat) => {
  const pd = flat.pd_probability ?? flat.Pd_Probability;
  if (pd != null && pd !== '') {
    const n = Number(pd);
    if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  }

  const ps = flat.prob_score ?? flat.Prob_Score;
  if (ps != null && ps !== '') {
    const n = Number(ps);
    if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  }
  const pp = flat.prob_percent ?? flat.Prob_Percent ?? flat.pd_probability_percent ?? flat.Pd_Probability_Percent;
  if (pp != null && pp !== '') {
    const n = parseNum(pp);
    if (n != null && n >= 0 && n <= 100) return n / 100;
    if (n != null && n >= 0 && n <= 1) return n;
  }

  const keys = [
    'predicted_prob',
    'Predicted_Prob',
    'predicted_probability',
    'Predicted_Probability',
    'pd_prob',
    'PD_Prob',
    'default_probability',
    'Default_Probability',
    'predicted_pd',
    'pd_score',
    'PD_Score',
    'probability',
    'Probability',
    'model_score',
    'Model_Score',
    'score',
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

const inferTierFromProbability = (p) => {
  if (p == null || !Number.isFinite(p) || p < 0 || p > 1) return '';
  if (p < 0.34) return 'GREEN';
  if (p > 0.66) return 'RED';
  return 'AMBER';
};

const transformPrediction = (apiResult) => {
  const flat = flattenPredictionPayload(apiResult);
  const tierRaw =
    flat.pd_risk ??
    flat.Pd_Risk ??
    flat.risk_tier ??
    flat.Risk_Tier ??
    flat.default_risk_tier ??
    flat.risk_band ??
    flat.Risk_Band ??
    flat.tier ??
    flat.Tier ??
    flat.classification ??
    flat.ptp_risk ??
    apiResult?.pd_risk;
  let riskTier = normalizePdTier(tierRaw);

  let confidencePercent = null;
  const pctRaw = flat.pd_probability_percent ?? flat.Pd_Probability_Percent ?? flat.prob_percent ?? flat.Prob_Percent;
  if (pctRaw != null && pctRaw !== '') {
    const pctStr = String(pctRaw).replace('%', '').trim();
    const p = parseFloat(pctStr);
    if (Number.isFinite(p)) confidencePercent = p;
  }

  let confidence = pickProbability(flat);
  if (confidence == null && confidencePercent != null) {
    confidence = confidencePercent / 100;
  }
  if (confidencePercent == null && confidence != null && confidence <= 1 && confidence >= 0) {
    confidencePercent = confidence * 100;
  }

  if (!riskTier && confidence != null) {
    riskTier = inferTierFromProbability(confidence);
  }

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
    const rawShap = flat.shap_values ?? apiResult?.shap_values;
    if (Array.isArray(rawShap) && rawShap.length > 0) {
      return rawShap.map((d) => ({
        feature: d.feature,
        shap_impact: Number(d.shap_impact ?? d.shap_value ?? 0),
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
    riskTier,
    confidence,
    confidencePercent,
    pd_probability: flat.pd_probability ?? flat.Pd_Probability ?? confidence,
    pd_probability_percent: flat.pd_probability_percent ?? flat.Pd_Probability_Percent ?? null,
    shapValues,
    top_shap_drivers,
  };
};

const PD_INT_KEYS = new Set([
  'months_on_book',
  'n_delinquent_elsewhere',
  'n_times_30plus_prior_12m',
  'bounce_count_prior_12m',
]);

const rowToPredictPayload = (row) => {
  const out = {};
  for (const k of PD_PREDICT_KEYS) {
    if (k === 'account_id') {
      out[k] = row.account_id ?? row.Account_Id ?? row.accountId;
    } else {
      const v = row[k];
      const n = typeof v === 'number' ? v : Number(v);
      if (!Number.isFinite(n)) {
        out[k] = v;
      } else {
        out[k] = PD_INT_KEYS.has(k) ? Math.round(n) : n;
      }
    }
  }
  return out;
};

export const fetchPdAccounts = async () => {
  const response = await pdRequest('/api/pd/accounts/generate', {
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
    const account_id = row.account_id ?? row.Account_Id ?? row.ACCOUNT_ID;
    return {
      ...row,
      account_id,
      __rowId: `${account_id || 'pd'}-${idx}`,
    };
  });
};

export const predictPdAccounts = async (rows) => {
  const payload = rows.map(rowToPredictPayload);
  if (payload.length === 0 || !payload.every((p) => p.account_id)) {
    throw new Error('No valid PD accounts to score');
  }

  const response = await pdRequest('/api/pd/accounts/predict', {
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
    const id = r.account_id ?? r.Account_Id ?? r.loan_id ?? r.Loan_Id ?? r.id ?? r.Id;
    if (id != null) byId.set(String(id), transformed[i]);
  });

  return rows.map((row, idx) => {
    const id = row.account_id != null ? String(row.account_id) : null;
    const byMap = id && byId.has(id) ? byId.get(id) : null;
    const byIndex = transformed[idx];
    const pred =
      byMap != null
        ? byMap
        : byIndex != null
          ? byIndex
          : transformed.length === 1 && rows.length === 1
            ? transformed[0]
            : {};
    return { ...row, ...pred };
  });
};
