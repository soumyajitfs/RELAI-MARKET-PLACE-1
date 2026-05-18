// SHAP data builder utility
// Generates mock SHAP values for a given account (frontend-only simulation)

import { MARITAL_MAP, SERVICE_TYPE_MAP } from '../data/sampleData';

// Column display labels mapping (internal key → display name)
const COLUMN_LABELS = {
  zip5: 'ZIP Code',
  fc: 'Financial Class',
  initBal: 'Initial Balance ($)',
  ptMs: 'Marital Status',
  tuScore: 'TU Score',
  bnkcrdAvlble: 'Bankcard Available',
  serviceType: 'Service Type',
  ptRepCode: 'Billing Status',
  serviceArea: 'Service Area',
  serviceDescr: 'Diagnosis Category',
  age: 'Patient Age',
  ageOfAccount: 'Account Age (Days)',
};

const BANKCARD_MAP = { 1: 'Yes', 0: 'No' };

// Format display value for each feature
const formatValue = (key, rawValue) => {
  if (key === 'ptMs') return MARITAL_MAP[rawValue] || String(rawValue);
  if (key === 'bnkcrdAvlble') return BANKCARD_MAP[rawValue] || String(rawValue);
  if (key === 'serviceType') return SERVICE_TYPE_MAP[rawValue] || String(rawValue);
  if (key === 'initBal') return `$${Number(rawValue).toLocaleString()}`;
  let val = String(rawValue);
  if (val.length > 25) val = val.substring(0, 25) + '...';
  return val;
};

// Generate mock SHAP impact values based on account features
// These simulate realistic SHAP contributions aligned with the mockApi propensity logic
const generateMockShapValues = (account) => {
  const impacts = {};

  // TU Score: higher = positive
  impacts.tuScore = ((account.tuScore - 700) / 120) * 0.5 + (Math.random() - 0.5) * 0.05;

  // Bankcard: having one is positive
  impacts.bnkcrdAvlble = account.bnkcrdAvlble === 1 ? 0.12 + Math.random() * 0.08 : -(0.10 + Math.random() * 0.08);

  // Account Age: newer is positive
  impacts.ageOfAccount = -((account.ageOfAccount - 150) / 600) * 0.3 + (Math.random() - 0.5) * 0.04;

  // Financial Class
  if (account.fc === 'COMMERCIAL' || account.fc === 'PREFERRED') {
    impacts.fc = 0.15 + Math.random() * 0.10;
  } else if (account.fc === 'SELF-PAY') {
    impacts.fc = -(0.20 + Math.random() * 0.10);
  } else {
    impacts.fc = (Math.random() - 0.5) * 0.10;
  }

  // Billing Status
  if (account.ptRepCode.includes('ACTIVE')) {
    impacts.ptRepCode = 0.10 + Math.random() * 0.08;
  } else if (account.ptRepCode.includes('DECLINED')) {
    impacts.ptRepCode = -(0.12 + Math.random() * 0.08);
  } else {
    impacts.ptRepCode = (Math.random() - 0.5) * 0.08;
  }

  // Patient Age
  if (account.age < 40) {
    impacts.age = 0.05 + Math.random() * 0.05;
  } else if (account.age > 65) {
    impacts.age = -(0.04 + Math.random() * 0.04);
  } else {
    impacts.age = (Math.random() - 0.5) * 0.06;
  }

  // Marital Status
  if (account.ptMs === 'M') impacts.ptMs = 0.04 + Math.random() * 0.04;
  else if (account.ptMs === 'W') impacts.ptMs = -(0.03 + Math.random() * 0.03);
  else impacts.ptMs = (Math.random() - 0.5) * 0.05;

  // Initial Balance: higher balance = slightly negative
  impacts.initBal = -((account.initBal - 1000) / 3000) * 0.15 + (Math.random() - 0.5) * 0.04;

  // ZIP Code: small random
  impacts.zip5 = (Math.random() - 0.5) * 0.08;

  // Service Type
  impacts.serviceType = account.serviceType === 'HB' ? (Math.random() - 0.5) * 0.06 : 0.03 + Math.random() * 0.04;

  // Service Area: small random
  impacts.serviceArea = (Math.random() - 0.5) * 0.06;

  // Diagnosis Category: small random
  impacts.serviceDescr = (Math.random() - 0.5) * 0.10;

  return impacts;
};

// Mapping from API SHAP feature names to internal account field keys
const API_FEATURE_TO_KEY = {
  'Age of Account': 'ageOfAccount',
  'FC': 'fc',
  'BNKCRD AVLBLE': 'bnkcrdAvlble',
  'INIT BAL': 'initBal',
  'Age': 'age',
  'SERVICE AREA': 'serviceArea',
  'PT REP CODE': 'ptRepCode',
  'ZIP5': 'zip5',
  'TU SCORE': 'tuScore',
  'PT MS': 'ptMs',
  'Description Code': 'serviceDescr',
  'SERVICE TYPE': 'serviceType',
};

// Mapping from API feature names to display labels
const API_FEATURE_DISPLAY = {
  'Age of Account': 'Account Age (Days)',
  'FC': 'Financial Class',
  'BNKCRD AVLBLE': 'Bankcard Available',
  'INIT BAL': 'Initial Balance ($)',
  'Age': 'Patient Age',
  'SERVICE AREA': 'Service Area',
  'PT REP CODE': 'Billing Status',
  'ZIP5': 'ZIP Code',
  'TU SCORE': 'TU Score',
  'PT MS': 'Marital Status',
  'Description Code': 'Diagnosis Category',
  'SERVICE TYPE': 'Service Type',
};

/**
 * Build shapData object for a given account (after model output is available).
 * Uses REAL API SHAP values when available (account.shapValues),
 * falls back to mock SHAP values otherwise.
 *
 * @param {Object} account - Account object with model output fields
 * @returns {Object} shapData matching the SHAP component props shape
 */
export const buildShapData = (account) => {
  if (!account || !account.predictedPropensity) return null;

  let features;

  if (account.shapValues && account.shapValues.length > 0) {
    // ── Use REAL SHAP values from backend API ──
    features = account.shapValues.map(sv => {
      const fieldKey = API_FEATURE_TO_KEY[sv.feature] || null;
      const displayName = API_FEATURE_DISPLAY[sv.feature] || sv.feature;
      const rawValue = fieldKey ? account[fieldKey] : '';
      return {
        name: displayName,
        impact: sv.impact,
        value: fieldKey ? formatValue(fieldKey, rawValue) : String(rawValue),
      };
    });
  } else {
    // ── Fallback: mock SHAP values ──
  const impacts = generateMockShapValues(account);
    features = Object.keys(COLUMN_LABELS).map(key => ({
    name: COLUMN_LABELS[key],
      impact: Math.round(impacts[key] * 10000) / 10000,
    value: formatValue(key, account[key]),
  }));
  }

  // Sort by absolute impact descending, take top 12
  features.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  features = features.slice(0, 12);

  // Sort: green (positive) first descending, then red (negative) by absolute impact descending
  features.sort((a, b) => {
    if (a.impact >= 0 && b.impact < 0) return -1;
    if (a.impact < 0 && b.impact >= 0) return 1;
    return Math.abs(b.impact) - Math.abs(a.impact);
  });

  // Calculate probability math
  const targetProbability = account.predictedPropensity / 100;
  const shapSum = features.reduce((sum, f) => sum + f.impact, 0);

  // Derive baseValue so that sigmoid(baseValue + shapSum) ≈ targetProbability
  const clampedP = Math.min(0.99, Math.max(0.01, targetProbability));
  const targetLogOdds = Math.log(clampedP / (1 - clampedP));
  const baseValue = targetLogOdds - shapSum;

  const logOdds = baseValue + shapSum;
  const probability = 1 / (1 + Math.exp(-logOdds));

  const predictedCategory = account.category;

  return {
    facsNumber: account.facsNumber,
    predictedCategory,
    factorContextLabel: 'P2P',
    baseValue: Math.round(baseValue * 1000) / 1000,
    shapSum: Math.round(shapSum * 1000) / 1000,
    logOdds: Math.round(logOdds * 1000) / 1000,
    probability,
    features,
    legendHighText: 'Increases probability toward High P2P',
    legendLowText: 'Decreases probability toward Low P2P',
  };
};

export default buildShapData;
