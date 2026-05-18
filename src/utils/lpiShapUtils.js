const formatValue = (val) => {
  if (val == null || val === '') return '—';
  if (typeof val === 'number') return val % 1 === 0 ? String(val) : val.toFixed(3);
  return String(val);
};

const INTERNAL_KEYS = new Set(['__rowId', 'probability', 'probabilityPercent', 'category', 'shapValues']);

const canonicalKey = (value) => String(value ?? '')
  .replace(/_woe$/i, '')
  .replace(/[^A-Za-z0-9]/g, '')
  .toLowerCase();

const resolveFeatureField = (row, feature) => {
  const inputKeys = Object.keys(row).filter((key) => !INTERNAL_KEYS.has(key));

  const direct = inputKeys.find((key) => key === feature);
  if (direct) {
    return { label: direct, value: row[direct] };
  }

  const target = canonicalKey(feature);
  const mapped = inputKeys.find((key) => canonicalKey(key) === target);
  if (mapped) {
    return { label: mapped, value: row[mapped] };
  }

  return null;
};

export const buildLpiShapData = (row) => {
  if (!row || !Array.isArray(row.shapValues) || row.shapValues.length === 0) return null;

  const features = row.shapValues
    .map((sv) => {
      const resolved = resolveFeatureField(row, sv.feature);
      if (!resolved || resolved.value == null || resolved.value === '') return null;
      return {
        name: resolved.label,
        impact: sv.impact,
        value: formatValue(resolved.value),
      };
    })
    .filter(Boolean);

  if (!features.length) return null;

  features.sort((a, b) => {
    if (a.impact >= 0 && b.impact < 0) return -1;
    if (a.impact < 0 && b.impact >= 0) return 1;
    return Math.abs(b.impact) - Math.abs(a.impact);
  });

  return {
    facsNumber: row.clmId || 'Claim',
    features,
    predictedCategory: row.category || 'Low',
    probability: row.probabilityPercent != null ? row.probabilityPercent / 100 : (row.probability ?? 0),
    categoryContextLabel: 'Late Payment Risk',
    legendHighText: 'Increases probability toward High Late Payment Risk',
    legendLowText: 'Increases probability toward Low Late Payment Risk',
  };
};

export default buildLpiShapData;
