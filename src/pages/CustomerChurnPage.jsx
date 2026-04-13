import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ChurnModelBanner from '../components/CustomerChurn/ChurnModelBanner';
import ChurnSimulationPanel from '../components/CustomerChurn/ChurnSimulationPanel';

const CustomerChurnPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="patient-collectability-page">
      <button className="back-btn" onClick={() => navigate('/')}>
        <i className="bi bi-arrow-left"></i>
        Back
      </button>

      <ChurnModelBanner />
      <ChurnSimulationPanel key={location.key} />
    </div>
  );
};

export default CustomerChurnPage;
