import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LgdModelBanner from '../components/MortgageLgd/LgdModelBanner';
import LgdSimulationPanel from '../components/MortgageLgd/LgdSimulationPanel';

const MortgageLgdPredictionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="patient-collectability-page">
      <button className="back-btn" onClick={() => navigate('/')}>
        <i className="bi bi-arrow-left"></i>
        Back
      </button>

      <LgdModelBanner />
      <LgdSimulationPanel key={location.key} />
    </div>
  );
};

export default MortgageLgdPredictionPage;
