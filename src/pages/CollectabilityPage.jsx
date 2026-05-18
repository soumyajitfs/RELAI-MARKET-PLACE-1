import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CollectabilityModelBanner from '../components/Collectability/CollectabilityModelBanner';
import CollectabilitySimulationPanel from '../components/Collectability/CollectabilitySimulationPanel';

const CollectabilityPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="patient-collectability-page">
      <button className="back-btn" onClick={() => navigate('/')}>
        <i className="bi bi-arrow-left"></i>
        Back
      </button>

      <CollectabilityModelBanner />
      <CollectabilitySimulationPanel key={location.key} />
    </div>
  );
};

export default CollectabilityPage;
