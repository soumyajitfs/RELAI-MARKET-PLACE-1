import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SalesModelBanner from '../components/SalesOptimization/SalesModelBanner';
import SalesSimulationPanel from '../components/SalesOptimization/SalesSimulationPanel';

const SalesOptimizationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="patient-collectability-page">
      <button className="back-btn" onClick={() => navigate('/')}>
        <i className="bi bi-arrow-left"></i>
        Back
      </button>

      <SalesModelBanner />
      <SalesSimulationPanel key={location.key} />
    </div>
  );
};

export default SalesOptimizationPage;
