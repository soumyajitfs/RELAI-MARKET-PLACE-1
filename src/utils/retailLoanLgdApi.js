import { RETAIL_LOAN_LGD_FIELD_RULES, RETAIL_LOAN_LGD_PREDICT_KEYS } from '../data/retailLoanLgdFieldRules';

const AUTH_TOKEN = '997hhEo876NHJo2AMbXl1i78895deK';
const LGD_LOAN_REMOTE_BASE = 'https://ml-market-backend-2-lgd-loan.azurewebsites.net';

const INT_KEYS = new Set([
  'age',
  'prior_delinquencies',
  'tenure_months',
  'seasoning_months',
  'restructured_flag',
  'dpd',
  'broken_ptps',
  'legal_flag',
  'months_in_collection',
]);

const lgdLoanRequest = async (path, options) => {
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
    response = await fetch(`${LGD_LOAN_REMOTE_BASE}${path}`, options);
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
  if (typeof raw === 'string') {
    const s = raw.trim().replace(/,/g, '');
    if (s.endsWith('%')) {
      const n = Number(s.slice(0, -1));
      return Number.isFinite(n) ? n / 100 : null;
    }
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

/** Training-set cure rate (Stage 1) per Basel_LGD_loan_model_acceptable_values_summary.txt */
const STAGE1_BASE_CURE_RATE = 0.0293;

const PCURE_KEY_RE = /^(p_cure|pcure|p_cure_probability|p_cure_pct|cure_probability|cure_prob|probability_cure|predicted_p_cure|stage1_probability)$/i;

const pickPcureFromObject = (obj, depth = 0) => {
  if (!obj || typeof obj !== 'object' || depth > 4) return null;

  for (const [key, val] of Object.entries(obj)) {
    if (PCURE_KEY_RE.test(key)) {
      const n = parseNum(val);
      if (n != null) return n > 1 ? n / 100 : n;
    }
  }

  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const nested = pickPcureFromObject(val, depth + 1);
      if (nested != null) return nested;
    }
  }
  return null;
};

/**
 * Stage 1 SHAP sums to log-odds offset from training base cure rate (when API omits p_cure).
 */
export const derivePcureFromStage1Shap = (shapStage1, baseCureRate = STAGE1_BASE_CURE_RATE) => {
  if (!Array.isArray(shapStage1) || shapStage1.length === 0) return null;

  const baseEntry = shapStage1.find(
    (d) => d?.feature && /^(base_value|expected_value|const|intercept)$/i.test(String(d.feature)),
  );
  if (baseEntry) {
    const v = Number(baseEntry.impact ?? baseEntry.shap_impact ?? baseEntry.shap_value);
    if (Number.isFinite(v)) {
      if (v >= 0 && v <= 1) return v;
      const p = 1 / (1 + Math.exp(-v));
      if (p >= 0 && p <= 1) return p;
    }
  }

  const rate = Math.min(Math.max(baseCureRate, 1e-6), 1 - 1e-6);
  const baseLogit = Math.log(rate / (1 - rate));
  const sum = shapStage1
    .filter((d) => d?.feature && !/^(base_value|expected_value|const|intercept)$/i.test(String(d.feature)))
    .reduce((s, d) => s + Number(d.impact ?? d.shap_impact ?? d.shap_value ?? 0), 0);
  const logit = baseLogit + sum;
  const p = 1 / (1 + Math.exp(-logit));
  return Number.isFinite(p) ? Math.min(Math.max(p, 0), 1) : null;
};

const derivePcureFromTwoStage = (flat) => {
  const raw = parseNum(flat.raw_two_stage_lgd ?? flat.rawTwoStageLgd);
  const eNon = parseNum(flat.e_lgd_given_non_cure ?? flat.eLgdGivenNonCure);
  const lgdCured = parseNum(flat.lgd_when_cured ?? flat.lgdWhenCured) ?? 0.067324;
  if (raw == null || eNon == null) return null;
  const denom = lgdCured - eNon;
  if (Math.abs(denom) < 1e-9) return null;
  const p = (raw - eNon) / denom;
  return p >= 0 && p <= 1 ? p : null;
};

export const resolvePcure = (row) => {
  if (!row || typeof row !== 'object') return null;

  const direct = pickPcureFromObject(row);
  if (direct != null) return direct;

  const fromTwoStage = derivePcureFromTwoStage(row);
  if (fromTwoStage != null) return fromTwoStage;

  const fromStage1 = derivePcureFromStage1Shap(row.shap_stage1 ?? row.shapStage1);
  if (fromStage1 != null) return fromStage1;

  return null;
};

const pickLoanId = (row) => row.loan_id ?? row.loanId ?? row.Loan_ID ?? row.LoanId;

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

export const resolveFinalBaselLgd = (row) => {
  if (!row || typeof row !== 'object') return null;
  const direct = parseNum(
    row.final_basel_lgd ?? row.Final_Basel_LGD ?? row.finalBaselLgd ?? row.lgd_predicted,
  );
  if (direct != null) return direct;

  const pctStr = row.final_basel_lgd_pct ?? row.finalBaselLgdPct;
  if (pctStr != null && pctStr !== '') {
    const n = Number(String(pctStr).replace('%', '').trim());
    if (Number.isFinite(n)) return n / 100;
  }
  return null;
};

export const formatFinalBaselLgdPercent = (row) => {
  const lgd = resolveFinalBaselLgd(row);
  if (lgd == null) {
    const pct = row?.final_basel_lgd_pct;
    if (pct != null && String(pct).trim() !== '') {
      const s = String(pct).trim();
      return s.includes('%') ? s : `${s}%`;
    }
    return '—';
  }
  return `${(lgd * 100).toFixed(2)}%`;
};

export const normalizeRetailLoanLgdInputRow = (row, idx = 0) => {
  const loan_id = pickLoanId(row);
  const norm = { loan_id: loan_id != null ? String(loan_id) : loan_id, __rowId: `loan-${loan_id ?? idx}-${idx}` };

  RETAIL_LOAN_LGD_PREDICT_KEYS.forEach((key) => {
    if (key === 'loan_id') return;
    const raw = pickRowValue(row, key, RETAIL_LOAN_LGD_FIELD_RULES[key]?.label);
    if (raw == null || raw === '') {
      norm[key] = raw;
      return;
    }
    if (key === 'employment_type') {
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

  return norm;
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
  const flat = flattenPredictionPayload(apiResult);

  let final_basel_lgd = parseNum(flat.final_basel_lgd ?? flat.Final_Basel_LGD ?? flat.finalBaselLgd);
  if (final_basel_lgd == null) {
    final_basel_lgd = resolveFinalBaselLgd(flat);
  }

  const e_lgd_given_non_cure = parseNum(flat.e_lgd_given_non_cure ?? flat.eLgdGivenNonCure);
  const raw_two_stage_lgd = parseNum(flat.raw_two_stage_lgd ?? flat.rawTwoStageLgd);
  const downturn_calibrated_lgd = parseNum(flat.downturn_calibrated_lgd ?? flat.downturnCalibratedLgd);

  let final_basel_lgd_pct = flat.final_basel_lgd_pct ?? flat.finalBaselLgdPct ?? null;
  if (final_basel_lgd_pct == null && final_basel_lgd != null) {
    final_basel_lgd_pct = `${(final_basel_lgd * 100).toFixed(2)}%`;
  }

  const mapShapList = (raw) => {
    if (!Array.isArray(raw)) return [];
    return raw.map(mapShapEntry).filter(Boolean);
  };

  const shap_stage1 = mapShapList(flat.shap_stage1 ?? apiResult?.shap_stage1);
  const shap_stage2 = mapShapList(flat.shap_stage2 ?? apiResult?.shap_stage2);
  const top_shap_drivers = shap_stage2.length > 0 ? shap_stage2 : shap_stage1;

  const shapValues = top_shap_drivers.map((d) => ({
    feature: d.feature,
    impact: Number.isFinite(d.shap_impact) ? d.shap_impact : 0,
  }));

  const merged = {
    ...flat,
    final_basel_lgd,
    final_basel_lgd_pct,
    e_lgd_given_non_cure,
    raw_two_stage_lgd,
    downturn_calibrated_lgd,
    shap_stage1,
    shap_stage2,
    shapValues,
    top_shap_drivers,
    shap_values: top_shap_drivers,
  };

  const p_cure = resolvePcure(merged);
  if (p_cure != null) merged.p_cure = p_cure;

  return merged;
};

const rowToPredictPayload = (row) => {
  const norm = normalizeRetailLoanLgdInputRow(row);
  const out = {};
  for (const k of RETAIL_LOAN_LGD_PREDICT_KEYS) {
    const v = norm[k];
    if (k === 'loan_id') {
      out[k] = v != null && v !== '' ? String(v) : v;
    } else if (k === 'employment_type') {
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

export const fetchRetailLoanLgdAccounts = async () => {
  const response = await lgdLoanRequest('/api/lgd/loans/generate', {
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
  return rows.map((row, idx) => normalizeRetailLoanLgdInputRow(row, idx));
};

export const predictRetailLoanLgdAccounts = async (rows) => {
  const payload = rows.map(rowToPredictPayload);
  if (payload.length === 0 || !payload.every((p) => p.loan_id != null && p.loan_id !== '')) {
    throw new Error('No valid loans to score');
  }

  const response = await lgdLoanRequest('/api/lgd/loans/predict', {
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
    const id = pickLoanId(r);
    if (id != null) {
      byId.set(String(id), transformed[i]);
      byIdRaw.set(String(id), r);
    }
  });

  return rows.map((row, idx) => {
    const id = row.loan_id != null ? String(row.loan_id) : null;
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
    return { ...normalizeRetailLoanLgdInputRow(row, idx), ...pred };
  });
};
