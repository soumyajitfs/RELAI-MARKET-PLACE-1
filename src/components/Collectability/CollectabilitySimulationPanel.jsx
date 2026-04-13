import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { fetchCollectabilityAccounts, predictCollectabilityAccounts } from '../../utils/collectabilityApi';
import { buildCollectabilityShapData } from '../../utils/collectabilityShapUtils';
import CollectabilityDataTable from './CollectabilityDataTable';
import ShapAnalysis from '../PatientCollectability/ShapAnalysis';

const COLLECTABILITY_FIELD_RULES = {
  'PLACEMENT AGE': { type: 'int', min: 0, max: 1259, label: 'PLACEMENT AGE' },
  TotCharges: { type: 'float', min: 0, max: 56589, label: 'TotCharges' },
  'Days of Hosp': { type: 'int', min: 0, max: 30, label: 'Days of Hosp' },
  'ADJ PLACEMENT AMOUNT': { type: 'float', min: 0, max: 3608.2, label: 'ADJ PLACEMENT AMOUNT' },
  'FINANCIAL CLASS': { type: 'enum', values: ['MEDICARE', 'MEDICAID C', 'MEDICAID N', 'COMMERCIAL'], label: 'FINANCIAL CLASS' },
  'INSURANCE LEVEL 1': { type: 'enum', values: ['MEDICARE', 'MEDICARE/MCO', 'BLUE CROSS BLUE SHIELD', 'OTHER'], label: 'INSURANCE LEVEL 1' },
  'ASSIGN DATE': { type: 'date', min: '2024-04-03', max: '2025-12-22', label: 'ASSIGN DATE' },
  'TOTAL COLLECTED': { type: 'float', min: 0, max: 19569.62, label: 'TOTAL COLLECTED' },
  ISMYDN: { type: 'int', min: 0, max: 1, label: 'ISMYDN' },
  'CLIENT CODE': { type: 'enum', values: ['MHFLOR', 'MHNWWI', 'MHBOTP', 'MHROCH', 'MHSWWI', 'MHSWMN', 'MHSEMN'], label: 'CLIENT CODE' },
  'DISCHARGE DATE': { type: 'date', min: '2022-05-31', max: '2024-08-28', label: 'DISCHARGE DATE' },
  'ADMIT DATE': { type: 'date', min: '2022-05-01', max: '2024-08-28', label: 'ADMIT DATE' },
  'DEBTOR NUMBER': { type: 'int', min: 597432, max: 2681514, label: 'DEBTOR NUMBER' },
  'Bill Type_111': { type: 'int', min: 0, max: 1, label: 'Bill Type_111' },
  'Bill Type_113': { type: 'int', min: 0, max: 1, label: 'Bill Type_113' },
  'Bill Type_123': { type: 'int', min: 0, max: 1, label: 'Bill Type_123' },
  'Bill Type_181': { type: 'int', min: 0, max: 1, label: 'Bill Type_181' },
  'Bill Type_185': { type: 'int', min: 0, max: 1, label: 'Bill Type_185' },
  'Bill Type_213': { type: 'int', min: 0, max: 1, label: 'Bill Type_213' },
  'Bill Type_313': { type: 'int', min: 0, max: 1, label: 'Bill Type_313' },
  'Bill Type_372': { type: 'int', min: 0, max: 1, label: 'Bill Type_372' },
  'Bill Type_713': { type: 'int', min: 0, max: 1, label: 'Bill Type_713' },
  'Bill Type_785': { type: 'int', min: 0, max: 1, label: 'Bill Type_785' },
  'Bill Type_Others': { type: 'int', min: 0, max: 1, label: 'Bill Type_Others' },
  'CPT Category_AG': { type: 'int', min: 0, max: 1, label: 'CPT Category_AG' },
  'CPT Category_AJ': { type: 'int', min: 0, max: 1, label: 'CPT Category_AJ' },
  'CPT Category_AQ': { type: 'int', min: 0, max: 1, label: 'CPT Category_AQ' },
  'CPT Category_AS': { type: 'int', min: 0, max: 1, label: 'CPT Category_AS' },
  'CPT Category_E&M': { type: 'int', min: 0, max: 1, label: 'CPT Category_E&M' },
  'CPT Category_Medicine': { type: 'int', min: 0, max: 1, label: 'CPT Category_Medicine' },
  'CPT Category_Others': { type: 'int', min: 0, max: 1, label: 'CPT Category_Others' },
  'CPT Category_P': { type: 'int', min: 0, max: 1, label: 'CPT Category_P' },
  'CPT Category_Pathology & Lab': { type: 'int', min: 0, max: 1, label: 'CPT Category_Pathology & Lab' },
  'CPT Category_Radiology': { type: 'int', min: 0, max: 1, label: 'CPT Category_Radiology' },
  'CPT Category_Surgery': { type: 'int', min: 0, max: 1, label: 'CPT Category_Surgery' },
  'RevCode_Category_Clinic': { type: 'int', min: 0, max: 1, label: 'RevCode_Category_Clinic' },
  'RevCode_Category_Diagnostics': { type: 'int', min: 0, max: 1, label: 'RevCode_Category_Diagnostics' },
  'RevCode_Category_ER': { type: 'int', min: 0, max: 1, label: 'RevCode_Category_ER' },
  'RevCode_Category_Imaging': { type: 'int', min: 0, max: 1, label: 'RevCode_Category_Imaging' },
  'RevCode_Category_Lab': { type: 'int', min: 0, max: 1, label: 'RevCode_Category_Lab' },
  'RevCode_Category_Others': { type: 'int', min: 0, max: 1, label: 'RevCode_Category_Others' },
  'RevCode_Category_Pharmacy': { type: 'int', min: 0, max: 1, label: 'RevCode_Category_Pharmacy' },
  'RevCode_Category_Professional Fees': { type: 'int', min: 0, max: 1, label: 'RevCode_Category_Professional Fees' },
  'RevCode_Category_Surgery': { type: 'int', min: 0, max: 1, label: 'RevCode_Category_Surgery' },
  'RevCode_Category_Therapy': { type: 'int', min: 0, max: 1, label: 'RevCode_Category_Therapy' },
  unique_rev_count: { type: 'int', min: 0, max: 11, label: 'unique_rev_count' },
  unique_cpt_count: { type: 'int', min: 0, max: 22, label: 'unique_cpt_count' },
  unique_carc_count: { type: 'int', min: 0, max: 3, label: 'unique_carc_count' },
  unique_rarc_count: { type: 'int', min: 0, max: 2, label: 'unique_rarc_count' },
  unique_bill_seq_count: { type: 'int', min: 0, max: 1, label: 'unique_bill_seq_count' },
  unique_bill_type_count: { type: 'int', min: 0, max: 2, label: 'unique_bill_type_count' },
  'Denial Class_Addl Doc': { type: 'int', min: 0, max: 1, label: 'Denial Class_Addl Doc' },
  'Denial Class_Auth': { type: 'int', min: 0, max: 1, label: 'Denial Class_Auth' },
  'Denial Class_COB': { type: 'int', min: 0, max: 1, label: 'Denial Class_COB' },
  'Denial Class_Coding': { type: 'int', min: 0, max: 1, label: 'Denial Class_Coding' },
  'Denial Class_Duplicate': { type: 'int', min: 0, max: 1, label: 'Denial Class_Duplicate' },
  'Denial Class_Med Necc': { type: 'int', min: 0, max: 1, label: 'Denial Class_Med Necc' },
  'Denial Class_Non - Covered': { type: 'int', min: 0, max: 1, label: 'Denial Class_Non - Covered' },
  'Denial Class_Others': { type: 'int', min: 0, max: 1, label: 'Denial Class_Others' },
  'Denial Class_Registration': { type: 'int', min: 0, max: 1, label: 'Denial Class_Registration' },
};

const normalizeDate = (value) => {
  if (value == null || value === '') return null;
  const str = String(value);
  return str.includes('T') ? str.split('T')[0] : str;
};

const validateCollectabilityValue = (field, value) => {
  const rule = COLLECTABILITY_FIELD_RULES[field];
  if (!rule) return null;

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

const CollectabilitySimulationPanel = () => {
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
      const data = await fetchCollectabilityAccounts();
      setRows(data);
    } catch (err) {
      console.error('Failed to fetch collectability accounts:', err);
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
      setDraftRows(rows.map(r => ({ ...r })));
      setHasUnappliedChanges(false);
    }
  }, [editEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleEdit = () => setEditEnabled(prev => !prev);

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
        ? rows.filter(r => selectedRowIds.includes(r.__rowId))
        : rows;

      const results = await predictCollectabilityAccounts(rowsToRun);
      const resultMap = new Map(results.map((r) => [r.__rowId, r]));
      const merged = selectedRowIds.length > 0
        ? rows.map((r) => (resultMap.has(r.__rowId) ? resultMap.get(r.__rowId) : r))
        : results;

      setRows(merged);
      setHasOutput(true);
      setSelectedRowId(selectedRowIds.length > 0 ? selectedRowIds[0] : null);
      setSelectedRowIds([]);
    } catch (err) {
      console.error('Collectability prediction failed:', err);
      actions.showToast({ message: err.message || 'Failed to run prediction model', type: 'warning' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyChanges = () => {
    for (const row of draftRows) {
      for (const [field] of Object.entries(COLLECTABILITY_FIELD_RULES)) {
        const message = validateCollectabilityValue(field, row[field]);
        if (message) {
          actions.showToast({
            message: `${message} (Account ${row['CLIENT REFERENCE NUMBER']})`,
            type: 'warning',
          });
          return;
        }
      }
    }

    setRows(draftRows);
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
    setSelectedRowId(prev => (prev === rowId ? null : rowId));
  };

  const selectedRow = selectedRowId != null
    ? rows.find(r => r.__rowId === selectedRowId)
    : null;

  const shapData = useMemo(() => {
    if (!hasOutput || selectedRowId == null) return null;
    const row = rows.find(r => r.__rowId === selectedRowId);
    if (!row) return null;
    return buildCollectabilityShapData(row);
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
          : 'Select rows to run on specific accounts, or run on all accounts without selection.'}
        {!hasOutput && selectedRowIds.length > 0 && <strong> ({selectedRowIds.length} account(s) selected)</strong>}
        {hasOutput && selectedRow && <strong> (Account {selectedRow['CLIENT REFERENCE NUMBER']} selected)</strong>}
      </p>

      {isInitialLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p className="loading-text">Loading collectability accounts from backend...</p>
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
          <CollectabilityDataTable
            rows={rows}
            draftRows={draftRows}
            setDraftRows={setDraftRows}
            setHasUnappliedChanges={setHasUnappliedChanges}
            editEnabled={editEnabled}
            hasOutput={hasOutput}
            selectedRowId={selectedRowId}
            selectedRowIds={selectedRowIds}
            onSelectRow={handleSelectRow}
            fieldRules={COLLECTABILITY_FIELD_RULES}
            validateField={validateCollectabilityValue}
            showToast={actions.showToast}
          />
          <ShapAnalysis shapData={shapData} />
        </>
      )}
    </div>
  );
};

export default CollectabilitySimulationPanel;
