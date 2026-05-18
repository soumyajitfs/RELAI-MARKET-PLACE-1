import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import EadModelBanner from '../components/CreditCardEad/EadModelBanner';
import EadSimulationPanel from '../components/CreditCardEad/EadSimulationPanel';

const CreditCardEadPredictionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="patient-collectability-page">
      <button type="button" className="back-btn" onClick={() => navigate('/')}>
        <i className="bi bi-arrow-left"></i>
        Back
      </button>

      <EadModelBanner />
      <EadSimulationPanel key={location.key} />
    </div>
  );
};

export default CreditCardEadPredictionPage;
