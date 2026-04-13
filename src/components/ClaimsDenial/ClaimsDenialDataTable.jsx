import React, { useMemo, useState } from 'react';

const INTERNAL_KEYS = new Set([
  '__rowId',
  'clmId',
  'probability',
  'probabilityPercent',
  'category',
  'shapValues',
]);

const FORCE_DROPDOWN_FIELDS = new Set([
  'Payer Name',
  'Type Bill',
  'Admit Type',
  'Admit Source',
  'Pat Status',
  'Claim Class',
  'CPT_AJ',
  'CPT_Anesthesia',
  'CPT_E&M',
  'CPT_Medicine',
  'CPT_Pathology & Lab',
  'CPT_Radiology',
  'CPT_Surgery',
  'REV_All Inclusive Rate',
  'REV_Anesthesia',
  'REV_CT Scan',
  'REV_Clinic',
  'REV_Emergency Room',
  'REV_Intensive Care Unit',
  'REV_Laboratory',
  'REV_Medical/Surgical Supplies and Devices',
  'REV_Occupational Therapy',
  'REV_Operating Room Services',
  'REV_Pharmacy',
  'REV_Physical Therapy',
  'REV_Professional Fees',
  'REV_Pulmonary Function',
  'REV_Radiology',
  'REV_Room & Board',
  'REV_Speech Therapy',
]);

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

const ClaimsDenialDataTable = ({
  rows,
  draftRows,
  setDraftRows,
  setHasUnappliedChanges,
  editEnabled,
  hasOutput,
  selectedRowId,
  selectedRowIds = [],
  onSelectRow,
  fieldRules,
  validateField,
  showToast,
}) => {
  const [showInputCols, setShowInputCols] = useState(false);

  const baseRows = editEnabled ? draftRows : rows;
  const displayRows = hasOutput
    ? baseRows.filter((r) => r.probabilityPercent != null)
    : baseRows;

  const inputColumns = useMemo(() => {
    const sample = displayRows[0] || baseRows[0];
    if (!sample) return [];
    return Object.keys(sample).filter((key) => {
      if (INTERNAL_KEYS.has(key)) return false;
      if (key === 'Claim_ID') return false;
      return true;
    });
  }, [displayRows, baseRows]);

  const handleFieldChange = (rowId, field, value) => {
    if (!setDraftRows || !setHasUnappliedChanges) return;
    setDraftRows((prev) => prev.map((r) => (r.__rowId === rowId ? { ...r, [field]: value } : r)));
    setHasUnappliedChanges(true);
  };

  const renderCell = (row, key) => {
    const value = row[key];
    if (!editEnabled) return value ?? '—';

    const rule = fieldRules?.[key];
    if (rule?.editable === false) return value ?? '—';

    const shouldForceDropdown = FORCE_DROPDOWN_FIELDS.has(key);
    const dropdownOptions = rule?.type === 'enum' ? (rule.values || []) : [];

    if (shouldForceDropdown && dropdownOptions.length > 0) {
      return (
        <select
          value={value ?? ''}
          onChange={(e) => handleFieldChange(row.__rowId, key, e.target.value)}
          onBlur={(e) => {
            if (!validateField) return;
            const msg = validateField(key, e.target.value);
            if (msg) showToast({ message: msg, type: 'warning' });
          }}
        >
          {dropdownOptions.map((opt) => (
            <option key={`${key}-${opt}`} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (rule?.type === 'date') {
      return (
        <input
          type="date"
          value={value ?? ''}
          min={rule.min}
          max={rule.max}
          onChange={(e) => handleFieldChange(row.__rowId, key, e.target.value)}
          onBlur={(e) => {
            if (!validateField) return;
            const msg = validateField(key, e.target.value);
            if (msg) showToast({ message: msg, type: 'warning' });
          }}
        />
      );
    }

    if (typeof value === 'number' || rule?.type === 'int' || rule?.type === 'float') {
      return (
        <input
          type="number"
          value={value ?? ''}
          min={rule?.min}
          max={rule?.max}
          step={rule?.type === 'int' ? 1 : 'any'}
          onChange={(e) => {
            const raw = e.target.value;
            handleFieldChange(row.__rowId, key, raw === '' ? '' : Number(raw));
          }}
          onBlur={(e) => {
            if (!validateField) return;
            const msg = validateField(key, e.target.value);
            if (msg) showToast({ message: msg, type: 'warning' });
          }}
        />
      );
    }

    return (
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => handleFieldChange(row.__rowId, key, e.target.value)}
        onBlur={(e) => {
          if (!validateField) return;
          const msg = validateField(key, e.target.value);
          if (msg) showToast({ message: msg, type: 'warning' });
        }}
      />
    );
  };

  const renderInputCells = (row) => (
    <>
      {inputColumns.map((key) => (
        <td key={`${row.__rowId}-${key}`}>{renderCell(row, key)}</td>
      ))}
    </>
  );

  if (!hasOutput) {
    return (
      <div>
        <div className="table-section-label">
          <i className="bi bi-table"></i> INPUT Data
        </div>
        <div className="data-table-wrapper">
          <table
            className={`data-table ${editEnabled ? 'claims-denial-edit-table' : ''}`}
            style={{ minWidth: `${Math.max(3200, inputColumns.length * 220)}px` }}
          >
            <thead>
              <tr>
                <th style={{ width: '50px' }}><i className="bi bi-filter"></i> Select</th>
                <th style={{ width: '180px' }}>Claim ID</th>
                {inputColumns.map((key) => (
                  <th key={key} style={{ width: '220px' }}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={inputColumns.length + 2} style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
                    No claims loaded.
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
                          onChange={() => onSelectRow(row.__rowId)}
                        />
                      </td>
                      <td><strong>{row.Claim_ID}</strong></td>
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
          style={showInputCols ? { minWidth: `${Math.max(2600, inputColumns.length * 160)}px` } : undefined}
        >
          <thead>
            <tr>
              <th style={{ width: showInputCols ? '50px' : '10%' }}><i className="bi bi-filter"></i> Select</th>
              <th style={{ width: showInputCols ? '180px' : '25%' }}>Claim ID</th>
              <th style={{ width: showInputCols ? '40px' : '7%' }} title="Toggle input columns"></th>
              <th style={{ width: showInputCols ? '220px' : '35%' }}>Denial Probability %</th>
              <th style={{ width: showInputCols ? '120px' : '23%' }}>Category</th>
              {showInputCols && inputColumns.map((key) => (
                <th key={`out-${key}`} style={{ width: '150px' }}>{key}</th>
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
                      disabled={isFrozen}
                      onChange={() => onSelectRow(row.__rowId)}
                    />
                  </td>
                  <td><strong>{row.Claim_ID}</strong></td>
                  <td>
                    <div
                      className={`expand-toggle ${showInputCols ? 'expanded' : ''}`}
                      onClick={() => setShowInputCols((prev) => !prev)}
                      title={showInputCols ? 'Hide input columns' : 'Show input columns'}
                    >
                      {showInputCols ? '−' : '+'}
                    </div>
                  </td>
                  <td>
                    <span style={{ color: getCategoryColor(row.category) }}>
                      {row.probabilityPercent != null ? `${row.probabilityPercent.toFixed(1)}%` : '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`category-badge ${getCategoryClass(row.category)}`}>
                      {row.category || '—'}
                    </span>
                  </td>
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

export default ClaimsDenialDataTable;
