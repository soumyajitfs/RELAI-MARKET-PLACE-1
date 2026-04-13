import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ClaimsDenialModelBanner from '../components/ClaimsDenial/ClaimsDenialModelBanner';
import ClaimsDenialSimulationPanel from '../components/ClaimsDenial/ClaimsDenialSimulationPanel';

const ClaimsDenialPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="patient-collectability-page">
      <button className="back-btn" onClick={() => navigate('/')}>
        <i className="bi bi-arrow-left"></i>
        Back
      </button>

      <ClaimsDenialModelBanner />
      <ClaimsDenialSimulationPanel key={location.key} />
    </div>
  );
};

export default ClaimsDenialPage;
