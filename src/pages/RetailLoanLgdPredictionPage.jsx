import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import RetailLoanLgdModelBanner from '../components/RetailLoanLgd/RetailLoanLgdModelBanner';
import RetailLoanLgdSimulationPanel from '../components/RetailLoanLgd/RetailLoanLgdSimulationPanel';

const RetailLoanLgdPredictionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="patient-collectability-page">
      <button type="button" className="back-btn" onClick={() => navigate('/')}>
        <i className="bi bi-arrow-left"></i>
        Back
      </button>

      <RetailLoanLgdModelBanner />
      <RetailLoanLgdSimulationPanel key={location.key} />
    </div>
  );
};

export default RetailLoanLgdPredictionPage;
