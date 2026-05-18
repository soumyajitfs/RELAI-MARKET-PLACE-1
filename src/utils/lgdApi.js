const AUTH_TOKEN = '997hhEo876NHJo2AMbXl1i78895deK';
const LGD_REMOTE_BASE = 'https://ml-market-backend-lgd.azurewebsites.net';

const LGD_PREDICT_KEYS = ['account_id', 'ltv', 'loan_purpose'];

const lgdRequest = async (path, options) => {
  let response;
  try {
    response = await fetch(path, options);
  } catch (_) {
    response = null;
  }
  if (!response || response.status === 404 || !(response.headers.get('content-type') || '').includes('application/json')) {
    response = await fetch(`${LGD_REMOTE_BASE}${path}`, options);
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
    json.data?.records,
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
    const n = Number(raw.replace('%', '').trim());
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

export const normalizeLgdInputRow = (row, idx = 0) => {
  const account_id = row.account_id ?? row.Account_Id ?? row.accountId ?? row.ACCOUNT_ID;
  const ltvRaw = row.ltv ?? row.LTV ?? row.Ltv;
  const lpRaw = row.loan_purpose ?? row.LoanPurpose ?? row.loanPurpose;

  let ltv = ltvRaw;
  if (ltvRaw != null && ltvRaw !== '') {
    const n = Number(ltvRaw);
    ltv = Number.isFinite(n) ? n : ltvRaw;
  }

  let loan_purpose = lpRaw;
  if (lpRaw != null && lpRaw !== '') {
    const n = Number(lpRaw);
    loan_purpose = Number.isFinite(n) ? Math.round(n) : lpRaw;
  }

  return {
    account_id,
    ltv,
    loan_purpose,
    __rowId: `${account_id || 'lgd'}-${idx}`,
  };
};

const pickLgdPredicted = (flat) => {
  const keys = ['lgd_predicted', 'LGD_Predicted', 'predicted_lgd', 'Predicted_LGD', 'lgd', 'LGD'];
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

  const lgd_predicted = pickLgdPredicted(flat);
  let lgd_percent =
    flat.lgd_percent ??
    flat.LGD_Percent ??
    flat.lgd_pct ??
    flat.LGD_Pct ??
    null;

  if (lgd_percent != null) lgd_percent = String(lgd_percent).trim();

  let confidencePercent = null;
  if (lgd_percent) {
    const pct = parseNum(lgd_percent);
    if (pct != null) confidencePercent = pct <= 1 ? pct * 100 : pct;
  }
  if (confidencePercent == null && lgd_predicted != null) {
    confidencePercent = lgd_predicted * 100;
  }

  const confidence = lgd_predicted;

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
    const rawShap =
      flat.shap_values ??
      apiResult?.shap_values ??
      flat.shape_values ??
      apiResult?.shape_values;
    if (Array.isArray(rawShap) && rawShap.length > 0) {
      return rawShap.map(mapShapEntry).filter(Boolean);
    }
    if (rawShap && typeof rawShap === 'object' && !Array.isArray(rawShap)) {
      return Object.entries(rawShap).map(([feature, val]) => {
        if (val != null && typeof val === 'object') {
          return mapShapEntry({ feature, ...val });
        }
        return mapShapEntry({ feature, shap_impact: val });
      }).filter(Boolean);
    }
    return [];
  };

  const top_shap_drivers = buildTopShapDrivers();
  const shapValues = top_shap_drivers.map((d) => ({
    feature: d.feature,
    impact: Number.isFinite(d.shap_impact) ? d.shap_impact : 0,
  }));

  return {
    lgd_predicted,
    lgd_percent,
    confidence,
    confidencePercent,
    base_value: flat.base_value ?? flat.baseValue ?? null,
    shapValues,
    top_shap_drivers,
    shap_values: flat.shap_values ?? apiResult?.shap_values,
  };
};

const rowToPredictPayload = (row) => {
  const norm = normalizeLgdInputRow(row);
  const out = {};
  for (const k of LGD_PREDICT_KEYS) {
    if (k === 'account_id') {
      out[k] = norm.account_id;
    } else if (k === 'loan_purpose') {
      const v = norm.loan_purpose;
      out[k] = v === '' || v == null ? v : Math.round(Number(v));
    } else if (k === 'ltv') {
      const v = norm.ltv;
      out[k] = typeof v === 'number' ? v : Number(v);
    }
  }
  return out;
};

export const fetchLgdAccounts = async () => {
  const response = await lgdRequest('/api/lgd/records/generate', {
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
  return rows.map((row, idx) => normalizeLgdInputRow(row, idx));
};

export const predictLgdAccounts = async (rows) => {
  const payload = rows.map(rowToPredictPayload);
  if (payload.length === 0 || !payload.every((p) => p.account_id)) {
    throw new Error('No valid LGD accounts to score');
  }

  const response = await lgdRequest('/api/lgd/records/predict', {
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
    const id = r.account_id ?? r.Account_Id ?? r.id;
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
    return { ...normalizeLgdInputRow(row, idx), ...pred };
  });
};
