import React from 'react';
import { useNavigate } from 'react-router-dom';
import ModelInfoBanner from '../components/PatientCollectability/ModelInfoBanner';
import SimulationPanel from '../components/PatientCollectability/SimulationPanel';

const PatientCollectabilityPage = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="patient-collectability-page">
      {/* Back Button */}
      <button className="back-btn" onClick={handleBack}>
        <i className="bi bi-arrow-left"></i>
        Back
      </button>

      {/* Model Info Banner */}
      <ModelInfoBanner />

      {/* Simulation Panel with Data Table */}
      <SimulationPanel />
    </div>
  );
};

export default PatientCollectabilityPage;
