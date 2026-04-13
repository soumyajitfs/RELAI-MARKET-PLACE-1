// Customer Churn backend API
// In development, requests to /api/churn are proxied via setupProxy.js

const AUTH_TOKEN = '997hhEo876NHJo2AMbXl1i78895deK';

const toNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const toInt = (v, fallback = 0) => Math.trunc(toNumber(v, fallback));

const CHURN_REMOTE_BASE = 'https://ml-market-backend-customer-churn.azurewebsites.net';

const churnRequest = async (path, options) => {
  let response;
  try {
    response = await fetch(path, options);
  } catch (_) {
    response = null;
  }

  if (!response || response.status === 404 || !(response.headers.get('content-type') || '').includes('application/json')) {
    const directUrl = `${CHURN_REMOTE_BASE}${path}`;
    response = await fetch(directUrl, options);
  }

  return response;
};

export const transformChurnCustomerToApi = (customer) => ({
  user_id: String(customer.user_id || ''),
  subscription_type: String(customer.subscription_type || ''),
  plan_type: String(customer.plan_type || ''),
  primary_device: String(customer.primary_device || ''),
  region: String(customer.region || ''),
  most_read_category: String(customer.most_read_category || ''),
  last_campaign_engaged: String(customer.last_campaign_engaged || ''),
  payment_method: String(customer.payment_method || ''),
  signup_source: String(customer.signup_source || ''),
  customer_age: toInt(customer.customer_age),
  avg_articles_per_week: toNumber(customer.avg_articles_per_week),
  article_skips_per_week: toInt(customer.article_skips_per_week),
  days_since_last_login: toInt(customer.days_since_last_login),
  support_tickets_last_90d: toInt(customer.support_tickets_last_90d),
  email_open_rate: toNumber(customer.email_open_rate),
  time_spent_per_session_mins: toNumber(customer.time_spent_per_session_mins),
  tenure_days: toInt(customer.tenure_days),
  completion_rate: toNumber(customer.completion_rate),
  campaign_ctr: toNumber(customer.campaign_ctr),
  nps_score: toInt(customer.nps_score),
  sentiment_score: toNumber(customer.sentiment_score),
  csat_score: toInt(customer.csat_score),
  discount_used_last_renewal: String(customer.discount_used_last_renewal || ''),
  auto_renew: String(customer.auto_renew || ''),
  previous_renewal_status: String(customer.previous_renewal_status || ''),
  downgrade_history: String(customer.downgrade_history || ''),
});

/**
 * GET /api/churn/customers/generate?n=5
 */
export const fetchChurnCustomers = async () => {
  const response = await churnRequest('/api/churn/customers/generate?n=5', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Churn API route not found. Restart the app server and try again.');
    }
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  if (json.Response?.StatusCode !== 200) {
    throw new Error(json.Response?.Message || 'API returned an error');
  }

  const rows = json.Response.ResponseInfo?.data || [];
  return rows.map((row, idx) => ({ ...row, __rowId: `${row.user_id}-${idx}` }));
};

const transformPredictionResult = (apiResult) => {
  const pct = String(apiResult.probability_percent || '').replace('%', '');
  const probabilityPercent = pct ? parseFloat(pct) : null;

  return {
    user_id: apiResult.user_id,
    prediction: apiResult.prediction,
    probability: apiResult.probability,
    probabilityPercent,
    churn_risk: apiResult.churn_risk,
    shapValues: apiResult.shap_values || [],
  };
};

/**
 * POST /api/churn/customers/predict?n=5
 */
export const predictChurnCustomers = async (customers) => {
  const payload = customers.map(transformChurnCustomerToApi);

  const response = await churnRequest('/api/churn/customers/predict?n=5', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Churn API route not found. Restart the app server and try again.');
    }
    let detail = response.statusText;
    try {
      const errBody = await response.json();
      if (errBody.detail) {
        detail = Array.isArray(errBody.detail)
          ? errBody.detail.map(d => d.msg || JSON.stringify(d)).join('; ')
          : String(errBody.detail);
      }
    } catch (_) {
      // Keep generic status detail
    }
    throw new Error(`Prediction failed (${response.status}): ${detail}`);
  }

  const json = await response.json();
  if (json.Response?.StatusCode !== 200) {
    throw new Error(json.Response?.Message || 'Prediction API returned an error');
  }

  const raw = json.Response.ResponseInfo?.data || [];
  const transformed = raw.map(transformPredictionResult);

  // Match by user_id; use queue so duplicates are still handled correctly.
  const queues = new Map();
  transformed.forEach((item) => {
    if (!queues.has(item.user_id)) queues.set(item.user_id, []);
    queues.get(item.user_id).push(item);
  });

  return customers.map((customer) => {
    const queue = queues.get(customer.user_id);
    const prediction = queue && queue.length ? queue.shift() : null;
    return prediction ? { ...customer, ...prediction } : customer;
  });
};
