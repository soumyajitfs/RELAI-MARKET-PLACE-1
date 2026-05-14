import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { fetchEadAccounts, predictEadAccounts } from '../../utils/eadApi';
import { buildEadShapData } from '../../utils/eadShapUtils';
import { resolveEadFieldRules, validateEadValue, validateEadRowCrossFields } from '../../data/eadFieldRules';
import EadDataTable from './EadDataTable';
import ShapAnalysis from '../PatientCollectability/ShapAnalysis';

const OUTPUT_UI_KEYS = new Set([
  'riskTier',
  'confidence',
  'confidencePercent',
  'shapValues',
  'top_shap_drivers',
  'shap_values',
  'prob_score',
  'prob_percent',
  'expected_ccf',
  'Expected_CCF',
  'expected_ccf_percent_display',
  'EAD_Predicted',
  'ead_predicted',
]);

const isValuePresent = (value) => value !== '' && value != null;

const EadSimulationPanel = () => {
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
  const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false);

  const loadRows = useCallback(async () => {
    setIsInitialLoading(true);
    setApiError(null);
    try {
      const data = await fetchEadAccounts();
      setRows(data);
    } catch (err) {
      console.error('Failed to fetch EAD accounts:', err);
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
    setHasUnappliedChanges(false);
    setApiError(null);
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (editEnabled) {
      setDraftRows(rows.map((r) => ({ ...r })));
      setHasUnappliedChanges(false);
    }
  }, [editEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const fieldRulesWithEdit = useMemo(() => {
    const base = resolveEadFieldRules();
    const sample = rows[0];
    if (!sample) return base;
    const merged = { ...base };
    Object.keys(sample).forEach((key) => {
      if (key === '__rowId' || key === 'account_id') return;
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
    setHasUnappliedChanges(false);
    await loadRows();
  };

  const handleRun = async () => {
    setIsLoading(true);
    try {
      const rowsToRun = selectedRowIds.length > 0 ? rows.filter((r) => selectedRowIds.includes(r.__rowId)) : rows;

      const results = await predictEadAccounts(rowsToRun);
      const resultMap = new Map(results.map((r) => [r.__rowId, r]));
      const merged =
        selectedRowIds.length > 0 ? rows.map((r) => (resultMap.has(r.__rowId) ? resultMap.get(r.__rowId) : r)) : results;

      setRows(merged);
      setHasOutput(true);
      setSelectedRowId(selectedRowIds.length > 0 ? selectedRowIds[0] : null);
      setSelectedRowIds([]);
    } catch (err) {
      console.error('EAD prediction failed:', err);
      actions.showToast({ message: err.message || 'Failed to run prediction model', type: 'warning' });
    } finally {
      setIsLoading(false);
    }
  };

  const validateField = useCallback(
    (field, value) => validateEadValue(field, value, fieldRulesWithEdit),
    [fieldRulesWithEdit]
  );

  const handleApplyChanges = () => {
    for (const row of draftRows) {
      for (const [field, rule] of Object.entries(fieldRulesWithEdit)) {
        if (!rule.editable) continue;
        if (!isValuePresent(row[field])) {
          actions.showToast({
            message: `"${rule.label}" cannot be empty. (${row.account_id})`,
            type: 'warning',
          });
          return;
        }
        const message = validateEadValue(field, row[field], fieldRulesWithEdit);
        if (message) {
          actions.showToast({
            message: `${message} (${row.account_id})`,
            type: 'warning',
          });
          return;
        }
      }
      const cross = validateEadRowCrossFields(row);
      if (cross) {
        actions.showToast({
          message: `${cross} (${row.account_id})`,
          type: 'warning',
        });
        return;
      }
    }

    setRows(draftRows.map((r) => ({ ...r })));
    setHasUnappliedChanges(false);
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
    return buildEadShapData(row);
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
          : 'Select customers to score a subset, or run on all loaded rows. Predict sends the same JSON array as Postman.'}
        {!hasOutput && selectedRowIds.length > 0 && <strong> ({selectedRowIds.length} account(s) selected)</strong>}
        {hasOutput && selectedRowId != null && rows.find((r) => r.__rowId === selectedRowId) && (
          <strong> ({rows.find((r) => r.__rowId === selectedRowId).account_id} selected)</strong>
        )}
      </p>

      {isInitialLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p className="loading-text">Loading credit card accounts from backend...</p>
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
          <p className="loading-text">Running EAD model...</p>
        </div>
      ) : (
        <>
          <EadDataTable
            rows={rows}
            draftRows={draftRows}
            setDraftRows={setDraftRows}
            setHasUnappliedChanges={setHasUnappliedChanges}
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

export default EadSimulationPanel;
