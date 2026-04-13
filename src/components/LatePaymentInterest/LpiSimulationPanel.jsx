import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { fetchLpiAccounts, predictLpiAccounts } from '../../utils/lpiApi';
import { buildLpiShapData } from '../../utils/lpiShapUtils';
import LpiDataTable from './LpiDataTable';
import ShapAnalysis from '../PatientCollectability/ShapAnalysis';

const INTERNAL_KEYS = new Set(['__rowId', 'probability', 'probabilityPercent', 'category', 'shapValues']);

const LPI_RULES = {
  aaInd: { type: 'enum', label: 'aaInd', options: ['no', 'yes'] },
  benopt: { type: 'enum', label: 'benopt', options: ['MHDP0004', 'MHRA0090', 'MOAP0003'] },
  billTyCd: { type: 'int', label: 'billTyCd', min: 126, max: 136 },
  clmBeginDt: { type: 'date', label: 'clmBeginDt', min: '2019-02-02', max: '2024-05-26' },
  clmEndDt: { type: 'date', label: 'clmEndDt', min: '2020-01-17', max: '2024-12-20' },
  clmPcpInd: { type: 'enum', label: 'clmPcpInd', options: ['no', 'yes'] },
  clmTyCd: { type: 'enum', label: 'clmTyCd', options: ['Inpatient', 'Outpatient', 'Professional'] },
  erisaInd: { type: 'enum', label: 'erisaInd', options: ['no', 'yes'] },
  formTyCd: { type: 'enum', label: 'formTyCd', options: ['HCFA', 'UB'] },
  paperEdiCd: { type: 'enum', label: 'paperEdiCd', options: ['Electronic', 'Paper'] },
  billProv_dervCpfTyCd2: {
    type: 'enum',
    label: 'billProv_dervCpfTyCd2',
    options: [
      'Acute Care Hospital',
      'Cardiology',
      'Critical Access Hospital',
      'Emergency Medicine',
      'General Surgery',
      'Home Health Agency',
      'Hospice Facility',
      'Inpatient Rehabilitation Facility',
      'Long-Term Care Hospital',
      'Obstetrics & Gynecology',
      'Orthopedic Surgery',
      'Pediatrics',
      'Psychiatric Hospital',
      'Psychiatry',
      'Skilled Nursing Facility',
    ],
  },
  billProv_ntCd: { type: 'enum', label: 'billProv_ntCd', options: ['In Network', 'Out of Network', 'Participating'] },
  billProv_stCd: { type: 'enum', label: 'billProv_stCd', options: ['Colorado', 'Florida', 'Missouri', 'Tennessee', 'Texas'] },
  otherPayeeTyp: { type: 'enum', label: 'otherPayeeTyp', options: ['Alternate', 'Provider', 'Subscriber'] },
  patDemo_patGndr: { type: 'enum', label: 'patDemo_patGndr', options: ['Female', 'Male'] },
  patient_age: { type: 'int', label: 'patient_age', min: 3, max: 93 },
  rndrProv_stCd: { type: 'enum', label: 'rndrProv_stCd', options: ['Colorado', 'Florida', 'Missouri', 'Tennessee', 'Texas'] },
  spProgElig_pathwellInd: { type: 'enum', label: 'spProgElig_pathwellInd', options: ['no', 'yes'] },
  allianceInd: { type: 'enum', label: 'allianceInd', options: ['no', 'yes'] },
  patDemo_rltnCd: {
    type: 'enum',
    label: 'patDemo_rltnCd',
    options: ['Daughter', 'Husband', 'Other Dependent', 'Son', 'Subscriber'],
  },
  branch: { type: 'enum', label: 'branch', options: ['A001', 'A011'] },
  billProv_city: {
    type: 'enum',
    label: 'billProv_city',
    options: ['Aurora', 'Centennial', 'Cherry Hills Village', 'Englewood', 'Greenwood Village', 'Highlands Ranch', 'Littleton'],
  },
  clmAmt_totChrgAmt: { type: 'int', label: 'clmAmt_totChrgAmt', min: 211, max: 4950 },
  clmAmt_totAllowAmt: { type: 'int', label: 'clmAmt_totAllowAmt', min: 142, max: 3868 },
  clmAmt_totPatRespPriorReimAmt: { type: 'int', label: 'clmAmt_totPatRespPriorReimAmt', min: 269, max: 14777 },
  fundingtype: { type: 'int', label: 'Funding type', min: 4, max: 23 },
  chrgAmt: { type: 'int', label: 'chrgAmt', min: 262, max: 4906 },
  ndc: { type: 'int', label: 'ndc', min: 9307296, max: 9307306 },
  posCd: { type: 'int', label: 'posCd', min: 11, max: 81 },
  preAuthInd: {
    type: 'enum',
    label: 'preAuthInd',
    options: [
      'Agreement Procedure',
      'Diagnosis Edit Criteria',
      'Procedure Edit Criteria',
      'Procedure UM',
      'Service Definition',
      'Service Definition Exceeds Amount',
    ],
  },
  procCd: { type: 'enum', label: 'procCd', options: ['A0429', 'E0601', 'G2211', 'H2019', 'J1100', 'J2405', 'L3908'] },
  revnuCd: { type: 'int', label: 'revnuCd', min: 705, max: 715 },
  serviceId: { type: 'enum', label: 'serviceId', options: ['Anesthesia Abortion IP', 'Lab Revenue OP', 'Office Visit OV'] },
  diagCd: { type: 'enum', label: 'diagCd', options: ['A000', 'R05', 'R079'] },
  adjustmentindicator: { type: 'int', label: 'adjustment indicator', min: 0, max: 1 },
  lpi_flag: { type: 'int', label: 'lpi_flag', min: 0, max: 1 },
  claimage: { type: 'int', label: 'claimage', min: 16, max: 1936 },
  actual_lpi: { type: 'int', label: 'actual_lpi', min: 0, max: 1 },
  lpivalue: { type: 'float', label: 'lpi value', min: 0, max: 98.96 },
};

const normalizeKey = (input) => String(input ?? '').replace(/[^A-Za-z0-9]/g, '').toLowerCase();
const normalizeDate = (value) => {
  if (value == null || value === '') return null;
  const s = String(value);
  return s.includes('T') ? s.split('T')[0] : s;
};
const normalizeEnumValue = (input) => String(input ?? '')
  .replace(/\u00A0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const LPI_RULES_BY_KEY = Object.fromEntries(
  Object.entries(LPI_RULES).map(([key, rule]) => [normalizeKey(key), rule])
);

const getRuleForField = (field) => LPI_RULES_BY_KEY[normalizeKey(field)] || null;

const validateLpiField = (field, value) => {
  const rule = getRuleForField(field);
  if (!rule) return null;

  if (rule.type === 'enum') {
    const candidate = normalizeEnumValue(value);
    const options = rule.options.map(normalizeEnumValue);
    if (!options.includes(candidate)) {
      return `"${rule.label}" must be one of the accepted values.`;
    }
    return null;
  }

  if (rule.type === 'date') {
    const d = normalizeDate(value);
    if (!d || d < rule.min || d > rule.max) {
      return `"${rule.label}" must be between ${rule.min} and ${rule.max}.`;
    }
    return null;
  }

  const n = Number(value);
  if (!Number.isFinite(n)) {
    return `"${rule.label}" must be a valid number.`;
  }
  if (rule.type === 'int' && !Number.isInteger(n)) {
    return `"${rule.label}" must be an integer.`;
  }
  if (n < rule.min || n > rule.max) {
    return `"${rule.label}" must be between ${rule.min} and ${rule.max}.`;
  }
  return null;
};

const LpiSimulationPanel = () => {
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
      const data = await fetchLpiAccounts();
      setRows(data);
    } catch (err) {
      console.error('Failed to fetch LPI accounts:', err);
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
      setDraftRows(rows.map((r) => ({ ...r })));
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

      const results = await predictLpiAccounts(rowsToRun);
      const resultMap = new Map(results.map((r) => [r.__rowId, r]));
      const merged = selectedRowIds.length > 0
        ? rows.map((r) => (resultMap.has(r.__rowId) ? resultMap.get(r.__rowId) : r))
        : results;

      setRows(merged);
      setHasOutput(true);
      setSelectedRowId(selectedRowIds.length > 0 ? selectedRowIds[0] : null);
      setSelectedRowIds([]);
    } catch (err) {
      console.error('LPI prediction failed:', err);
      actions.showToast({ message: err.message || 'Failed to run prediction model', type: 'warning' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyChanges = () => {
    for (const row of draftRows) {
      for (const [field, value] of Object.entries(row)) {
        if (INTERNAL_KEYS.has(field) || field === 'clmId') continue;
        const message = validateLpiField(field, value);
        if (message) {
          actions.showToast({
            message: `${message} (Claim ${row.clmId})`,
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
    setSelectedRowId((prev) => (prev === rowId ? null : rowId));
  };

  const selectedRow = selectedRowId != null
    ? rows.find((r) => r.__rowId === selectedRowId)
    : null;

  const shapData = useMemo(() => {
    if (!hasOutput || selectedRowId == null) return null;
    const row = rows.find((r) => r.__rowId === selectedRowId);
    if (!row) return null;
    return buildLpiShapData(row);
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
        {hasOutput && selectedRow && <strong> (Claim {selectedRow.clmId} selected)</strong>}
      </p>

      {isInitialLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p className="loading-text">Loading late payment interest accounts from backend...</p>
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
          <LpiDataTable
            rows={rows}
            draftRows={draftRows}
            setDraftRows={setDraftRows}
            setHasUnappliedChanges={setHasUnappliedChanges}
            editEnabled={editEnabled}
            hasOutput={hasOutput}
            selectedRowId={selectedRowId}
            selectedRowIds={selectedRowIds}
            onSelectRow={handleSelectRow}
            fieldRules={LPI_RULES_BY_KEY}
            validateField={validateLpiField}
            showToast={actions.showToast}
          />
          <ShapAnalysis shapData={shapData} />
        </>
      )}
    </div>
  );
};

export default LpiSimulationPanel;
