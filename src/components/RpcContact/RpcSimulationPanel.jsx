import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { fetchRpcAccounts, predictRpcAccounts } from '../../utils/rpcApi';
import { buildRpcShapData } from '../../utils/rpcShapUtils';
import RpcDataTable from './RpcDataTable';
import ShapAnalysis from '../PatientCollectability/ShapAnalysis';

/**
 * Min / Max validation ranges for editable numeric fields.
 * Based on the Amex Prediction API – Accepted Values documentation.
 */
const FIELD_RANGES = {
  PlaceAmt:                  { min: 10,    max: 10000,  label: 'Place Amount' },
  Decile:                    { min: 1,     max: 10,     label: 'Decile' },
  FICOScore_sql04:           { min: 300,   max: 850,    label: 'FICO Score' },
  BestDayToCall:             { min: 1,     max: 7,      label: 'Best Day to Call' },
  CallWindow_avg:            { min: 0,     max: 23,     label: 'Call Window (avg)' },
  SecondBestCallWindow_avg:  { min: 0,     max: 23,     label: '2nd Best Call Window' },
  InitialAmexPScore_sql04:   { min: 0,     max: 10000,  label: 'Initial Amex P-Score' },
  // NumPhoneNumbersDialed, ValidCalls, Totalemailscount: "Any integer" — no upper bound enforced
  NumPhoneNumbersDialed:     { min: 0,     max: 999999, label: 'Phone Numbers Dialed' },
  ValidCalls:                { min: 0,     max: 999999, label: 'Valid Calls' },
  Totalemailscount:          { min: 0,     max: 999999, label: 'Total Emails' },
};

const RpcSimulationPanel = () => {
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
   * Fetch RPC accounts from the backend.
   */
  const loadAccounts = useCallback(async () => {
    setIsInitialLoading(true);
    setApiError(null);
    try {
      const data = await fetchRpcAccounts();
      setAccounts(data);
    } catch (err) {
      console.error('Failed to fetch RPC accounts:', err);
      setApiError(err.message || 'Failed to load data from backend');
    } finally {
      setIsInitialLoading(false);
      setIsLoading(false);
    }
  }, []);

  // Reset ALL state and fetch fresh data every time the component mounts
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
        ? accounts.filter(acc => selectedAcctIds.includes(acc.AcctID))
        : accounts;

      const results = await predictRpcAccounts(accountsToRun);
      const resultMap = new Map(results.map(r => [r.AcctID, r]));

      const merged = accounts.map(acc =>
        resultMap.has(acc.AcctID) ? resultMap.get(acc.AcctID) : acc
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
            message: `"${range.label}" for Account ${acc.AcctID} must be between ${range.min} and ${range.max}. Please correct the value before applying.`,
            type: 'warning',
          });
          return;
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
    const selectedAccount = accounts.find(acc => acc.AcctID === selectedAcctId);
    if (!selectedAccount) return null;
    return buildRpcShapData(selectedAccount);
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
          <p className="loading-text">Loading RPC accounts from backend...</p>
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
          <RpcDataTable
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

export default RpcSimulationPanel;

