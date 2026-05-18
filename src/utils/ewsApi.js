import { PAYMENT_REG_6M_VALUES, PAYMENT_REG_12M_VALUES } from '../data/ewsFieldRules';

const snapToNearest = (val, allowed) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return val;
  let best = allowed[0];
  let bestD = Infinity;
  for (const a of allowed) {
    const d = Math.abs(a - n);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return bestD <= 0.06 ? best : val;
};

const normalizeEwsRow = (row) => {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  if (out.payment_regularity_6m != null) {
    out.payment_regularity_6m = snapToNearest(out.payment_regularity_6m, PAYMENT_REG_6M_VALUES);
  }
  if (out.payment_regularity_12m != null) {
    out.payment_regularity_12m = snapToNearest(out.payment_regularity_12m, PAYMENT_REG_12M_VALUES);
  }
  return out;
};

const AUTH_TOKEN = '1234567890abcdef1234567890abcdef';
const EWS_REMOTE_BASE = 'https://ml-market-backend-ews.azurewebsites.net';

const UI_KEYS = new Set([
  '__rowId',
  'riskTier',
  'confidence',
  'confidencePercent',
  'shapValues',
]);

/** Strip UI and model-output keys before re-posting to predict. */
const PREDICTION_KEYS = new Set([
  'risk_tier',
  'Risk_Tier',
  'model_score',
  'Model_Score',
  'model_score_percent',
  'Model_Score_Percent',
  'shap_values',
  'prediction',
]);

const stripForPredict = (row) => {
  const payload = {};
  Object.keys(row).forEach((key) => {
    if (UI_KEYS.has(key) || PREDICTION_KEYS.has(key)) return;
    payload[key] = row[key];
  });
  return payload;
};

const ewsRequest = async (path, options) => {
  let response;
  try {
    response = await fetch(path, options);
  } catch (_) {
    response = null;
  }

  if (!response || response.status === 404 || !(response.headers.get('content-type') || '').includes('application/json')) {
    const directUrl = `${EWS_REMOTE_BASE}${path}`;
    response = await fetch(directUrl, options);
  }

  return response;
};

const extractDataArray = (json) => {
  if (Array.isArray(json)) return json;
  if (json?.Response?.ResponseInfo?.data != null) return json.Response.ResponseInfo.data;
  if (Array.isArray(json?.data)) return json.data;
  return [];
};

const assertOkWrapper = (json) => {
  if (json?.Response != null && json.Response.StatusCode != null && json.Response.StatusCode !== 200) {
    throw new Error(json.Response.Message || 'API returned an error');
  }
};

const normalizeTier = (raw) => {
  if (raw == null) return '';
  const s = String(raw).trim().toUpperCase();
  if (s === 'GREEN' || s === 'AMBER' || s === 'RED') return s;
  if (s === 'LOW' || s === 'LOW_RISK') return 'GREEN';
  if (s === 'MEDIUM' || s === 'MED') return 'AMBER';
  if (s === 'HIGH' || s === 'HIGH_RISK') return 'RED';
  return s;
};

const parseNumericMaybePercent = (raw) => {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.endsWith('%')) {
      const n = Number(trimmed.replace('%', ''));
      return Number.isFinite(n) ? n : null;
    }
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

/**
 * Picks a scalar confidence / probability from common EWS backend field names.
 * Many deployments omit "confidence" and use e.g. model_probability, tier scores, or class probs.
 */
const pickConfidenceFromApi = (apiResult, riskTierNorm) => {
  const directKeys = [
    'confidence',
    'Confidence',
    'model_score',
    'Model_Score',
    'model_probability',
    'Model_Probability',
    'prediction_probability',
    'prediction_probability_max',
    'probability',
    'Probability',
    'risk_probability',
    'Risk_Probability',
    'confidence_score',
    'Confidence_Score',
    'score',
    'Score',
    'ews_score',
    'prediction_confidence',
    'max_probability',
    'prob_max',
  ];

  for (const k of directKeys) {
    const raw = apiResult[k];
    if (raw == null || raw === '') continue;
    const n = parseNumericMaybePercent(raw);
    if (n == null) continue;
    if (n >= 0 && n <= 1) return n;
    if (n > 1 && n <= 100) return n / 100;
    if (n > 100) return null;
  }

  const probs = apiResult.class_probabilities ?? apiResult.classProbabilities ?? apiResult.probabilities;
  if (probs && typeof probs === 'object' && riskTierNorm) {
    const t = String(riskTierNorm).toLowerCase();
    const pick =
      probs[riskTierNorm] ??
      probs[t] ??
      probs[`p_${t}`] ??
      probs[`prob_${t}`] ??
      probs[`P_${String(riskTierNorm).toUpperCase()}`];
    const n = parseNumericMaybePercent(pick);
    if (n != null) {
      if (n >= 0 && n <= 1) return n;
      if (n > 1 && n <= 100) return n / 100;
    }
    const pg = parseNumericMaybePercent(probs.green ?? probs.GREEN ?? probs.p_green);
    const pa = parseNumericMaybePercent(probs.amber ?? probs.AMBER ?? probs.p_amber);
    const pr = parseNumericMaybePercent(probs.red ?? probs.RED ?? probs.p_red);
    if (riskTierNorm === 'GREEN' && pg != null) return pg > 1 ? pg / 100 : pg;
    if (riskTierNorm === 'AMBER' && pa != null) return pa > 1 ? pa / 100 : pa;
    if (riskTierNorm === 'RED' && pr != null) return pr > 1 ? pr / 100 : pr;
    const best = Math.max(
      pg != null ? (pg > 1 ? pg / 100 : pg) : 0,
      pa != null ? (pa > 1 ? pa / 100 : pa) : 0,
      pr != null ? (pr > 1 ? pr / 100 : pr) : 0
    );
    if (best > 0) return best;
  }

  const pg = parseNumericMaybePercent(apiResult.p_green ?? apiResult.prob_green ?? apiResult.P_GREEN);
  const pa = parseNumericMaybePercent(apiResult.p_amber ?? apiResult.prob_amber ?? apiResult.P_AMBER);
  const pr = parseNumericMaybePercent(apiResult.p_red ?? apiResult.prob_red ?? apiResult.P_RED);
  if (riskTierNorm === 'GREEN' && pg != null) return pg > 1 ? pg / 100 : pg;
  if (riskTierNorm === 'AMBER' && pa != null) return pa > 1 ? pa / 100 : pa;
  if (riskTierNorm === 'RED' && pr != null) return pr > 1 ? pr / 100 : pr;

  return null;
};

/** Merge common nested envelopes so confidence / SHAP live under one flat object. */
const flattenPredictionPayload = (apiResult) => {
  if (!apiResult || typeof apiResult !== 'object') return apiResult;
  const out = { ...apiResult };
  const nestKeys = ['model_output', 'output', 'prediction', 'result', 'response'];
  for (const nk of nestKeys) {
    const inner = apiResult[nk];
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      Object.assign(out, inner);
    }
  }
  return out;
};

const transformPredictionResult = (apiResult) => {
  const flat = flattenPredictionPayload(apiResult);

  const tierRaw = flat.risk_tier ?? flat.Risk_Tier ?? flat.riskTier ?? flat.prediction ?? apiResult.risk_tier;
  const riskTier = normalizeTier(tierRaw);

  let confidence = pickConfidenceFromApi(flat, riskTier);
  if (confidence == null) {
    confidence = pickConfidenceFromApi(apiResult, riskTier);
  }
  if (confidence == null) {
    const n = parseNumericMaybePercent(flat.confidence ?? flat.model_score ?? flat.Model_Score);
    if (n != null) {
      confidence = n > 1 && n <= 100 ? n / 100 : n >= 0 && n <= 1 ? n : null;
    }
  }

  let confidencePercent = null;
  if (confidence != null && confidence <= 1 && confidence >= 0) {
    confidencePercent = confidence * 100;
  } else if (confidence != null && confidence > 1 && confidence <= 100) {
    confidencePercent = confidence;
    confidence = confidence / 100;
  }

  const shapValues =
    flat.shap_values ?? flat.shapValues ?? apiResult.shap_values ?? apiResult.shapValues ?? [];

  return {
    riskTier,
    confidence,
    confidencePercent,
    shapValues: Array.isArray(shapValues) ? shapValues : [],
  };
};

export const fetchEwsAccounts = async () => {
  const response = await ewsRequest('/api/ews/accounts/generate', {
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
  assertOkWrapper(json);

  const rows = extractDataArray(json).slice(0, 5);
  return rows.map((row, idx) => ({
    ...normalizeEwsRow(row),
    __rowId: `${row.account_id || row.Account_ID || 'ews'}-${idx}`,
  }));
};

export const predictEwsAccounts = async (rows) => {
  const payload = rows.map(stripForPredict);
  const path = '/api/ews/accounts/predict';

  const response = await ewsRequest(path, {
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
  const transformed = raw.map(transformPredictionResult);

  const byAccount = new Map();
  raw.forEach((r, i) => {
    const id = r.account_id ?? r.Account_ID;
    if (id != null) byAccount.set(String(id), transformed[i]);
  });

  return rows.map((row, idx) => {
    const id = row.account_id != null ? String(row.account_id) : null;
    const fromMap = id && byAccount.has(id) ? byAccount.get(id) : transformed[idx];
    return normalizeEwsRow({ ...row, ...(fromMap || {}) });
  });
};
