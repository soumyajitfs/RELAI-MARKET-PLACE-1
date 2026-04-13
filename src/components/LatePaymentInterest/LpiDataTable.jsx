import React, { useMemo, useState } from 'react';

const INTERNAL_KEYS = new Set([
  '__rowId',
  'probability',
  'probabilityPercent',
  'category',
  'shapValues',
]);

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

const LpiDataTable = ({
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
    ? baseRows.filter((r) => r.probabilityPercent != null)
    : baseRows;

  const inputColumns = useMemo(() => {
    const sample = displayRows[0] || baseRows[0];
    if (!sample) return [];
    return Object.keys(sample).filter((key) => !INTERNAL_KEYS.has(key) && key !== 'clmId');
  }, [displayRows, baseRows]);

  const handleFieldChange = (rowId, field, value) => {
    setDraftRows((prev) => prev.map((r) => (r.__rowId === rowId ? { ...r, [field]: value } : r)));
    setHasUnappliedChanges(true);
  };

  const renderCell = (row, key) => {
    const value = row[key];
    if (!editEnabled) return value ?? '—';

    const normalizedKey = String(key).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    const rule = fieldRules?.[normalizedKey];

    if (rule?.type === 'enum') {
      const normalizedValue = String(value ?? '').trim();
      const hasMatch = rule.options.some((opt) => String(opt).trim() === normalizedValue);
      const currentValue = hasMatch ? normalizedValue : '';
      return (
        <select
          value={currentValue}
          style={{ width: '100%' }}
          onChange={(e) => handleFieldChange(row.__rowId, key, e.target.value)}
          onBlur={(e) => {
            if (!validateField) return;
            const msg = validateField(key, e.target.value);
            if (msg) showToast({ message: msg, type: 'warning' });
          }}
        >
          {!hasMatch && <option value="" disabled>Select value</option>}
          {rule.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (rule?.type === 'date') {
      const dateValue = value == null
        ? ''
        : String(value).includes('T')
          ? String(value).split('T')[0]
          : String(value);
      return (
        <input
          type="date"
          value={dateValue}
          min={rule.min}
          max={rule.max}
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
          <table className="data-table" style={{ minWidth: `${Math.max(2400, inputColumns.length * 160)}px` }}>
            <thead>
              <tr>
                <th style={{ width: '50px' }}><i className="bi bi-filter"></i> Select</th>
                <th style={{ width: '180px' }}>Claim ID</th>
                {inputColumns.map((key) => (
                  <th key={key} style={{ width: '160px' }}>{key}</th>
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
                      <td><strong>{row.clmId}</strong></td>
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
          style={showInputCols ? { minWidth: `${Math.max(2800, inputColumns.length * 170)}px` } : undefined}
        >
          <thead>
            <tr>
              <th style={{ width: showInputCols ? '50px' : '10%' }}><i className="bi bi-filter"></i> Select</th>
              <th style={{ width: showInputCols ? '180px' : '25%' }}>Claim ID</th>
              <th style={{ width: showInputCols ? '40px' : '7%' }} title="Toggle input columns"></th>
              <th style={{ width: showInputCols ? '220px' : '35%' }}>Late Interest Probability %</th>
              <th style={{ width: showInputCols ? '120px' : '23%' }}>Category</th>
              {showInputCols && inputColumns.map((key) => (
                <th key={`out-${key}`} style={{ width: '160px' }}>{key}</th>
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
                  <td><strong>{row.clmId}</strong></td>
                  <td>
                    <div
                      className={`expand-toggle ${showInputCols ? 'expanded' : ''}`}
                      onClick={() => setShowInputCols((prev) => !prev)}
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

export default LpiDataTable;
