import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerLifecycleSubCard from '../components/CustomerLifecycle/CustomerLifecycleSubCard';
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

      <div className="card-grid lifecycle-sub-grid">
        {customerLifecycleSubUseCases.map((item) => (
          <CustomerLifecycleSubCard
            key={item.id}
            title={item.title}
            description={item.description}
            problemType={item.problemType}
            isSelected={selectedId === item.id}
            onViewClick={() => setSelectedId(item.id)}
          />
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
