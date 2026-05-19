import React from 'react';

const ApplicationScorecardModelBanner = () => (
  <div className="model-banner">
    <div className="banner-content">
      <div className="banner-left">
        <div className="badges-row">
          <span className="badge-classification">Classification Model</span>
          <span className="badge-status">
            <span className="status-dot"></span>
            Active Usecase
          </span>
        </div>

        <p className="banner-description">
          Scores personal loan applications at onboarding using a WoE-transformed logistic regression scorecard
          (300–900). Higher score indicates lower credit risk; decision bands drive approve, refer, or decline.
        </p>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">
              <span className="stat-icon blue"></span>
              Algorithm
            </div>
            <div className="stat-value">Logistic Regression (WoE)</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              <span className="stat-icon brown"></span>
              Training Data
            </div>
            <div className="stat-value">
              <span className="big">35,000</span>
              <span className="small">records</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              <span className="stat-icon yellow"></span>
              Output
            </div>
            <div className="stat-value">Scorecard Score (300–900)</div>
          </div>
        </div>
      </div>

      <div className="banner-right">
        <div className="accuracy-card">
          <span className="accuracy-label">Accuracy</span>
          <span className="accuracy-value">75.0%</span>
        </div>
      </div>
    </div>
  </div>
);

export default ApplicationScorecardModelBanner;
