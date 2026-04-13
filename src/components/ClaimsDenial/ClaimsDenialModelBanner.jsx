import React from 'react';

const ClaimsDenialModelBanner = () => {
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
            Predict claims that are likely to be denied by Healthcare payers.
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
                <span className="big">300</span>
                <span className="small">claims</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">
                <span className="stat-icon yellow"></span>
                Output
              </div>
              <div className="output-badges">
                <span className="badge-high">High</span>
                <span className="badge-medium">Medium</span>
                <span className="badge-low">Low</span>
              </div>
            </div>
          </div>
        </div>

        <div className="banner-right">
          <div className="accuracy-card">
            <span className="accuracy-label">Accuracy</span>
            <span className="accuracy-value">82%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaimsDenialModelBanner;
