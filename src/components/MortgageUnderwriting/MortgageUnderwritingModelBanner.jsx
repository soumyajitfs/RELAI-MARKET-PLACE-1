import React from 'react';

const MortgageUnderwritingModelBanner = () => {
  return (
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
            Predicts underwriting decisions using financial and risk data, with confidence scores to support consistent, risk-aware decision-making.
          </p>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">
                <span className="stat-icon blue"></span>
                Algorithm
              </div>
              <div className="stat-value">XGBoost</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">
                <span className="stat-icon brown"></span>
                Training Data
              </div>
              <div className="stat-value">
                <span className="big">8000</span>
                <span className="small">records</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">
                <span className="stat-icon yellow"></span>
                Output
              </div>
              <div className="output-badges">
                <span className="badge-high">Approved</span>
                <span className="badge-medium">Declined</span>
                <span className="badge-low">Cancelled</span>
                <span className="badge-medium">Suspended</span>
              </div>
            </div>
          </div>
        </div>

        <div className="banner-right">
          <div className="accuracy-card">
            <span className="accuracy-label">Accuracy</span>
            <span className="accuracy-value">80%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MortgageUnderwritingModelBanner;
