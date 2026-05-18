const formatValue = (val) => {
  if (val == null || val === '') return '—';
  if (typeof val === 'number') return val % 1 === 0 ? String(val) : val.toFixed(3);
  if (typeof val === 'string' && val.includes('T')) return val.split('T')[0];
  return String(val);
};

const prettifyFeatureName = (feature) => {
  if (!feature) return '—';
  const text = String(feature);
  return text.replace(/_/g, ' ');
};

const resolveFeatureInfo = (row, feature) => {
  if (!row) return null;

  // Exact match first.
  if (row[feature] != null) {
    return { name: prettifyFeatureName(feature), value: row[feature] };
  }

  // Handle one-hot-like SHAP features e.g. AUS_Risk_Class_C -> AUS_Risk_Class
  const parts = String(feature).split('_');
  for (let i = parts.length - 1; i > 1; i -= 1) {
    const baseKey = parts.slice(0, i).join('_');
    if (row[baseKey] != null) {
      return { name: prettifyFeatureName(baseKey), value: row[baseKey] };
    }
  }

  return { name: prettifyFeatureName(feature), value: null };
};

export const buildMortgageUnderwritingShapData = (row) => {
  if (!row || !Array.isArray(row.shapValues) || row.shapValues.length === 0) return null;

  const features = row.shapValues.map((sv) => {
    const resolved = resolveFeatureInfo(row, sv.feature);
    return {
      name: resolved?.name || prettifyFeatureName(sv.feature),
      impact: sv.impact,
      value: formatValue(resolved?.value),
    };
  });

  features.sort((a, b) => {
    if (a.impact >= 0 && b.impact < 0) return -1;
    if (a.impact < 0 && b.impact >= 0) return 1;
    return Math.abs(b.impact) - Math.abs(a.impact);
  });

  const decision = String(row.decision || '').toLowerCase();
  const predictedCategory = decision === 'approved' ? 'High' : 'Low';
  const decisionLabels = { approved: 'Approved', declined: 'Declined', cancelled: 'Cancelled', suspended: 'Suspended' };
  const categoryDisplayLabel = decisionLabels[decision] || decision;
  const probability = row.confidence != null ? row.confidence : ((row.confidencePercent || 0) / 100);

  return {
    facsNumber: row['Applicant_ID'],
    features,
    predictedCategory,
    categoryDisplayLabel,
    probability,
    categoryContextLabel: 'Underwriting Approval',
    factorContextLabel: '',
    legendHighText: 'Increases probability toward Higher likelihood of Approval',
    legendLowText: 'Increases probability toward Lower likelihood of Approval',
  };
};

export default buildMortgageUnderwritingShapData;
