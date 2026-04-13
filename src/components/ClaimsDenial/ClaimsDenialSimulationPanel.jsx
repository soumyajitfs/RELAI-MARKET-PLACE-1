import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { fetchClaimDenialAccounts, predictClaimDenialAccounts } from '../../utils/claimDenialApi';
import { buildClaimDenialShapData } from '../../utils/claimDenialShapUtils';
import ClaimsDenialDataTable from './ClaimsDenialDataTable';
import ShapAnalysis from '../PatientCollectability/ShapAnalysis';

const CLAIM_DENIAL_FIELD_RULES = {
  Claim_ID: { type: 'text', editable: false, label: 'Claim_ID' },
  'Patient DOB': { type: 'date', min: '1931-11-21', max: '2007-04-26', label: 'Patient DOB' },
  Age: { type: 'int', min: 10, max: 96, label: 'Age' },
  'Payer Name': { type: 'enum', values: ['Commercial', 'Medicare', 'Medicaid', 'Private Insurance'], label: 'Payer Name' },
  'Type Bill': { type: 'enum', values: ['111', '131', '112', '117'], label: 'Type Bill' },
  'Admit Date': { type: 'date', min: '2025-01-25', max: '2025-12-12', label: 'Admit Date' },
  'Discharge Date': { type: 'date', min: '2025-01-25', max: '2026-01-01', label: 'Discharge Date' },
  Duration: { type: 'int', min: 0, max: 323, label: 'Duration' },
  'Admit Type': { type: 'enum', values: ['1', '2', '3', '4', '5'], label: 'Admit Type' },
  'Admit Source': { type: 'enum', values: ['Physician Referral', 'Emergency Room', 'Transfer', 'Other'], label: 'Admit Source' },
  'Pat Status': { type: 'enum', values: ['Discharged Home', 'Transfer', 'Skilled Nursing', 'AMA', 'Expired'], label: 'Pat Status' },
  'Ncov Total': { type: 'float', min: 29, max: 35792, label: 'Ncov Total' },
  'Claim Class': { type: 'enum', values: ['Outpatient', 'Inpatient'], label: 'Claim Class' },
  CPT_AJ: { type: 'enum', values: ['0', '1'], label: 'CPT_AJ' },
  CPT_Anesthesia: { type: 'enum', values: ['0', '1'], label: 'CPT_Anesthesia' },
  'CPT_E&M': { type: 'enum', values: ['0', '1'], label: 'CPT_E&M' },
  CPT_Medicine: { type: 'enum', values: ['0', '1'], label: 'CPT_Medicine' },
  'CPT_Pathology & Lab': { type: 'enum', values: ['0', '1'], label: 'CPT_Pathology & Lab' },
  CPT_Radiology: { type: 'enum', values: ['0', '1'], label: 'CPT_Radiology' },
  CPT_Surgery: { type: 'enum', values: ['0', '1'], label: 'CPT_Surgery' },
  'REV_All Inclusive Rate': { type: 'enum', values: ['0', '1'], label: 'REV_All Inclusive Rate' },
  REV_Anesthesia: { type: 'enum', values: ['0', '1'], label: 'REV_Anesthesia' },
  'REV_CT Scan': { type: 'enum', values: ['0', '1'], label: 'REV_CT Scan' },
  REV_Clinic: { type: 'enum', values: ['0', '1'], label: 'REV_Clinic' },
  'REV_Emergency Room': { type: 'enum', values: ['0', '1'], label: 'REV_Emergency Room' },
  'REV_Intensive Care Unit': { type: 'enum', values: ['0', '1'], label: 'REV_Intensive Care Unit' },
  REV_Laboratory: { type: 'enum', values: ['0', '1'], label: 'REV_Laboratory' },
  'REV_Medical/Surgical Supplies and Devices': { type: 'enum', values: ['0', '1'], label: 'REV_Medical/Surgical Supplies and Devices' },
  'REV_Occupational Therapy': { type: 'enum', values: ['0', '1'], label: 'REV_Occupational Therapy' },
  'REV_Operating Room Services': { type: 'enum', values: ['0', '1'], label: 'REV_Operating Room Services' },
  REV_Pharmacy: { type: 'enum', values: ['0', '1'], label: 'REV_Pharmacy' },
  'REV_Physical Therapy': { type: 'enum', values: ['0', '1'], label: 'REV_Physical Therapy' },
  'REV_Professional Fees': { type: 'enum', values: ['0', '1'], label: 'REV_Professional Fees' },
  'REV_Pulmonary Function': { type: 'enum', values: ['0', '1'], label: 'REV_Pulmonary Function' },
  REV_Radiology: { type: 'enum', values: ['0', '1'], label: 'REV_Radiology' },
  'REV_Room & Board': { type: 'enum', values: ['0', '1'], label: 'REV_Room & Board' },
  'REV_Speech Therapy': { type: 'enum', values: ['0', '1'], label: 'REV_Speech Therapy' },
  'Denial Charge': { type: 'float', min: 0, max: 266959, label: 'Denial Charge' },
};

const normalizeDate = (value) => {
  if (value == null || value === '') return '';
  const str = String(value);
  return str.includes('T') ? str.split('T')[0] : str;
};

const normalizeRowForEdit = (row) => {
  const { Patient_DOB, ...rest } = row;
  return {
    ...rest,
    'Patient DOB': normalizeDate(row['Patient DOB'] ?? Patient_DOB),
    'Admit Date': normalizeDate(row['Admit Date']),
    'Discharge Date': normalizeDate(row['Discharge Date']),
  };
};

const validateClaimDenialValue = (field, value) => {
  const rule = CLAIM_DENIAL_FIELD_RULES[field];
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
  if (!Number.isFinite(n) || n < rule.min || n > rule.max) {
    return `"${rule.label}" must be between ${rule.min} and ${rule.max}.`;
  }

  if (rule.type === 'int' && !Number.isInteger(n)) {
    return `"${rule.label}" must be an integer.`;
  }

  return null;
};

const ClaimsDenialSimulationPanel = () => {
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
  const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false);

  const loadRows = useCallback(async () => {
    setIsInitialLoading(true);
    setApiError(null);
    try {
      const data = await fetchClaimDenialAccounts();
      setRows(data);
    } catch (err) {
      console.error('Failed to fetch claim denial accounts:', err);
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
    setHasUnappliedChanges(false);
    setApiError(null);
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    if (editEnabled) {
      setDraftRows(rows.map(normalizeRowForEdit));
      setHasUnappliedChanges(false);
    }
  }, [editEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleEdit = () => setEditEnabled((prev) => !prev);

  const handleReset = async () => {
    setSelectedRowId(null);
    setSelectedRowIds([]);
    setHasOutput(false);
    setEditEnabled(false);
    setHasUnappliedChanges(false);
    await loadRows();
  };

  const handleRun = async () => {
    setIsLoading(true);
    try {
      const rowsToRun = selectedRowIds.length > 0
        ? rows.filter((r) => selectedRowIds.includes(r.__rowId))
        : rows;

      const results = await predictClaimDenialAccounts(rowsToRun, selectedRowIds.length === 0);
      const resultMap = new Map(results.map((r) => [r.__rowId, r]));
      const merged = selectedRowIds.length > 0
        ? rows.map((r) => (resultMap.has(r.__rowId) ? resultMap.get(r.__rowId) : r))
        : results;

      setRows(merged);
      setHasOutput(true);
      setSelectedRowId(selectedRowIds.length > 0 ? selectedRowIds[0] : null);
      setSelectedRowIds([]);
    } catch (err) {
      console.error('Claim denial prediction failed:', err);
      actions.showToast({ message: err.message || 'Failed to run prediction model', type: 'warning' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyChanges = () => {
    for (const row of draftRows) {
      for (const [field] of Object.entries(CLAIM_DENIAL_FIELD_RULES)) {
        const message = validateClaimDenialValue(field, row[field]);
        if (message) {
          actions.showToast({
            message: `${message} (Claim ${row.Claim_ID})`,
            type: 'warning',
          });
          return;
        }
      }
    }

    setRows(draftRows.map(normalizeRowForEdit));
    setHasUnappliedChanges(false);
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
    return buildClaimDenialShapData(row);
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
          : 'Select rows to run on specific claims, or run on all claims without selection.'}
        {!hasOutput && selectedRowIds.length > 0 && <strong> ({selectedRowIds.length} claim(s) selected)</strong>}
        {hasOutput && selectedRow && <strong> (Claim {selectedRow.Claim_ID} selected)</strong>}
      </p>

      {isInitialLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p className="loading-text">Loading claim denial records from backend...</p>
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
          <ClaimsDenialDataTable
            rows={rows}
            draftRows={draftRows}
            setDraftRows={setDraftRows}
            setHasUnappliedChanges={setHasUnappliedChanges}
            editEnabled={editEnabled}
            hasOutput={hasOutput}
            selectedRowId={selectedRowId}
            selectedRowIds={selectedRowIds}
            onSelectRow={handleSelectRow}
            fieldRules={CLAIM_DENIAL_FIELD_RULES}
            validateField={validateClaimDenialValue}
            showToast={actions.showToast}
          />
          <ShapAnalysis shapData={shapData} />
        </>
      )}
    </div>
  );
};

export default ClaimsDenialSimulationPanel;
