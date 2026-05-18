import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { fetchUnderwritingAccounts, predictUnderwritingAccounts } from '../../utils/mortgageUnderwritingApi';
import { buildMortgageUnderwritingShapData } from '../../utils/mortgageUnderwritingShapUtils';
import { useDirtyCells } from '../../hooks/useDirtyCells';
import { validateDirtyFieldRules } from '../../utils/dirtyCellTracking';
import MortgageUnderwritingDataTable from './MortgageUnderwritingDataTable';
import ShapAnalysis from '../PatientCollectability/ShapAnalysis';

const MORTGAGE_FIELD_RULES = {
  'Applicant_ID': { type: 'text', editable: false, label: 'Applicant ID' },

  Alternative_Credit_Flag: { type: 'enum', values: ['Yes', 'No'], label: 'Alternative_Credit_Flag' },
  Credit_Score: { type: 'int', min: 400, max: 850, label: 'Credit_Score' },
  Loan_Amount: { type: 'float', min: 0.01, label: 'Loan_Amount' },
  Debt_to_Income_Ratio: { type: 'float', min: 0, max: 100, label: 'Debt_to_Income_Ratio' },

  Loan_Purpose: { type: 'enum', values: ['PURCHASE', 'RATE_TERM_REFINANCE', 'CASH_OUT_REFINANCE'], label: 'Loan_Purpose' },
  Loan_Program_Type: { type: 'enum', values: ['CONVENTIONAL', 'NON_QM', 'FHA', 'VA'], label: 'Loan_Program_Type' },
  Pre_Approval_Risk_Level: { type: 'enum', values: ['Low', 'Medium', 'High'], label: 'Pre_Approval_Risk_Level' },

  Income_Variance_Percent: { type: 'float', min: 0, max: 35, maxExclusive: true, label: 'Income_Variance_Percent' },
  Verified_Liquid_Assets: { type: 'float', min: 0, label: 'Verified_Liquid_Assets' },
  Reserve_Months_x: { type: 'int', min: 0, label: 'Reserve_Months_x' },
  VOE_Date: { type: 'date', min: '2020-01-01', max: '2035-12-31', label: 'VOE_Date' },
  Employer_Type: { type: 'enum', values: ['Government', 'Self_Employed', 'Private', 'Public'], label: 'Employer_Type' },
  Missing_Documents_Count: { type: 'int', min: 0, label: 'Missing_Documents_Count' },
  Cleaned_Income: { type: 'float', min: 0, label: 'Cleaned_Income' },

  Appraisal_Condition_Issues: { type: 'int', min: 0, label: 'Appraisal_Condition_Issues' },
  Final_LTV_After_Appraisal: { type: 'float', min: 0, max: 100, label: 'Final_LTV_After_Appraisal' },
  Appraisal_Risk_Level: { type: 'enum', values: ['LOW', 'MEDIUM', 'HIGH'], label: 'Appraisal_Risk_Level' },
  Title_Risk_Level: { type: 'enum', values: ['LOW', 'MEDIUM', 'HIGH'], label: 'Title_Risk_Level' },

  OFAC_Check_Status: { type: 'enum', values: ['CLEAR', 'HIT', 'PENDING'], label: 'OFAC_Check_Status' },
  SSN_Mismatch_Flag: { type: 'enum', values: ['Yes', 'No'], label: 'SSN_Mismatch_Flag' },
  Identity_Verified_Flag: { type: 'enum', values: ['Yes', 'No'], label: 'Identity_Verified_Flag' },
  MI_Required_Flag: { type: 'enum', values: ['Yes', 'No'], label: 'MI_Required_Flag' },
  Income_Verification_Status: { type: 'enum', values: ['VERIFIED', 'PARTIAL', 'UNVERIFIED'], label: 'Income_Verification_Status' },
  Asset_Verification_Status: { type: 'enum', values: ['VERIFIED', 'PARTIAL', 'UNVERIFIED'], label: 'Asset_Verification_Status' },
  Flood_Insurance_Missing_Flag: { type: 'enum', values: ['Yes', 'No'], label: 'Flood_Insurance_Missing_Flag' },
  AUS_Risk_Class: { type: 'enum', values: ['A', 'B', 'C'], label: 'AUS_Risk_Class' },
  QM_Status: { type: 'enum', values: ['Safe_Harbor', 'Rebuttable', 'Non_QM'], label: 'QM_Status' },
};

const normalizeDate = (value) => {
  if (value == null || value === '') return '';
  const str = String(value);
  return str.includes('T') ? str.split('T')[0] : str;
};

const normalizeRowForEdit = (row) => ({
  ...row,
  VOE_Date: normalizeDate(row.VOE_Date),
});

const isValuePresent = (value) => value !== '' && value != null;

const validateMortgageValue = (field, value) => {
  const rule = MORTGAGE_FIELD_RULES[field];
  if (!rule || rule.editable === false) return null;

  if (rule.type === 'enum') {
    if (!rule.values.includes(String(value))) {
      return `"${rule.label}" must be one of: ${rule.values.join(', ')}.`;
    }
    return null;
  }

  if (rule.type === 'date') {
    const date = normalizeDate(value);
    if (!date || date < rule.min || date > rule.max) {
      return `"${rule.label}" must be between ${rule.min} and ${rule.max}.`;
    }
    return null;
  }

  const n = Number(value);
  if (!Number.isFinite(n)) {
    return `"${rule.label}" must be a valid number.`;
  }

  if (rule.min != null && n < rule.min) {
    return `"${rule.label}" must be >= ${rule.min}.`;
  }
  if (rule.maxExclusive === true && rule.max != null && n >= rule.max) {
    return `"${rule.label}" must be < ${rule.max}.`;
  }
  if (rule.maxExclusive !== true && rule.max != null && n > rule.max) {
    return `"${rule.label}" must be <= ${rule.max}.`;
  }

  if (rule.type === 'int' && !Number.isInteger(n)) {
    return `"${rule.label}" must be an integer.`;
  }

  return null;
};

const MortgageUnderwritingSimulationPanel = () => {
  const { actions } = useAppContext();

  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [hasOutput, setHasOutput] = useState(false);
  const [editEnabled, setEditEnabled] = useState(false);
  const [draftRows, setDraftRows] = useState([]);
  const { dirtyCells, hasUnappliedChanges, markCellDirty, resetDirtyCells } = useDirtyCells();

  const loadRows = useCallback(async () => {
    setIsInitialLoading(true);
    setApiError(null);
    try {
      const data = await fetchUnderwritingAccounts();
      setRows(data);
    } catch (err) {
      console.error('Failed to fetch underwriting accounts:', err);
      setApiError(err.message || 'Failed to load data from backend');
    } finally {
      setIsInitialLoading(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setRows([]);
    setHasOutput(false);
    setSelectedRowId(null);
    setSelectedRowIds([]);
    setEditEnabled(false);
    setDraftRows([]);
    resetDirtyCells();
    setApiError(null);
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (editEnabled) {
      setDraftRows(rows.map(normalizeRowForEdit));
      resetDirtyCells();
    }
  }, [editEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleEdit = () => setEditEnabled((prev) => !prev);

  const handleReset = async () => {
    setSelectedRowId(null);
    setSelectedRowIds([]);
    setHasOutput(false);
    setEditEnabled(false);
    resetDirtyCells();
    await loadRows();
  };

  const handleRun = async () => {
    setIsLoading(true);
    try {
      const rowsToRun = selectedRowIds.length > 0
        ? rows.filter((r) => selectedRowIds.includes(r.__rowId))
        : rows;

      const results = await predictUnderwritingAccounts(rowsToRun, selectedRowIds.length === 0);
      const resultMap = new Map(results.map((r) => [r.__rowId, r]));
      const merged = selectedRowIds.length > 0
        ? rows.map((r) => (resultMap.has(r.__rowId) ? resultMap.get(r.__rowId) : r))
        : results;

      setRows(merged);
      setHasOutput(true);
      setSelectedRowId(selectedRowIds.length > 0 ? selectedRowIds[0] : null);
      setSelectedRowIds([]);
    } catch (err) {
      console.error('Underwriting prediction failed:', err);
      actions.showToast({ message: err.message || 'Failed to run prediction model', type: 'warning' });
    } finally {
      setIsLoading(false);
    }
  };

  const fieldRulesWithEdit = useMemo(() => {
    const resolved = {};
    Object.keys(MORTGAGE_FIELD_RULES).forEach((key) => {
      resolved[key] = {
        ...MORTGAGE_FIELD_RULES[key],
        editable: MORTGAGE_FIELD_RULES[key].editable !== false,
      };
    });
    return resolved;
  }, []);

  const handleApplyChanges = () => {
    if (dirtyCells.size === 0) return;

    const error = validateDirtyFieldRules({
      dirtyCells,
      draftRows,
      fieldRules: fieldRulesWithEdit,
      validateValue: (field, value) => validateMortgageValue(field, value),
      validateRowCross: null,
      isValuePresent,
      formatError: ({ row, rule, type, message }) => {
        if (type === 'empty') return `"${rule.label}" cannot be empty. (Application ${row['Applicant_ID']})`;
        return `${message} (Application ${row['Applicant_ID']})`;
      },
    });
    if (error) {
      actions.showToast({ message: error, type: 'warning' });
      return;
    }

    setRows(draftRows.map(normalizeRowForEdit));
    resetDirtyCells();
    setEditEnabled(false);
    actions.showToast({ message: 'Changes have been applied successfully!', type: 'success' });
  };

  const handleSelectRow = (rowId) => {
    if (!hasOutput) {
      setSelectedRowIds((prev) =>
        prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
      );
      return;
    }
    setSelectedRowId((prev) => (prev === rowId ? null : rowId));
  };

  const selectedRow = selectedRowId != null
    ? rows.find((r) => r.__rowId === selectedRowId)
    : null;

  const shapData = useMemo(() => {
    if (!hasOutput || selectedRowId == null) return null;
    const row = rows.find((r) => r.__rowId === selectedRowId);
    if (!row) return null;
    return buildMortgageUnderwritingShapData(row);
  }, [hasOutput, selectedRowId, rows]);

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
              <button className="action-btn run" onClick={handleRun} disabled={isLoading || rows.length === 0}>
                <i className="bi bi-play-fill"></i>
                Run
              </button>
              <button className="action-btn reset" onClick={handleReset} disabled={isLoading}>
                <i className="bi bi-arrow-clockwise"></i>
                Reset
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`toggle-wrapper ${hasOutput ? 'disabled' : ''}`}>
        <label className="toggle-switch">
          <input type="checkbox" checked={editEnabled} onChange={handleToggleEdit} disabled={hasOutput} />
          <span className="toggle-slider"></span>
        </label>
        <span className="toggle-label">Enable input editing</span>
      </div>

      <p className="simulation-caption">
        {hasOutput
          ? 'Outputs are highlighted. Select any row to see details.'
          : 'Select rows to run on specific applications, or run on all applications without selection.'}
        {!hasOutput && selectedRowIds.length > 0 && <strong> ({selectedRowIds.length} application(s) selected)</strong>}
        {hasOutput && selectedRow && <strong> (Application {selectedRow['Applicant_ID']} selected)</strong>}
      </p>

      {isInitialLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p className="loading-text">Loading underwriting applications from backend...</p>
        </div>
      ) : apiError ? (
        <div className="api-error-state" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '2rem', color: '#dc3545' }}></i>
          <p style={{ color: '#dc3545', marginTop: '10px', fontWeight: 600 }}>Failed to load data</p>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>{apiError}</p>
          <button className="action-btn run" onClick={loadRows} style={{ marginTop: '15px' }}>
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
          <MortgageUnderwritingDataTable
            rows={rows}
            draftRows={draftRows}
            setDraftRows={setDraftRows}
            markCellDirty={markCellDirty}
            editEnabled={editEnabled}
            hasOutput={hasOutput}
            selectedRowId={selectedRowId}
            selectedRowIds={selectedRowIds}
            onSelectRow={handleSelectRow}
            fieldRules={fieldRulesWithEdit}
            validateField={validateMortgageValue}
            showToast={actions.showToast}
          />
          <ShapAnalysis shapData={shapData} />
        </>
      )}
    </div>
  );
};

export default MortgageUnderwritingSimulationPanel;
