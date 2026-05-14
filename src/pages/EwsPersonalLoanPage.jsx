import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import EwsModelBanner from '../components/EwsPersonalLoan/EwsModelBanner';
import EwsSimulationPanel from '../components/EwsPersonalLoan/EwsSimulationPanel';

const EwsPersonalLoanPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="patient-collectability-page">
      <button className="back-btn" onClick={() => navigate('/')}>
        <i className="bi bi-arrow-left"></i>
        Back
      </button>

      <EwsModelBanner />
      <EwsSimulationPanel key={location.key} />
    </div>
  );
};

export default EwsPersonalLoanPage;
