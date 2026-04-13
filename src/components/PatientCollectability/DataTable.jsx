import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { 
  MARITAL_MAP, 
  SERVICE_TYPE_MAP,
  ZIP_OPTIONS,
  FC_OPTIONS,
  PT_REP_OPTIONS,
  SERVICE_AREA_OPTIONS,
  SERVICE_DESCR_OPTIONS
} from '../../data/sampleData';

const DataTable = ({ draftAccounts, setDraftAccounts, setHasUnappliedChanges }) => {
  const { state, actions } = useAppContext();
  const { accounts, selectedFacs, hasOutput, editEnabled } = state.patientData;

  // Single toggle: when true, input columns are shown alongside output columns
  const [showInputCols, setShowInputCols] = useState(false);

  // Use draft accounts while editing, otherwise use the committed accounts
  // When output exists, only show accounts that have been scored
  const baseAccounts = editEnabled ? draftAccounts : accounts;
  const displayAccounts = hasOutput
    ? baseAccounts.filter(acc => acc.predictedPropensity != null)
    : baseAccounts;

  const handleCheckboxChange = (facsNumber) => {
    if (!hasOutput) {
      // INPUT table: allow true multi-select.
      const nextSelection = selectedFacs.includes(facsNumber)
        ? selectedFacs.filter(id => id !== facsNumber)
        : [...selectedFacs, facsNumber];
      actions.setSelectedFacs(nextSelection);
      return;
    }

    // OUTPUT table: keep existing single-select behavior.
    actions.toggleFacsSelection(facsNumber);
  };

  // Min/Max validation ranges for numeric fields
  const FIELD_RANGES = {
    initBal:      { min: 10,  max: 10000, label: 'Initial Balance' },
    tuScore:      { min: 300, max: 850,   label: 'TU Score' },
    bnkcrdAvlble: { min: 0,   max: 1,     label: 'Bankcard Available' },
    age:          { min: 1,   max: 100,   label: 'Patient Age' },
    ageOfAccount: { min: 1,   max: 300,   label: 'Age of Account' },
  };

  // Update only local draft state — changes are NOT saved yet (no blocking on keystroke)
  const handleFieldChange = (facsNumber, field, value) => {
    setDraftAccounts(prev =>
      prev.map(acc =>
        acc.facsNumber === facsNumber ? { ...acc, [field]: value } : acc
      )
    );
    setHasUnappliedChanges(true);
  };

  // Validate on blur — if value is outside range, show warning (value is NOT auto-corrected)
  const handleFieldBlur = (facsNumber, field, value) => {
    const range = FIELD_RANGES[field];
    if (!range) return;
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < range.min || numValue > range.max) {
      actions.showToast({
        message: `"${range.label}" must be between ${range.min} and ${range.max}. Please correct the value.`,
        type: 'warning'
      });
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getCategoryClass = (category) => {
    if (category === 'High') return 'high';
    if (category === 'Medium') return 'medium';
    return 'low';
  };

  // Color based on Category: High=green, Medium=yellow, Low=red
  const getCategoryColor = (category) => {
    if (category === 'High') return '#2e7d32';
    if (category === 'Medium') return '#b8860b';
    return '#c62828';
  };

  // Render input cells inline (used both in INPUT table and inline-expanded OUTPUT table)
  const renderInputCells = (account) => (
    <>
      {/* ZIP Code */}
      <td>
        {editEnabled ? (
          <select value={account.zip5} onChange={(e) => handleFieldChange(account.facsNumber, 'zip5', e.target.value)}>
            {ZIP_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : account.zip5}
      </td>
      {/* Financial Class */}
      <td>
        {editEnabled ? (
          <select value={account.fc} onChange={(e) => handleFieldChange(account.facsNumber, 'fc', e.target.value)}>
            {FC_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : account.fc}
      </td>
      {/* Initial Balance */}
      <td>
        {editEnabled ? (
          <input type="number" value={account.initBal} min={10} max={10000}
            onChange={(e) => handleFieldChange(account.facsNumber, 'initBal', e.target.value === '' ? '' : parseFloat(e.target.value))}
            onBlur={(e) => handleFieldBlur(account.facsNumber, 'initBal', e.target.value)} />
        ) : formatCurrency(account.initBal)}
      </td>
      {/* Marital Status */}
      <td>
        {editEnabled ? (
          <select value={account.ptMs} onChange={(e) => handleFieldChange(account.facsNumber, 'ptMs', e.target.value)}>
            {Object.entries(MARITAL_MAP).map(([key, val]) => <option key={key} value={key}>{val}</option>)}
          </select>
        ) : (MARITAL_MAP[account.ptMs] || account.ptMs)}
      </td>
      {/* TU Score */}
      <td>
        {editEnabled ? (
          <input type="number" value={account.tuScore} min={300} max={850}
            onChange={(e) => handleFieldChange(account.facsNumber, 'tuScore', e.target.value === '' ? '' : parseInt(e.target.value))}
            onBlur={(e) => handleFieldBlur(account.facsNumber, 'tuScore', e.target.value)} />
        ) : account.tuScore}
      </td>
      {/* Bankcard Available */}
      <td>
        {editEnabled ? (
          <select value={account.bnkcrdAvlble} onChange={(e) => handleFieldChange(account.facsNumber, 'bnkcrdAvlble', parseInt(e.target.value))}>
            <option value={1}>Yes</option>
            <option value={0}>No</option>
          </select>
        ) : (account.bnkcrdAvlble === 1 ? 'Yes' : 'No')}
      </td>
      {/* Service Type */}
      <td>
        {editEnabled ? (
          <select value={account.serviceType} onChange={(e) => handleFieldChange(account.facsNumber, 'serviceType', e.target.value)}>
            {Object.entries(SERVICE_TYPE_MAP).map(([key, val]) => <option key={key} value={key}>{val}</option>)}
          </select>
        ) : (SERVICE_TYPE_MAP[account.serviceType] || account.serviceType)}
      </td>
      {/* Billing Status */}
      <td>
        {editEnabled ? (
          <select value={account.ptRepCode} onChange={(e) => handleFieldChange(account.facsNumber, 'ptRepCode', e.target.value)}>
            {PT_REP_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : <span style={{ color: '#666' }}>{account.ptRepCode}</span>}
      </td>
      {/* Service Area */}
      <td>
        {editEnabled ? (
          <select value={account.serviceArea} onChange={(e) => handleFieldChange(account.facsNumber, 'serviceArea', e.target.value)}>
            {SERVICE_AREA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : account.serviceArea}
      </td>
      {/* Diagnosis Category */}
      <td>
        {editEnabled ? (
          <select value={account.serviceDescr} onChange={(e) => handleFieldChange(account.facsNumber, 'serviceDescr', e.target.value)}>
            {SERVICE_DESCR_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : account.serviceDescr}
      </td>
      {/* Patient Age */}
      <td>
        {editEnabled ? (
          <input type="number" value={account.age} min={1} max={100}
            onChange={(e) => handleFieldChange(account.facsNumber, 'age', e.target.value === '' ? '' : parseInt(e.target.value))}
            onBlur={(e) => handleFieldBlur(account.facsNumber, 'age', e.target.value)} />
        ) : account.age}
      </td>
      {/* Account Age (Days) */}
      <td>
        {editEnabled ? (
          <input type="number" value={account.ageOfAccount} min={1} max={300}
            onChange={(e) => handleFieldChange(account.facsNumber, 'ageOfAccount', e.target.value === '' ? '' : parseInt(e.target.value))}
            onBlur={(e) => handleFieldBlur(account.facsNumber, 'ageOfAccount', e.target.value)} />
        ) : account.ageOfAccount}
      </td>
    </>
  );

  /* ===============================================================
     BEFORE RUN → Data Table 1 (INPUT Data) — original flat layout
     =============================================================== */
  if (!hasOutput) {
    return (
      <div>
        {/* Section Label */}
        <div className="table-section-label">
          <i className="bi bi-table"></i> INPUT Data
        </div>

        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>
                  <i className="bi bi-filter"></i> Select
                </th>
                <th style={{ width: '150px' }}>FACS Number</th>
                <th style={{ width: '120px' }}>ZIP Code</th>
                <th style={{ width: '170px' }}>Financial Class</th>
                <th style={{ width: '160px' }}>Initial Balance ($)</th>
                <th style={{ width: '140px' }}>Marital Status</th>
                <th style={{ width: '120px' }}>TU Score</th>
                <th style={{ width: '170px' }}>Bankcard Available</th>
                <th style={{ width: '140px' }}>Service Type</th>
                <th style={{ width: '220px' }}>Billing Status</th>
                <th style={{ width: '260px' }}>Service Area</th>
                <th style={{ width: '280px' }}>Diagnosis Category</th>
                <th style={{ width: '130px' }}>Patient Age</th>
                <th style={{ width: '170px' }}>Account Age (Days)</th>
          </tr>
        </thead>
        <tbody>
          {displayAccounts.map((account) => (
            <tr 
              key={account.facsNumber}
                  className={`${selectedFacs.includes(account.facsNumber) ? 'selected' : ''}`}
            >
              <td>
                <input
                  type="checkbox"
                  checked={selectedFacs.includes(account.facsNumber)}
                  onChange={() => handleCheckboxChange(account.facsNumber)}
                />
              </td>
                  <td><strong>{account.facsNumber}</strong></td>
              {renderInputCells(account)}
            </tr>
          ))}
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
      {/* Section Label */}
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
        <table className={`data-table output-table ${showInputCols ? 'output-table--expanded' : ''}`} style={showInputCols ? { minWidth: '3200px' } : undefined}>
          <thead>
            <tr>
              <th style={{ width: showInputCols ? '50px' : '7%' }}><i className="bi bi-filter"></i> Select</th>
              <th style={{ width: showInputCols ? '130px' : '14%' }}>FACS Number</th>
              <th style={{ width: showInputCols ? '40px' : '5%' }} title="Toggle input columns"></th>
              <th style={{ width: showInputCols ? '200px' : '28%' }}>Predicted Payment Propensity %</th>
              <th style={{ width: showInputCols ? '100px' : '14%' }}>Category</th>
              <th style={{ width: showInputCols ? '90px' : '12%' }}>Priority</th>
              <th style={{ width: showInputCols ? '140px' : '20%' }}>Amount Predicted</th>
              {showInputCols && (
                <>
                  <th style={{ width: '120px' }}>ZIP Code</th>
                  <th style={{ width: '160px' }}>Financial Class</th>
                  <th style={{ width: '150px' }}>Initial Balance ($)</th>
                  <th style={{ width: '140px' }}>Marital Status</th>
                  <th style={{ width: '110px' }}>TU Score</th>
                  <th style={{ width: '160px' }}>Bankcard Available</th>
                  <th style={{ width: '140px' }}>Service Type</th>
                  <th style={{ width: '200px' }}>Billing Status</th>
                  <th style={{ width: '240px' }}>Service Area</th>
                  <th style={{ width: '260px' }}>Diagnosis Category</th>
                  <th style={{ width: '120px' }}>Patient Age</th>
                  <th style={{ width: '160px' }}>Account Age (Days)</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {displayAccounts.map((account) => {
              const isSelected = selectedFacs.includes(account.facsNumber);
              const isFrozen = selectedFacs.length > 0 && !isSelected;

              return (
                <tr
                  key={account.facsNumber}
                  className={`${isSelected ? 'selected' : ''} ${isFrozen ? 'frozen' : ''}`}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleCheckboxChange(account.facsNumber)}
                      disabled={isFrozen}
                    />
                  </td>
                  <td><strong>{account.facsNumber}</strong></td>

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

                  {/* Output values */}
                  {account.predictedPropensity != null ? (
                    <>
                      <td>
                        <span style={{ color: getCategoryColor(account.category) }}>
                          {account.predictedPropensity.toFixed(2)}%
                        </span>
                      </td>
                      <td>
                        <span className={`category-badge ${getCategoryClass(account.category)}`}>
                          {account.category}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: getCategoryColor(account.category) }}>
                          {account.priority}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: getCategoryColor(account.category) }}>
                          {formatCurrency(account.amountPredicted)}
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td></td><td></td><td></td><td></td>
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

export default DataTable;
