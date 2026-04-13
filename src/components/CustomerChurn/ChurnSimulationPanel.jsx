import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { fetchChurnCustomers, predictChurnCustomers } from '../../utils/churnApi';
import { buildChurnShapData } from '../../utils/churnShapUtils';
import ChurnDataTable from './ChurnDataTable';
import ShapAnalysis from '../PatientCollectability/ShapAnalysis';

const FIELD_RANGES = {
  customer_age: { min: 18, max: 80, label: 'Customer Age', integer: true },
  avg_articles_per_week: { min: 0.0, max: 9.0, label: 'Avg Articles/Week', integer: false },
  article_skips_per_week: { min: 0, max: 10, label: 'Article Skips/Week', integer: true },
  days_since_last_login: { min: 0, max: 100, label: 'Days Since Last Login', integer: true },
  support_tickets_last_90d: { min: 0, max: 10, label: 'Support Tickets (90d)', integer: true },
  email_open_rate: { min: 0, max: 1, label: 'Email Open Rate', integer: false },
  time_spent_per_session_mins: { min: 0.0, max: 30.0, label: 'Time/Session (mins)', integer: false },
  tenure_days: { min: 0, max: 1825, label: 'Tenure (Days)', integer: true },
  completion_rate: { min: 0, max: 1, label: 'Completion Rate', integer: false },
  campaign_ctr: { min: 0, max: 1, label: 'Campaign CTR', integer: false },
  nps_score: { min: -100, max: 100, label: 'NPS Score', integer: true },
  sentiment_score: { min: -1.5, max: 1.5, label: 'Sentiment Score', integer: false },
  csat_score: { min: 1, max: 5, label: 'CSAT Score', integer: true },
};

const ChurnSimulationPanel = () => {
  const { actions } = useAppContext();

  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [hasOutput, setHasOutput] = useState(false);

  const [editEnabled, setEditEnabled] = useState(false);
  const [draftCustomers, setDraftCustomers] = useState([]);
  const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false);

  const loadCustomers = useCallback(async () => {
    setIsInitialLoading(true);
    setApiError(null);
    try {
      const data = await fetchChurnCustomers();
      setCustomers(data);
    } catch (err) {
      console.error('Failed to fetch churn customers:', err);
      setApiError(err.message || 'Failed to load data from backend');
    } finally {
      setIsInitialLoading(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setCustomers([]);
    setHasOutput(false);
    setSelectedRowId(null);
    setSelectedRowIds([]);
    setEditEnabled(false);
    setDraftCustomers([]);
    setHasUnappliedChanges(false);
    setApiError(null);
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (editEnabled) {
      setDraftCustomers(customers.map(c => ({ ...c })));
      setHasUnappliedChanges(false);
    }
  }, [editEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleEdit = () => {
    setEditEnabled(prev => !prev);
  };

  const handleReset = async () => {
    setSelectedRowId(null);
    setSelectedRowIds([]);
    setHasOutput(false);
    setEditEnabled(false);
    setHasUnappliedChanges(false);
    await loadCustomers();
  };

  const handleRun = async () => {
    setIsLoading(true);
    try {
      const rowsToRun = selectedRowIds.length > 0
        ? customers.filter(c => selectedRowIds.includes(c.__rowId))
        : customers;

      const results = await predictChurnCustomers(rowsToRun);
      const resultMap = new Map(results.map((r) => [r.__rowId, r]));
      const merged = selectedRowIds.length > 0
        ? customers.map((c) => (resultMap.has(c.__rowId) ? resultMap.get(c.__rowId) : c))
        : results;

      setCustomers(merged);
      setHasOutput(true);
      setSelectedRowId(selectedRowIds.length > 0 ? selectedRowIds[0] : null);
      setSelectedRowIds([]);
    } catch (err) {
      console.error('Churn prediction API failed:', err);
      actions.showToast({ message: err.message || 'Failed to run prediction model', type: 'warning' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyChanges = () => {
    for (const row of draftCustomers) {
      for (const [field, range] of Object.entries(FIELD_RANGES)) {
        const val = parseFloat(row[field]);
        const invalidRange = isNaN(val) || val < range.min || val > range.max;
        const invalidInt = range.integer && !Number.isInteger(val);
        if (invalidRange || invalidInt) {
          actions.showToast({
            message: invalidInt
              ? `"${range.label}" for User ${row.user_id} must be an integer.`
              : `"${range.label}" for User ${row.user_id} must be between ${range.min} and ${range.max}.`,
            type: 'warning',
          });
          return;
        }
      }
    }

    setCustomers(draftCustomers);
    setHasUnappliedChanges(false);
    setEditEnabled(false);
    actions.showToast({ message: 'Changes have been applied successfully!', type: 'success' });
  };

  const handleSelectCustomer = (rowId) => {
    if (!hasOutput) {
      setSelectedRowIds((prev) =>
        prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
      );
      return;
    }
    setSelectedRowId(prev => (prev === rowId ? null : rowId));
  };

  const selectedCustomer = selectedRowId != null
    ? customers.find(c => c.__rowId === selectedRowId)
    : null;

  const shapData = useMemo(() => {
    if (!hasOutput || selectedRowId == null) return null;
    const row = customers.find(c => c.__rowId === selectedRowId);
    if (!row) return null;
    return buildChurnShapData(row);
  }, [hasOutput, selectedRowId, customers]);

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
              <button
                className="action-btn run"
                onClick={handleRun}
                disabled={isLoading || customers.length === 0}
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
          ? 'Outputs are highlighted. Select any row to see details.'
          : 'Select rows to run on specific customers, or run on all customers without selection.'}
        {!hasOutput && selectedRowIds.length > 0 && <strong> ({selectedRowIds.length} customer(s) selected)</strong>}
        {hasOutput && selectedCustomer && <strong> (User {selectedCustomer.user_id} selected)</strong>}
      </p>

      {isInitialLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p className="loading-text">Loading churn customers from backend...</p>
        </div>
      ) : apiError ? (
        <div className="api-error-state" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '2rem', color: '#dc3545' }}></i>
          <p style={{ color: '#dc3545', marginTop: '10px', fontWeight: 600 }}>Failed to load data</p>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>{apiError}</p>
          <button className="action-btn run" onClick={loadCustomers} style={{ marginTop: '15px' }}>
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
          <ChurnDataTable
            customers={customers}
            draftCustomers={draftCustomers}
            setDraftCustomers={setDraftCustomers}
            setHasUnappliedChanges={setHasUnappliedChanges}
            editEnabled={editEnabled}
            hasOutput={hasOutput}
            selectedRowId={selectedRowId}
            selectedRowIds={selectedRowIds}
            onSelectCustomer={handleSelectCustomer}
            fieldRanges={FIELD_RANGES}
          />
          <ShapAnalysis shapData={shapData} />
        </>
      )}
    </div>
  );
};

export default ChurnSimulationPanel;
