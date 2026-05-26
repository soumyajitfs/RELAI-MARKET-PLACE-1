import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import RollRateModelBanner from '../components/RollRate/RollRateModelBanner';
import RollRateSimulationPanel from '../components/RollRate/RollRateSimulationPanel';

const RollRatePredictionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="patient-collectability-page">
      <button type="button" className="back-btn" onClick={() => navigate('/')}>
        <i className="bi bi-arrow-left"></i>
        Back
      </button>

      <RollRateModelBanner />
      <RollRateSimulationPanel key={location.key} />
    </div>
  );
};

export default RollRatePredictionPage;
