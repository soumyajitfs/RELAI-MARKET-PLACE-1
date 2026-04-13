import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { fetchAmlAccounts, predictAmlAccounts } from '../../utils/amlApi';
import { buildAmlShapData } from '../../utils/amlShapUtils';
import AmlDataTable from './AmlDataTable';
import ShapAnalysis from '../PatientCollectability/ShapAnalysis';

const FIELD_RANGES = {
  kycRiskScore: { min: 1, max: 30, label: 'KYC Risk Score', integer: true },
  income: { min: 29800, max: 103500, label: 'Income', integer: true },
  tenureMonths: { min: 10, max: 33, label: 'Tenure (Months)', integer: true },
  creditScore: { min: 616, max: 762, label: 'Credit Score', integer: true },
  nbrPurchases90d: { min: 2, max: 101, label: 'Purchases (90d)', integer: true },
  avgTxnSize90d: { min: 87.03, max: 728.78, label: 'Avg Txn Size (90d)', integer: false },
  totalSpend90d: { min: 174.06, max: 19255.65, label: 'Total Spend (90d)', integer: false },
  nbrDistinctMerch90d: { min: 0, max: 51, label: 'Distinct Merchants (90d)', integer: true },
  nbrMerchCredits90d: { min: 1, max: 59, label: 'Merchant Credits (90d)', integer: true },
  nbrMerchCreditsRndDollarAmt90d: { min: 1, max: 3, label: 'Rnd Dollar Credits (90d)', integer: true },
  totalMerchCred90d: { min: 94.0, max: 2947.5, label: 'Total Merchant Credits (90d)', integer: false },
  nbrMerchCreditsWoOffsettingPurch: { min: 1, max: 6, label: 'Credits w/o Offset Purch', integer: true },
  nbrPayments90d: { min: 0, max: 3, label: 'Payments (90d)', integer: true },
  totalPaymentAmt90d: { min: 60.0, max: 19255.65, label: 'Total Payment Amt (90d)', integer: false },
  overpaymentAmt90d: { min: 0.0, max: 5260.76, label: 'Overpayment Amt (90d)', integer: false },
  indCustReqRefund90d: { min: 0, max: 1, label: 'Cust Refund Req (0/1)', integer: true },
  totalRefundsToCust90d: { min: 30.41, max: 5304.04, label: 'Total Refunds (90d)', integer: false },
  nbrPaymentsCashLike90d: { min: 0, max: 3, label: 'Cash-like Payments (90d)', integer: true },
  maxRevolveLine: { min: 7000, max: 27000, label: 'Max Revolve Line', integer: true },
  indOwnsHome: { min: 0, max: 1, label: 'Owns Home (0/1)', integer: true },
  nbrInquiries1y: { min: 1, max: 27, label: 'Inquiries (1y)', integer: true },
  nbrCollections3y: { min: 0, max: 5, label: 'Collections (3y)', integer: true },
  nbrPointRed90d: { min: 1, max: 2, label: 'Point Redemptions (90d)', integer: true },
  PEP: { min: 0, max: 1, label: 'PEP (0/1)', integer: true },
  txn_per_month: { min: 5.802, max: 1578.751, label: 'Transactions / Month', integer: false },
  credit_utilization: { min: 0.0096, max: 100.0, label: 'Credit Utilization', integer: false },
  risk_score_income_ratio: { min: 0.0287, max: 0.123, label: 'Risk/Income Ratio', integer: false },
  high_value_txn_ind: { min: 0, max: 1, label: 'High Value Txn (0/1)', integer: true },
  frequent_logins: { min: 0, max: 1, label: 'Frequent Logins (0/1)', integer: true },
};

const AmlSimulationPanel = () => {
  const { actions } = useAppContext();

  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [hasOutput, setHasOutput] = useState(false);

  const [editEnabled, setEditEnabled] = useState(false);
  const [draftAccounts, setDraftAccounts] = useState([]);
  const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false);

  const loadAccounts = useCallback(async () => {
    setIsInitialLoading(true);
    setApiError(null);
    try {
      const data = await fetchAmlAccounts();
      setAccounts(data);
    } catch (err) {
      console.error('Failed to fetch AML accounts:', err);
      setApiError(err.message || 'Failed to load data from backend');
    } finally {
      setIsInitialLoading(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setAccounts([]);
    setHasOutput(false);
    setSelectedRowId(null);
    setSelectedRowIds([]);
    setEditEnabled(false);
    setDraftAccounts([]);
    setHasUnappliedChanges(false);
    setApiError(null);
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (editEnabled) {
      setDraftAccounts(accounts.map(acc => ({ ...acc })));
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
    await loadAccounts();
  };

  const handleRun = async () => {
    setIsLoading(true);
    try {
      const accountsToRun = selectedRowIds.length > 0
        ? accounts.filter(acc => selectedRowIds.includes(acc.__rowId))
        : accounts;

      const results = await predictAmlAccounts(accountsToRun);
      const resultMap = new Map(results.map((r) => [r.__rowId, r]));
      const merged = selectedRowIds.length > 0
        ? accounts.map((acc) => (resultMap.has(acc.__rowId) ? resultMap.get(acc.__rowId) : acc))
        : results;

      setAccounts(merged);
      setHasOutput(true);
      setSelectedRowId(selectedRowIds.length > 0 ? selectedRowIds[0] : null);
      setSelectedRowIds([]);
    } catch (err) {
      console.error('AML prediction API failed:', err);
      actions.showToast({ message: err.message || 'Failed to run prediction model', type: 'warning' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyChanges = () => {
    for (const acc of draftAccounts) {
      for (const [field, range] of Object.entries(FIELD_RANGES)) {
        const val = parseFloat(acc[field]);
        const isOutOfRange = isNaN(val) || val < range.min || val > range.max;
        const isTypeInvalid = range.integer && !Number.isInteger(val);
        if (isOutOfRange || isTypeInvalid) {
          actions.showToast({
            message: isTypeInvalid
              ? `"${range.label}" for Account ${acc.accountId} must be an integer.`
              : `"${range.label}" for Account ${acc.accountId} must be between ${range.min} and ${range.max}.`,
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

  const handleSelectAccount = (rowId) => {
    if (!hasOutput) {
      setSelectedRowIds((prev) =>
        prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
      );
      return;
    }
    setSelectedRowId(prev => (prev === rowId ? null : rowId));
  };

  const shapData = useMemo(() => {
    if (!hasOutput || selectedRowId == null) return null;
    const selectedAccount = accounts.find(acc => acc.__rowId === selectedRowId);
    if (!selectedAccount) return null;
    return buildAmlShapData(selectedAccount);
  }, [hasOutput, selectedRowId, accounts]);

  const selectedAccount = selectedRowId != null
    ? accounts.find(acc => acc.__rowId === selectedRowId)
    : null;

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
          : 'Select rows to run on specific accounts, or run on all accounts without selection.'}
        {!hasOutput && selectedRowIds.length > 0 && <strong> ({selectedRowIds.length} account(s) selected)</strong>}
        {hasOutput && selectedAccount && <strong> (Account {selectedAccount.accountId} selected)</strong>}
      </p>

      {isInitialLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p className="loading-text">Loading AML accounts from backend...</p>
        </div>
      ) : apiError ? (
        <div className="api-error-state" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '2rem', color: '#dc3545' }}></i>
          <p style={{ color: '#dc3545', marginTop: '10px', fontWeight: 600 }}>Failed to load data</p>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>{apiError}</p>
          <button className="action-btn run" onClick={loadAccounts} style={{ marginTop: '15px' }}>
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
          <AmlDataTable
            accounts={accounts}
            draftAccounts={draftAccounts}
            setDraftAccounts={setDraftAccounts}
            setHasUnappliedChanges={setHasUnappliedChanges}
            editEnabled={editEnabled}
            hasOutput={hasOutput}
            selectedRowId={selectedRowId}
            selectedRowIds={selectedRowIds}
            onSelectAccount={handleSelectAccount}
            fieldRanges={FIELD_RANGES}
          />
          <ShapAnalysis shapData={shapData} />
        </>
      )}
    </div>
  );
};

export default AmlSimulationPanel;
