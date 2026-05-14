const AUTH_TOKEN = 'ptp_internal_marketplace_key_2024';
const PTP_REMOTE_BASE = 'https://ml-market-backend-ptp.azurewebsites.net';

const ptpRequest = async (path, options) => {
  let response;
  try {
    response = await fetch(path, options);
  } catch (_) {
    response = null;
  }
  if (!response || response.status === 404 || !(response.headers.get('content-type') || '').includes('application/json')) {
    response = await fetch(`${PTP_REMOTE_BASE}${path}`, options);
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

const flattenPredictionPayload = (apiResult) => {
  if (!apiResult || typeof apiResult !== 'object') return apiResult;
  const out = { ...apiResult };
  ['model_output', 'output', 'prediction', 'result', 'response'].forEach((nk) => {
    const inner = apiResult[nk];
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) Object.assign(out, inner);
  });
  return out;
};

const normalizePtpTier = (raw) => {
  if (raw == null) return '';
  const s = String(raw).trim().toUpperCase().replace(/\s+/g, '_');
  if (s === 'GREEN' || s === 'YELLOW') return 'GREEN';
  if (s === 'AMBER' || s === 'ORANGE') return 'AMBER';
  if (s === 'RED' || s === 'DARK_RED') return 'RED';
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
  const ps = flat.prob_score ?? flat.Prob_Score;
  if (ps != null && ps !== '') {
    const n = Number(ps);
    if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  }
  const pp = flat.prob_percent ?? flat.Prob_Percent;
  if (pp != null && pp !== '') {
    const n = parseNum(pp);
    if (n != null && n >= 0 && n <= 100) return n / 100;
    if (n != null && n >= 0 && n <= 1) return n;
  }

  const keys = [
    'probability',
    'Probability',
    'model_score',
    'Model_Score',
    'prediction_probability',
    'ptp_kept_probability',
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

const transformPrediction = (apiResult) => {
  const flat = flattenPredictionPayload(apiResult);
  const tierRaw = flat.ptp_risk ?? flat.Ptp_Risk ?? flat.ptpRisk ?? apiResult?.ptp_risk;
  const riskTier = normalizePtpTier(tierRaw);

  let confidencePercent = null;
  if (flat.prob_percent != null && flat.prob_percent !== '') {
    const pctStr = String(flat.prob_percent).replace('%', '').trim();
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

  const top = flat.top_shap_drivers ?? apiResult?.top_shap_drivers;
  const shapValues = Array.isArray(top)
    ? top.map((d) => ({
        feature: d.feature,
        impact: Number(d.shap_impact),
      }))
    : [];

  return {
    riskTier,
    confidence,
    confidencePercent,
    shapValues,
    top_shap_drivers: Array.isArray(top) ? top : [],
  };
};

export const fetchPtpAccounts = async () => {
  const response = await ptpRequest('/api/ptp/accounts/generate', {
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
    const ptp_id = row.ptp_id ?? row.Ptp_Id ?? row.PTP_ID;
    return {
      ...row,
      ptp_id,
      __rowId: `${ptp_id || 'ptp'}-${idx}`,
    };
  });
};

export const predictPtpAccounts = async (rows) => {
  const ptp_ids = rows.map((r) => r.ptp_id ?? r.Ptp_Id).filter(Boolean);
  if (ptp_ids.length === 0) throw new Error('No PTP IDs to score');

  const response = await ptpRequest('/api/ptp/accounts/predict', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ptp_ids }),
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

  const byPtp = new Map();
  raw.forEach((r, i) => {
    const id = r.ptp_id ?? r.Ptp_Id;
    if (id != null) byPtp.set(String(id), transformed[i]);
  });

  return rows.map((row, idx) => {
    const id = row.ptp_id != null ? String(row.ptp_id) : null;
    const pred = (id && byPtp.has(id) ? byPtp.get(id) : transformed[idx]) || {};
    return { ...row, ...pred };
  });
};
