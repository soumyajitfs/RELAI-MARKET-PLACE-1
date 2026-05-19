import {
  COLLECTIONS_SCORECARD_FIELD_RULES,
  COLLECTIONS_SCORECARD_PREDICT_KEYS,
} from '../data/collectionsScorecardFieldRules';

const AUTH_TOKEN = 'replace_with_your_secret_key_here';
const COLLECTIONS_REMOTE_BASE = 'https://ml-market-backend-2-collections-scorecard.azurewebsites.net';

const INT_KEYS = new Set([
  'current_dpd_bucket',
  'months_in_bucket',
  'cycles_delq_12m',
  'num_on_time_6m',
  'num_partial_6m',
  'num_missed_6m',
  'days_since_last_pay',
  'contact_attempts_30d',
  'rpc_count_30d',
  'ptp_broken_12m',
  'ptp_kept_12m',
  'cust_initiated_contact_30d',
  'salary_credit_regular',
  'num_nsf_6m',
  'cibil_now',
  'num_new_tl_6m',
  'num_new_enq_3m',
  'original_tenor',
  'months_on_book',
  'vintage_year',
  'restructured',
  'co_applicant',
]);

const collectionsRequest = async (path, options) => {
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
    response = await fetch(`${COLLECTIONS_REMOTE_BASE}${path}`, options);
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

export const resolveCollectionsScore = (row) => {
  if (!row || typeof row !== 'object') return null;
  const raw = row.collections_score ?? row.collectionsScore ?? row.Collections_Score;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

export const formatCollectionsScore = (row) => {
  const score = resolveCollectionsScore(row);
  if (score == null) return '—';
  return String(Math.round(score));
};

export const resolveProbabilityBad = (row) => {
  if (!row || typeof row !== 'object') return null;
  const raw = row.probability_bad ?? row.probabilityBad ?? row.probability;
  const n = Number(raw);
  return Number.isFinite(n) ? (n > 1 ? n / 100 : n) : null;
};

export const formatProbabilityBadPct = (row) => {
  const pct = row?.probability_pct ?? row?.probabilityPct;
  if (pct != null && String(pct).trim() !== '') {
    const s = String(pct).trim();
    return s.includes('%') ? s : `${s}%`;
  }
  const p = resolveProbabilityBad(row);
  if (p == null) return '—';
  return `${(p * 100).toFixed(1)}%`;
};

export const formatScoreBand = (row) => {
  const band = row?.score_band ?? row?.scoreBand;
  if (band == null || String(band).trim() === '') return '—';
  return String(band).trim();
};

export const formatTreatmentQueue = (row) => {
  const q = row?.treatment_queue ?? row?.treatmentQueue;
  if (q == null || String(q).trim() === '') return '—';
  return String(q).trim();
};

const mapDriverEntry = (d) => {
  if (d == null || typeof d !== 'object') return null;
  const feature = d.feature ?? d.Feature ?? d.name;
  if (!feature) return null;
  const impactRaw = d.shap_impact ?? d.shap_value ?? d.impact ?? d.contribution;
  return {
    feature,
    shap_impact: Number(impactRaw),
    feature_value: d.feature_value ?? d.value ?? d.featureValue,
  };
};

const transformPrediction = (apiResult) => {
  const flat = apiResult && typeof apiResult === 'object' ? { ...apiResult } : {};

  const collections_score = resolveCollectionsScore(flat);
  const probability_bad = resolveProbabilityBad(flat);
  let probability_pct = flat.probability_pct ?? flat.probabilityPct ?? null;
  if (probability_pct == null && probability_bad != null) {
    probability_pct = `${(probability_bad * 100).toFixed(1)}%`;
  }

  const topRaw = flat.top_drivers ?? flat.topDrivers ?? flat.shap_values ?? [];
  const top_drivers = Array.isArray(topRaw) ? topRaw.map(mapDriverEntry).filter(Boolean) : [];
  const shapValues = top_drivers.map((d) => ({
    feature: d.feature,
    impact: Number.isFinite(d.shap_impact) ? d.shap_impact : 0,
  }));

  return {
    ...flat,
    collections_score,
    probability_bad,
    probability_pct,
    score_band: formatScoreBand(flat),
    treatment_queue: formatTreatmentQueue(flat),
    top_drivers,
    shap_values: top_drivers,
    shapValues,
    top_shap_drivers: top_drivers,
  };
};

export const normalizeCollectionsScorecardInputRow = (row, idx = 0) => {
  const cust_id = pickCustId(row);
  const norm = {
    cust_id: cust_id != null ? String(cust_id) : cust_id,
    __rowId: `col-${cust_id ?? idx}-${idx}`,
  };

  const allKeys = new Set([
    ...COLLECTIONS_SCORECARD_PREDICT_KEYS,
    ...Object.keys(COLLECTIONS_SCORECARD_FIELD_RULES),
  ]);

  allKeys.forEach((key) => {
    if (key === 'cust_id') return;
    const raw = pickRowValue(row, key, COLLECTIONS_SCORECARD_FIELD_RULES[key]?.label);
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
  const norm = normalizeCollectionsScorecardInputRow(row);
  const out = {};
  for (const k of COLLECTIONS_SCORECARD_PREDICT_KEYS) {
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

export const fetchCollectionsScorecardAccounts = async () => {
  const response = await collectionsRequest('/api/collections/accounts/generate', {
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
  return rows.map((row, idx) => normalizeCollectionsScorecardInputRow(row, idx));
};

export const predictCollectionsScorecardAccounts = async (rows) => {
  const payload = rows.map(rowToPredictPayload);
  if (payload.length === 0 || !payload.every((p) => p.cust_id != null && p.cust_id !== '')) {
    throw new Error('No valid accounts to score');
  }

  const response = await collectionsRequest('/api/collections/accounts/predict', {
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
    return { ...normalizeCollectionsScorecardInputRow(row, idx), ...pred };
  });
};
