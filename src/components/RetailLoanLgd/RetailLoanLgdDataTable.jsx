import React, { useMemo, useState } from 'react';

import { RETAIL_LOAN_LGD_INPUT_COLUMN_ORDER } from '../../data/retailLoanLgdFieldRules';
import { formatFinalBaselLgdPercent, resolvePcure } from '../../utils/retailLoanLgdApi';

const INTERNAL_KEYS = new Set([
  '__rowId',
  'shapValues',
  'final_basel_lgd',
  'final_basel_lgd_pct',
  'p_cure',
  'e_lgd_given_non_cure',
  'raw_two_stage_lgd',
  'downturn_calibrated_lgd',
  'shap_stage1',
  'shap_stage2',
  'base_value',
  'shap_values',
  'top_shap_drivers',
  'prediction',
]);

const formatDiscreteOpt = (v, rule) => rule?.optionLabels?.[v] ?? String(v);

const formatPCure = (row) => {
  const p = resolvePcure(row);
  if (p == null || !Number.isFinite(Number(p))) return '—';
  const n = Number(p);
  const pct = n <= 1 ? n * 100 : n;
  return `${pct.toFixed(2)}%`;
};

const RetailLoanLgdDataTable = ({
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
    if (!sample) return [...RETAIL_LOAN_LGD_INPUT_COLUMN_ORDER];
    return RETAIL_LOAN_LGD_INPUT_COLUMN_ORDER.filter((key) => key in sample || fieldRules?.[key]);
  }, [displayRows, baseRows, fieldRules]);

  const tableMinWidth = Math.max(6000, inputColumns.length * (editEnabled ? 200 : 150));

  const handleFieldChange = (rowId, field, value) => {
    if (!setDraftRows) return;
    setDraftRows((prev) => prev.map((r) => (r.__rowId === rowId ? { ...r, [field]: value } : r)));
    if (markCellDirty) markCellDirty(rowId, field);
  };

  const renderCell = (row, key) => {
    const value = row[key];
    if (!editEnabled) {
      if (['restructured_flag', 'legal_flag'].includes(key) && value != null && value !== '') {
        const rule = fieldRules?.[key];
        if (rule?.optionLabels) return formatDiscreteOpt(Number(value), rule);
      }
      if (key === 'employment_type') return value ?? '—';
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
            style={{ minWidth: `${tableMinWidth}px` }}
          >
            <thead>
              <tr>
                <th style={{ width: '50px' }}>
                  <i className="bi bi-filter"></i> Select
                </th>
                <th style={{ width: '100px' }}>Loan ID</th>
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
                    No loans loaded.
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
                        <strong>{row.loan_id}</strong>
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
          style={showInputCols ? { minWidth: `${Math.max(5600, inputColumns.length * 150)}px` } : undefined}
        >
          <thead>
            <tr>
              <th style={{ width: showInputCols ? '50px' : '8%' }}>
                <i className="bi bi-filter"></i> Select
              </th>
              <th style={{ width: showInputCols ? '100px' : '12%' }}>Loan ID</th>
              <th style={{ width: showInputCols ? '40px' : '5%' }} title="Toggle input columns"></th>
              <th style={{ width: showInputCols ? '140px' : '16%' }}>Final Basel LGD (%)</th>
              <th style={{ width: showInputCols ? '110px' : '12%' }}>P(Cure)</th>
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
                    <strong>{row.loan_id}</strong>
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
                    <span style={{ color: '#1e3a5f', fontWeight: 600 }}>{formatFinalBaselLgdPercent(row)}</span>
                  </td>
                  <td>
                    <span style={{ color: '#1e3a5f', fontWeight: 600 }}>{formatPCure(row)}</span>
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

export default RetailLoanLgdDataTable;
