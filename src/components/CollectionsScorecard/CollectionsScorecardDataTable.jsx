import React, { useMemo, useState } from 'react';

import { COLLECTIONS_SCORECARD_INPUT_COLUMN_ORDER } from '../../data/collectionsScorecardFieldRules';
import {
  formatCollectionsScore,
  formatProbabilityBadPct,
  formatScoreBand,
} from '../../utils/collectionsScorecardApi';

const formatDiscreteOpt = (v, rule) => rule?.optionLabels?.[v] ?? String(v);

const BINARY_KEYS = new Set([
  'salary_credit_regular',
  'cust_initiated_contact_30d',
  'restructured',
  'co_applicant',
]);

const bandColor = (band) => {
  const b = String(band || '').toUpperCase();
  if (b === 'C5' || b === 'C4') return '#dc3545';
  if (b === 'C3') return '#d97706';
  if (b === 'C1' || b === 'C2') return '#16a34a';
  return '#1e3a5f';
};

const CollectionsScorecardDataTable = ({
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
    if (!sample) return [...COLLECTIONS_SCORECARD_INPUT_COLUMN_ORDER];
    return COLLECTIONS_SCORECARD_INPUT_COLUMN_ORDER.filter((key) => key in sample || fieldRules?.[key]);
  }, [displayRows, baseRows, fieldRules]);

  const tableMinWidth = Math.max(6000, inputColumns.length * (editEnabled ? 200 : 150));

  const handleFieldChange = (rowId, field, value) => {
    if (!setDraftRows) return;
    setDraftRows((prev) =>
      prev.map((r) => (r.__rowId === rowId ? { ...r, [field]: value } : r)),
    );
    if (markCellDirty) markCellDirty(rowId, field);
  };

  const renderCell = (row, key) => {
    const value = row[key];
    if (!editEnabled) {
      if (BINARY_KEYS.has(key) && value != null && value !== '') {
        const rule = fieldRules?.[key];
        if (rule?.optionLabels) return formatDiscreteOpt(Number(value), rule);
      }
      if (key === 'avg_pay_ratio_6m' && value != null && value !== '') {
        const n = Number(value);
        return Number.isFinite(n) ? n.toFixed(4) : value;
      }
      return value ?? '—';
    }

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
              {formatDiscreteOpt(opt, rule)}
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
          min={key === 'cibil' ? -1 : rule?.min}
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
            style={{ minWidth: `${tableMinWidth}px` }}
          >
            <thead>
              <tr>
                <th style={{ width: '50px' }}>
                  <i className="bi bi-filter"></i> Select
                </th>
                <th style={{ width: '120px' }}>Customer ID</th>
                {inputColumns.map((key) => (
                  <th key={key} style={{ width: editEnabled ? '200px' : '150px' }}>
                    {fieldRules?.[key]?.label || key}
                  </th>
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
                        <input type="checkbox" checked={isSelected} onChange={() => onSelectRow(row.__rowId)} />
                      </td>
                      <td>
                        <strong>{row.cust_id}</strong>
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
          style={showInputCols ? { minWidth: `${Math.max(5200, inputColumns.length * 150)}px` } : undefined}
        >
          <thead>
            <tr>
              <th style={{ width: showInputCols ? '50px' : '8%' }}>
                <i className="bi bi-filter"></i> Select
              </th>
              <th style={{ width: showInputCols ? '120px' : '10%' }}>Customer ID</th>
              <th style={{ width: showInputCols ? '40px' : '4%' }} title="Toggle input columns"></th>
              <th style={{ width: showInputCols ? '120px' : '11%' }}>Collections Score</th>
              <th style={{ width: showInputCols ? '100px' : '10%' }}>P(Bad 6M)</th>
              <th style={{ width: showInputCols ? '80px' : '8%' }}>Score Band</th>
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
              const band = formatScoreBand(row);
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
                    <strong>{row.cust_id}</strong>
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
                    <span style={{ color: '#1e3a5f', fontWeight: 600 }}>{formatCollectionsScore(row)}</span>
                  </td>
                  <td>
                    <span style={{ color: '#1e3a5f', fontWeight: 600 }}>{formatProbabilityBadPct(row)}</span>
                  </td>
                  <td>
                    <span style={{ color: bandColor(band), fontWeight: 600 }}>{band}</span>
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

export default CollectionsScorecardDataTable;
