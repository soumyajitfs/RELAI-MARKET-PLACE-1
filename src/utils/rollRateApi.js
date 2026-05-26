import { ROLL_RATE_FIELD_RULES } from '../data/rollRateFieldRules';

const AUTH_TOKEN = 'rollrate_internal_marketplace_key_2024';
const ROLL_RATE_REMOTE_BASE = 'https://ml-market-backend-2-roll-rate.azurewebsites.net';

const INT_KEYS = new Set(
  Object.entries(ROLL_RATE_FIELD_RULES)
    .filter(([, rule]) => rule.type === 'int' || rule.type === 'discrete')
    .map(([key]) => key)
    .filter((key) => key !== 'account_id' && key !== 'snapshot_date'),
);

const rollRateRequest = async (path, options) => {
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
    response = await fetch(`${ROLL_RATE_REMOTE_BASE}${path}`, options);
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

const pickAccountId = (row) => row.account_id ?? row.accountId ?? row.Account_ID;

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

export const resolveRagRating = (row) => {
  if (!row || typeof row !== 'object') return null;
  const raw = row.roll_rate_risk ?? row.rag_rating ?? row.ragRating ?? row.RAG_Rating;
  if (raw == null || String(raw).trim() === '') return null;
  return String(raw).trim();
};

export const formatRagRating = (row) => {
  const rag = resolveRagRating(row);
  return rag ?? '—';
};

export const ragColor = (rag) => {
  const r = String(rag || '').toLowerCase();
  if (r === 'green') return '#43A047';
  if (r === 'amber') return '#FB8C00';
  if (r === 'red') return '#E53935';
  return '#1e3a5f';
};

export const formatPrimaryProbPct = (row) => {
  const pct = row?.primary_prob_percent ?? row?.primaryProbPercent;
  if (pct != null && String(pct).trim() !== '') {
    const s = String(pct).trim();
    return s.includes('%') ? s : `${s}%`;
  }
  const val = row?.primary_prob_value ?? row?.prob_roll_forward ?? row?.prob_cure;
  const n = Number(val);
  if (!Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(1)}%`;
};

export const resolvePrimaryProb = (row) => {
  if (!row || typeof row !== 'object') return null;
  const raw = row.primary_prob_value ?? row.primaryProbValue ?? row.prob_roll_forward ?? row.prob_cure;
  const n = Number(raw);
  return Number.isFinite(n) ? (n > 1 ? n / 100 : n) : null;
};

export const formatProbRollForward = (row) => {
  const n = Number(row?.prob_roll_forward ?? row?.probRollForward);
  if (!Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(1)}%`;
};

export const formatProbCure = (row) => {
  const n = Number(row?.prob_cure ?? row?.probCure);
  if (!Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(1)}%`;
};

export const formatRiskInterpretation = (row) => {
  const text = row?.risk_interpretation ?? row?.riskInterpretation;
  if (text == null || String(text).trim() === '') return '—';
  return String(text).trim();
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
    direction: d.direction,
  };
};

const transformPrediction = (apiResult) => {
  const flat = apiResult && typeof apiResult === 'object' ? { ...apiResult } : {};
  const rag = resolveRagRating(flat);

  const topRaw = flat.top_shap_drivers ?? flat.topShapDrivers ?? flat.shap_values ?? [];
  const top_shap_drivers = Array.isArray(topRaw) ? topRaw.map(mapDriverEntry).filter(Boolean) : [];
  const shapValues = top_shap_drivers.map((d) => ({
    feature: d.feature,
    impact: Number.isFinite(d.shap_impact) ? d.shap_impact : 0,
  }));

  return {
    ...flat,
    rag_rating: rag,
    roll_rate_risk: rag ?? flat.roll_rate_risk,
    primary_prob_percent: formatPrimaryProbPct(flat),
    top_shap_drivers,
    shap_values: top_shap_drivers,
    shapValues,
    top_drivers: top_shap_drivers,
  };
};

export const normalizeRollRateInputRow = (row, idx = 0) => {
  const account_id = pickAccountId(row);
  const norm = {
    account_id: account_id != null ? String(account_id) : account_id,
    __rowId: `rr-${account_id ?? idx}-${idx}`,
  };

  const allKeys = new Set([...Object.keys(ROLL_RATE_FIELD_RULES), ...Object.keys(row || {})]);

  allKeys.forEach((key) => {
    if (key === 'account_id' || key.startsWith('__')) return;
    const raw = pickRowValue(row, key, ROLL_RATE_FIELD_RULES[key]?.label);
    if (raw == null || raw === '') {
      norm[key] = raw;
      return;
    }
    const rule = ROLL_RATE_FIELD_RULES[key];
    if (rule?.type === 'enum' || rule?.type === 'text') {
      norm[key] = String(raw);
      return;
    }
    if (INT_KEYS.has(key) && rule?.type !== 'float') {
      const n = Number(raw);
      norm[key] = Number.isFinite(n) ? Math.round(n) : raw;
      return;
    }
    const n = Number(raw);
    norm[key] = Number.isFinite(n) ? n : raw;
  });

  return norm;
};

export const fetchRollRateAccounts = async () => {
  const response = await rollRateRequest('/api/rollrate/accounts/generate', {
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
  return rows.map((row, idx) => normalizeRollRateInputRow(row, idx));
};

export const predictRollRateAccounts = async (rows) => {
  const accountIds = rows
    .map((r) => r.account_id)
    .filter((id) => id != null && String(id).trim() !== '');
  if (accountIds.length === 0) throw new Error('No valid accounts to score');

  const response = await rollRateRequest('/api/rollrate/accounts/predict', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ account_ids: accountIds }),
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
    const id = pickAccountId(r);
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
            : raw[idx]
              ? transformPrediction(raw[idx])
              : {};
    return { ...normalizeRollRateInputRow(row, idx), ...pred };
  });
};
