import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ApplicationScorecardModelBanner from '../components/ApplicationScorecard/ApplicationScorecardModelBanner';
import ApplicationScorecardSimulationPanel from '../components/ApplicationScorecard/ApplicationScorecardSimulationPanel';

const ApplicationScorecardPredictionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="patient-collectability-page">
      <button type="button" className="back-btn" onClick={() => navigate('/')}>
        <i className="bi bi-arrow-left"></i>
        Back
      </button>

      <ApplicationScorecardModelBanner />
      <ApplicationScorecardSimulationPanel key={location.key} />
    </div>
  );
};

export default ApplicationScorecardPredictionPage;
