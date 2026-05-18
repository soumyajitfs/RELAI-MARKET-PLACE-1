import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LpiModelBanner from '../components/LatePaymentInterest/LpiModelBanner';
import LpiSimulationPanel from '../components/LatePaymentInterest/LpiSimulationPanel';

const LatePaymentInterestPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="patient-collectability-page">
      <button className="back-btn" onClick={() => navigate('/')}>
        <i className="bi bi-arrow-left"></i>
        Back
      </button>

      <LpiModelBanner />
      <LpiSimulationPanel key={location.key} />
    </div>
  );
};

export default LatePaymentInterestPage;
