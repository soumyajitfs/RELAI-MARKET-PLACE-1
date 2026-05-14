import React from 'react';

const EadModelBanner = () => {
  return (
    <div className="model-banner">
      <div className="banner-content">
        <div className="banner-left">
          <div className="badges-row">
            <span className="badge-classification">EAD — Retail Credit Card</span>
            <span className="badge-status">
              <span className="status-dot"></span>
              Active Usecase
            </span>
          </div>

          <p className="banner-description">
            Predicts expected credit card exposure at default: CCF from logistic regression on behavioral drivers.
          </p>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">
                <span className="stat-icon blue"></span>
                Algorithm
              </div>
              <div className="stat-value">Logistic regression</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">
                <span className="stat-icon brown"></span>
                ROC-AUC
              </div>
              <div className="stat-value">
                <span className="big">0.5154</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">
                <span className="stat-icon yellow"></span>
                Observations
              </div>
              <div className="stat-value">
                <span className="big">5,000</span>
              </div>
            </div>
          </div>
        </div>

        <div className="banner-right">
          <div className="accuracy-card">
            <span className="accuracy-label">CCF accuracy</span>
            <span className="accuracy-value">59.0%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EadModelBanner;
