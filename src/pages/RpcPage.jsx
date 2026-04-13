import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import RpcModelBanner from '../components/RpcContact/RpcModelBanner';
import RpcSimulationPanel from '../components/RpcContact/RpcSimulationPanel';

const RpcPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="patient-collectability-page">
      {/* Back Button */}
      <button className="back-btn" onClick={handleBack}>
        <i className="bi bi-arrow-left"></i>
        Back
      </button>

      {/* Model Info Banner */}
      <RpcModelBanner />

      {/* key={location.key} forces a full fresh mount every time user navigates here */}
      <RpcSimulationPanel key={location.key} />
    </div>
  );
};

export default RpcPage;

