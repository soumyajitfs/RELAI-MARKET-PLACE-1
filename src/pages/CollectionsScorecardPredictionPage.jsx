import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CollectionsScorecardModelBanner from '../components/CollectionsScorecard/CollectionsScorecardModelBanner';
import CollectionsScorecardSimulationPanel from '../components/CollectionsScorecard/CollectionsScorecardSimulationPanel';

const CollectionsScorecardPredictionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="patient-collectability-page">
      <button type="button" className="back-btn" onClick={() => navigate('/')}>
        <i className="bi bi-arrow-left"></i>
        Back
      </button>

      <CollectionsScorecardModelBanner />
      <CollectionsScorecardSimulationPanel key={location.key} />
    </div>
  );
};

export default CollectionsScorecardPredictionPage;
