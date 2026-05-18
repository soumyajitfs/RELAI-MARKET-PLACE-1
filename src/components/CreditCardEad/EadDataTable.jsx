import React, { useMemo, useState } from 'react';

const INTERNAL_KEYS = new Set([
  '__rowId',
  'riskTier',
  'confidence',
  'confidencePercent',
  'shapValues',
  'shap_values',
  'shape_values',
  'prediction',
  'top_shap_drivers',
  'prob_score',
  'prob_percent',
  'expected_ccf',
  'Expected_CCF',
  'expected_ccf_percent_display',
  'EAD_Predicted',
  'ead_predicted',
]);

const formatEadInr = (n) => {
  if (n == null || n === '' || !Number.isFinite(Number(n))) return '—';
  const v = Number(n);
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
};

const formatCcfPercent = (row) => {
  if (row.confidencePercent != null && String(row.confidencePercent).trim() !== '') {
    return `${Number(row.confidencePercent).toFixed(2)}%`;
  }
  if (row.confidence != null && Number.isFinite(Number(row.confidence))) {
    return `${(Number(row.confidence) * 100).toFixed(2)}%`;
  }
  if (row.expected_ccf_percent_display != null && String(row.expected_ccf_percent_display).trim() !== '') {
    return String(row.expected_ccf_percent_display).trim();
  }
  return '—';
};

const EadDataTable = ({
  rows,
  draftRows,
  setDraftRows,
  markCellDirty,
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
  const displayRows = baseRows;

  const inputColumns = useMemo(() => {
    const sample = displayRows[0] || baseRows[0];
    if (!sample) return [];
    return Object.keys(sample).filter((key) => {
      if (INTERNAL_KEYS.has(key)) return false;
      if (key === 'account_id') return false;
      if (key === 'Customer_ID') return false;
      return true;
    });
  }, [displayRows, baseRows]);

  const handleFieldChange = (rowId, field, value) => {
    if (!setDraftRows) return;
    setDraftRows((prev) => prev.map((r) => (r.__rowId === rowId ? { ...r, [field]: value } : r)));
    if (markCellDirty) markCellDirty(rowId, field);
  };

  const renderCell = (row, key) => {
    const value = row[key];
    if (!editEnabled) return value ?? '—';

    const rule = fieldRules?.[key];
    if (rule?.editable === false) return value ?? '—';

    if (rule?.type === 'enum' && (rule.values || []).length > 0) {
      return (
        <select
          value={value ?? ''}
          onChange={(e) => handleFieldChange(row.__rowId, key, e.target.value)}
          onBlur={(e) => {
            if (!validateField) return;
            const msg = validateField(key, e.target.value);
            if (msg) showToast({ message: msg, type: 'warning' });
          }}
        >
          {(rule.values || []).map((opt) => (
            <option key={`${key}-${opt}`} value={opt}>
              {String(opt)}
            </option>
          ))}
        </select>
      );
    }

    if (rule?.type === 'discrete' && Array.isArray(rule.allowed)) {
      return (
        <select
          value={value === '' || value == null ? '' : String(value)}
          onChange={(e) => {
            const raw = e.target.value;
            handleFieldChange(row.__rowId, key, raw === '' ? '' : Number(raw));
          }}
          onBlur={(e) => {
            if (!validateField) return;
            const msg = validateField(key, e.target.value);
            if (msg) showToast({ message: msg, type: 'warning' });
          }}
        >
          {rule.allowed.map((opt) => (
            <option key={`${key}-${opt}`} value={opt}>
              {String(opt)}
            </option>
          ))}
        </select>
      );
    }

    if (typeof value === 'number' || rule?.type === 'int' || rule?.type === 'float') {
      return (
        <input
          type="number"
          value={value ?? ''}
          min={rule?.min}
          max={rule?.max}
          step={rule?.type === 'int' ? 1 : 'any'}
          onChange={(e) => {
            const raw = e.target.value;
            handleFieldChange(row.__rowId, key, raw === '' ? '' : Number(raw));
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

  const tableMinWidth = Math.max(2000, inputColumns.length * (editEnabled ? 220 : 160));

  const eadValue = (row) => row.ead_predicted ?? row.EAD_Predicted;

  if (!hasOutput) {
    return (
      <div>
        <div className="table-section-label">
          <i className="bi bi-table"></i> INPUT Data
        </div>
        <div className="data-table-wrapper">
          <table
            className={`data-table ${editEnabled ? 'mortgage-edit-table' : ''}`}
            style={{ minWidth: `${tableMinWidth}px` }}
          >
            <thead>
              <tr>
                <th style={{ width: '50px' }}>
                  <i className="bi bi-filter"></i> Select
                </th>
                <th style={{ width: '180px' }}>Customer ID</th>
                {inputColumns.map((key) => (
                  <th key={key} style={{ width: editEnabled ? '220px' : '160px' }}>
                    {fieldRules?.[key]?.label || key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={inputColumns.length + 2} style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                    No credit card accounts loaded.
                  </td>
                </tr>
              ) : (
                displayRows.map((row) => {
                  const isSelected = selectedRowIds.includes(row.__rowId);
                  return (
                    <tr key={row.__rowId} className={`${isSelected ? 'selected' : ''}`}>
                      <td>
                        <input type="checkbox" checked={isSelected} onChange={() => onSelectRow(row.__rowId)} />
                      </td>
                      <td>
                        <strong>{row.account_id}</strong>
                      </td>
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
          style={showInputCols ? { minWidth: `${Math.max(2000, inputColumns.length * 150)}px` } : undefined}
        >
          <thead>
            <tr>
              <th style={{ width: showInputCols ? '50px' : '10%' }}>
                <i className="bi bi-filter"></i> Select
              </th>
              <th style={{ width: showInputCols ? '180px' : '22%' }}>Customer ID</th>
              <th style={{ width: showInputCols ? '40px' : '6%' }} title="Toggle input columns"></th>
              <th style={{ width: showInputCols ? '200px' : '22%' }}>Expected CCF %</th>
              <th style={{ width: showInputCols ? '220px' : '26%' }}>EAD (INR)</th>
              {showInputCols &&
                inputColumns.map((key) => (
                  <th key={`out-${key}`} style={{ width: '150px' }}>
                    {fieldRules?.[key]?.label || key}
                  </th>
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
                  <td>
                    <strong>{row.account_id}</strong>
                  </td>
                  <td>
                    <div
                      className={`expand-toggle ${showInputCols ? 'expanded' : ''}`}
                      onClick={() => setShowInputCols((prev) => !prev)}
                      title={showInputCols ? 'Hide input columns' : 'Show input columns'}
                    >
                      {showInputCols ? '−' : '+'}
                    </div>
                  </td>
                  <td>
                    <span style={{ color: '#0f766e', fontWeight: 600 }}>{formatCcfPercent(row)}</span>
                  </td>
                  <td>
                    <span style={{ color: '#1e293b', fontWeight: 600 }}>{formatEadInr(eadValue(row))}</span>
                  </td>
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

export default EadDataTable;
