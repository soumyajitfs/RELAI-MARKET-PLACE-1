import React, { useMemo, useState } from 'react';

const INTERNAL_KEYS = new Set([
  '__rowId',
  'acct_id',
  'probability',
  'probabilityPercent',
  'category',
  'shapValues',
]);

const FORCE_DROPDOWN_FIELDS = new Set([
  'Bill Type_111',
  'Bill Type_113',
  'Bill Type_123',
  'Bill Type_181',
  'Bill Type_185',
  'Bill Type_213',
  'Bill Type_313',
  'Bill Type_372',
  'Bill Type_713',
  'Bill Type_785',
  'Bill Type_Others',
  'CPT Category_AG',
  'CPT Category_AJ',
  'CPT Category_AQ',
  'CPT Category_AS',
  'CPT Category_E&M',
  'CPT Category_Medicine',
  'CPT Category_Others',
  'CPT Category_P',
  'CPT Category_Pathology & Lab',
  'CPT Category_Radiology',
  'CPT Category_Surgery',
  'RevCode_Category_Clinic',
  'RevCode_Category_Diagnostics',
  'RevCode_Category_ER',
  'RevCode_Category_Imaging',
  'RevCode_Category_Lab',
  'RevCode_Category_Others',
  'RevCode_Category_Pharmacy',
  'RevCode_Category_Professional Fees',
  'RevCode_Category_Surgery',
  'RevCode_Category_Therapy',
  'unique_carc_count',
  'unique_rarc_count',
  'unique_bill_seq_count',
  'unique_bill_type_count',
  'Denial Class_Addl Doc',
  'Denial Class_Auth',
  'Denial Class_COB',
  'Denial Class_Coding',
  'Denial Class_Duplicate',
  'Denial Class_Med Necc',
  'Denial Class_Non - Covered',
  'Denial Class_Others',
  'Denial Class_Registration',
  'CLIENT CODE',
  'FINANCIAL CLASS',
  'INSURANCE LEVEL 1',
]);

const buildRangeOptions = (min, max) => {
  if (!Number.isInteger(min) || !Number.isInteger(max)) return [];
  if (max < min || max - min > 100) return [];
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
};

const getCategoryClass = (category) => {
  if (category === 'High') return 'high';
  if (category === 'Medium') return 'medium';
  return 'low';
};

const getCategoryColor = (category) => {
  if (category === 'High') return '#2e7d32';
  if (category === 'Medium') return '#b8860b';
  return '#c62828';
};

const CollectabilityDataTable = ({
  rows,
  draftRows,
  setDraftRows,
  setHasUnappliedChanges,
  editEnabled,
  hasOutput,
  selectedRowId,
  selectedRowIds = [],
  onSelectRow,
  fieldRules,
  validateField,
  showToast,
}) => {
  const [showInputCols, setShowInputCols] = useState(false);

  const baseRows = editEnabled ? draftRows : rows;
  const displayRows = hasOutput
    ? baseRows.filter(r => r.probabilityPercent != null)
    : baseRows;

  const inputColumns = useMemo(() => {
    const sample = displayRows[0] || baseRows[0];
    if (!sample) return [];
    return Object.keys(sample).filter((key) => {
      if (INTERNAL_KEYS.has(key)) return false;
      // Client Reference is already shown in dedicated first column.
      if (key.toLowerCase() === 'client reference number') return false;
      return true;
    });
  }, [displayRows, baseRows]);

  const handleFieldChange = (rowId, field, value) => {
    setDraftRows(prev => prev.map(r => (r.__rowId === rowId ? { ...r, [field]: value } : r)));
    setHasUnappliedChanges(true);
  };

  const renderCell = (row, key) => {
    const value = row[key];
    if (!editEnabled) return value ?? '—';

    const rule = fieldRules?.[key];
    const shouldForceDropdown = FORCE_DROPDOWN_FIELDS.has(key);
    const dropdownOptions = rule?.type === 'enum'
      ? (rule.values || [])
      : buildRangeOptions(rule?.min, rule?.max);

    if (shouldForceDropdown && dropdownOptions.length > 0) {
      return (
        <select
          value={value ?? ''}
          onChange={(e) => {
            const raw = e.target.value;
            const nextValue = rule?.type === 'int' ? parseInt(raw, 10) : raw;
            handleFieldChange(row.__rowId, key, Number.isNaN(nextValue) ? raw : nextValue);
          }}
          onBlur={(e) => {
            if (!validateField) return;
            const msg = validateField(key, e.target.value);
            if (msg) showToast({ message: msg, type: 'warning' });
          }}
        >
          {dropdownOptions.map((opt) => (
            <option key={`${key}-${opt}`} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (typeof value === 'number') {
      return (
        <input
          type="number"
          value={value}
          min={rule?.min}
          max={rule?.max}
          step={rule?.type === 'int' ? 1 : 'any'}
          onChange={(e) => {
            const raw = e.target.value;
            handleFieldChange(row.__rowId, key, raw === '' ? '' : parseFloat(raw));
          }}
          onBlur={(e) => {
            if (!validateField) return;
            const msg = validateField(key, e.target.value);
            if (msg) showToast({ message: msg, type: 'warning' });
          }}
        />
      );
    }

    return (
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => handleFieldChange(row.__rowId, key, e.target.value)}
        onBlur={(e) => {
          if (!validateField) return;
          const msg = validateField(key, e.target.value);
          if (msg) showToast({ message: msg, type: 'warning' });
        }}
      />
    );
  };

  const renderInputCells = (row) => (
    <>
      {inputColumns.map((key) => (
        <td key={`${row.__rowId}-${key}`}>{renderCell(row, key)}</td>
      ))}
    </>
  );

  if (!hasOutput) {
    return (
      <div>
        <div className="table-section-label">
          <i className="bi bi-table"></i> INPUT Data
        </div>
        <div className="data-table-wrapper">
          <table className="data-table" style={{ minWidth: `${Math.max(2200, inputColumns.length * 150)}px` }}>
            <thead>
              <tr>
                <th style={{ width: '50px' }}><i className="bi bi-filter"></i> Select</th>
                <th style={{ width: '180px' }}>Client Reference</th>
                {inputColumns.map((key) => (
                  <th key={key} style={{ width: '150px' }}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={inputColumns.length + 2} style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                    No accounts loaded.
                  </td>
                </tr>
              ) : (
                displayRows.map((row) => {
                  const isSelected = selectedRowIds.includes(row.__rowId);
                  return (
                    <tr key={row.__rowId} className={`${isSelected ? 'selected' : ''}`}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectRow(row.__rowId)}
                        />
                      </td>
                      <td><strong>{row['CLIENT REFERENCE NUMBER']}</strong></td>
                      {renderInputCells(row)}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="table-section-label">
        <i className="bi bi-bar-chart-fill"></i> OUTPUT Data
        {showInputCols && (
          <span style={{ marginLeft: '12px', fontSize: '0.78rem', color: '#6366f1', fontWeight: 500 }}>
            <i className="bi bi-arrows-angle-expand" style={{ marginRight: '4px' }}></i>
            Scroll right to see input data →
          </span>
        )}
      </div>
      <div className="data-table-wrapper">
        <table
          className={`data-table output-table ${showInputCols ? 'output-table--expanded' : ''}`}
          style={showInputCols ? { minWidth: `${Math.max(2600, inputColumns.length * 160)}px` } : undefined}
        >
          <thead>
            <tr>
              <th style={{ width: showInputCols ? '50px' : '10%' }}><i className="bi bi-filter"></i> Select</th>
              <th style={{ width: showInputCols ? '180px' : '25%' }}>Client Reference</th>
              <th style={{ width: showInputCols ? '40px' : '7%' }} title="Toggle input columns"></th>
              <th style={{ width: showInputCols ? '220px' : '35%' }}>Collectability Probability %</th>
              <th style={{ width: showInputCols ? '120px' : '23%' }}>Category</th>
              {showInputCols && inputColumns.map((key) => (
                <th key={`out-${key}`} style={{ width: '150px' }}>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => {
              const isSelected = selectedRowId === row.__rowId;
              const isFrozen = selectedRowId != null && !isSelected;
              return (
                <tr key={`out-${row.__rowId}`} className={`${isSelected ? 'selected' : ''} ${isFrozen ? 'frozen' : ''}`}>
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isFrozen}
                      onChange={() => onSelectRow(row.__rowId)}
                    />
                  </td>
                  <td><strong>{row['CLIENT REFERENCE NUMBER']}</strong></td>
                  <td>
                    <div
                      className={`expand-toggle ${showInputCols ? 'expanded' : ''}`}
                      onClick={() => setShowInputCols(prev => !prev)}
                      title={showInputCols ? 'Hide input columns' : 'Show input columns'}
                    >
                      {showInputCols ? '−' : '+'}
                    </div>
                  </td>
                  {row.probabilityPercent != null ? (
                    <>
                      <td>
                        <span style={{ color: getCategoryColor(row.category) }}>
                          {row.probabilityPercent.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <span className={`category-badge ${getCategoryClass(row.category)}`}>
                          {row.category}
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td></td><td></td>
                    </>
                  )}
                  {showInputCols && renderInputCells(row)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CollectabilityDataTable;
