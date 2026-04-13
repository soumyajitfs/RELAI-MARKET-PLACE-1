import React, { useMemo, useState } from 'react';

const INTERNAL_KEYS = new Set([
  '__rowId',
  'decision',
  'confidence',
  'confidencePercent',
  'shapValues',
]);

const getDecisionClass = (decision) => {
  const d = String(decision || '').toLowerCase();
  if (d === 'approved') return 'high';
  if (d === 'cancelled') return 'low';
  return 'medium';
};

const getDecisionColor = (decision) => {
  const d = String(decision || '').toLowerCase();
  if (d === 'approved') return '#2e7d32';
  if (d === 'cancelled') return '#c62828';
  return '#b8860b';
};

const MortgageUnderwritingDataTable = ({
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
  const displayRows = hasOutput ? baseRows.filter((r) => r.confidencePercent != null) : baseRows;

  const inputColumns = useMemo(() => {
    const sample = displayRows[0] || baseRows[0];
    if (!sample) return [];
    return Object.keys(sample).filter((key) => {
      if (INTERNAL_KEYS.has(key)) return false;
      if (key === 'Applicant_ID') return false;
      return true;
    });
  }, [displayRows, baseRows]);

  const handleFieldChange = (rowId, field, value) => {
    if (!setDraftRows || !setHasUnappliedChanges) return;
    setDraftRows((prev) => prev.map((r) => (r.__rowId === rowId ? { ...r, [field]: value } : r)));
    setHasUnappliedChanges(true);
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
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (rule?.type === 'date') {
      return (
        <input
          type="date"
          value={value ?? ''}
          min={rule.min}
          max={rule.max}
          onChange={(e) => handleFieldChange(row.__rowId, key, e.target.value)}
          onBlur={(e) => {
            if (!validateField) return;
            const msg = validateField(key, e.target.value);
            if (msg) showToast({ message: msg, type: 'warning' });
          }}
        />
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

  if (!hasOutput) {
    return (
      <div>
        <div className="table-section-label">
          <i className="bi bi-table"></i> INPUT Data
        </div>
        <div className="data-table-wrapper">
          <table
            className={`data-table ${editEnabled ? 'mortgage-edit-table' : ''}`}
            style={{ minWidth: `${Math.max(3200, inputColumns.length * (editEnabled ? 230 : 170))}px` }}
          >
            <thead>
              <tr>
                <th style={{ width: '50px' }}><i className="bi bi-filter"></i> Select</th>
                <th style={{ width: '180px' }}>Applicant ID</th>
                {inputColumns.map((key) => (
                  <th key={key} style={{ width: editEnabled ? '230px' : '170px' }}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={inputColumns.length + 2} style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                    No applications loaded.
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
                      <td><strong>{row['Applicant_ID']}</strong></td>
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
              <th style={{ width: showInputCols ? '180px' : '25%' }}>Applicant ID</th>
              <th style={{ width: showInputCols ? '40px' : '7%' }} title="Toggle input columns"></th>
              <th style={{ width: showInputCols ? '210px' : '28%' }}>Confidence %</th>
              <th style={{ width: showInputCols ? '190px' : '30%' }}>Decision</th>
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
                  <td><strong>{row['Applicant_ID']}</strong></td>
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
                    <span style={{ color: getDecisionColor(row.decision) }}>
                      {row.confidencePercent != null ? `${row.confidencePercent.toFixed(1)}%` : '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`category-badge ${getDecisionClass(row.decision)}`}>
                      {row.decision || '—'}
                    </span>
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

export default MortgageUnderwritingDataTable;
