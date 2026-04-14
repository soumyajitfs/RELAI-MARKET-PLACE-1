import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerLifecycleModelDetailBanner from '../components/CustomerLifecycle/CustomerLifecycleModelDetailBanner';
import CustomerLifecycleSimulationPanel from '../components/CustomerLifecycle/CustomerLifecycleSimulationPanel';
import customerLifecycleSubUseCases from '../data/customerLifecycleSubUseCases';

const defaultLifecycleSelectionId = customerLifecycleSubUseCases[0]?.id ?? null;

const CustomerLifecycleAnalyticsPage = () => {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(defaultLifecycleSelectionId);

  const selectedUseCase = useMemo(
    () => customerLifecycleSubUseCases.find((u) => u.id === selectedId) ?? null,
    [selectedId]
  );

  return (
    <div className="patient-collectability-page customer-lifecycle-analytics-page">
      <button type="button" className="back-btn" onClick={() => navigate('/')}>
        <i className="bi bi-arrow-left" />
        Back
      </button>

      <div className="lifecycle-hub-header">
        <h1 className="lifecycle-hub-title">Customer Lifecycle analytics</h1>
      </div>

      <div className="lifecycle-sub-button-row" role="tablist" aria-label="Customer lifecycle models">
        {customerLifecycleSubUseCases.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            className={`lifecycle-sub-btn ${selectedId === item.id ? 'active' : ''}`}
            aria-selected={selectedId === item.id}
            onClick={() => setSelectedId(item.id)}
          >
            {item.title}
          </button>
        ))}
      </div>

      {selectedUseCase && (
        <>
          <div className="lifecycle-detail-panel">
            <CustomerLifecycleModelDetailBanner useCase={selectedUseCase} />
          </div>
          {selectedUseCase.generateKey && (
            <CustomerLifecycleSimulationPanel
              key={selectedUseCase.id}
              generateKey={selectedUseCase.generateKey}
              modelTitle={selectedUseCase.title}
            />
          )}
        </>
      )}
    </div>
  );
};

export default CustomerLifecycleAnalyticsPage;
