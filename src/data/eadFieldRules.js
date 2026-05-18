const L = (s) => s;

/** PascalCase keys match Postman / backend. */
export const EAD_FIELD_RULES = {
  Customer_ID: { type: 'int', editable: false, label: L('Customer ID') },

  Credit_Score: { type: 'int', min: 300, max: 850, label: L('Credit Score') },
  Utilization_Rate: { type: 'float', min: 0, max: 1, label: L('Utilization Rate (0–1)') },
  Months_on_Book: { type: 'int', min: 0, max: 600, label: L('Months on Book') },
  Past_Delinquencies: { type: 'int', min: 0, max: 99, label: L('Past Delinquencies') },
  Payment_to_Income_Ratio: { type: 'float', min: 0, max: 5, label: L('Payment-to-Income Ratio') },
  Current_Exposure: { type: 'float', min: 0, max: 1e7, label: L('Current Exposure (INR)') },
  Undrawn_Limit: { type: 'float', min: 0, max: 1e7, label: L('Undrawn Limit (INR)') },
};

/** Same order as simulation table inputs (excludes Customer_ID); SHAP rows align to this. */
export const EAD_SHAP_DISPLAY_ORDER = [
  'Credit_Score',
  'Utilization_Rate',
  'Months_on_Book',
  'Past_Delinquencies',
  'Payment_to_Income_Ratio',
  'Current_Exposure',
  'Undrawn_Limit',
];

export const resolveEadFieldRules = () => {
  const out = {};
  Object.keys(EAD_FIELD_RULES).forEach((k) => {
    out[k] = { ...EAD_FIELD_RULES[k], editable: EAD_FIELD_RULES[k].editable !== false };
  });
  return out;
};

export const validateEadValue = (field, value, rules = EAD_FIELD_RULES) => {
  const rule = rules[field];
  if (!rule || rule.editable === false) return null;

  const n = Number(value);
  if (!Number.isFinite(n)) return `"${rule.label}" must be a valid number.`;

  if (rule.min != null && n < rule.min) return `"${rule.label}" must be >= ${rule.min}.`;
  if (rule.max != null && n > rule.max) return `"${rule.label}" must be <= ${rule.max}.`;

  if (rule.type === 'int' && !Number.isInteger(n)) {
    return `"${rule.label}" must be an integer.`;
  }

  return null;
};

export const validateEadRowCrossFields = () => null;
