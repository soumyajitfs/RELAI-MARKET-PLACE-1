import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { fetchUtilityAccounts, predictUtilityAccounts } from '../../utils/utilityApi';
import { buildUtilityShapData } from '../../utils/utilityShapUtils';
import UtilityDataTable from './UtilityDataTable';
import ShapAnalysis from '../PatientCollectability/ShapAnalysis';

/**
 * Min / Max validation ranges for editable numeric fields.
 */
const FIELD_RANGES = {
  pctOnTimePayments12m: { min: 0,     max: 1,      label: 'On-Time Payments (12m)' },
  arrearsBalance:       { min: 0,     max: 100000,  label: 'Arrears Balance' },
  maxDpd12m:            { min: 0,     max: 60,      label: 'Max DPD (12m)' },
  delinquencyCount12m:  { min: 0,     max: 12,      label: 'Delinquency Count (12m)' },
  rpcSuccessRatio:      { min: 0,     max: 1,       label: 'RPC Success Ratio' },
  ptpKeptCount:         { min: 0,     max: 12,      label: 'PTP Kept' },
  ptpBrokenCount:       { min: 0,     max: 12,      label: 'PTP Broken' },
  tuScore:              { min: 300,   max: 850,     label: 'TU Score' },
  complaintCount:       { min: 0,     max: 10,      label: 'Complaints' },
};

const UtilitySimulationPanel = () => {
  const { actions } = useAppContext();

  // ── Core state ──
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [selectedAcctId, setSelectedAcctId] = useState(null);
  const [selectedAcctIds, setSelectedAcctIds] = useState([]);
  const [hasOutput, setHasOutput] = useState(false);

  // ── Edit state ──
  const [editEnabled, setEditEnabled] = useState(false);
  const [draftAccounts, setDraftAccounts] = useState([]);
  const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false);

  /**
   * Fetch utility accounts from the backend.
   */
  const loadAccounts = useCallback(async () => {
    setIsInitialLoading(true);
    setApiError(null);
    try {
      const data = await fetchUtilityAccounts();
      setAccounts(data);
    } catch (err) {
      console.error('Failed to fetch utility accounts:', err);
      setApiError(err.message || 'Failed to load data from backend');
    } finally {
      setIsInitialLoading(false);
      setIsLoading(false);
    }
  }, []);

  // Reset ALL state and fetch fresh data every time the component mounts
  // (handles navigation back-and-forth without a full page refresh)
  useEffect(() => {
    setAccounts([]);
    setHasOutput(false);
    setSelectedAcctId(null);
    setSelectedAcctIds([]);
    setEditEnabled(false);
    setDraftAccounts([]);
    setHasUnappliedChanges(false);
    setApiError(null);
    loadAccounts();
  }, [loadAccounts]);

  // Initialize draft when edit mode is toggled ON
  useEffect(() => {
    if (editEnabled) {
      setDraftAccounts(accounts.map(acc => ({ ...acc })));
      setHasUnappliedChanges(false);
    }
  }, [editEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──
  const handleToggleEdit = () => {
    setEditEnabled(prev => !prev);
  };

  const handleReset = async () => {
    setSelectedAcctId(null);
    setSelectedAcctIds([]);
    setHasOutput(false);
    setEditEnabled(false);
    setHasUnappliedChanges(false);
    await loadAccounts();
  };

  const handleRun = async () => {
    setIsLoading(true);
    try {
      const accountsToRun = selectedAcctIds.length > 0
        ? accounts.filter(acc => selectedAcctIds.includes(acc.acctId))
        : accounts;

      // Call real backend predict API — returns merged results with prediction output
      const results = await predictUtilityAccounts(accountsToRun);
      const resultMap = new Map(results.map(r => [r.acctId, r]));

      // Merge: only scored accounts get output fields, others stay as-is
      const merged = accounts.map(acc =>
        resultMap.has(acc.acctId) ? resultMap.get(acc.acctId) : acc
      );
      setAccounts(merged);
      setHasOutput(true);
      setSelectedAcctId(selectedAcctIds.length > 0 ? selectedAcctIds[0] : null);
      setSelectedAcctIds([]);
    } catch (err) {
      console.error('Prediction API failed:', err);
      actions.showToast({ message: err.message || 'Failed to run prediction model', type: 'warning' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyChanges = () => {
    // Validate all draft accounts before applying
    for (const acc of draftAccounts) {
      for (const [field, range] of Object.entries(FIELD_RANGES)) {
        const val = parseFloat(acc[field]);
        if (isNaN(val) || val < range.min || val > range.max) {
          actions.showToast({
            message: `"${range.label}" for Account ${acc.acctId} must be between ${range.min} and ${range.max}. Please correct the value before applying.`,
            type: 'warning'
          });
          return; // Block apply
        }
      }
    }

    setAccounts(draftAccounts);
    setHasUnappliedChanges(false);
    setEditEnabled(false);
    actions.showToast({ message: 'Changes have been applied successfully!', type: 'success' });
  };

  const handleSelectAccount = (acctId) => {
    if (!hasOutput) {
      setSelectedAcctIds((prev) =>
        prev.includes(acctId) ? prev.filter((id) => id !== acctId) : [...prev, acctId]
      );
      return;
    }
    setSelectedAcctId(prev => (prev === acctId ? null : acctId));
  };

  // Build SHAP data when exactly one row is selected and model output exists
  const shapData = useMemo(() => {
    if (!hasOutput || selectedAcctId == null) return null;
    const selectedAccount = accounts.find(acc => acc.acctId === selectedAcctId);
    if (!selectedAccount) return null;
    return buildUtilityShapData(selectedAccount);
  }, [hasOutput, selectedAcctId, accounts]);

  return (
    <div className="simulation-panel">
      {/* Header */}
      <div className="simulation-header">
        <h4>
          <i className="bi bi-gear-fill"></i>
          Test & Simulation
        </h4>

        <div className="simulation-controls">
          {/* Apply Changes — shown when editing */}
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

          {/* Run & Reset — hidden when editing */}
          {!editEnabled && (
            <>
              <button
                className="action-btn run"
                onClick={handleRun}
                disabled={isLoading || accounts.length === 0}
              >
                <i className="bi bi-play-fill"></i>
                Run
              </button>

              <button
                className="action-btn reset"
                onClick={handleReset}
                disabled={isLoading}
              >
                <i className="bi bi-arrow-clockwise"></i>
                Reset
              </button>
            </>
          )}
        </div>
      </div>

      {/* Toggle — disabled after Run */}
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

      {/* Caption */}
      <p className="simulation-caption">
        {hasOutput
          ? 'Outputs are highlighted. Select any row to see details.'
          : 'Select rows to run on specific accounts, or run on all accounts without selection.'}
        {!hasOutput && selectedAcctIds.length > 0 && (
          <strong> ({selectedAcctIds.length} account(s) selected)</strong>
        )}
        {hasOutput && selectedAcctId != null && (
          <strong> (Account {selectedAcctId} selected)</strong>
        )}
      </p>

      {/* Loading / Error / Data */}
      {isInitialLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p className="loading-text">Loading utility accounts from backend...</p>
        </div>
      ) : apiError ? (
        <div className="api-error-state" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '2rem', color: '#dc3545' }}></i>
          <p style={{ color: '#dc3545', marginTop: '10px', fontWeight: 600 }}>Failed to load data</p>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>{apiError}</p>
          <button
            className="action-btn run"
            onClick={loadAccounts}
            style={{ marginTop: '15px' }}
          >
            <i className="bi bi-arrow-clockwise"></i>
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p className="loading-text">Running prediction model...</p>
        </div>
      ) : (
        <>
          <UtilityDataTable
            accounts={accounts}
            draftAccounts={draftAccounts}
            setDraftAccounts={setDraftAccounts}
            setHasUnappliedChanges={setHasUnappliedChanges}
            editEnabled={editEnabled}
            hasOutput={hasOutput}
            selectedAcctId={selectedAcctId}
            selectedAcctIds={selectedAcctIds}
            onSelectAccount={handleSelectAccount}
            fieldRanges={FIELD_RANGES}
          />

          {/* SHAP Analysis — shown when model output exists and exactly 1 row is selected */}
          <ShapAnalysis shapData={shapData} />
        </>
      )}
    </div>
  );
};

export default UtilitySimulationPanel;
