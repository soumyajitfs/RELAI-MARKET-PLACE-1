import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PdModelBanner from '../components/BorrowerDefaultPrediction/PdModelBanner';
import PdSimulationPanel from '../components/BorrowerDefaultPrediction/PdSimulationPanel';

const BorrowerDefaultPredictionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="patient-collectability-page">
      <button className="back-btn" onClick={() => navigate('/')}>
        <i className="bi bi-arrow-left"></i>
        Back
      </button>

      <PdModelBanner />
      <PdSimulationPanel key={location.key} />
    </div>
  );
};

export default BorrowerDefaultPredictionPage;
