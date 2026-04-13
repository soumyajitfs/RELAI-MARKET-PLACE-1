import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import UtilityModelBanner from '../components/UtilityPropensity/UtilityModelBanner';
import UtilitySimulationPanel from '../components/UtilityPropensity/UtilitySimulationPanel';

const UtilityPropensityPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
      <UtilityModelBanner />

      {/* key={location.key} forces a full fresh mount every time user navigates here */}
      <UtilitySimulationPanel key={location.key} />
    </div>
  );
};

export default UtilityPropensityPage;

