/**
 * Editable field definitions per Customer Lifecycle generate key.
 * Keys match API response property names. Read-only columns are not validated.
 */

const SUBSCRIPTION_TYPES = ['Premium', 'Basic', 'VIP'];

const GENDER_THREE = ['Female', 'Male', 'Other'];
const GENDER_TWO = ['Male', 'Female'];

const REGIONS = ['Suburban', 'Urban', 'Rural'];

const EDUCATION_FULL = [
  "Bachelor's",
  'High School',
  "Master's",
  'Other',
  'Doctorate',
];

const PREFERRED_ARTICLES_FULL = [
  'Technology',
  'News',
  'Politics',
  'Entertainment',
  'Other',
  'Sports',
  'Lifestyle',
];

/** Customer Collection — PreferredArticleCategory subset per spec */
const PREFERRED_ARTICLES_COLLECTION = ['Technology', 'News', 'Politics', 'Entertainment', 'Other'];

const LAST_INTERACTION = ['Email', 'In-App', 'Phone'];

const field = {
  ro: (key, label) => ({ key, readOnly: true, label: label || key }),
  num: (key, label, min, max) => ({
    key,
    label: label || key,
    type: 'number',
    min,
    max,
  }),
  /** String option list (exact values from training data) */
  sel: (key, label, options) => ({
    key,
    label: label || key,
    type: 'select',
    options: [...options],
  }),
  /** 0 / 1 stored as numbers */
  binary: (key, label) => ({
    key,
    label: label || key,
    type: 'select',
    options: [
      { value: 0, label: 'No (0)' },
      { value: 1, label: 'Yes (1)' },
    ],
  }),
};

const customerLifecycleFieldConfig = {
  customer_acquisition: {
    fields: [
      field.ro('Customer_Account', 'Customer Account'),
      field.num('Income', 'Income', 20055, 119986),
      field.num('Age', 'Age', 18, 74),
      field.sel('SubscriptionType', 'Subscription Type', SUBSCRIPTION_TYPES),
      field.sel('Gender', 'Gender', GENDER_THREE),
      field.sel('Region', 'Region', REGIONS),
      field.sel('EducationLevel', 'Education Level', EDUCATION_FULL),
      field.sel('PreferredArticleCategory', 'Preferred Article Category', PREFERRED_ARTICLES_FULL),
      field.num('LifetimeValue', 'Lifetime Value', 50.923314, 4982.999999),
    ],
  },

  customer_value: {
    fields: [
      field.ro('Customer_Account', 'Customer Account'),
      field.num('Income', 'Income', 101, 9999),
      field.num('Age', 'Age', 18, 90),
      field.sel('SubscriptionType', 'Subscription Type', SUBSCRIPTION_TYPES),
      field.sel('Gender', 'Gender', GENDER_TWO),
      field.sel('Region', 'Region', REGIONS),
      field.sel('EducationLevel', 'Education Level', EDUCATION_FULL),
      field.num('ChurnRate', 'Churn Rate', 0.01, 0.07),
      field.num('AvgLifespanMonths', 'Avg Lifespan (Months)', 12, 60),
      field.num('CAC', 'CAC', 40, 120),
      field.num('ReferralBonus', 'Referral Bonus', 5, 25),
      field.num('Revenue from Add-Ons', 'Revenue from Add-Ons', 0, 20),
      field.num('OperationalCost', 'Operational Cost', 5.01, 19.93),
    ],
  },

  customer_retention: {
    fields: [
      field.ro('Customer_Account', 'Customer Account'),
      field.num('Income', 'Income', 20055, 119986),
      field.num('Age', 'Age', 18, 74),
      field.sel('SubscriptionType', 'Subscription Type', SUBSCRIPTION_TYPES),
      field.sel('Gender', 'Gender', GENDER_THREE),
      field.sel('Region', 'Region', REGIONS),
      field.sel('EducationLevel', 'Education Level', EDUCATION_FULL),
      field.sel('PreferredArticleCategory', 'Preferred Article Category', PREFERRED_ARTICLES_FULL),
      field.num('LifetimeValue', 'Lifetime Value', 50.923314, 4982.999999),
      field.num('MonthsSinceLastPurchase', 'Months Since Last Purchase', 0, 35),
      field.num('AvgSessionDuration', 'Avg Session Duration', 2.006739, 29.994868),
      field.num('CustomerSupportInteractions', 'Customer Support Interactions', 0, 9),
      field.num('LoyaltyPoints', 'Loyalty Points', -48.865307, 1025.327902),
      field.num('AvgArticlesReadPerMonth', 'Avg Articles Read Per Month', 0.005932, 49.950473),
    ],
  },

  customer_winback: {
    fields: [
      field.ro('Customer_Account', 'Customer Account'),
      field.num('Income', 'Income', 20055, 119986),
      field.num('Age', 'Age', 18, 74),
      field.sel('SubscriptionType', 'Subscription Type', SUBSCRIPTION_TYPES),
      field.sel('Gender', 'Gender', GENDER_THREE),
      field.sel('Region', 'Region', REGIONS),
      field.sel('EducationLevel', 'Education Level', EDUCATION_FULL),
      field.sel('PreferredArticleCategory', 'Preferred Article Category', PREFERRED_ARTICLES_FULL),
      field.num('LifetimeValue', 'Lifetime Value', 50.923314, 4982.999999),
      field.num('MonthsSinceLastPurchase', 'Months Since Last Purchase', 0, 35),
      field.num('AvgSessionDuration', 'Avg Session Duration', 2.006739, 29.994868),
      field.num('CustomerSupportInteractions', 'Customer Support Interactions', 0, 9),
      field.num('LoyaltyPoints', 'Loyalty Points', -48.865307, 1025.327902),
      field.num('AvgArticlesReadPerMonth', 'Avg Articles Read Per Month', 0.005932, 49.950473),
      field.num('EngagementScore', 'Engagement Score', 0.001163, 99.782086),
      field.sel('LastInteraction', 'Last Interaction', LAST_INTERACTION),
      field.num('SharedArticles', 'Shared Articles', 0, 29),
      field.num('MonthlySubscriptionFee', 'Monthly Subscription Fee', 8.014426, 51.992791),
      field.num('YearsAsCustomer', 'Years As Customer', 0.004231, 9.962716),
    ],
  },

  customer_collection: {
    fields: [
      field.ro('Customer_Account', 'Customer Account'),
      field.num('Income', 'Income', 20055, 119986),
      field.num('Age', 'Age', 18, 74),
      field.sel('SubscriptionType', 'Subscription Type', SUBSCRIPTION_TYPES),
      field.sel('Gender', 'Gender', GENDER_THREE),
      field.sel('Region', 'Region', REGIONS),
      field.sel('EducationLevel', 'Education Level', EDUCATION_FULL),
      field.sel('PreferredArticleCategory', 'Preferred Article Category', PREFERRED_ARTICLES_COLLECTION),
      field.num('LifetimeValue', 'Lifetime Value', 50.923314, 4982.999999),
      field.num('MonthsSinceLastPurchase', 'Months Since Last Purchase', 0, 35),
      field.num('AvgSessionDuration', 'Avg Session Duration', 2.006739, 29.994868),
      field.num('CustomerSupportInteractions', 'Customer Support Interactions', 0, 9),
      field.num('LoyaltyPoints', 'Loyalty Points', -48.865307, 1025.327902),
      field.num('AvgArticlesReadPerMonth', 'Avg Articles Read Per Month', 0.005932, 49.950473),
      field.binary('IsActive', 'Is Active'),
      field.num('MonthlySubscriptionFee', 'Monthly Subscription Fee', 8.014426, 51.992791),
      field.num('YearsAsCustomer', 'Years As Customer', 0.004231, 9.962716),
    ],
  },
};

export function getLifecycleModelFieldList(generateKey) {
  return customerLifecycleFieldConfig[generateKey] || null;
}

function keysMatchCanonical(a, b) {
  if (a === b) return true;
  if (String(a).toLowerCase() === String(b).toLowerCase()) return true;
  const na = String(a).replace(/[\s_-]/g, '').toLowerCase();
  const nb = String(b).replace(/[\s_-]/g, '').toLowerCase();
  return na.length > 0 && na === nb;
}

export function getLifecycleFieldSpec(generateKey, columnKey) {
  const model = customerLifecycleFieldConfig[generateKey];
  if (!model) return null;
  const k = columnKey;
  return (
    model.fields.find((f) => f.key === k) ??
    model.fields.find((f) => keysMatchCanonical(f.key, k)) ??
    null
  );
}

/** True if this column is a defined model input feature (should be hidden in collapsed OUTPUT summary). */
export function isLifecycleInputColumn(generateKey, columnKey) {
  return getLifecycleFieldSpec(generateKey, columnKey) != null;
}

function splitCamelCaseSegments(str) {
  const s = String(str);
  return s
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .split(/\s+/)
    .filter(Boolean);
}

function collectHeaderTokens() {
  const set = new Set();
  const OUTPUT_EXTRAS = [
    'Predicted',
    'Value',
    'Probability',
    'Prediction',
    'Category',
    'Class',
    'Score',
    'Label',
    'Output',
    'From',
    'Add',
    'Ons',
  ];
  OUTPUT_EXTRAS.forEach((w) => set.add(w));
  for (const model of Object.values(customerLifecycleFieldConfig)) {
    for (const f of model.fields) {
      const k = f.key;
      if (k.includes(' ')) {
        k.split(/\s+/).forEach((part) => {
          part.split(/[-–]/).forEach((p) => set.add(p));
        });
      } else if (k.includes('_')) {
        k.split(/_+/).forEach((part) => {
          splitCamelCaseSegments(part).forEach((w) => set.add(w));
        });
      } else {
        splitCamelCaseSegments(k).forEach((w) => set.add(w));
      }
    }
  }
  return [...set].sort((a, b) => b.length - a.length);
}

let cachedHeaderTokens = null;
function getHeaderTokens() {
  if (!cachedHeaderTokens) {
    cachedHeaderTokens = collectHeaderTokens();
  }
  return cachedHeaderTokens;
}

function capitalizeWord(w) {
  if (!w) return '';
  const lower = w.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function splitConcatenatedAllCaps(raw) {
  const tokens = getHeaderTokens();
  const upper = raw.toUpperCase();
  let i = 0;
  const parts = [];
  while (i < upper.length) {
    let found = false;
    for (const tok of tokens) {
      if (!tok || tok.length < 2) continue;
      const T = tok.toUpperCase();
      if (upper.startsWith(T, i)) {
        parts.push(capitalizeWord(tok));
        i += T.length;
        found = true;
        break;
      }
    }
    if (!found) {
      parts.push(upper.slice(i, i + 1));
      i += 1;
    }
  }
  return parts.join(' ');
}

/**
 * Readable label for API keys not matched to field config (camelCase, snake_case, SCREAMING_SMASHED).
 */
export function humanizeUnknownApiKey(key) {
  const raw = String(key ?? '').trim();
  if (!raw) return '';
  if (raw.includes(' ')) {
    return raw.split(/\s+/).map(capitalizeWord).join(' ');
  }
  if (raw.includes('_')) {
    return raw
      .split(/_+/)
      .filter(Boolean)
      .map((w) => splitCamelCaseSegments(w).join(' ') || w)
      .join(' ')
      .split(/\s+/)
      .map(capitalizeWord)
      .join(' ');
  }

  let spaced = raw.replace(/([a-z\d])([A-Z])/g, '$1 $2');
  spaced = spaced.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');

  if (!spaced.includes(' ') && /^[A-Z0-9]+$/.test(raw) && raw.length > 1) {
    spaced = splitConcatenatedAllCaps(raw);
  }

  return spaced
    .split(/\s+/)
    .filter(Boolean)
    .map(capitalizeWord)
    .join(' ');
}

/**
 * Table / SHAP column title: prefer config label; else humanize API key (handles ALLCAPS smashed keys).
 */
export function getLifecycleColumnLabel(generateKey, columnKey) {
  if (columnKey == null || columnKey === '') return '';
  if (generateKey) {
    const spec = getLifecycleFieldSpec(generateKey, columnKey);
    if (spec?.label) return spec.label;
  }
  return humanizeUnknownApiKey(columnKey);
}

export default customerLifecycleFieldConfig;
