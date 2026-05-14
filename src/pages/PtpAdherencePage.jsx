import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PtpModelBanner from '../components/PtpAdherence/PtpModelBanner';
import PtpSimulationPanel from '../components/PtpAdherence/PtpSimulationPanel';

const PtpAdherencePage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="patient-collectability-page">
      <button className="back-btn" onClick={() => navigate('/')}>
        <i className="bi bi-arrow-left"></i>
        Back
      </button>

      <PtpModelBanner />
      <PtpSimulationPanel key={location.key} />
    </div>
  );
};

export default PtpAdherencePage;
