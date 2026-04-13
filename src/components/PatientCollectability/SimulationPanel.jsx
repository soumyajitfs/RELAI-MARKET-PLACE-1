import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import DataTable from './DataTable';
import ShapAnalysis from './ShapAnalysis';
import { buildShapData } from '../../utils/shapUtils';
import { fetchAccountsFromAPI, predictAccountsFromAPI } from '../../utils/api';

const SimulationPanel = () => {
  const { state, actions } = useAppContext();
  const { editEnabled, selectedFacs, isLoading, accounts, hasOutput, isInitialLoading, apiError } = state.patientData;

  // Draft state lifted from DataTable so Apply Changes can sit next to Run
  const [draftAccounts, setDraftAccounts] = useState([]);
  const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false);

  // Fetch real data from the backend API
  const loadAccountsFromAPI = useCallback(async () => {
    actions.setInitialLoading(true);
    actions.setApiError(null);
    try {
      const realAccounts = await fetchAccountsFromAPI();
      actions.setAccounts(realAccounts);
    } catch (err) {
      console.error('Failed to fetch accounts from API:', err);
      actions.setApiError(err.message || 'Failed to load data from backend');
    } finally {
      actions.setInitialLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset state and fetch fresh data every time the component mounts
  useEffect(() => {
    actions.resetPatientData();
    loadAccountsFromAPI();
  }, [loadAccountsFromAPI]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize / reset draft when edit mode is toggled
  useEffect(() => {
    if (editEnabled) {
      setDraftAccounts(accounts.map(acc => ({ ...acc })));
      setHasUnappliedChanges(false);
    }
  }, [editEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleEdit = () => {
    actions.setEditEnabled(!editEnabled);
  };

  const handleReset = async () => {
    actions.resetPatientData();
    // After resetting state, re-fetch fresh data from the API
    await loadAccountsFromAPI();
  };

  // Run the prediction model via real backend API
  const handleRun = async () => {
    actions.setLoading(true);
    try {
      const accountsToRun = selectedFacs.length > 0
        ? accounts.filter(acc => selectedFacs.includes(acc.facsNumber))
        : accounts;

      // Call real backend predict API — returns merged results with prediction output + SHAP values
      const results = await predictAccountsFromAPI(accountsToRun);
      const resultMap = new Map(results.map(r => [r.facsNumber, r]));

      // Merge: only scored accounts get output fields, others stay as-is
      const merged = accounts.map(acc =>
        resultMap.has(acc.facsNumber) ? resultMap.get(acc.facsNumber) : acc
      );
      actions.setAccounts(merged);
      actions.setHasOutput(true);
      // OUTPUT view supports single-row drill-down (SHAP), so keep one selected row.
      if (selectedFacs.length > 1) {
        actions.setSelectedFacs([selectedFacs[0]]);
      }
    } catch (err) {
      console.error('Prediction API failed:', err);
      actions.setApiError(err.message || 'Failed to run prediction model');
    } finally {
      actions.setLoading(false);
    }
  };

  // Min/Max validation ranges for numeric fields
  const FIELD_RANGES = {
    initBal:      { min: 10,  max: 10000, label: 'Initial Balance' },
    tuScore:      { min: 300, max: 850,   label: 'TU Score' },
    bnkcrdAvlble: { min: 0,   max: 1,     label: 'Bankcard Available' },
    age:          { min: 1,   max: 100,   label: 'Patient Age' },
    ageOfAccount: { min: 1,   max: 300,   label: 'Age of Account' },
  };

  // Commit all draft edits to global state — only if all values are in valid range
  const handleApplyChanges = () => {
    // Validate all draft accounts before applying
    for (const acc of draftAccounts) {
      for (const [field, range] of Object.entries(FIELD_RANGES)) {
        const val = parseFloat(acc[field]);
        if (isNaN(val) || val < range.min || val > range.max) {
          actions.showToast({
            message: `"${range.label}" for FACS ${acc.facsNumber} must be between ${range.min} and ${range.max}. Please correct the value before applying.`,
            type: 'warning'
          });
          return; // Block apply
        }
      }
    }

    actions.setAccounts(draftAccounts);
    setHasUnappliedChanges(false);
    actions.setEditEnabled(false);
    actions.showToast({ message: 'Changes have been applied successfully!', type: 'success' });
  };

  // Build SHAP data when exactly one row is selected and model output exists
  const shapData = useMemo(() => {
    if (!hasOutput || selectedFacs.length !== 1) return null;
    const selectedAccount = accounts.find(acc => acc.facsNumber === selectedFacs[0]);
    if (!selectedAccount) return null;
    return buildShapData(selectedAccount);
  }, [hasOutput, selectedFacs, accounts]);

  return (
    <div className="simulation-panel">
      {/* Header */}
      <div className="simulation-header">
        <h4>
          <i className="bi bi-gear-fill"></i>
          Test & Simulation
        </h4>
        
        <div className="simulation-controls">
          {/* Apply Changes - shown when editing */}
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
          <button 
            className="action-btn run"
            onClick={handleRun}
            disabled={isLoading}
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

      {/* Toggle — disabled after Run so users cannot edit scored results */}
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
          ? 'Outputs are highlighted and Select any row to see SHAP analysis below.'
          : 'Select rows to run on specific accounts, or run on all accounts without selection.'}
        {selectedFacs.length > 0 && (
          <strong> ({selectedFacs.length} account(s) selected)</strong>
        )}
      </p>

      {/* Loading State */}
      {isInitialLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p className="loading-text">Loading patient accounts from backend...</p>
        </div>
      ) : apiError ? (
        <div className="api-error-state" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '2rem', color: '#dc3545' }}></i>
          <p style={{ color: '#dc3545', marginTop: '10px', fontWeight: 600 }}>Failed to load data</p>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>{apiError}</p>
          <button
            className="action-btn run"
            onClick={loadAccountsFromAPI}
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
          <DataTable 
            draftAccounts={draftAccounts}
            setDraftAccounts={setDraftAccounts}
            setHasUnappliedChanges={setHasUnappliedChanges}
          />

          {/* SHAP Analysis — shown when model output exists and exactly 1 row is selected */}
          <ShapAnalysis shapData={shapData} />
        </>
      )}
    </div>
  );
};

export default SimulationPanel;
