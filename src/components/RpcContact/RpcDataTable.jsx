import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { formatDate } from '../../utils/rpcApi';

/**
 * Dropdown option lists — sourced from the Amex Prediction API Accepted Values doc.
 */
const YES_NO = ['Yes', 'No'];
const PARTY_GROUPING = ['1st Party', '3rd Party'];
const CHANNEL = ['Digital', 'Non Digital'];
const STATUS_CODE = ['ACT', 'NSF', 'BKP'];
const AMEX_TENURE = ['HIGH', 'MED', 'LOW'];
const ACCOUNT_TYPE = ['LENDING', 'LOC', 'CHARGE', 'CI', 'SM'];
const AMEX_PRODUCT_TYPE = ['OP', 'GL', 'SR', 'PL', 'SB', 'PR', 'CI', 'SM', 'EX'];
const CLIENT_ID_OPTIONS = [
  'AMXA72J24S', 'AMXA743FS', 'AMXA73CFS', 'AMXA72J16S', 'AMXA741FS',
  'AMXA73J37S', 'AMX71J1KS', 'AMXA46S', 'AMXA43S', 'AMXA4OS',
];
const LEVEL_OPTIONS = [
  'IC 4.0', 'IC 3.5', 'IC 2.5', 'IC 1.5', 'PRIMARY-H',
];
const PHONE_IN_SERVICE = [
  'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7',
  'I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'U',
];
const CONTACTABILITY_SCORE = ['A', 'B', 'C', 'E', 'F', 'G', 'I', 'J', 'K'];
const RESULT_CODE_FLAG = ['Name and Phone positively linked', 'Name and Phone negatively linked'];
const CM_CITY = [
  'BROOKLYN', 'MIAMI', 'HOUSTON', 'LOS ANGELES', 'NEW YORK',
  'BRONX', 'LAS VEGAS', 'ATLANTA', 'CHICAGO', 'ORLANDO',
];

/**
 * Priority color helper.
 * Account_Priority: SH (Super High) → green, M → yellow, L → red
 */
const getPriorityColor = (priority) => {
  if (priority === 'SH' || priority === 'H') return '#2e7d32';
  if (priority === 'M') return '#b8860b';
  return '#c62828';
};

const getPriorityClass = (priority) => {
  if (priority === 'SH' || priority === 'H') return 'high';
  if (priority === 'M') return 'medium';
  return 'low';
};

const getPriorityLabel = (priority) => {
  if (priority === 'SH') return 'Super High';
  if (priority === 'H') return 'High';
  if (priority === 'M') return 'Medium';
  if (priority === 'L') return 'Low';
  return priority;
};

/**
 * RpcDataTable
 * Full-featured data table for RPC use case with INPUT and OUTPUT views,
 * inline editing, single-row selection, and horizontal inline expansion.
 */
const RpcDataTable = ({
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

  const baseAccounts = editEnabled ? draftAccounts : accounts;
  const displayAccounts = hasOutput
    ? baseAccounts.filter(acc => acc.modelScorePercent != null)
    : baseAccounts;

  // ── Field change (draft only, no blocking) ──
  const handleFieldChange = (acctId, field, value) => {
    setDraftAccounts(prev =>
      prev.map(acc =>
        acc.AcctID === acctId ? { ...acc, [field]: value } : acc
      )
    );
    setHasUnappliedChanges(true);
  };

  // ── Validate on blur — shows "Outside the Range" pop-up ──
  const handleFieldBlur = (acctId, field, value) => {
    const range = fieldRanges[field];
    if (!range) return;
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < range.min || numValue > range.max) {
      actions.showToast({
        message: `"${range.label}" for Account ${acctId} is outside the range. Accepted: ${range.min} – ${range.max}.`,
        type: 'warning',
      });
    }
  };

  // ── Render helpers ──
  const renderDropdown = (account, field, options) => {
    if (editEnabled) {
      return (
        <select
          value={account[field] || ''}
          onChange={(e) => handleFieldChange(account.AcctID, field, e.target.value)}
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }
    return account[field] ?? '—';
  };

  const renderNumberInput = (account, field, step) => {
    const range = fieldRanges[field] || {};
    if (editEnabled) {
      return (
        <input
          type="number"
          value={account[field] ?? ''}
          min={range.min}
          max={range.max}
          step={step || 1}
          style={{ width: '90px' }}
          onChange={(e) => {
            const raw = e.target.value;
            handleFieldChange(account.AcctID, field, raw === '' ? '' : parseFloat(raw));
          }}
          onBlur={(e) => handleFieldBlur(account.AcctID, field, e.target.value)}
        />
      );
    }
    return account[field] ?? '—';
  };

  // ── Render all INPUT columns for a given row ──
  const renderInputCells = (account) => (
    <>
      <td>{formatDate(account.PlaceDate)}</td>
      <td>{formatDate(account.LastPayPreCharge_sql04)}</td>
      <td>{formatDate(account.LastOutboundCallDate)}</td>
      <td>{formatDate(account.LastEmailSentDate)}</td>
      <td>{formatDate(account.LastWebActivityDate)}</td>
      <td>{renderNumberInput(account, 'PlaceAmt', 0.01)}</td>
      <td>{renderNumberInput(account, 'Decile')}</td>
      <td>{renderNumberInput(account, 'FICOScore_sql04')}</td>
      <td>{renderDropdown(account, 'HasValidNumber', YES_NO)}</td>
      <td>{renderDropdown(account, 'RPC_Flag', YES_NO)}</td>
      <td>{renderDropdown(account, 'Connect_Flag', YES_NO)}</td>
      <td>{renderDropdown(account, 'PageFlag', YES_NO)}</td>
      <td>{renderDropdown(account, 'PageWebFlag', YES_NO)}</td>
      <td>{renderDropdown(account, 'PartyGrouping_mapped', PARTY_GROUPING)}</td>
      <td>{renderNumberInput(account, 'BestDayToCall')}</td>
      <td>{renderDropdown(account, 'ResultCodeFlag', RESULT_CODE_FLAG)}</td>
      <td>{renderDropdown(account, 'PhoneInService_mapped', PHONE_IN_SERVICE)}</td>
      <td>{renderDropdown(account, 'Phone1ContactabilityScore_mapped', CONTACTABILITY_SCORE)}</td>
      <td>{renderNumberInput(account, 'CallWindow_avg', 0.1)}</td>
      <td>{renderNumberInput(account, 'SecondBestCallWindow_avg', 0.1)}</td>
      <td>{renderNumberInput(account, 'NumPhoneNumbersDialed')}</td>
      <td>{renderNumberInput(account, 'ValidCalls')}</td>
      <td>{renderNumberInput(account, 'Totalemailscount')}</td>
      <td>{renderNumberInput(account, 'InitialAmexPScore_sql04', 0.001)}</td>
      <td>{renderDropdown(account, 'CMCity', CM_CITY)}</td>
      <td>{renderDropdown(account, 'AccountType', ACCOUNT_TYPE)}</td>
      <td>{renderDropdown(account, 'Clientid', CLIENT_ID_OPTIONS)}</td>
      <td>{renderDropdown(account, 'AmexProductType', AMEX_PRODUCT_TYPE)}</td>
      <td>{renderDropdown(account, 'StatusCode', STATUS_CODE)}</td>
      <td>{renderDropdown(account, 'AmexTenure_sql04', AMEX_TENURE)}</td>
      <td>{renderDropdown(account, 'Level', LEVEL_OPTIONS)}</td>
      <td>{renderDropdown(account, 'Channel', CHANNEL)}</td>
      <td>{formatDate(account.DateOfBirth)}</td>
      <td>{formatDate(account.CardOpenDate)}</td>
      <td>{formatDate(account.ChargeOffDate)}</td>
    </>
  );

  /* ===============================================================
     BEFORE RUN → INPUT Data — flat table with all 35+ columns
     =============================================================== */
  if (!hasOutput) {
    return (
      <div>
        <div className="table-section-label">
          <i className="bi bi-table"></i> INPUT Data
        </div>

        <div className="data-table-wrapper">
          <table className="data-table" style={{ minWidth: '5000px' }}>
            <thead>
              <tr>
                <th style={{ width: '50px' }}><i className="bi bi-filter"></i> Select</th>
                <th style={{ width: '110px' }}>Account ID</th>
                <th style={{ width: '110px' }}>Place Date</th>
                <th style={{ width: '130px' }}>Last Pay Pre-Charge</th>
                <th style={{ width: '130px' }}>Last Outbound Call</th>
                <th style={{ width: '120px' }}>Last Email Sent</th>
                <th style={{ width: '130px' }}>Last Web Activity</th>
                <th style={{ width: '130px' }}>Place Amount ($)</th>
                <th style={{ width: '80px' }}>Decile</th>
                <th style={{ width: '100px' }}>FICO Score</th>
                <th style={{ width: '120px' }}>Has Valid Number</th>
                <th style={{ width: '90px' }}>RPC Flag</th>
                <th style={{ width: '110px' }}>Connect Flag</th>
                <th style={{ width: '90px' }}>Page Flag</th>
                <th style={{ width: '110px' }}>Page Web Flag</th>
                <th style={{ width: '120px' }}>Party Grouping</th>
                <th style={{ width: '110px' }}>Best Day to Call</th>
                <th style={{ width: '220px' }}>Result Code Flag</th>
                <th style={{ width: '120px' }}>Phone In-Service</th>
                <th style={{ width: '140px' }}>Contactability Score</th>
                <th style={{ width: '130px' }}>Call Window (avg)</th>
                <th style={{ width: '150px' }}>2nd Best Call Window</th>
                <th style={{ width: '140px' }}>Phone Numbers Dialed</th>
                <th style={{ width: '100px' }}>Valid Calls</th>
                <th style={{ width: '100px' }}>Total Emails</th>
                <th style={{ width: '140px' }}>Initial Amex P-Score</th>
                <th style={{ width: '120px' }}>City</th>
                <th style={{ width: '110px' }}>Account Type</th>
                <th style={{ width: '100px' }}>Client ID</th>
                <th style={{ width: '110px' }}>Product Type</th>
                <th style={{ width: '100px' }}>Status Code</th>
                <th style={{ width: '100px' }}>Amex Tenure</th>
                <th style={{ width: '100px' }}>Level</th>
                <th style={{ width: '110px' }}>Channel</th>
                <th style={{ width: '110px' }}>Date of Birth</th>
                <th style={{ width: '120px' }}>Card Open Date</th>
                <th style={{ width: '120px' }}>Charge-Off Date</th>
              </tr>
            </thead>
            <tbody>
              {displayAccounts.length === 0 ? (
                <tr>
                  <td colSpan={37} style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                    No accounts loaded.
                  </td>
                </tr>
              ) : (
                displayAccounts.map((account) => {
                  const isSelected = selectedAcctIds.includes(account.AcctID);

                  return (
                    <tr
                      key={account.AcctID}
                      className={`${isSelected ? 'selected' : ''}`}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectAccount(account.AcctID)}
                        />
                      </td>
                      <td><strong>{account.AcctID}</strong></td>
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
     AFTER RUN → OUTPUT Data
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
        <table className={`data-table output-table ${showInputCols ? 'output-table--expanded' : ''}`} style={showInputCols ? { minWidth: '5800px' } : undefined}>
          <thead>
            <tr>
              <th style={{ width: showInputCols ? '50px' : '8%' }}><i className="bi bi-filter"></i> Select</th>
              <th style={{ width: showInputCols ? '110px' : '15%' }}>Account ID</th>
              <th style={{ width: showInputCols ? '40px' : '5%' }} title="Toggle input columns"></th>
              <th style={{ width: showInputCols ? '140px' : '30%' }}>Model Score %</th>
              <th style={{ width: showInputCols ? '130px' : '22%' }}>Account Priority</th>
              <th style={{ width: showInputCols ? '120px' : '20%' }}>Scoring Date</th>
              {showInputCols && (
                <>
                  <th style={{ width: '110px' }}>Place Date</th>
                  <th style={{ width: '130px' }}>Last Pay Pre-Charge</th>
                  <th style={{ width: '130px' }}>Last Outbound Call</th>
                  <th style={{ width: '120px' }}>Last Email Sent</th>
                  <th style={{ width: '130px' }}>Last Web Activity</th>
                  <th style={{ width: '130px' }}>Place Amount ($)</th>
                  <th style={{ width: '80px' }}>Decile</th>
                  <th style={{ width: '100px' }}>FICO Score</th>
                  <th style={{ width: '120px' }}>Has Valid Number</th>
                  <th style={{ width: '90px' }}>RPC Flag</th>
                  <th style={{ width: '110px' }}>Connect Flag</th>
                  <th style={{ width: '90px' }}>Page Flag</th>
                  <th style={{ width: '110px' }}>Page Web Flag</th>
                  <th style={{ width: '120px' }}>Party Grouping</th>
                  <th style={{ width: '110px' }}>Best Day to Call</th>
                  <th style={{ width: '220px' }}>Result Code Flag</th>
                  <th style={{ width: '120px' }}>Phone In-Service</th>
                  <th style={{ width: '140px' }}>Contactability Score</th>
                  <th style={{ width: '130px' }}>Call Window (avg)</th>
                  <th style={{ width: '150px' }}>2nd Best Call Window</th>
                  <th style={{ width: '140px' }}>Phone Numbers Dialed</th>
                  <th style={{ width: '100px' }}>Valid Calls</th>
                  <th style={{ width: '100px' }}>Total Emails</th>
                  <th style={{ width: '140px' }}>Initial Amex P-Score</th>
                  <th style={{ width: '120px' }}>City</th>
                  <th style={{ width: '110px' }}>Account Type</th>
                  <th style={{ width: '100px' }}>Client ID</th>
                  <th style={{ width: '110px' }}>Product Type</th>
                  <th style={{ width: '100px' }}>Status Code</th>
                  <th style={{ width: '100px' }}>Amex Tenure</th>
                  <th style={{ width: '100px' }}>Level</th>
                  <th style={{ width: '110px' }}>Channel</th>
                  <th style={{ width: '110px' }}>Date of Birth</th>
                  <th style={{ width: '120px' }}>Card Open Date</th>
                  <th style={{ width: '120px' }}>Charge-Off Date</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {displayAccounts.map((account) => {
              const isSelected = selectedAcctId === account.AcctID;
              const isFrozen = selectedAcctId != null && !isSelected;

              return (
                <tr
                  key={account.AcctID}
                  className={`${isSelected ? 'selected' : ''} ${isFrozen ? 'frozen' : ''}`}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onSelectAccount(account.AcctID)}
                      disabled={isFrozen}
                    />
                  </td>
                  <td><strong>{account.AcctID}</strong></td>

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
                  {account.modelScorePercent != null ? (
                    <>
                      <td>
                        <span style={{ color: getPriorityColor(account.accountPriority) }}>
                          {account.modelScorePercent.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <span className={`category-badge ${getPriorityClass(account.accountPriority)}`}>
                          {getPriorityLabel(account.accountPriority)}
                        </span>
                      </td>
                      <td>{account.scoringDate || '—'}</td>
                    </>
                  ) : (
                    <>
                      <td></td><td></td><td></td>
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

export default RpcDataTable;
