const formatValue = (val) => {
  if (val == null || val === '') return '—';
  if (typeof val === 'number') return val % 1 === 0 ? String(val) : val.toFixed(3);
  if (typeof val === 'string' && val.includes('T')) return val.split('T')[0];
  return String(val);
};

export const buildClaimDenialShapData = (row) => {
  if (!row || !row.shapValues || row.shapValues.length === 0) return null;

  const features = row.shapValues.map((sv) => ({
    name: sv.feature,
    impact: sv.impact,
    value: formatValue(row[sv.feature]),
  }));

  features.sort((a, b) => {
    if (a.impact >= 0 && b.impact < 0) return -1;
    if (a.impact < 0 && b.impact >= 0) return 1;
    return Math.abs(b.impact) - Math.abs(a.impact);
  });

  let predictedCategory = 'Low';
  if (row.category === 'High') predictedCategory = 'High';
  else if (row.category === 'Medium') predictedCategory = 'Medium';

  const probability = row.probabilityPercent != null
    ? row.probabilityPercent / 100
    : (row.probability ?? 0);

  return {
    facsNumber: row.Claim_ID,
    features,
    predictedCategory,
    probability,
    categoryContextLabel: 'Claim Denial',
    legendHighText: 'Increases probability toward High Claim Denial',
    legendLowText: 'Increases probability toward Low Claim Denial',
  };
};

export default buildClaimDenialShapData;
