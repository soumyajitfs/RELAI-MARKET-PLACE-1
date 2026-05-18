import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { fetchEwsAccounts, predictEwsAccounts } from '../../utils/ewsApi';
import { buildEwsShapData } from '../../utils/ewsShapUtils';
import {
  resolveEwsFieldRules,
  validateEwsValue,
  validateEwsRowCrossFields,
} from '../../data/ewsFieldRules';
import EwsDataTable from './EwsDataTable';
import ShapAnalysis from '../PatientCollectability/ShapAnalysis';

const OUTPUT_UI_KEYS = new Set(['riskTier', 'confidence', 'confidencePercent', 'shapValues']);

const isValuePresent = (value) => value !== '' && value != null;

const dirtyKey = (rowId, field) => `${rowId}::${field}`;

const EwsSimulationPanel = () => {
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
  /** Tracks which (rowId, field) pairs the user actually edited in this session. */
  const [dirtyCells, setDirtyCells] = useState(() => new Set());
  const hasUnappliedChanges = dirtyCells.size > 0;
  const markCellDirty = useCallback((rowId, field) => {
    setDirtyCells((prev) => {
      const k = dirtyKey(rowId, field);
      if (prev.has(k)) return prev;
      const next = new Set(prev);
      next.add(k);
      return next;
    });
  }, []);

  const loadRows = useCallback(async () => {
    setIsInitialLoading(true);
    setApiError(null);
    try {
      const data = await fetchEwsAccounts();
      setRows(data);
    } catch (err) {
      console.error('Failed to fetch EWS accounts:', err);
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
    setDirtyCells(new Set());
    setApiError(null);
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (editEnabled) {
      setDraftRows(rows.map((r) => ({ ...r })));
      setDirtyCells(new Set());
    }
  }, [editEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const fieldRulesWithEdit = useMemo(() => {
    const base = resolveEwsFieldRules();
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
    setDirtyCells(new Set());
    await loadRows();
  };

  const handleRun = async () => {
    setIsLoading(true);
    try {
      const rowsToRun = selectedRowIds.length > 0 ? rows.filter((r) => selectedRowIds.includes(r.__rowId)) : rows;

      const results = await predictEwsAccounts(rowsToRun);
      const resultMap = new Map(results.map((r) => [r.__rowId, r]));
      const merged =
        selectedRowIds.length > 0 ? rows.map((r) => (resultMap.has(r.__rowId) ? resultMap.get(r.__rowId) : r)) : results;

      setRows(merged);
      setHasOutput(true);
      setSelectedRowId(selectedRowIds.length > 0 ? selectedRowIds[0] : null);
      setSelectedRowIds([]);
    } catch (err) {
      console.error('EWS prediction failed:', err);
      actions.showToast({ message: err.message || 'Failed to run prediction model', type: 'warning' });
    } finally {
      setIsLoading(false);
    }
  };

  const validateField = useCallback(
    (field, value) => validateEwsValue(field, value, fieldRulesWithEdit),
    [fieldRulesWithEdit]
  );

  const handleApplyChanges = () => {
    if (dirtyCells.size === 0) return;

    /** Group dirty cell keys by rowId for per-row validation. */
    const dirtyByRow = new Map();
    for (const key of dirtyCells) {
      const [rowIdStr, field] = key.split('::');
      const rowId = Number.isNaN(Number(rowIdStr)) ? rowIdStr : Number(rowIdStr);
      if (!dirtyByRow.has(rowId)) dirtyByRow.set(rowId, new Set());
      dirtyByRow.get(rowId).add(field);
    }

    /** Validate ONLY cells the user actually edited. */
    for (const [rowId, fields] of dirtyByRow) {
      const row = draftRows.find((r) => r.__rowId === rowId);
      if (!row) continue;
      for (const field of fields) {
        const rule = fieldRulesWithEdit[field];
        if (!rule || !rule.editable) continue;
        if (!isValuePresent(row[field])) {
          actions.showToast({
            message: `"${rule.label}" cannot be empty. (Account ${row.account_id})`,
            type: 'warning',
          });
          return;
        }
        const message = validateEwsValue(field, row[field], fieldRulesWithEdit);
        if (message) {
          actions.showToast({
            message: `${message} (Account ${row.account_id})`,
            type: 'warning',
          });
          return;
        }
      }
      /** Cross-field rules can depend on the just-edited values, so re-check on rows that changed. */
      const cross = validateEwsRowCrossFields(row);
      if (cross) {
        actions.showToast({
          message: `${cross} (Account ${row.account_id})`,
          type: 'warning',
        });
        return;
      }
    }

    setRows(draftRows.map((r) => ({ ...r })));
    setDirtyCells(new Set());
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

  const selectedRow = selectedRowId != null ? rows.find((r) => r.__rowId === selectedRowId) : null;

  const shapData = useMemo(() => {
    if (!hasOutput || selectedRowId == null) return null;
    const row = rows.find((r) => r.__rowId === selectedRowId);
    if (!row) return null;
    return buildEwsShapData(row);
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
          : 'Select rows to run on specific accounts, or run on all accounts without selection.'}
        {!hasOutput && selectedRowIds.length > 0 && <strong> ({selectedRowIds.length} account(s) selected)</strong>}
        {hasOutput && selectedRow && <strong> (Account {selectedRow.account_id} selected)</strong>}
      </p>

      {isInitialLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p className="loading-text">Loading loan accounts from backend...</p>
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
          <p className="loading-text">Running EWS model...</p>
        </div>
      ) : (
        <>
          <EwsDataTable
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

export default EwsSimulationPanel;
