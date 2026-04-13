import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

/**
 * Dropdown options for editable fields
 */
const YES_NO_OPTIONS = ['Yes', 'No'];
const PAYMENT_CHANNEL_OPTIONS = ['Online', 'IVR', 'Cash', 'Agent'];

/**
 * Format helpers
 */
const formatCurrency = (val) => {
  if (val == null) return '—';
  return `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPercent = (val) => {
  if (val == null) return '—';
  return `${(val * 100).toFixed(0)}%`;
};

/**
 * Color based on Category: High=green, Medium=yellow, Low=red
 */
const getCategoryColor = (category) => {
  if (category === 'High') return '#2e7d32';
  if (category === 'Medium') return '#b8860b';
  return '#c62828';
};

const getCategoryClass = (category) => {
  if (category === 'High') return 'high';
  if (category === 'Medium') return 'medium';
  return 'low';
};

/**
 * UtilityDataTable
 * Full-featured data table with INPUT and OUTPUT views, inline editing,
 * and horizontal inline expansion (click "+" to show input columns alongside output).
 */
const UtilityDataTable = ({
  accounts,
  draftAccounts,
  setDraftAccounts,
  setHasUnappliedChanges,
  editEnabled,
  hasOutput,
  selectedAcctId,
  selectedAcctIds = [],
  onSelectAccount,
  fieldRanges,
}) => {
  const { actions } = useAppContext();

  // Single toggle: when true, input columns are shown alongside output columns
  const [showInputCols, setShowInputCols] = useState(false);

  // Use draft accounts while editing, otherwise committed accounts
  const baseAccounts = editEnabled ? draftAccounts : accounts;
  const displayAccounts = hasOutput
    ? baseAccounts.filter(acc => acc.probabilityPercent != null)
    : baseAccounts;

  // ── Field change (local draft only, no blocking) ──
  const handleFieldChange = (acctId, field, value) => {
    setDraftAccounts(prev =>
      prev.map(acc =>
        acc.acctId === acctId ? { ...acc, [field]: value } : acc
      )
    );
    setHasUnappliedChanges(true);
  };

  // ── Validate on blur ──
  const handleFieldBlur = (acctId, field, value) => {
    const range = fieldRanges[field];
    if (!range) return;
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < range.min || numValue > range.max) {
      actions.showToast({
        message: `"${range.label}" must be between ${range.min} and ${range.max}. Please correct the value.`,
        type: 'warning'
      });
    }
  };

  // ── Render helpers for editable fields ──
  const renderDropdown = (account, field, options) => {
    if (editEnabled) {
      return (
        <select
          value={account[field]}
          onChange={(e) => handleFieldChange(account.acctId, field, e.target.value)}
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }
    return account[field];
  };

  const renderNumberInput = (account, field, step) => {
    const range = fieldRanges[field] || {};
    if (editEnabled) {
      return (
        <input
          type="number"
          value={account[field]}
          min={range.min}
          max={range.max}
          step={step || 1}
          onChange={(e) => {
            const raw = e.target.value;
            handleFieldChange(account.acctId, field, raw === '' ? '' : parseFloat(raw));
          }}
          onBlur={(e) => handleFieldBlur(account.acctId, field, e.target.value)}
        />
      );
    }
    return account[field];
  };

  // ── Render the full INPUT cells inline ──
  const renderInputCells = (account) => (
    <>
      <td>{renderDropdown(account, 'budgetBillingFlag', YES_NO_OPTIONS)}</td>
      <td>{renderDropdown(account, 'lowIncomeFlag', YES_NO_OPTIONS)}</td>
      <td>
        {editEnabled ? (
          <input
            type="number"
            value={account.pctOnTimePayments12m}
            min={0} max={1} step={0.01}
            style={{ width: '80px' }}
            onChange={(e) => handleFieldChange(account.acctId, 'pctOnTimePayments12m', e.target.value === '' ? '' : parseFloat(e.target.value))}
            onBlur={(e) => handleFieldBlur(account.acctId, 'pctOnTimePayments12m', e.target.value)}
          />
        ) : formatPercent(account.pctOnTimePayments12m)}
      </td>
      <td>{renderDropdown(account, 'paymentChannelPrimary', PAYMENT_CHANNEL_OPTIONS)}</td>
      <td>
        {editEnabled ? (
          <input
            type="number"
            value={account.arrearsBalance}
            min={0} max={100000} step={0.01}
            onChange={(e) => handleFieldChange(account.acctId, 'arrearsBalance', e.target.value === '' ? '' : parseFloat(e.target.value))}
            onBlur={(e) => handleFieldBlur(account.acctId, 'arrearsBalance', e.target.value)}
          />
        ) : formatCurrency(account.arrearsBalance)}
      </td>
      <td>{renderNumberInput(account, 'maxDpd12m')}</td>
      <td>{renderNumberInput(account, 'delinquencyCount12m')}</td>
      <td>
        {editEnabled ? (
          <input
            type="number"
            value={account.rpcSuccessRatio}
            min={0} max={1} step={0.01}
            style={{ width: '80px' }}
            onChange={(e) => handleFieldChange(account.acctId, 'rpcSuccessRatio', e.target.value === '' ? '' : parseFloat(e.target.value))}
            onBlur={(e) => handleFieldBlur(account.acctId, 'rpcSuccessRatio', e.target.value)}
          />
        ) : account.rpcSuccessRatio}
      </td>
      <td>{renderNumberInput(account, 'ptpKeptCount')}</td>
      <td>{renderNumberInput(account, 'ptpBrokenCount')}</td>
      <td>{renderDropdown(account, 'arrangementEnrolledFlag', YES_NO_OPTIONS)}</td>
      <td>{renderNumberInput(account, 'tuScore')}</td>
      <td>{renderNumberInput(account, 'complaintCount')}</td>
    </>
  );

  /* ===============================================================
     BEFORE RUN → Data Table 1 (INPUT Data) — original flat layout
     =============================================================== */
  if (!hasOutput) {
    return (
      <div>
        <div className="table-section-label">
          <i className="bi bi-table"></i> INPUT Data
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}><i className="bi bi-filter"></i> Select</th>
                <th style={{ width: '120px' }}>Account ID</th>
                <th style={{ width: '140px' }}>Budget Billing</th>
                <th style={{ width: '120px' }}>Low Income</th>
                <th style={{ width: '200px' }}>On-Time Payments (12m)</th>
                <th style={{ width: '170px' }}>Payment Channel</th>
                <th style={{ width: '170px' }}>Arrears Balance ($)</th>
                <th style={{ width: '140px' }}>Max DPD (12m)</th>
                <th style={{ width: '200px' }}>Delinquency Count (12m)</th>
                <th style={{ width: '170px' }}>RPC Success Ratio</th>
                <th style={{ width: '120px' }}>PTP Kept</th>
                <th style={{ width: '120px' }}>PTP Broken</th>
                <th style={{ width: '190px' }}>Arrangement Enrolled</th>
                <th style={{ width: '120px' }}>TU Score</th>
                <th style={{ width: '120px' }}>Complaints</th>
              </tr>
            </thead>
            <tbody>
              {displayAccounts.length === 0 ? (
                <tr>
                  <td colSpan={15} style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                    No accounts loaded.
                  </td>
                </tr>
              ) : (
                displayAccounts.map((account) => {
                  const isSelected = selectedAcctIds.includes(account.acctId);

                  return (
                    <tr
                      key={account.acctId}
                      className={`${isSelected ? 'selected' : ''}`}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectAccount(account.acctId)}
                        />
                      </td>
                      <td><strong>{account.acctId}</strong></td>
                      {renderInputCells(account)}
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

  /* ===============================================================
     AFTER RUN → Data Table 2 (OUTPUT Data)
     Clicking "+" expands the table horizontally to include input columns.
     =============================================================== */
  return (
    <div>
      <div className="table-section-label">
        <i className="bi bi-bar-chart-fill"></i> OUTPUT Data
        {showInputCols && (
          <span style={{ marginLeft: '12px', fontSize: '0.78rem', color: '#6366f1', fontWeight: 500 }}>
            <i className="bi bi-arrows-angle-expand" style={{ marginRight: '4px' }}></i>
            Scroll right to see input data →
          </span>
        )}
      </div>

      <div className="data-table-wrapper">
        <table className={`data-table output-table ${showInputCols ? 'output-table--expanded' : ''}`} style={showInputCols ? { minWidth: '2800px' } : undefined}>
          <thead>
            <tr>
              <th style={{ width: showInputCols ? '50px' : '10%' }}><i className="bi bi-filter"></i> Select</th>
              <th style={{ width: showInputCols ? '110px' : '18%' }}>Account ID</th>
              <th style={{ width: showInputCols ? '40px' : '7%' }} title="Toggle input columns"></th>
              <th style={{ width: showInputCols ? '200px' : '40%' }}>Predicted Payment Propensity %</th>
              <th style={{ width: showInputCols ? '100px' : '25%' }}>Category</th>
              {showInputCols && (
                <>
                  <th style={{ width: '130px' }}>Budget Billing</th>
                  <th style={{ width: '110px' }}>Low Income</th>
                  <th style={{ width: '180px' }}>On-Time Payments (12m)</th>
                  <th style={{ width: '150px' }}>Payment Channel</th>
                  <th style={{ width: '160px' }}>Arrears Balance ($)</th>
                  <th style={{ width: '130px' }}>Max DPD (12m)</th>
                  <th style={{ width: '190px' }}>Delinquency Count (12m)</th>
                  <th style={{ width: '160px' }}>RPC Success Ratio</th>
                  <th style={{ width: '110px' }}>PTP Kept</th>
                  <th style={{ width: '110px' }}>PTP Broken</th>
                  <th style={{ width: '170px' }}>Arrangement Enrolled</th>
                  <th style={{ width: '110px' }}>TU Score</th>
                  <th style={{ width: '110px' }}>Complaints</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {displayAccounts.map((account) => {
              const isSelected = selectedAcctId === account.acctId;
              const isFrozen = selectedAcctId != null && !isSelected;

              return (
                <tr
                  key={account.acctId}
                  className={`${isSelected ? 'selected' : ''} ${isFrozen ? 'frozen' : ''}`}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onSelectAccount(account.acctId)}
                      disabled={isFrozen}
                    />
                  </td>
                  <td><strong>{account.acctId}</strong></td>

                  {/* Expand/Collapse Toggle */}
                  <td>
                    <div
                      className={`expand-toggle ${showInputCols ? 'expanded' : ''}`}
                      onClick={() => setShowInputCols(prev => !prev)}
                      title={showInputCols ? 'Hide input columns' : 'Show input columns'}
                    >
                      {showInputCols ? '−' : '+'}
                    </div>
                  </td>

                  {/* Output values — Probability % and Category */}
                  {account.probabilityPercent != null ? (
                    <>
                      <td>
                        <span style={{ color: getCategoryColor(account.category) }}>
                          {account.probabilityPercent.toFixed(2)}%
                        </span>
                      </td>
                      <td>
                        <span className={`category-badge ${getCategoryClass(account.category)}`}>
                          {account.category}
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td></td><td></td>
                    </>
                  )}

                  {/* Input columns — shown inline when expanded */}
                  {showInputCols && renderInputCells(account)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UtilityDataTable;
