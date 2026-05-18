import React, { useMemo, useState } from 'react';

import { LGD_INPUT_COLUMN_ORDER } from '../../data/lgdFieldRules';

const INTERNAL_KEYS = new Set([
  '__rowId',
  'confidence',
  'confidencePercent',
  'shapValues',
  'lgd_predicted',
  'lgd_percent',
  'LGD_Predicted',
  'LGD_Percent',
  'base_value',
  'shap_values',
  'top_shap_drivers',
  'prediction',
]);

const formatDiscreteOpt = (v, rule) => rule?.optionLabels?.[v] ?? String(v);

/** Percent widths — table stays within panel; no horizontal scroll (LGD only). */
const LGD_INPUT_COL_PCT = {
  select: '6%',
  account_id: '28%',
  ltv: '33%',
  loan_purpose: '33%',
};

const LGD_OUTPUT_COL_PCT = {
  select: '6%',
  account_id: '24%',
  expand: '5%',
  lgd: '14%',
  ltv: '26%',
  loan_purpose: '25%',
};

const inputColPct = (key) => LGD_INPUT_COL_PCT[key] || '20%';
const outputInputColPct = (key) => LGD_OUTPUT_COL_PCT[key] || inputColPct(key);

const formatLgdOutput = (row) => {
  if (row.lgd_percent != null && String(row.lgd_percent).trim() !== '') {
    const s = String(row.lgd_percent).trim();
    return s.includes('%') ? s : `${s}%`;
  }
  if (row.lgd_predicted != null && Number.isFinite(Number(row.lgd_predicted))) {
    return `${(Number(row.lgd_predicted) * 100).toFixed(2)}%`;
  }
  if (row.confidencePercent != null) return `${Number(row.confidencePercent).toFixed(2)}%`;
  return '—';
};

const LgdDataTable = ({
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
  /** After Run, always list all accounts so rows are not hidden if the API uses unexpected field names. */
  const displayRows = baseRows;

  const inputColumns = useMemo(() => {
    const sample = displayRows[0] || baseRows[0];
    if (!sample) return [...LGD_INPUT_COLUMN_ORDER];
    return LGD_INPUT_COLUMN_ORDER.filter((key) => key in sample || fieldRules?.[key]);
  }, [displayRows, baseRows, fieldRules]);

  const handleFieldChange = (rowId, field, value) => {
    if (!setDraftRows) return;
    setDraftRows((prev) => prev.map((r) => (r.__rowId === rowId ? { ...r, [field]: value } : r)));
    if (markCellDirty) markCellDirty(rowId, field);
  };

  const renderCell = (row, key) => {
    const value = row[key];
    if (!editEnabled) {
      if (key === 'loan_purpose' && value != null && value !== '') {
        const rule = fieldRules?.[key];
        return formatDiscreteOpt(Number(value), rule);
      }
      if (key === 'ltv' && typeof value === 'number') return value;
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
        <div className="data-table-wrapper lgd-table-wrapper">
          <table
            className={`data-table lgd-data-table lgd-input-table ${editEnabled ? 'lgd-edit-table' : ''}`}
          >
            <thead>
              <tr>
                <th style={{ width: LGD_INPUT_COL_PCT.select }}>
                  <i className="bi bi-filter"></i> Select
                </th>
                <th style={{ width: LGD_INPUT_COL_PCT.account_id }}>Account ID</th>
                {inputColumns.map((key) => (
                  <th key={key} style={{ width: inputColPct(key) }} className={key === 'ltv' ? 'lgd-col-ltv' : undefined}>
                    {fieldRules?.[key]?.label || key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={inputColumns.length + 2} style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                    No LGD accounts loaded.
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
      </div>
      <div className="data-table-wrapper lgd-table-wrapper">
        <table
          className={`data-table lgd-data-table lgd-output-table output-table ${showInputCols ? 'output-table--expanded' : ''} ${showInputCols ? 'lgd-edit-table' : ''}`}
        >
          <thead>
            <tr>
              <th style={{ width: LGD_OUTPUT_COL_PCT.select }}>
                <i className="bi bi-filter"></i> Select
              </th>
              <th style={{ width: LGD_OUTPUT_COL_PCT.account_id }}>Account ID</th>
              <th style={{ width: LGD_OUTPUT_COL_PCT.expand }} title="Toggle input columns"></th>
              <th style={{ width: LGD_OUTPUT_COL_PCT.lgd }}>Predicted LGD %</th>
              {showInputCols &&
                inputColumns.map((key) => (
                  <th key={`out-${key}`} style={{ width: outputInputColPct(key) }} className={key === 'ltv' ? 'lgd-col-ltv' : undefined}>
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
                    <span style={{ color: '#1e3a5f', fontWeight: 600 }}>{formatLgdOutput(row)}</span>
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

export default LgdDataTable;
