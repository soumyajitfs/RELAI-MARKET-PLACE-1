import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';

const CHURN_COLUMNS = [
  { key: 'subscription_type', label: 'Subscription Type', type: 'select', options: ['Digital', 'Digital+Print', 'Espresso'] },
  { key: 'plan_type', label: 'Plan Type', type: 'select', options: ['Monthly', 'Annual'] },
  { key: 'primary_device', label: 'Primary Device', type: 'select', options: ['Mobile', 'Desktop', 'Tablet'] },
  { key: 'region', label: 'Region', type: 'select', options: ['North America', 'Europe', 'Asia', 'Others'] },
  { key: 'most_read_category', label: 'Most Read Category', type: 'select', options: ['Culture', 'Environment', 'Finance', 'Politics', 'Technology'] },
  { key: 'last_campaign_engaged', label: 'Last Campaign Engaged', type: 'select', options: ['Newsletter Promo', 'Retention Offer', 'Survey'] },
  { key: 'payment_method', label: 'Payment Method', type: 'select', options: ['Credit Card', 'Debit Card', 'PayPal'] },
  { key: 'signup_source', label: 'Signup Source', type: 'select', options: ['Web', 'Mobile App', 'Referral'] },
  { key: 'customer_age', label: 'Customer Age', type: 'number', step: 1 },
  { key: 'avg_articles_per_week', label: 'Avg Articles/Week', type: 'number', step: 0.1 },
  { key: 'article_skips_per_week', label: 'Article Skips/Week', type: 'number', step: 1 },
  { key: 'days_since_last_login', label: 'Days Since Last Login', type: 'number', step: 1 },
  { key: 'support_tickets_last_90d', label: 'Support Tickets (90d)', type: 'number', step: 1 },
  { key: 'email_open_rate', label: 'Email Open Rate', type: 'number', step: 0.01 },
  { key: 'time_spent_per_session_mins', label: 'Time/Session (mins)', type: 'number', step: 0.1 },
  { key: 'tenure_days', label: 'Tenure (Days)', type: 'number', step: 1 },
  { key: 'completion_rate', label: 'Completion Rate', type: 'number', step: 0.01 },
  { key: 'campaign_ctr', label: 'Campaign CTR', type: 'number', step: 0.01 },
  { key: 'nps_score', label: 'NPS Score', type: 'number', step: 1 },
  { key: 'sentiment_score', label: 'Sentiment Score', type: 'number', step: 0.1 },
  { key: 'csat_score', label: 'CSAT Score', type: 'number', step: 1 },
  { key: 'discount_used_last_renewal', label: 'Discount Used Last Renewal', type: 'select', options: ['Yes', 'No'] },
  { key: 'auto_renew', label: 'Auto Renew', type: 'select', options: ['Yes', 'No'] },
  { key: 'previous_renewal_status', label: 'Previous Renewal Status', type: 'select', options: ['Auto', 'Manual'] },
  { key: 'downgrade_history', label: 'Downgrade History', type: 'select', options: ['Yes', 'No'] },
];

const getRiskClass = (risk) => {
  if (risk === 'High') return 'high';
  if (risk === 'Medium') return 'medium';
  return 'low';
};

const getRiskColor = (risk) => {
  if (risk === 'High') return '#c62828';
  if (risk === 'Medium') return '#b8860b';
  return '#2e7d32';
};

const ChurnDataTable = ({
  customers,
  draftCustomers,
  setDraftCustomers,
  setHasUnappliedChanges,
  editEnabled,
  hasOutput,
  selectedRowId,
  selectedRowIds = [],
  onSelectCustomer,
  fieldRanges,
}) => {
  const { actions } = useAppContext();
  const [showInputCols, setShowInputCols] = useState(false);

  const baseRows = editEnabled ? draftCustomers : customers;
  const displayRows = hasOutput ? baseRows.filter(r => r.probabilityPercent != null) : baseRows;

  const handleFieldChange = (rowId, field, value) => {
    setDraftCustomers(prev => prev.map(r => (r.__rowId === rowId ? { ...r, [field]: value } : r)));
    setHasUnappliedChanges(true);
  };

  const handleFieldBlur = (userId, field, value) => {
    const range = fieldRanges[field];
    if (!range) return;
    const n = parseFloat(value);
    const invalidRange = isNaN(n) || n < range.min || n > range.max;
    const invalidInt = range.integer && !Number.isInteger(n);
    if (invalidRange || invalidInt) {
      actions.showToast({
        message: invalidInt
          ? `"${range.label}" for User ${userId} must be an integer.`
          : `"${range.label}" for User ${userId} must be between ${range.min} and ${range.max}.`,
        type: 'warning',
      });
    }
  };

  const renderCell = (row, col) => {
    if (!editEnabled) return row[col.key] ?? '—';

    if (col.type === 'select') {
      return (
        <select
          value={row[col.key] ?? ''}
          onChange={(e) => handleFieldChange(row.__rowId, col.key, e.target.value)}
        >
          {col.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }

    if (col.type === 'number') {
      const range = fieldRanges[col.key] || {};
      return (
        <input
          type="number"
          value={row[col.key] ?? ''}
          min={range.min}
          max={range.max}
          step={col.step || 1}
          onChange={(e) => {
            const raw = e.target.value;
            handleFieldChange(row.__rowId, col.key, raw === '' ? '' : parseFloat(raw));
          }}
          onBlur={(e) => handleFieldBlur(row.user_id, col.key, e.target.value)}
        />
      );
    }

    return (
      <input
        type="text"
        value={row[col.key] ?? ''}
        onChange={(e) => handleFieldChange(row.__rowId, col.key, e.target.value)}
      />
    );
  };

  const renderInputCells = (row) => (
    <>
      {CHURN_COLUMNS.map(col => <td key={`${row.__rowId}-${col.key}`}>{renderCell(row, col)}</td>)}
    </>
  );

  if (!hasOutput) {
    return (
      <div>
        <div className="table-section-label">
          <i className="bi bi-table"></i> INPUT Data
        </div>

        <div className="data-table-wrapper">
          <table className="data-table" style={{ minWidth: '4700px' }}>
            <thead>
              <tr>
                <th style={{ width: '50px' }}><i className="bi bi-filter"></i> Select</th>
                <th style={{ width: '120px' }}>User ID</th>
                {CHURN_COLUMNS.map(col => (
                  <th key={col.key} style={{ width: '180px' }}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={CHURN_COLUMNS.length + 2} style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                    No customers loaded.
                  </td>
                </tr>
              ) : (
                displayRows.map((row) => {
                  const isSelected = selectedRowIds.includes(row.__rowId);
                  return (
                    <tr key={row.__rowId} className={`${isSelected ? 'selected' : ''}`}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectCustomer(row.__rowId)}
                        />
                      </td>
                      <td><strong>{row.user_id}</strong></td>
                      {renderInputCells(row)}
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
          style={showInputCols ? { minWidth: '5300px' } : undefined}
        >
          <thead>
            <tr>
              <th style={{ width: showInputCols ? '50px' : '10%' }}><i className="bi bi-filter"></i> Select</th>
              <th style={{ width: showInputCols ? '120px' : '18%' }}>User ID</th>
              <th style={{ width: showInputCols ? '40px' : '8%' }} title="Toggle input columns"></th>
              <th style={{ width: showInputCols ? '160px' : '24%' }}>Prediction</th>
              <th style={{ width: showInputCols ? '180px' : '30%' }}>Probability %</th>
              <th style={{ width: showInputCols ? '140px' : '20%' }}>Churn Risk</th>
              {showInputCols && CHURN_COLUMNS.map(col => (
                <th key={`out-${col.key}`} style={{ width: '180px' }}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => {
              const isSelected = selectedRowId === row.__rowId;
              const isFrozen = selectedRowId != null && !isSelected;

              return (
                <tr key={`out-${row.__rowId}`} className={`${isSelected ? 'selected' : ''} ${isFrozen ? 'frozen' : ''}`}>
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onSelectCustomer(row.__rowId)}
                      disabled={isFrozen}
                    />
                  </td>
                  <td><strong>{row.user_id}</strong></td>
                  <td>
                    <div
                      className={`expand-toggle ${showInputCols ? 'expanded' : ''}`}
                      onClick={() => setShowInputCols(prev => !prev)}
                      title={showInputCols ? 'Hide input columns' : 'Show input columns'}
                    >
                      {showInputCols ? '−' : '+'}
                    </div>
                  </td>

                  {row.probabilityPercent != null ? (
                    <>
                      <td>{row.prediction || '—'}</td>
                      <td>
                        <span style={{ color: getRiskColor(row.churn_risk) }}>
                          {row.probabilityPercent.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <span className={`category-badge ${getRiskClass(row.churn_risk)}`}>
                          {row.churn_risk}
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td></td><td></td><td></td>
                    </>
                  )}

                  {showInputCols && renderInputCells(row)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ChurnDataTable;
