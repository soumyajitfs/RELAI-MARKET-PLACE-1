import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

const AML_COLUMNS = [
  { key: 'kycRiskScore', label: 'KYC Risk Score', step: 1 },
  { key: 'income', label: 'Income', step: 1 },
  { key: 'tenureMonths', label: 'Tenure (Months)', step: 1 },
  { key: 'creditScore', label: 'Credit Score', step: 1 },
  { key: 'nbrPurchases90d', label: 'Purchases (90d)', step: 1 },
  { key: 'avgTxnSize90d', label: 'Avg Txn Size (90d)', step: 0.01 },
  { key: 'totalSpend90d', label: 'Total Spend (90d)', step: 0.01 },
  { key: 'nbrDistinctMerch90d', label: 'Distinct Merchants (90d)', step: 1 },
  { key: 'nbrMerchCredits90d', label: 'Merchant Credits (90d)', step: 1 },
  { key: 'nbrMerchCreditsRndDollarAmt90d', label: 'Rnd Dollar Credits (90d)', step: 1 },
  { key: 'totalMerchCred90d', label: 'Total Merchant Credits (90d)', step: 0.01 },
  { key: 'nbrMerchCreditsWoOffsettingPurch', label: 'Credits w/o Offset Purch', step: 1 },
  { key: 'nbrPayments90d', label: 'Payments (90d)', step: 1 },
  { key: 'totalPaymentAmt90d', label: 'Total Payment Amt (90d)', step: 0.01 },
  { key: 'overpaymentAmt90d', label: 'Overpayment Amt (90d)', step: 0.01 },
  { key: 'indCustReqRefund90d', label: 'Cust Refund Req (0/1)', step: 1 },
  { key: 'totalRefundsToCust90d', label: 'Total Refunds (90d)', step: 0.01 },
  { key: 'nbrPaymentsCashLike90d', label: 'Cash-like Payments (90d)', step: 1 },
  { key: 'maxRevolveLine', label: 'Max Revolve Line', step: 1 },
  { key: 'indOwnsHome', label: 'Owns Home (0/1)', step: 1 },
  { key: 'nbrInquiries1y', label: 'Inquiries (1y)', step: 1 },
  { key: 'nbrCollections3y', label: 'Collections (3y)', step: 1 },
  { key: 'nbrPointRed90d', label: 'Point Redemptions (90d)', step: 1 },
  { key: 'PEP', label: 'PEP (0/1)', step: 1 },
  { key: 'txn_per_month', label: 'Transactions / Month', step: 0.001 },
  { key: 'credit_utilization', label: 'Credit Utilization', step: 0.001 },
  { key: 'risk_score_income_ratio', label: 'Risk/Income Ratio', step: 0.0001 },
  { key: 'high_value_txn_ind', label: 'High Value Txn (0/1)', step: 1 },
  { key: 'frequent_logins', label: 'Frequent Logins (0/1)', step: 1 },
];

const getColumnWidth = (key) => (key === 'income' ? '210px' : '160px');

const getCategoryClass = (category) => {
  if (category === 'High') return 'high';
  if (category === 'Medium') return 'medium';
  return 'low';
};

const getCategoryColor = (category) => {
  if (category === 'High') return '#2e7d32';
  if (category === 'Medium') return '#b8860b';
  return '#c62828';
};

const AmlDataTable = ({
  accounts,
  draftAccounts,
  setDraftAccounts,
  setHasUnappliedChanges,
  editEnabled,
  hasOutput,
  selectedRowId,
  selectedRowIds = [],
  onSelectAccount,
  fieldRanges,
}) => {
  const { actions } = useAppContext();
  const [showInputCols, setShowInputCols] = useState(false);

  const baseAccounts = editEnabled ? draftAccounts : accounts;
  const displayAccounts = hasOutput
    ? baseAccounts.filter(acc => acc.probabilityPercent != null)
    : baseAccounts;

  const handleFieldChange = (acctId, field, value) => {
    setDraftAccounts(prev =>
      prev.map(acc => (acc.__rowId === acctId ? { ...acc, [field]: value } : acc))
    );
    setHasUnappliedChanges(true);
  };

  const handleFieldBlur = (acctId, field, value) => {
    const range = fieldRanges[field];
    if (!range) return;
    const numValue = parseFloat(value);
    const isOutOfRange = isNaN(numValue) || numValue < range.min || numValue > range.max;
    const isTypeInvalid = range.integer && !Number.isInteger(numValue);
    if (isOutOfRange || isTypeInvalid) {
      actions.showToast({
        message: isTypeInvalid
          ? `"${range.label}" for Account ${acctId} must be an integer.`
          : `"${range.label}" for Account ${acctId} must be between ${range.min} and ${range.max}.`,
        type: 'warning',
      });
    }
  };

  const renderCell = (account, col) => {
    if (editEnabled) {
      const range = fieldRanges[col.key] || {};
      return (
        <input
          type="number"
          value={account[col.key] ?? ''}
          min={range.min}
          max={range.max}
          step={col.step || 1}
          onChange={(e) => {
            const raw = e.target.value;
            handleFieldChange(account.__rowId, col.key, raw === '' ? '' : parseFloat(raw));
          }}
          onBlur={(e) => handleFieldBlur(account.accountId, col.key, e.target.value)}
          style={col.key === 'income' ? { width: '100%', minWidth: '130px' } : undefined}
        />
      );
    }
    return account[col.key] ?? '—';
  };

  const renderInputCells = (account) => (
    <>
      {AML_COLUMNS.map(col => <td key={`${account.__rowId}-${col.key}`}>{renderCell(account, col)}</td>)}
    </>
  );

  if (!hasOutput) {
    return (
      <div>
        <div className="table-section-label">
          <i className="bi bi-table"></i> INPUT Data
        </div>

        <div className="data-table-wrapper">
          <table className="data-table" style={{ minWidth: '4300px' }}>
            <thead>
              <tr>
                <th style={{ width: '50px' }}><i className="bi bi-filter"></i> Select</th>
                <th style={{ width: '130px' }}>Account ID</th>
                {AML_COLUMNS.map(col => (
                  <th key={col.key} style={{ width: getColumnWidth(col.key) }}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayAccounts.length === 0 ? (
                <tr>
                  <td colSpan={AML_COLUMNS.length + 2} style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                    No accounts loaded.
                  </td>
                </tr>
              ) : (
                displayAccounts.map((account) => {
                  const isSelected = selectedRowIds.includes(account.__rowId);

                  return (
                    <tr
                      key={account.__rowId}
                      className={`${isSelected ? 'selected' : ''}`}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectAccount(account.__rowId)}
                        />
                      </td>
                      <td><strong>{account.accountId}</strong></td>
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
        <table
          className={`data-table output-table ${showInputCols ? 'output-table--expanded' : ''}`}
          style={showInputCols ? { minWidth: '4700px' } : undefined}
        >
          <thead>
            <tr>
              <th style={{ width: showInputCols ? '50px' : '10%' }}><i className="bi bi-filter"></i> Select</th>
              <th style={{ width: showInputCols ? '130px' : '20%' }}>Account ID</th>
              <th style={{ width: showInputCols ? '40px' : '8%' }} title="Toggle input columns"></th>
              <th style={{ width: showInputCols ? '220px' : '40%' }}>Risk Probability %</th>
              <th style={{ width: showInputCols ? '120px' : '22%' }}>Category</th>
              {showInputCols && AML_COLUMNS.map(col => (
                <th key={`out-${col.key}`} style={{ width: getColumnWidth(col.key) }}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayAccounts.map((account) => {
              const isSelected = selectedRowId === account.__rowId;
              const isFrozen = selectedRowId != null && !isSelected;

              return (
                <tr
                  key={`out-${account.__rowId}`}
                  className={`${isSelected ? 'selected' : ''} ${isFrozen ? 'frozen' : ''}`}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onSelectAccount(account.__rowId)}
                      disabled={isFrozen}
                    />
                  </td>
                  <td><strong>{account.accountId}</strong></td>
                  <td>
                    <div
                      className={`expand-toggle ${showInputCols ? 'expanded' : ''}`}
                      onClick={() => setShowInputCols(prev => !prev)}
                      title={showInputCols ? 'Hide input columns' : 'Show input columns'}
                    >
                      {showInputCols ? '−' : '+'}
                    </div>
                  </td>
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

export default AmlDataTable;
