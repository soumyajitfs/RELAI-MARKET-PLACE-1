const L = (s) => s;

/** Final model features + account id (PD acceptable ranges). */
export const PD_FIELD_RULES = {
  account_id: { type: 'text', editable: false, label: L('Account ID') },

  interest_rate: { type: 'float', min: 8.97, max: 26.73, label: L('Interest Rate (%)') },
  months_on_book: { type: 'int', min: 3, max: 186, label: L('Months on Book') },
  avg_monthly_credit_6m: { type: 'float', min: 14018.55, max: 336275.87, label: L('Avg Monthly Credit (6M, INR)') },
  current_foir: { type: 'float', min: 0, max: 1, label: L('Current FOIR') },
  bureau_utilization: { type: 'float', min: 0, max: 1, label: L('Bureau Utilization') },
  n_delinquent_elsewhere: {
    type: 'discrete',
    allowed: [0, 1, 2, 3, 4],
    label: L('Delinquent Accounts Elsewhere'),
  },
  n_times_30plus_prior_12m: { type: 'int', min: 0, max: 6, label: L('Times 30+ DPD (12M)') },
  bounce_count_prior_12m: { type: 'int', min: 0, max: 9, label: L('Bounces (12M)') },
};

export const resolvePdFieldRules = () => {
  const out = {};
  Object.keys(PD_FIELD_RULES).forEach((k) => {
    out[k] = { ...PD_FIELD_RULES[k], editable: PD_FIELD_RULES[k].editable !== false };
  });
  return out;
};

export const validatePdValue = (field, value, rules = PD_FIELD_RULES) => {
  const rule = rules[field];
  if (!rule || rule.editable === false) return null;

  if (rule.type === 'text') return null;

  if (rule.type === 'discrete' && Array.isArray(rule.allowed)) {
    const n = Number(value);
    if (!Number.isFinite(n)) return `"${rule.label}" must be a valid number.`;
    if (!rule.allowed.some((a) => Number(a) === n)) {
      return `"${rule.label}" must be one of: ${rule.allowed.join(', ')}.`;
    }
    return null;
  }

  const n = Number(value);
  if (!Number.isFinite(n)) return `"${rule.label}" must be a valid number.`;

  if (rule.min != null && n < rule.min) return `"${rule.label}" must be >= ${rule.min}.`;
  if (rule.max != null && n > rule.max) return `"${rule.label}" must be <= ${rule.max}.`;

  if (rule.type === 'int' && !Number.isInteger(n)) {
    return `"${rule.label}" must be an integer.`;
  }

  return null;
};

export const validatePdRowCrossFields = (_row) => null;
