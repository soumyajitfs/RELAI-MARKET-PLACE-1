import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BehaviouralScorecardModelBanner from '../components/BehaviouralScorecard/BehaviouralScorecardModelBanner';
import BehaviouralScorecardSimulationPanel from '../components/BehaviouralScorecard/BehaviouralScorecardSimulationPanel';

const BehaviouralScorecardPredictionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="patient-collectability-page">
      <button type="button" className="back-btn" onClick={() => navigate('/')}>
        <i className="bi bi-arrow-left"></i>
        Back
      </button>

      <BehaviouralScorecardModelBanner />
      <BehaviouralScorecardSimulationPanel key={location.key} />
    </div>
  );
};

export default BehaviouralScorecardPredictionPage;
