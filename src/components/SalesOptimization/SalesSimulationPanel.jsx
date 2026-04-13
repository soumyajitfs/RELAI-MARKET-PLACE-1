import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { fetchSalesAccounts, predictSalesAccounts } from '../../utils/salesApi';
import { buildSalesShapData } from '../../utils/salesShapUtils';
import SalesDataTable from './SalesDataTable';
import ShapAnalysis from '../PatientCollectability/ShapAnalysis';

const SALES_SERVICE_OPTIONS = `
Stream+Sports & Cinema+Sim & Device
Stream
Q Box(Dish antenna)
Sim & Device
BB & Talk
Stream+Sim & Device+Q Box(Dish antenna)
Stream+Q Box(Dish antenna)+BB & Talk
Q Box(Dish antenna)+BB & Talk
BB & Talk+Sports & Cinema+Q Box(Dish antenna)
Sim & Device+Sports & Cinema+Q Box(Dish antenna)
Sports & Cinema
Glass TV+Stream
Glass TV+BB & Talk
Q Box(Dish antenna)+Sports & Cinema
BB & Talk+Q Box(Dish antenna)+Glass TV
Q Box(Dish antenna)+Sim & Device+BB & Talk
Sports & Cinema+Glass TV
Q Box(Dish antenna)+Stream
Glass TV
Q Box(Dish antenna)+Sim & Device
BB & Talk+Glass TV+Sim & Device
Sim & Device+Stream+Glass TV
Sim & Device+Glass TV+Sports & Cinema
Q Box(Dish antenna)+Glass TV+BB & Talk
Stream+BB & Talk
Glass TV+Sim & Device
Glass TV+Stream+Q Box(Dish antenna)
Sim & Device+Stream+BB & Talk
Sports & Cinema+Sim & Device
Glass TV+BB & Talk+Sports & Cinema
Stream+Glass TV
BB & Talk+Q Box(Dish antenna)
BB & Talk+Glass TV
Q Box(Dish antenna)+BB & Talk+Sports & Cinema
Sports & Cinema+Sim & Device+Q Box(Dish antenna)
Sim & Device+Sports & Cinema
Stream+Sim & Device+Glass TV
Stream+Glass TV+Q Box(Dish antenna)
Stream+Sports & Cinema
Glass TV+Q Box(Dish antenna)+BB & Talk
BB & Talk+Sim & Device+Q Box(Dish antenna)
Glass TV+Sim & Device+Sports & Cinema
Sim & Device+Q Box(Dish antenna)
BB & Talk+Stream
Sim & Device+BB & Talk
Glass TV+Q Box(Dish antenna)
Sports & Cinema+Q Box(Dish antenna)+Sim & Device
Stream+Q Box(Dish antenna)
Glass TV+Q Box(Dish antenna)+Sports & Cinema
BB & Talk+Sports & Cinema
Q Box(Dish antenna)+Glass TV+Sports & Cinema
Q Box(Dish antenna)+Glass TV
Stream+Q Box(Dish antenna)+Glass TV
Sports & Cinema+Q Box(Dish antenna)
BB & Talk+Stream+Sim & Device
Sim & Device+Stream
Sim & Device+BB & Talk+Q Box(Dish antenna)
Stream+BB & Talk+Glass TV
Q Box(Dish antenna)+Stream+Sim & Device
Q Box(Dish antenna)+Glass TV+Stream
Sim & Device+BB & Talk+Sports & Cinema
Q Box(Dish antenna)+Sports & Cinema+Glass TV
Sports & Cinema+Stream+BB & Talk
Sports & Cinema+BB & Talk
Glass TV+Stream+BB & Talk
Q Box(Dish antenna)+BB & Talk+Glass TV
Glass TV+Sports & Cinema
Sports & Cinema+Sim & Device+Stream
Stream+Glass TV+Sports & Cinema
BB & Talk+Sim & Device
Sports & Cinema+BB & Talk+Glass TV
BB & Talk+Glass TV+Sports & Cinema
Sim & Device+Q Box(Dish antenna)+Glass TV
Glass TV+Sim & Device+BB & Talk
Q Box(Dish antenna)+BB & Talk+Sim & Device
Sports & Cinema+Stream+Q Box(Dish antenna)
Sports & Cinema+BB & Talk+Sim & Device
BB & Talk+Sports & Cinema+Sim & Device
Glass TV+Q Box(Dish antenna)+Stream
Sim & Device+Glass TV+BB & Talk
BB & Talk+Sports & Cinema+Stream
Q Box(Dish antenna)+Sports & Cinema+Sim & Device
Stream+Q Box(Dish antenna)+Sim & Device
BB & Talk+Stream+Glass TV
Glass TV+Sports & Cinema+Sim & Device
Sports & Cinema+Q Box(Dish antenna)+Glass TV
Sports & Cinema+Stream
BB & Talk+Sports & Cinema+Glass TV
Glass TV+Q Box(Dish antenna)+Sim & Device
BB & Talk+Sim & Device+Glass TV
Q Box(Dish antenna)+Sim & Device+Sports & Cinema
Q Box(Dish antenna)+Sports & Cinema+BB & Talk
Q Box(Dish antenna)+Sports & Cinema+Stream
Sports & Cinema+Sim & Device+Glass TV
Stream+BB & Talk+Sports & Cinema
Sports & Cinema+Glass TV+Q Box(Dish antenna)
Sim & Device+Q Box(Dish antenna)+Sports & Cinema
Sports & Cinema+Glass TV+BB & Talk
Sim & Device+Glass TV
Sports & Cinema+Q Box(Dish antenna)+BB & Talk
BB & Talk+Sim & Device+Stream
Sports & Cinema+BB & Talk+Stream
Glass TV+BB & Talk+Stream
Glass TV+BB & Talk+Sim & Device
Glass TV+Sim & Device+Stream
Sports & Cinema+Glass TV+Sim & Device
Q Box(Dish antenna)+Stream+Glass TV
Q Box(Dish antenna)+Glass TV+Sim & Device
Sim & Device+Sports & Cinema+Glass TV
Stream+Glass TV+Sim & Device
Stream+Sim & Device
Sim & Device+BB & Talk+Stream
BB & Talk+Q Box(Dish antenna)+Sports & Cinema
Stream+Sports & Cinema+BB & Talk
Sim & Device+Q Box(Dish antenna)+BB & Talk
Sim & Device+Stream+Sports & Cinema
Stream+Sim & Device+Sports & Cinema
Sim & Device+Q Box(Dish antenna)+Stream
`.trim().split('\n').map(s => s.trim());

const SALES_RULES = {
  interactionid: { type: 'pattern', label: 'interactionid', pattern: /^INT\d{7}$/, min: 1000000, max: 9999999 },
  Customer_Account: { type: 'number-string', label: 'Customer_Account', min: 70000000000, max: 90000000000 },
  Agent_ID: { type: 'pattern', label: 'Agent_ID', pattern: /^A\d{4}$/, min: 1000, max: 1998 },
  Agent_tenure: { type: 'enum', label: 'Agent_tenure', options: ['OJT(0-3 months)', 'BAU (above 3 months)'] },
  Location: { type: 'enum', label: 'Location', options: ['Bangalore', 'Hyderabad', 'Mumbai'] },
  Customer_Tenure_Segment: {
    type: 'enum',
    label: 'Customer_Tenure_Segment',
    options: ['Silver(0-3yrs)', 'Gold(3-8yrs)', 'Platinum (8-15yrs)', 'Diamond(15+years)'],
  },
  AHT_sec: { type: 'int', label: 'AHT_sec', min: 650, max: 1302 },
  Compliance_Miss: { type: 'int', label: 'Compliance_Miss', allowed: [0, 1] },
  'Num of existing product': { type: 'int', label: 'Num of existing product', allowed: [1, 2, 3] },
  Services: { type: 'enum', label: 'Services', options: SALES_SERVICE_OPTIONS },
  channel: { type: 'enum', label: 'channel', options: ['chat', 'Voice'] },
  number_of_prior_calls_90d: { type: 'int', label: 'number_of_prior_calls_90d', min: 0, max: 9 },
  time_since_last_success: { type: 'int', label: 'time_since_last_success', min: 0, max: 349 },
  call_sequence_position: { type: 'int', label: 'call_sequence_position', allowed: [1, 2, 3, 4] },
  escalation_flag: { type: 'int', label: 'escalation_flag', allowed: [0, 1] },
  time_of_day_bucket: { type: 'enum', label: 'time_of_day_bucket', options: ['Morning', 'Afternoon', 'Evening'] },
  seasonal_factor: { type: 'float', label: 'seasonal_factor', allowed: [1.0, 1.2] },
  pitchtype: { type: 'enum', label: 'pitchtype', options: ['Retention Save', 'Cross-sell Bundle', 'Upsell Add-on'] },
  primaryproductoffered: {
    type: 'enum',
    label: 'primaryproductoffered',
    options: [
      'TV + Broadband Bundle',
      'Broadband Superfast',
      'Mobile 5GB SIM',
      'Full Fibre 500',
      'Talk Anytime',
      'Cinema',
      'Sports',
      'Talk Evenings & Weekends',
      'Kids',
      'Full Fibre 150',
      'Mobile 30GB SIM',
      'Broadband Ultrafast',
      'Triple Play Bundle',
      'Entertainment',
      'Mobile Unlimited SIM',
    ],
  },
  compliancescore: { type: 'float', label: 'compliancescore', min: 0.38, max: 0.95 },
  sentimentscore: { type: 'float', label: 'sentimentscore', min: 0.05, max: 1.05 },
  last_nps: { type: 'float', label: 'last_nps', min: 0.0, max: 10.0 },
  day_of_week: {
    type: 'enum',
    label: 'day_of_week',
    options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  },
};

const validateSalesField = (field, value) => {
  const rule = SALES_RULES[field];
  if (!rule) return null;

  if (rule.type === 'enum') {
    const normalizeEnumValue = (input) => String(input ?? '')
      .replace(/\u00A0/g, ' ')
      .replace(/\s*\+\s*/g, '+')
      .replace(/\s+/g, ' ')
      .trim();

    const normalizedValue = normalizeEnumValue(value);
    const normalizedOptions = rule.options.map(normalizeEnumValue);

    if (!normalizedOptions.includes(normalizedValue)) {
      return `"${rule.label}" must be one of the accepted values.`;
    }
    return null;
  }

  if (rule.type === 'pattern') {
    const str = String(value || '');
    if (!rule.pattern.test(str)) {
      return `"${rule.label}" format is invalid.`;
    }
    const n = parseInt(str.replace(/\D/g, ''), 10);
    if ((rule.min != null && n < rule.min) || (rule.max != null && n > rule.max)) {
      return `"${rule.label}" must be in accepted range.`;
    }
    return null;
  }

  if (rule.type === 'number-string') {
    const n = Number(value);
    if (!Number.isFinite(n) || n < rule.min || n > rule.max) {
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

  if (rule.min != null && n < rule.min) {
    return `"${rule.label}" must be >= ${rule.min}.`;
  }
  if (rule.max != null && n > rule.max) {
    return `"${rule.label}" must be <= ${rule.max}.`;
  }
  if (rule.allowed && !rule.allowed.some(v => Number(v) === n)) {
    return `"${rule.label}" must be one of: ${rule.allowed.join(', ')}.`;
  }
  return null;
};

const SalesSimulationPanel = () => {
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
      const data = await fetchSalesAccounts();
      setRows(data);
    } catch (err) {
      console.error('Failed to fetch sales accounts:', err);
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

      const results = await predictSalesAccounts(rowsToRun);
      const resultMap = new Map(results.map((r) => [r.__rowId, r]));
      const merged = selectedRowIds.length > 0
        ? rows.map((r) => (resultMap.has(r.__rowId) ? resultMap.get(r.__rowId) : r))
        : results;

      setRows(merged);
      setHasOutput(true);
      setSelectedRowId(selectedRowIds.length > 0 ? selectedRowIds[0] : null);
      setSelectedRowIds([]);
    } catch (err) {
      console.error('Sales prediction failed:', err);
      actions.showToast({ message: err.message || 'Failed to run prediction model', type: 'warning' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyChanges = () => {
    for (const row of draftRows) {
      for (const [field] of Object.entries(SALES_RULES)) {
        const message = validateSalesField(field, row[field]);
        if (message) {
          actions.showToast({
            message: `${message} (Account ${row.Customer_Account})`,
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
    return buildSalesShapData(row);
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
        {hasOutput && selectedRow && <strong> (Account {selectedRow.Customer_Account} selected)</strong>}
      </p>

      {isInitialLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p className="loading-text">Loading sales accounts from backend...</p>
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
          <SalesDataTable
            rows={rows}
            draftRows={draftRows}
            setDraftRows={setDraftRows}
            setHasUnappliedChanges={setHasUnappliedChanges}
            editEnabled={editEnabled}
            hasOutput={hasOutput}
            selectedRowId={selectedRowId}
            selectedRowIds={selectedRowIds}
            onSelectRow={handleSelectRow}
            fieldRules={SALES_RULES}
            validateField={validateSalesField}
            showToast={actions.showToast}
          />
          <ShapAnalysis shapData={shapData} />
        </>
      )}
    </div>
  );
};

export default SalesSimulationPanel;
