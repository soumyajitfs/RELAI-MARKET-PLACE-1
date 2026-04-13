import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AmlModelBanner from '../components/AmlAlert/AmlModelBanner';
import AmlSimulationPanel from '../components/AmlAlert/AmlSimulationPanel';

const AmlAlertPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="patient-collectability-page">
      <button className="back-btn" onClick={handleBack}>
        <i className="bi bi-arrow-left"></i>
        Back
      </button>

      <AmlModelBanner />
      <AmlSimulationPanel key={location.key} />
    </div>
  );
};

export default AmlAlertPage;
