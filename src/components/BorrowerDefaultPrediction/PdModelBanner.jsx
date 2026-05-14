import React from 'react';

const PdModelBanner = () => {
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
            Estimates probability of borrower default using loan, bureau, and payment-behavior features.
          </p>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">
                <span className="stat-icon blue"></span>
                Algorithm
              </div>
              <div className="stat-value">Logistic Regression</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">
                <span className="stat-icon brown"></span>
                Model quality (test / OOT)
              </div>
              <div className="stat-value">
                <span className="big">AUC 0.820</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">
                <span className="stat-icon yellow"></span>
                Output
              </div>
              <div className="output-badges">
                <span className="badge-high">Green — Low default risk</span>
                <span className="badge-medium">Amber — Borderline</span>
                <span className="badge-low">Red — High default risk</span>
              </div>
            </div>
          </div>
        </div>

        <div className="banner-right">
          <div className="accuracy-card">
            <span className="accuracy-label">Accuracy (test)</span>
            <span className="accuracy-value">90.7%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdModelBanner;
