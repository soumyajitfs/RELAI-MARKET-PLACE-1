import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import {
  fetchLifecycleGenerateData,
  predictLifecycleCustomers,
  normalizeLifecyclePredictionRow,
} from '../../utils/customerLifecycleApi';
import {
  getLifecycleFieldSpec,
  getLifecycleModelFieldList,
  getLifecycleColumnLabel,
  isLifecycleInputColumn,
} from '../../data/customerLifecycleFieldConfig';
import CustomerLifecycleShapAnalysis from './CustomerLifecycleShapAnalysis';
import { buildLifecycleShapData } from '../../utils/customerLifecycleShapUtils';

const ROW_ID_KEYS = ['Customer_Account', 'customer_account'];

const getRowId = (row, index) => {
  for (const k of ROW_ID_KEYS) {
    if (row[k] != null && row[k] !== '') return String(row[k]);
  }
  return `row-${index}`;
};

const deriveColumnKeys = (rows) => {
  if (!rows.length) return [];
  const seen = new Set();
  const ordered = [];
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (!seen.has(k)) {
        seen.add(k);
        ordered.push(k);
      }
    }
  }
  return ordered;
};

const formatDisplayValue = (val) => {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return '—';
    return Number.isInteger(val) ? String(val) : String(Math.round(val * 1e6) / 1e6);
  }
  if (typeof val === 'object') return '—';
  return String(val);
};

/** Maps API category strings to global `.category-badge.{high|medium|low}` (same as other ML marketplace tables). */
const getCategoryBadgeClass = (category) => {
  if (category == null || category === '') return null;
  const s = String(category).trim().toLowerCase();
  if (s === 'high' || s === 'super high') return 'high';
  if (s === 'medium') return 'medium';
  if (s === 'low') return 'low';
  return null;
};

const isCategoryOutputColumn = (key) => /^category$/i.test(String(key));

function selectValueMatchesOption(spec, val) {
  if (!spec.options?.length) return true;
  const first = spec.options[0];
  if (typeof first === 'object' && first && 'value' in first) {
    return spec.options.some((o) => o.value === val || o.value === Number(val));
  }
  return spec.options.some((o) => o === val || String(o) === String(val));
}

const CustomerLifecycleSimulationPanel = ({ generateKey, modelTitle }) => {
  const { actions } = useAppContext();
  const [rows, setRows] = useState([]);
  const [draftRows, setDraftRows] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [editEnabled, setEditEnabled] = useState(false);
  const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const [hasOutput, setHasOutput] = useState(false);
  const [outputRows, setOutputRows] = useState([]);
  const [selectedOutputId, setSelectedOutputId] = useState(null);
  const [showInputCols, setShowInputCols] = useState(false);

  const columnKeys = useMemo(() => deriveColumnKeys(rows), [rows]);
  const fieldList = useMemo(() => getLifecycleModelFieldList(generateKey), [generateKey]);

  const allOutputKeys = useMemo(() => {
    if (!outputRows.length) return [];
    const keys = new Set();
    outputRows.forEach((r) => {
      Object.keys(r).forEach((k) => {
        if (k !== 'shap_values') keys.add(k);
      });
    });
    const list = [...keys];
    const priority = ['Customer_Account', 'predicted_value', 'prediction', 'probability', 'category'];
    const ordered = [];
    priority.forEach((p) => {
      if (keys.has(p)) ordered.push(p);
    });
    list.sort().forEach((k) => {
      if (!ordered.includes(k)) ordered.push(k);
    });
    return ordered;
  }, [outputRows]);

  const summaryOutputKeys = useMemo(() => {
    if (!outputRows[0]) return [];
    const row = outputRows[0];

    const accountKey =
      Object.keys(row).find((k) => getLifecycleFieldSpec(generateKey, k)?.key === 'Customer_Account') ??
      'Customer_Account';

    const predKeys = Object.keys(row).filter((k) => {
      if (k === 'shap_values') return false;
      if (getLifecycleFieldSpec(generateKey, k)?.key === 'Customer_Account') return false;
      return !isLifecycleInputColumn(generateKey, k);
    });

    const priority = ['predicted_value', 'prediction', 'probability', 'category'];
    const ordered = [];
    priority.forEach((p) => {
      if (predKeys.includes(p)) ordered.push(p);
    });
    predKeys.sort().forEach((k) => {
      if (!ordered.includes(k)) ordered.push(k);
    });

    return [accountKey, ...ordered].filter((k) => Object.prototype.hasOwnProperty.call(row, k));
  }, [outputRows, generateKey]);

  const visibleOutputKeys = showInputCols ? allOutputKeys : summaryOutputKeys;

  const loadData = useCallback(async () => {
    setIsInitialLoading(true);
    setApiError(null);
    setHasOutput(false);
    setOutputRows([]);
    setSelectedOutputId(null);
    setShowInputCols(false);
    try {
      const data = await fetchLifecycleGenerateData(generateKey);
      setRows(data);
      setSelectedIds([]);
    } catch (err) {
      console.error('Customer lifecycle generate failed:', err);
      setApiError(err.message || 'Failed to load data from backend');
      setRows([]);
    } finally {
      setIsInitialLoading(false);
      setIsLoading(false);
    }
  }, [generateKey]);

  useEffect(() => {
    setEditEnabled(false);
    setDraftRows([]);
    setHasUnappliedChanges(false);
    setSelectedIds([]);
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (editEnabled) {
      setDraftRows(rows.map((r) => ({ ...r })));
      setHasUnappliedChanges(false);
    }
  }, [editEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const displayRows = editEnabled ? draftRows : rows;

  const handleToggleEdit = () => {
    if (hasOutput) return;
    setEditEnabled((prev) => !prev);
  };

  const handleReset = async () => {
    setEditEnabled(false);
    setHasUnappliedChanges(false);
    setSelectedIds([]);
    setSelectedOutputId(null);
    await loadData();
  };

  const handleRun = async () => {
    if (hasOutput) return;
    const source = rows;
    if (!source.length) {
      actions.showToast({ message: 'No input rows to run.', type: 'warning' });
      return;
    }
    let toPredict = source;
    if (selectedIds.length > 0) {
      toPredict = source.filter((r, i) => selectedIds.includes(getRowId(r, i)));
    }
    if (!toPredict.length) {
      actions.showToast({ message: 'No rows match the current selection.', type: 'warning' });
      return;
    }

    setIsLoading(true);
    try {
      const payloadRows = toPredict.map((r) => ({ ...r }));
      const pred = await predictLifecycleCustomers(generateKey, payloadRows);
      const byAcc = new Map(source.map((r, i) => [getRowId(r, i), { ...r }]));
      const merged = pred.map((p) => {
        const id = String(p.Customer_Account ?? p.customer_account ?? '');
        const input = byAcc.get(id) || {};
        return normalizeLifecyclePredictionRow({ ...input, ...p });
      });
      setOutputRows(merged.slice(0, 5));
      setHasOutput(true);
      setSelectedOutputId(merged[0] ? getRowId(merged[0], 0) : null);
      setSelectedIds([]);
      setEditEnabled(false);
      setShowInputCols(false);
    } catch (err) {
      console.error(err);
      actions.showToast({
        message: err.message || 'Prediction request failed',
        type: 'warning',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateDraft = useCallback(() => {
    if (!fieldList) return true;
    for (let ri = 0; ri < draftRows.length; ri++) {
      const row = draftRows[ri];
      const acct = getRowId(row, ri);
      for (const spec of fieldList.fields) {
        if (spec.readOnly) continue;
        if (!(spec.key in row)) continue;
        const raw = row[spec.key];

        if (spec.type === 'number') {
          if (raw === '' || raw === undefined || raw === null) {
            actions.showToast({
              message: `"${spec.label}" for customer ${acct} is required and must be between ${spec.min} and ${spec.max}.`,
              type: 'warning',
            });
            return false;
          }
          const v = Number(raw);
          if (!Number.isFinite(v) || v < spec.min || v > spec.max) {
            actions.showToast({
              message: `"${spec.label}" for customer ${acct} must be between ${spec.min} and ${spec.max}.`,
              type: 'warning',
            });
            return false;
          }
        }
        if (spec.type === 'select' && !selectValueMatchesOption(spec, raw)) {
          actions.showToast({
            message: `"${spec.label}" for customer ${acct} must use one of the allowed options.`,
            type: 'warning',
          });
          return false;
        }
      }
    }
    return true;
  }, [fieldList, draftRows]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApplyChanges = () => {
    if (!validateDraft()) return;
    setRows(draftRows.map((r) => ({ ...r })));
    setHasUnappliedChanges(false);
    setEditEnabled(false);
    actions.showToast({ message: 'Changes have been applied successfully!', type: 'success' });
  };

  const toggleSelect = (rowId) => {
    setSelectedIds((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    );
  };

  const updateDraftCell = (rowIndex, key, newVal) => {
    setDraftRows((prev) =>
      prev.map((row, i) => (i !== rowIndex ? row : { ...row, [key]: newVal }))
    );
    setHasUnappliedChanges(true);
  };

  const handleNumberBlur = (spec, value) => {
    if (value === '' || value === undefined) {
      actions.showToast({
        message: `"${spec.label}" cannot be empty (allowed range ${spec.min} – ${spec.max}).`,
        type: 'warning',
      });
      return;
    }
    const v = Number(value);
    if (!Number.isFinite(v) || v < spec.min || v > spec.max) {
      actions.showToast({
        message: `"${spec.label}" must be between ${spec.min} and ${spec.max}.`,
        type: 'warning',
      });
    }
  };

  const renderCell = (row, key, rowIndex) => {
    const val = row[key];
    const spec = getLifecycleFieldSpec(generateKey, key);

    if (!editEnabled) {
      return <td key={key}>{formatDisplayValue(val)}</td>;
    }

    if (!spec || spec.readOnly) {
      return <td key={key}>{formatDisplayValue(val)}</td>;
    }

    if (spec.type === 'select') {
      const first = spec.options[0];
      if (typeof first === 'object' && first && 'value' in first) {
        let n = Number(val);
        if (!Number.isFinite(n) || (n !== 0 && n !== 1)) {
          n = 0;
        }
        return (
          <td key={key}>
            <select
              value={String(n)}
              onChange={(e) => {
                updateDraftCell(rowIndex, key, parseInt(e.target.value, 10));
              }}
            >
              {spec.options.map((o) => (
                <option key={String(o.value)} value={String(o.value)}>
                  {o.label}
                </option>
              ))}
            </select>
          </td>
        );
      }

      const strOpts = spec.options.filter((o) => typeof o === 'string');
      const strVal = val === undefined || val === null ? '' : String(val);
      const safeValue = strOpts.some((o) => String(o) === strVal) ? strVal : strOpts[0];
      return (
        <td key={key}>
          <select
            value={safeValue}
            onChange={(e) => updateDraftCell(rowIndex, key, e.target.value)}
          >
            {strOpts.map((opt) => (
              <option key={String(opt)} value={String(opt)}>
                {opt}
              </option>
            ))}
          </select>
        </td>
      );
    }

    if (spec.type === 'number') {
      return (
        <td key={key}>
          <input
            type="number"
            step="any"
            value={val === '' || val === undefined || val === null ? '' : val}
            min={spec.min}
            max={spec.max}
            onChange={(e) => {
              const t = e.target.value;
              if (t === '') {
                updateDraftCell(rowIndex, key, '');
                return;
              }
              const n = parseFloat(t);
              updateDraftCell(rowIndex, key, Number.isFinite(n) ? n : val);
            }}
            onBlur={(e) => handleNumberBlur(spec, e.target.value)}
          />
        </td>
      );
    }

    return <td key={key}>{formatDisplayValue(val)}</td>;
  };

  const renderOutputValueCell = (key, val) => {
    if (isCategoryOutputColumn(key)) {
      const label = formatDisplayValue(val);
      const badgeClass = getCategoryBadgeClass(val);
      return (
        <td key={key} style={{ textAlign: 'center' }}>
          {badgeClass ? (
            <span className={`category-badge ${badgeClass}`}>{label}</span>
          ) : (
            label
          )}
        </td>
      );
    }
    return <td key={key}>{formatDisplayValue(val)}</td>;
  };

  const selectedShapRow = useMemo(() => {
    if (!selectedOutputId) return null;
    return (
      outputRows.find((r, i) => getRowId(r, i) === selectedOutputId) ??
      outputRows.find((r) => String(r.Customer_Account) === selectedOutputId) ??
      null
    );
  }, [outputRows, selectedOutputId]);

  const lifecycleShapData = useMemo(
    () =>
      selectedShapRow
        ? buildLifecycleShapData(selectedShapRow, {
            contextLabel: modelTitle || 'Customer Lifecycle',
            generateKey,
          })
        : null,
    [selectedShapRow, modelTitle, generateKey]
  );

  return (
    <div className="simulation-panel customer-lifecycle-simulation">
      <div className="simulation-header">
        <h4>
          <i className="bi bi-gear-fill"></i>
          Test & Simulation
          {modelTitle ? (
            <span className="lifecycle-sim-model-label"> — {modelTitle}</span>
          ) : null}
        </h4>

        <div className="simulation-controls">
          {editEnabled && (
            <button
              type="button"
              className="action-btn apply-changes"
              onClick={handleApplyChanges}
              disabled={!hasUnappliedChanges}
              title={hasUnappliedChanges ? 'Save all edited values' : 'No changes to apply'}
            >
              <i className="bi bi-check-circle-fill"></i>
              Apply Changes
            </button>
          )}

          {!editEnabled && (
            <>
              <button
                type="button"
                className="action-btn run"
                onClick={handleRun}
                disabled={isLoading || isInitialLoading || hasOutput}
              >
                <i className="bi bi-play-fill"></i>
                Run
              </button>
              <button
                type="button"
                className="action-btn reset"
                onClick={handleReset}
                disabled={isLoading || isInitialLoading}
              >
                <i className="bi bi-arrow-clockwise"></i>
                Reset
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`toggle-wrapper ${hasOutput ? 'disabled' : ''}`}>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={editEnabled}
            onChange={handleToggleEdit}
            disabled={hasOutput}
          />
          <span className="toggle-slider"></span>
        </label>
        <span className="toggle-label">Enable input editing</span>
      </div>

      <p className="simulation-caption">
        {hasOutput
          ? 'Review predictions below. Select one row to inspect SHAP values.'
          : 'Select rows to run on specific customers, or run on all rows.'}
        {!hasOutput && selectedIds.length > 0 && (
          <strong> ({selectedIds.length} row(s) selected)</strong>
        )}
      </p>

      {isInitialLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p className="loading-text">Loading input data from backend…</p>
        </div>
      ) : apiError ? (
        <div className="api-error-state" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '2rem', color: '#dc3545' }} />
          <p style={{ color: '#dc3545', marginTop: '10px', fontWeight: 600 }}>Failed to load data</p>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>{apiError}</p>
          <button type="button" className="action-btn run" onClick={loadData} style={{ marginTop: '15px' }}>
            <i className="bi bi-arrow-clockwise"></i>
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p className="loading-text">Running prediction model…</p>
        </div>
      ) : !hasOutput ? (
        <>
          <div className="table-section-label">
            <i className="bi bi-table"></i> INPUT Data
          </div>
          <div className="data-table-wrapper lifecycle-dynamic-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '52px' }}>
                    <i className="bi bi-filter"></i> Select
                  </th>
                  {columnKeys.map((key) => (
                    <th key={key}>{getLifecycleColumnLabel(generateKey, key)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, idx) => {
                  const rowId = getRowId(row, idx);
                  return (
                    <tr
                      key={rowId}
                      className={selectedIds.includes(rowId) ? 'selected' : ''}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(rowId)}
                          onChange={() => toggleSelect(rowId)}
                        />
                      </td>
                      {columnKeys.map((key) => renderCell(row, key, idx))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="table-section-label">
            <i className="bi bi-bar-chart-fill"></i> OUTPUT Data
            {showInputCols && (
              <span style={{ marginLeft: '12px', fontSize: '0.78rem', color: '#6366f1', fontWeight: 500 }}>
                <i className="bi bi-arrows-angle-expand" style={{ marginRight: '4px' }}></i>
                Scroll right for full feature values →
              </span>
            )}
          </div>
          <div className="data-table-wrapper lifecycle-dynamic-table-wrap">
            <table
              className={`data-table output-table ${showInputCols ? 'output-table--expanded' : ''}`}
              style={showInputCols ? { minWidth: '3200px' } : undefined}
            >
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="lifecycle-output-col-select"
                    title="Select row for SHAP analysis"
                    aria-label="Select"
                  >
                    <i className="bi bi-filter" aria-hidden="true" />
                  </th>
                  <th
                    scope="col"
                    className="lifecycle-output-col-expand"
                    aria-label="Expand inputs"
                  />
                  {visibleOutputKeys.map((key) => (
                    <th key={key}>{getLifecycleColumnLabel(generateKey, key)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outputRows.map((row, idx) => {
                  const rowId = getRowId(row, idx);
                  const isSelected = selectedOutputId === rowId;
                  const isFrozen = selectedOutputId != null && !isSelected;
                  return (
                    <tr
                      key={rowId}
                      className={`${isSelected ? 'selected' : ''} ${isFrozen ? 'frozen' : ''}`}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            setSelectedOutputId((prev) => (prev === rowId ? null : rowId))
                          }
                          disabled={isFrozen}
                        />
                      </td>
                      <td>
                        <div
                          className={`expand-toggle ${showInputCols ? 'expanded' : ''}`}
                          onClick={() => setShowInputCols((s) => !s)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setShowInputCols((s) => !s);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          title={showInputCols ? 'Hide input columns' : 'Show input columns'}
                        >
                          {showInputCols ? '−' : '+'}
                        </div>
                      </td>
                      {visibleOutputKeys.map((key) =>
                        renderOutputValueCell(key, row[key])
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {lifecycleShapData && (
            <CustomerLifecycleShapAnalysis shapData={lifecycleShapData} generateKey={generateKey} />
          )}
        </>
      )}
    </div>
  );
};

export default CustomerLifecycleSimulationPanel;
