import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { fetchRollRateAccounts, predictRollRateAccounts } from '../../utils/rollRateApi';
import { buildRollRateShapData } from '../../utils/rollRateShapUtils';
import {
  resolveRollRateFieldRules,
  validateRollRateValue,
  validateRollRateRowCrossFields,
} from '../../data/rollRateFieldRules';
import { useDirtyCells } from '../../hooks/useDirtyCells';
import { validateDirtyFieldRules } from '../../utils/dirtyCellTracking';
import RollRateDataTable from './RollRateDataTable';
import ShapAnalysis from '../PatientCollectability/ShapAnalysis';

const OUTPUT_UI_KEYS = new Set([
  'rag_rating',
  'roll_rate_risk',
  'prob_roll_forward',
  'prob_cure',
  'primary_prob_label',
  'primary_prob_value',
  'primary_prob_percent',
  'bucket_description',
  'risk_interpretation',
  'top_shap_drivers',
  'top_drivers',
  'shapValues',
  'shap_values',
  'prediction',
]);

const isValuePresent = (value) => value !== '' && value != null;

const RollRateSimulationPanel = () => {
  const { actions } = useAppContext();

  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [hasOutput, setHasOutput] = useState(false);
  const [editEnabled, setEditEnabled] = useState(false);
  const [draftRows, setDraftRows] = useState([]);
  const { dirtyCells, hasUnappliedChanges, markCellDirty, resetDirtyCells } = useDirtyCells();

  const loadRows = useCallback(async () => {
    setIsInitialLoading(true);
    setApiError(null);
    try {
      const data = await fetchRollRateAccounts();
      setRows(data);
    } catch (err) {
      console.error('Failed to fetch roll rate accounts:', err);
      setApiError(err.message || 'Failed to load data from backend');
    } finally {
      setIsInitialLoading(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setRows([]);
    setHasOutput(false);
    setSelectedRowId(null);
    setSelectedRowIds([]);
    setEditEnabled(false);
    setDraftRows([]);
    resetDirtyCells();
    setApiError(null);
    loadRows();
  }, [loadRows, resetDirtyCells]);

  useEffect(() => {
    if (editEnabled) {
      setDraftRows(rows.map((r) => ({ ...r })));
      resetDirtyCells();
    }
  }, [editEnabled, resetDirtyCells]); // eslint-disable-line react-hooks/exhaustive-deps

  const fieldRulesWithEdit = useMemo(() => {
    const base = resolveRollRateFieldRules();
    const sample = rows[0];
    if (!sample) return base;
    const merged = { ...base };
    Object.keys(sample).forEach((key) => {
      if (key === '__rowId') return;
      if (OUTPUT_UI_KEYS.has(key)) return;
      if (!merged[key]) {
        merged[key] = { type: 'float', editable: false, label: key };
      }
    });
    return merged;
  }, [rows]);

  const handleToggleEdit = () => setEditEnabled((prev) => !prev);

  const handleReset = async () => {
    setSelectedRowId(null);
    setSelectedRowIds([]);
    setHasOutput(false);
    setEditEnabled(false);
    resetDirtyCells();
    await loadRows();
  };

  const handleRun = async () => {
    setIsLoading(true);
    try {
      const rowsToRun =
        selectedRowIds.length > 0 ? rows.filter((r) => selectedRowIds.includes(r.__rowId)) : rows;

      const results = await predictRollRateAccounts(rowsToRun);
      const resultMap = new Map(results.map((r) => [r.__rowId, r]));
      const merged =
        selectedRowIds.length > 0
          ? rows.map((r) => (resultMap.has(r.__rowId) ? resultMap.get(r.__rowId) : r))
          : results;

      setRows(merged);
      setHasOutput(true);
      setSelectedRowId(selectedRowIds.length > 0 ? selectedRowIds[0] : null);
      setSelectedRowIds([]);
    } catch (err) {
      console.error('Roll Rate prediction failed:', err);
      actions.showToast({ message: err.message || 'Failed to run roll rate model', type: 'warning' });
    } finally {
      setIsLoading(false);
    }
  };

  const validateField = useCallback(
    (field, value) => validateRollRateValue(field, value, fieldRulesWithEdit),
    [fieldRulesWithEdit],
  );

  const handleApplyChanges = () => {
    if (dirtyCells.size === 0) return;

    const error = validateDirtyFieldRules({
      dirtyCells,
      draftRows,
      fieldRules: fieldRulesWithEdit,
      validateValue: validateRollRateValue,
      validateRowCross: validateRollRateRowCrossFields,
      isValuePresent,
      formatError: ({ row, rule, type, message }) => {
        if (type === 'empty') return `"${rule.label}" cannot be empty. (${row.account_id})`;
        if (type === 'cross') return `${message} (${row.account_id})`;
        return `${message} (${row.account_id})`;
      },
    });
    if (error) {
      actions.showToast({ message: error, type: 'warning' });
      return;
    }

    setRows(draftRows.map((r) => ({ ...r })));
    resetDirtyCells();
    setEditEnabled(false);
    actions.showToast({ message: 'Changes have been applied successfully!', type: 'success' });
  };

  const handleSelectRow = (rowId) => {
    if (!hasOutput) {
      setSelectedRowIds((prev) => (prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]));
      return;
    }
    setSelectedRowId((prev) => (prev === rowId ? null : rowId));
  };

  const shapData = useMemo(() => {
    if (!hasOutput || selectedRowId == null) return null;
    const row = rows.find((r) => r.__rowId === selectedRowId);
    if (!row) return null;
    return buildRollRateShapData(row);
  }, [hasOutput, selectedRowId, rows]);

  return (
    <div className="simulation-panel">
      <div className="simulation-header">
        <h4>
          <i className="bi bi-gear-fill"></i>
          Test & Simulation
        </h4>
        <div className="simulation-controls">
          {editEnabled && (
            <button
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
              <button className="action-btn run" onClick={handleRun} disabled={isLoading || rows.length === 0}>
                <i className="bi bi-play-fill"></i>
                Run
              </button>
              <button className="action-btn reset" onClick={handleReset} disabled={isLoading}>
                <i className="bi bi-arrow-clockwise"></i>
                Reset
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`toggle-wrapper ${hasOutput ? 'disabled' : ''}`}>
        <label className="toggle-switch">
          <input type="checkbox" checked={editEnabled} onChange={handleToggleEdit} disabled={hasOutput} />
          <span className="toggle-slider"></span>
        </label>
        <span className="toggle-label">Enable input editing</span>
      </div>

      <p className="simulation-caption">
        {hasOutput
          ? 'Outputs are highlighted. Select any row to see SHAP details.'
          : 'Select accounts to score a subset, or run on all loaded rows. Predict sends account_ids as in Postman.'}
        {!hasOutput && selectedRowIds.length > 0 && (
          <strong> ({selectedRowIds.length} account(s) selected)</strong>
        )}
        {hasOutput && rows.find((r) => r.__rowId === selectedRowId) && (
          <strong> ({rows.find((r) => r.__rowId === selectedRowId).account_id} selected)</strong>
        )}
      </p>

      {isInitialLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p className="loading-text">Loading roll rate accounts from backend...</p>
        </div>
      ) : apiError ? (
        <div className="api-error-state" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '2rem', color: '#dc3545' }}></i>
          <p style={{ color: '#dc3545', marginTop: '10px', fontWeight: 600 }}>Failed to load data</p>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>{apiError}</p>
          <button className="action-btn run" onClick={loadRows} style={{ marginTop: '15px' }}>
            <i className="bi bi-arrow-clockwise"></i>
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p className="loading-text">Running Roll Rate Prediction model...</p>
        </div>
      ) : (
        <>
          <RollRateDataTable
            rows={rows}
            draftRows={draftRows}
            setDraftRows={setDraftRows}
            markCellDirty={markCellDirty}
            editEnabled={editEnabled}
            hasOutput={hasOutput}
            selectedRowId={selectedRowId}
            selectedRowIds={selectedRowIds}
            onSelectRow={handleSelectRow}
            fieldRules={fieldRulesWithEdit}
            validateField={validateField}
            showToast={actions.showToast}
          />
          <ShapAnalysis shapData={shapData} />
        </>
      )}
    </div>
  );
};

export default RollRateSimulationPanel;
