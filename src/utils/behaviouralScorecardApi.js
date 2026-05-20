import {
  BEHAVIOURAL_SCORECARD_FIELD_RULES,
  BEHAVIOURAL_SCORECARD_PREDICT_KEYS,
} from '../data/behaviouralScorecardFieldRules';

const AUTH_TOKEN = 'replace_with_your_secret_key_here';
const BEHAVIOURAL_REMOTE_BASE = 'https://ml-market-backend-2-behavioural-scorecard.azurewebsites.net';
const SCORE_FACTOR = 28.853901;
const SCORE_OFFSET = 487.122876;

const INT_KEYS = new Set([
  'num_emi_paid_6m',
  'num_partial_pay_6m',
  'max_dpd_6m',
  'num_dpd30_6m',
  'salary_credit_regular',
  'num_nsf_6m',
  'cibil_now',
  'num_new_tl_6m',
  'num_new_enq_3m',
  'restructured',
]);

const behaviouralRequest = async (path, options) => {
  let response;
  try {
    response = await fetch(path, options);
  } catch (_) {
    response = null;
  }
  if (response != null && response.status >= 400) {
    return response;
  }
  if (!response || response.status === 404 || !(response.headers.get('content-type') || '').includes('application/json')) {
    response = await fetch(`${BEHAVIOURAL_REMOTE_BASE}${path}`, options);
  }
  return response;
};

const firstArray = (...candidates) => {
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
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
    json.data?.records,
    json.data?.accounts,
    json.data?.predictions,
  );
  if (direct) return direct;

  const ri = json.Response?.ResponseInfo;
  if (ri != null && typeof ri === 'object') {
    const d = ri.data;
    if (d && typeof d === 'object' && !Array.isArray(d) && Array.isArray(d.predictions)) {
      return d.predictions;
    }
    const nested = firstArray(
      d,
      d?.records,
      d?.items,
      d?.rows,
      d?.results,
      d?.predictions,
      d?.accounts,
    );
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

const pickCustId = (row) => row.cust_id ?? row.custId ?? row.Cust_ID ?? row.CustId;

const pickRowValue = (row, key, label) => {
  if (!row || typeof row !== 'object') return undefined;
  const parts = key.split('_');
  const pascal = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  const camel = parts[0] + parts.slice(1).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  const candidates = [key, camel, pascal, key.toUpperCase(), label].filter(Boolean);
  for (const k of candidates) {
    const v = row[k];
    if (v != null && v !== '') return v;
  }
  return undefined;
};

export const resolvePdScore = (row) => {
  if (!row || typeof row !== 'object') return null;
  const raw = row.pd_score ?? row.pdScore ?? row.PD_Score;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

export const formatPdScore = (row) => {
  const score = resolvePdScore(row);
  if (score == null) return '—';
  return String(Math.round(score * 10) / 10 === Math.round(score) ? Math.round(score) : score.toFixed(1));
};

export const resolveProbBad12m = (row) => {
  if (!row || typeof row !== 'object') return null;
  const raw = row.prob_bad_12m ?? row.probBad12m ?? row.probability_bad;
  const n = Number(raw);
  if (Number.isFinite(n)) return n > 1 ? n / 100 : n;

  // Backend currently returns pd_score; derive bad probability from score scaling:
  // score = offset + factor * ln(good_odds), where good_odds = (1 - p_bad) / p_bad
  const score = resolvePdScore(row);
  if (!Number.isFinite(score)) return null;
  const goodOdds = Math.exp((score - SCORE_OFFSET) / SCORE_FACTOR);
  const probBad = 1 / (1 + goodOdds);
  return Number.isFinite(probBad) ? probBad : null;
};

export const formatProbBadPct = (row) => {
  const pct = row?.prob_bad_pct ?? row?.probBadPct;
  if (pct != null && String(pct).trim() !== '') {
    const s = String(pct).trim();
    return s.includes('%') ? s : `${s}%`;
  }
  const p = resolveProbBad12m(row);
  if (p == null) return '—';
  return `${(p * 100).toFixed(2)}%`;
};

export const formatScoreBand = (row) => {
  const band = row?.score_band ?? row?.scoreBand;
  if (band == null || String(band).trim() === '') return '—';
  return String(band).trim();
};

export const formatRecommendedAction = (row) => {
  const action = row?.recommended_action ?? row?.recommendedAction;
  if (action == null || String(action).trim() === '') return '—';
  return String(action).trim();
};

const mapDriverEntry = (d) => {
  if (d == null || typeof d !== 'object') return null;
  const feature = d.feature ?? d.Feature ?? d.name;
  if (!feature) return null;
  const impactRaw = d.shap_impact ?? d.shap_value ?? d.impact ?? d.contribution;
  return {
    feature,
    shap_impact: Number(impactRaw),
    feature_value: d.feature_value ?? d.woe_value ?? d.value ?? d.featureValue,
  };
};

const transformPrediction = (apiResult) => {
  const flat = apiResult && typeof apiResult === 'object' ? { ...apiResult } : {};

  const pd_score = resolvePdScore(flat);
  const prob_bad_12m = resolveProbBad12m(flat);
  let prob_bad_pct = flat.prob_bad_pct ?? flat.probBadPct ?? null;
  if (prob_bad_pct == null && prob_bad_12m != null) {
    prob_bad_pct = `${(prob_bad_12m * 100).toFixed(1)}%`;
  }

  const topRaw = flat.top_drivers ?? flat.topDrivers ?? flat.shap_values ?? [];
  const top_drivers = Array.isArray(topRaw) ? topRaw.map(mapDriverEntry).filter(Boolean) : [];
  const shapValues = top_drivers.map((d) => ({
    feature: d.feature,
    impact: Number.isFinite(d.shap_impact) ? d.shap_impact : 0,
  }));

  return {
    ...flat,
    pd_score,
    prob_bad_12m,
    prob_bad_pct,
    score_band: formatScoreBand(flat),
    recommended_action: formatRecommendedAction(flat),
    top_drivers,
    shap_values: top_drivers,
    shapValues,
    top_shap_drivers: top_drivers,
  };
};

export const normalizeBehaviouralScorecardInputRow = (row, idx = 0) => {
  const cust_id = pickCustId(row);
  const norm = {
    cust_id: cust_id != null ? String(cust_id) : cust_id,
    __rowId: `beh-${cust_id ?? idx}-${idx}`,
  };

  const allKeys = new Set([
    ...BEHAVIOURAL_SCORECARD_PREDICT_KEYS,
    ...Object.keys(BEHAVIOURAL_SCORECARD_FIELD_RULES),
  ]);

  allKeys.forEach((key) => {
    if (key === 'cust_id') return;
    const raw = pickRowValue(row, key, BEHAVIOURAL_SCORECARD_FIELD_RULES[key]?.label);
    if (raw == null || raw === '') {
      norm[key] = raw;
      return;
    }
    if (INT_KEYS.has(key)) {
      const n = Number(raw);
      norm[key] = Number.isFinite(n) ? Math.round(n) : raw;
      return;
    }
    const n = Number(raw);
    norm[key] = Number.isFinite(n) ? n : raw;
  });

  return norm;
};

const rowToPredictPayload = (row) => {
  const norm = normalizeBehaviouralScorecardInputRow(row);
  const out = {};
  for (const k of BEHAVIOURAL_SCORECARD_PREDICT_KEYS) {
    const v = norm[k];
    if (k === 'cust_id') {
      out[k] = v != null && v !== '' ? String(v) : v;
    } else if (INT_KEYS.has(k)) {
      out[k] = v === '' || v == null ? v : Math.round(Number(v));
    } else if (typeof v === 'number') {
      out[k] = v;
    } else if (v != null && v !== '') {
      out[k] = Number(v);
    }
  }
  return out;
};

export const fetchBehaviouralScorecardAccounts = async () => {
  const response = await behaviouralRequest('/api/scorecard/accounts/generate', {
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
  return rows.map((row, idx) => normalizeBehaviouralScorecardInputRow(row, idx));
};

export const predictBehaviouralScorecardAccounts = async (rows) => {
  const payload = rows.map(rowToPredictPayload);
  if (payload.length === 0 || !payload.every((p) => p.cust_id != null && p.cust_id !== '')) {
    throw new Error('No valid accounts to score');
  }

  const response = await behaviouralRequest('/api/scorecard/accounts/predict', {
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
    const id = pickCustId(r);
    if (id != null) byId.set(String(id), transformed[i]);
  });

  return rows.map((row, idx) => {
    const id = row.cust_id != null ? String(row.cust_id) : null;
    const byMap = id && byId.has(id) ? byId.get(id) : null;
    const byIndex = transformed[idx];
    const pred =
      byMap != null
        ? byMap
        : byIndex != null
          ? byIndex
          : transformed.length === 1 && rows.length === 1
            ? transformed[0]
            : raw[idx]
              ? transformPrediction(raw[idx])
              : {};
    return { ...normalizeBehaviouralScorecardInputRow(row, idx), ...pred };
  });
};
