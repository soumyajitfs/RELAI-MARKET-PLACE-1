import {
  APPLICATION_SCORECARD_FIELD_RULES,
  APPLICATION_SCORECARD_PREDICT_KEYS,
} from '../data/applicationScorecardFieldRules';

const AUTH_TOKEN = 'abcfdgetb564fsn';
const SCORECARD_REMOTE_BASE = 'https://ml-market-backend-2-application-scorecard.azurewebsites.net';

const INT_KEYS = new Set([
  'age',
  'dependents',
  'tenor',
  'total_tl',
  'active_tl',
  'oldest_tl_months',
  'max_dpd_24m',
  'num_enq_3m',
  'num_enq_6m',
  'num_writeoff',
  'banking_rel_months',
  'salary_with_us',
  'cibil',
]);

const ENUM_KEYS = new Set([
  'gender',
  'marital',
  'education',
  'residence',
  'city_tier',
  'emp_type',
  'employer_cat',
  'loan_purpose',
]);

const scorecardRequest = async (path, options) => {
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
    response = await fetch(`${SCORECARD_REMOTE_BASE}${path}`, options);
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
    json.applications,
    json.records,
    json.items,
    json.rows,
    json.output,
    json.data?.values,
    json.data?.records,
    json.data?.applications,
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
      d?.applications,
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

export const computeDti = (monthlyIncome, existingEmi) => {
  const inc = Number(monthlyIncome);
  const emi = Number(existingEmi);
  if (!Number.isFinite(inc) || inc <= 0 || !Number.isFinite(emi) || emi < 0) return null;
  const dti = emi / inc;
  return Number.isFinite(dti) ? Math.min(Math.max(dti, 0), 1) : null;
};

const pickAppId = (row) => row.app_id ?? row.appId ?? row.App_ID ?? row.AppId;

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

export const resolveScorecardScore = (row) => {
  if (!row || typeof row !== 'object') return null;
  const raw = row.scorecard_score ?? row.scorecardScore ?? row.Scorecard_Score;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

export const formatScorecardScore = (row) => {
  const score = resolveScorecardScore(row);
  if (score == null) return '—';
  return String(Math.round(score));
};

export const formatDecision = (row) => {
  const d = row?.decision ?? row?.Decision;
  if (d == null || String(d).trim() === '') return '—';
  return String(d).trim();
};

const mapShapEntry = (d) => {
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

  const scorecard_score = resolveScorecardScore(flat);
  const decision = formatDecision(flat);

  const shapRaw = flat.shap_values ?? flat.shapValues ?? [];
  const shap_values = Array.isArray(shapRaw) ? shapRaw.map(mapShapEntry).filter(Boolean) : [];
  const shapValues = shap_values.map((d) => ({
    feature: d.feature,
    impact: Number.isFinite(d.shap_impact) ? d.shap_impact : 0,
  }));

  return {
    ...flat,
    scorecard_score,
    decision,
    shap_values,
    shapValues,
    top_shap_drivers: shap_values,
  };
};

export const normalizeApplicationScorecardInputRow = (row, idx = 0) => {
  const app_id = pickAppId(row);
  const norm = {
    app_id: app_id != null ? String(app_id) : app_id,
    __rowId: `app-${app_id ?? idx}-${idx}`,
  };

  const allKeys = new Set([
    ...APPLICATION_SCORECARD_PREDICT_KEYS,
    ...Object.keys(APPLICATION_SCORECARD_FIELD_RULES),
  ]);

  allKeys.forEach((key) => {
    if (key === 'app_id' || key === 'dti') return;
    const raw = pickRowValue(row, key, APPLICATION_SCORECARD_FIELD_RULES[key]?.label);
    if (raw == null || raw === '') {
      norm[key] = raw;
      return;
    }
    if (ENUM_KEYS.has(key)) {
      norm[key] = String(raw).trim();
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

  const dti = computeDti(norm.monthly_income, norm.existing_emi);
  if (dti != null) norm.dti = dti;
  else if (row.dti != null) norm.dti = Number(row.dti);

  return norm;
};

const rowToPredictPayload = (row) => {
  const norm = normalizeApplicationScorecardInputRow(row);
  const out = {};
  for (const k of APPLICATION_SCORECARD_PREDICT_KEYS) {
    const v = norm[k];
    if (k === 'app_id') {
      out[k] = v != null && v !== '' ? String(v) : v;
    } else if (ENUM_KEYS.has(k)) {
      out[k] = v;
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

export const fetchApplicationScorecardAccounts = async () => {
  const response = await scorecardRequest('/api/scorecard/applications/generate', {
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
  return rows.map((row, idx) => normalizeApplicationScorecardInputRow(row, idx));
};

export const predictApplicationScorecardAccounts = async (rows) => {
  const payload = rows.map(rowToPredictPayload);
  if (payload.length === 0 || !payload.every((p) => p.app_id != null && p.app_id !== '')) {
    throw new Error('No valid applications to score');
  }

  const response = await scorecardRequest('/api/scorecard/applications/predict', {
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
  const byIdRaw = new Map();
  raw.forEach((r, i) => {
    const id = pickAppId(r);
    if (id != null) {
      byId.set(String(id), transformed[i]);
      byIdRaw.set(String(id), r);
    }
  });

  return rows.map((row, idx) => {
    const id = row.app_id != null ? String(row.app_id) : null;
    const rawRec = id && byIdRaw.has(id) ? byIdRaw.get(id) : raw[idx];
    const byMap = id && byId.has(id) ? byId.get(id) : null;
    const byIndex = transformed[idx];
    const pred =
      byMap != null
        ? byMap
        : byIndex != null
          ? byIndex
          : transformed.length === 1 && rows.length === 1
            ? transformed[0]
            : rawRec
              ? transformPrediction(rawRec)
              : {};
    return { ...normalizeApplicationScorecardInputRow(row, idx), ...pred };
  });
};
