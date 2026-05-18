import { PERSONAL_LOAN_EAD_FIELD_RULES, PERSONAL_LOAN_EAD_PREDICT_KEYS } from '../data/personalLoanEadFieldRules';

const AUTH_TOKEN = '997hhEo876NHJo2AMbXl1i78895deK';
const EAD_LOAN_REMOTE_BASE = 'https://ml-market-backend-ead-loan.azurewebsites.net';

const eadLoanRequest = async (path, options) => {
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
    response = await fetch(`${EAD_LOAN_REMOTE_BASE}${path}`, options);
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
    json.loans,
    json.records,
    json.items,
    json.rows,
    json.output,
    json.data?.values,
    json.data?.records,
    json.data?.loans,
  );
  if (direct) return direct;

  const ri = json.Response?.ResponseInfo;
  if (ri != null && typeof ri === 'object') {
    const d = ri.data;
    const nested = firstArray(d, d?.records, d?.items, d?.rows, d?.results, d?.predictions, d?.loans);
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
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

const pickLoanId = (row) => row.loan_id ?? row.loanId ?? row.Loan_ID ?? row.LoanId;

/**
 * API often returns only predicted_ead (EAD = K × outstanding). Derive K when missing.
 */
export const resolvePredictedKFactor = (row) => {
  if (!row || typeof row !== 'object') return null;

  const direct = parseNum(
    row.predicted_k_factor ??
      row.Predicted_K_Factor ??
      row.predicted_K_factor ??
      row.k_factor ??
      row.K_Factor ??
      row.K_final ??
      row.k_final,
  );
  if (direct != null) return direct;

  const ead = parseNum(row.predicted_ead ?? row.Predicted_EAD ?? row.predicted_EAD);
  const outstanding = parseNum(row.outstanding ?? row.Outstanding);
  if (ead != null && outstanding != null && outstanding > 0) {
    return ead / outstanding;
  }
  return null;
};

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

export const normalizePersonalLoanEadInputRow = (row, idx = 0) => {
  const loan_id = pickLoanId(row);
  const norm = { loan_id, __rowId: `loan-${loan_id ?? idx}-${idx}` };

  PERSONAL_LOAN_EAD_PREDICT_KEYS.forEach((key) => {
    if (key === 'loan_id') return;
    const raw = pickRowValue(row, key, PERSONAL_LOAN_EAD_FIELD_RULES[key]?.label);
    if (raw == null || raw === '') {
      norm[key] = raw;
      return;
    }
    if (key === 'employment_type') {
      norm[key] = String(raw).trim();
      return;
    }
    if (['topup_flag', 'restructured_flag', 'age', 'original_tenure_months', 'prior_delinquencies', 'months_since_orig', 'dpd', 'missed_running', 'emis_missed_6m'].includes(key)) {
      const n = Number(raw);
      norm[key] = Number.isFinite(n) ? Math.round(n) : raw;
      return;
    }
    const n = Number(raw);
    norm[key] = Number.isFinite(n) ? n : raw;
  });

  return norm;
};

const transformPrediction = (apiResult) => {
  const flat = flattenPredictionPayload(apiResult);

  const predicted_ead = parseNum(
    flat.predicted_ead ?? flat.Predicted_EAD ?? flat.predicted_EAD ?? flat.ead_predicted,
  );
  let predicted_k_factor = parseNum(
    flat.predicted_k_factor ??
      flat.Predicted_K_Factor ??
      flat.predicted_K_factor ??
      flat.k_factor ??
      flat.K_Factor ??
      flat.K_final ??
      flat.k_final ??
      flat.predicted_k,
  );
  if (predicted_k_factor == null && predicted_ead != null) {
    const out = parseNum(flat.outstanding ?? flat.Outstanding ?? apiResult?.outstanding);
    if (out != null && out > 0) predicted_k_factor = predicted_ead / out;
  }

  const mapShapEntry = (d) => {
    if (d == null || typeof d !== 'object') return null;
    const feature = d.feature ?? d.Feature ?? d.name;
    if (!feature) return null;
    const impactRaw = d.shap_impact ?? d.shap_value ?? d.SHAP_value ?? d.impact ?? d.contribution;
    return {
      feature,
      shap_impact: Number(impactRaw),
      feature_value: d.feature_value ?? d.value ?? d.featureValue,
      direction: d.direction,
    };
  };

  const buildTopShapDrivers = () => {
    const rawTop = flat.top_shap_drivers ?? apiResult?.top_shap_drivers;
    if (Array.isArray(rawTop) && rawTop.length > 0) {
      return rawTop.map(mapShapEntry).filter(Boolean);
    }
    const rawShap = flat.shap_values ?? apiResult?.shap_values ?? flat.shape_values ?? apiResult?.shape_values;
    if (Array.isArray(rawShap) && rawShap.length > 0) {
      return rawShap.map(mapShapEntry).filter(Boolean);
    }
    if (rawShap && typeof rawShap === 'object' && !Array.isArray(rawShap)) {
      return Object.entries(rawShap)
        .map(([feature, val]) => {
          if (val != null && typeof val === 'object') return mapShapEntry({ feature, ...val });
          return mapShapEntry({ feature, shap_impact: val });
        })
        .filter(Boolean);
    }
    return [];
  };

  const top_shap_drivers = buildTopShapDrivers();
  const shapValues = top_shap_drivers.map((d) => ({
    feature: d.feature,
    impact: Number.isFinite(d.shap_impact) ? d.shap_impact : 0,
  }));

  return {
    predicted_k_factor,
    predicted_ead,
    base_value: flat.base_value ?? flat.baseValue ?? null,
    shapValues,
    top_shap_drivers,
    shap_values: flat.shap_values ?? apiResult?.shap_values,
  };
};

const rowToPredictPayload = (row) => {
  const norm = normalizePersonalLoanEadInputRow(row);
  const out = {};
  for (const k of PERSONAL_LOAN_EAD_PREDICT_KEYS) {
    const v = norm[k];
    if (k === 'loan_id') {
      out[k] = typeof v === 'number' ? v : v;
    } else if (k === 'employment_type') {
      out[k] = v;
    } else if (['topup_flag', 'restructured_flag', 'age', 'original_tenure_months', 'prior_delinquencies', 'months_since_orig', 'dpd', 'missed_running', 'emis_missed_6m'].includes(k)) {
      out[k] = v === '' || v == null ? v : Math.round(Number(v));
    } else if (typeof v === 'number') {
      out[k] = v;
    } else if (v != null && v !== '') {
      out[k] = Number(v);
    }
  }
  return out;
};

export const fetchPersonalLoanEadAccounts = async () => {
  const response = await eadLoanRequest('/api/ead/loans/generate', {
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
  return rows.map((row, idx) => normalizePersonalLoanEadInputRow(row, idx));
};

export const predictPersonalLoanEadAccounts = async (rows) => {
  const payload = rows.map(rowToPredictPayload);
  if (payload.length === 0 || !payload.every((p) => p.loan_id != null && p.loan_id !== '')) {
    throw new Error('No valid loans to score');
  }

  const response = await eadLoanRequest('/api/ead/loans/predict', {
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
    const id = pickLoanId(r);
    if (id != null) byId.set(String(id), transformed[i]);
  });

  return rows.map((row, idx) => {
    const id = row.loan_id != null ? String(row.loan_id) : null;
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
    const merged = { ...normalizePersonalLoanEadInputRow(row, idx), ...pred };
    const k = resolvePredictedKFactor(merged);
    if (k != null) merged.predicted_k_factor = k;
    return merged;
  });
};
