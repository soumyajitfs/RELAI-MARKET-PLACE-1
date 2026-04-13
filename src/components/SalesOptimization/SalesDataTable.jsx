import React, { useMemo, useState } from 'react';

const INTERNAL_KEYS = new Set([
  '__rowId',
  'probability',
  'probabilityPercent',
  'category',
  'shapValues',
  'recommended_products',
  'recommendation_reason',
]);

const COLUMN_WIDTHS = {
  Agent_tenure: 260,
  Location: 180,
  Services: 420,
  channel: 160,
  Customer_Tenure_Segment: 220,
  pitchtype: 200,
  primaryproductoffered: 260,
};

const getColumnWidth = (key) => COLUMN_WIDTHS[key] || 150;

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

const SalesDataTable = ({
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
  const displayRows = hasOutput ? baseRows.filter(r => r.probabilityPercent != null) : baseRows;

  const inputColumns = useMemo(() => {
    const sample = displayRows[0] || baseRows[0];
    if (!sample) return [];
    return Object.keys(sample).filter((key) => {
      if (INTERNAL_KEYS.has(key)) return false;
      // Customer account is already shown in the dedicated first column.
      if (key.toLowerCase() === 'customer_account') return false;
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
    if (rule?.type === 'number-string') {
      return (
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value ?? ''}
          style={{ width: '100%' }}
          onChange={(e) => handleFieldChange(row.__rowId, key, e.target.value)}
          onBlur={(e) => {
            if (!validateField) return;
            const msg = validateField(key, e.target.value);
            if (msg) showToast({ message: msg, type: 'warning' });
          }}
        />
      );
    }

    if (rule?.type === 'enum') {
      return (
        <select
          value={value ?? ''}
          style={{ width: '100%' }}
          onChange={(e) => handleFieldChange(row.__rowId, key, e.target.value)}
          onBlur={(e) => {
            if (!validateField) return;
            const msg = validateField(key, e.target.value);
            if (msg) showToast({ message: msg, type: 'warning' });
          }}
        >
          {rule.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }

    if (typeof value === 'number') {
      return (
        <input
          type="number"
          value={value}
          style={{ width: '100%' }}
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
        style={{ width: '100%' }}
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
          <table className="data-table" style={{ minWidth: `${Math.max(3000, inputColumns.reduce((sum, key) => sum + getColumnWidth(key), 2300))}px` }}>
            <thead>
              <tr>
                <th style={{ width: '50px' }}><i className="bi bi-filter"></i> Select</th>
                <th style={{ width: '180px' }}>Customer Account</th>
                {inputColumns.map((key) => (
                  <th key={key} style={{ width: `${getColumnWidth(key)}px` }}>{key}</th>
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
                      <td><strong>{row.Customer_Account}</strong></td>
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
          style={showInputCols ? { minWidth: `${Math.max(3400, inputColumns.reduce((sum, key) => sum + getColumnWidth(key), 3200))}px` } : undefined}
        >
          <thead>
            <tr>
              <th style={{ width: showInputCols ? '50px' : '8%' }}><i className="bi bi-filter"></i> Select</th>
              <th style={{ width: showInputCols ? '180px' : '18%' }}>Customer Account</th>
              <th style={{ width: showInputCols ? '40px' : '6%' }} title="Toggle input columns"></th>
              <th style={{ width: showInputCols ? '170px' : '18%' }}>Probability %</th>
              <th style={{ width: showInputCols ? '110px' : '12%' }}>Category</th>
              <th style={{ width: showInputCols ? '260px' : '22%' }}>Recommended Products</th>
              {showInputCols && inputColumns.map((key) => (
                <th key={`out-${key}`} style={{ width: `${getColumnWidth(key)}px` }}>{key}</th>
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
                  <td><strong>{row.Customer_Account}</strong></td>
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
                      <td>
                        {(() => {
                          const raw = row.recommended_products;
                          const options = Array.isArray(raw)
                            ? raw
                            : typeof raw === 'string'
                              ? raw.split(',').map((item) => item.trim()).filter(Boolean)
                              : [];

                          if (!options.length) return '—';

                          return (
                            <select defaultValue={options[0]} style={{ width: '100%' }}>
                              {options.map((product) => (
                                <option key={`${row.__rowId}-${product}`} value={product}>
                                  {product}
                                </option>
                              ))}
                            </select>
                          );
                        })()}
                      </td>
                    </>
                  ) : (
                    <>
                      <td></td><td></td><td></td>
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

export default SalesDataTable;
