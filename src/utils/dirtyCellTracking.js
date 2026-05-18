/** Composite key for a single edited cell: `${rowId}::${field}`. */
export const dirtyKey = (rowId, field) => `${rowId}::${field}`;

export const parseRowIdFromDirtyKey = (rowIdStr) =>
  Number.isNaN(Number(rowIdStr)) ? rowIdStr : Number(rowIdStr);

/** Groups dirty cell keys into Map<rowId, Set<field>>. */
export const groupDirtyCellsByRow = (dirtyCells) => {
  const dirtyByRow = new Map();
  for (const key of dirtyCells) {
    const [rowIdStr, field] = key.split('::');
    const rowId = parseRowIdFromDirtyKey(rowIdStr);
    if (!dirtyByRow.has(rowId)) dirtyByRow.set(rowId, new Set());
    dirtyByRow.get(rowId).add(field);
  }
  return dirtyByRow;
};

/**
 * Validates only edited cells against FIELD_RANGES-style rules.
 * Returns an error message string, or null if valid.
 */
export const validateDirtyFieldRanges = (
  dirtyCells,
  items,
  fieldRanges,
  { getRowId, formatError }
) => {
  if (dirtyCells.size === 0) return null;
  for (const [rowId, fields] of groupDirtyCellsByRow(dirtyCells)) {
    const item = items.find((r) => getRowId(r) === rowId);
    if (!item) continue;
    for (const field of fields) {
      const range = fieldRanges[field];
      if (!range) continue;
      const val = parseFloat(item[field]);
      const isOutOfRange = Number.isNaN(val) || val < range.min || val > range.max;
      const isTypeInvalid = range.integer && !Number.isInteger(val);
      if (isOutOfRange || isTypeInvalid) {
        return formatError({ item, field, range, isTypeInvalid });
      }
    }
  }
  return null;
};

/**
 * Validates only edited cells against field-rule validators (EWS-style).
 * Returns an error message string, or null if valid.
 */
export const validateDirtyFieldRules = ({
  dirtyCells,
  draftRows,
  fieldRules,
  validateValue,
  validateRowCross,
  isValuePresent,
  formatError,
}) => {
  if (dirtyCells.size === 0) return null;
  for (const [rowId, fields] of groupDirtyCellsByRow(dirtyCells)) {
    const row = draftRows.find((r) => r.__rowId === rowId);
    if (!row) continue;
    for (const field of fields) {
      const rule = fieldRules[field];
      if (!rule || rule.editable === false) continue;
      if (!isValuePresent(row[field])) {
        return formatError({ row, field, rule, type: 'empty' });
      }
      const message = validateValue(field, row[field], fieldRules);
      if (message) {
        return formatError({ row, field, rule, type: 'value', message });
      }
    }
    if (validateRowCross) {
      const cross = validateRowCross(row);
      if (cross) {
        return formatError({ row, type: 'cross', message: cross });
      }
    }
  }
  return null;
};

/** Validates only edited fields using a per-field validator function. */
export const validateDirtyFields = (dirtyCells, draftRows, validateFieldValue, formatError) => {
  if (dirtyCells.size === 0) return null;
  for (const [rowId, fields] of groupDirtyCellsByRow(dirtyCells)) {
    const row = draftRows.find((r) => r.__rowId === rowId);
    if (!row) continue;
    for (const field of fields) {
      const message = validateFieldValue(field, row[field], row);
      if (message) return formatError({ row, field, message });
    }
  }
  return null;
};
