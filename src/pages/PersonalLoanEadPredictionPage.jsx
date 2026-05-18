import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PersonalLoanEadModelBanner from '../components/PersonalLoanEad/PersonalLoanEadModelBanner';
import PersonalLoanEadSimulationPanel from '../components/PersonalLoanEad/PersonalLoanEadSimulationPanel';

const PersonalLoanEadPredictionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="patient-collectability-page">
      <button type="button" className="back-btn" onClick={() => navigate('/')}>
        <i className="bi bi-arrow-left"></i>
        Back
      </button>

      <PersonalLoanEadModelBanner />
      <PersonalLoanEadSimulationPanel key={location.key} />
    </div>
  );
};

export default PersonalLoanEadPredictionPage;
