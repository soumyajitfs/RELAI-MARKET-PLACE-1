import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MortgageUnderwritingModelBanner from '../components/MortgageUnderwriting/MortgageUnderwritingModelBanner';
import MortgageUnderwritingSimulationPanel from '../components/MortgageUnderwriting/MortgageUnderwritingSimulationPanel';

const MortgageUnderwritingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="patient-collectability-page">
      <button className="back-btn" onClick={() => navigate('/')}>
        <i className="bi bi-arrow-left"></i>
        Back
      </button>

      <MortgageUnderwritingModelBanner />
      <MortgageUnderwritingSimulationPanel key={location.key} />
    </div>
  );
};

export default MortgageUnderwritingPage;
