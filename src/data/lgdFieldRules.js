const L = (s) => s;

/** Model inputs per LGD acceptable-values summary (LTV + LoanPurpose). */
export const LGD_FIELD_RULES = {
  account_id: { type: 'text', editable: false, label: L('Account ID') },
  ltv: {
    type: 'float',
    min: 0.0014,
    max: 1.9841,
    label: L('Loan-to-Value Ratio (LTV)'),
  },
  loan_purpose: {
    type: 'discrete',
    allowed: [0, 1],
    optionLabels: { 0: L('Purchase (0)'), 1: L('Refinance (1)') },
    label: L('Loan Purpose'),
  },
};

export const LGD_INPUT_COLUMN_ORDER = ['ltv', 'loan_purpose'];

export const LGD_SHAP_DISPLAY_ORDER = ['ltv', 'loan_purpose'];

export const resolveLgdFieldRules = () => {
  const out = {};
  Object.keys(LGD_FIELD_RULES).forEach((k) => {
    out[k] = { ...LGD_FIELD_RULES[k], editable: LGD_FIELD_RULES[k].editable !== false };
  });
  return out;
};

export const validateLgdValue = (field, value, rules = LGD_FIELD_RULES) => {
  const rule = rules[field];
  if (!rule || rule.editable === false) return null;

  if (rule.type === 'text') return null;

  if (rule.type === 'discrete' && Array.isArray(rule.allowed)) {
    const n = Number(value);
    if (!Number.isFinite(n)) return `"${rule.label}" must be 0 (Purchase) or 1 (Refinance).`;
    if (!rule.allowed.some((a) => Number(a) === n)) {
      return `"${rule.label}" must be 0 (Purchase) or 1 (Refinance).`;
    }
    return null;
  }

  const n = Number(value);
  if (!Number.isFinite(n)) return `"${rule.label}" must be a valid number.`;

  if (rule.min != null && n < rule.min) {
    return `"${rule.label}" must be >= ${rule.min} (use ratio, not percent).`;
  }
  if (rule.max != null && n > rule.max) {
    return `"${rule.label}" must be <= ${rule.max}.`;
  }

  if (rule.type === 'int' && !Number.isInteger(n)) {
    return `"${rule.label}" must be an integer.`;
  }

  return null;
};

export const validateLgdRowCrossFields = (_row) => null;
