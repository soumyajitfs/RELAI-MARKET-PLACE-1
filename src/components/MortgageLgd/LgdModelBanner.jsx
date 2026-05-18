import React from 'react';

const LgdModelBanner = () => {
  return (
    <div className="model-banner">
      <div className="banner-content">
        <div className="banner-left">
          <div className="badges-row">
            <span className="badge-classification">Forecasting Model</span>
            <span className="badge-status">
              <span className="status-dot"></span>
              Active Usecase
            </span>
          </div>

          <p className="banner-description">
            Predicts the expected loss percentage on mortgage loans after borrower default using loan-to-value and loan purpose.
          </p>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">
                <span className="stat-icon blue"></span>
                Algorithm
              </div>
              <div className="stat-value">Beta Regression (GLM)</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">
                <span className="stat-icon brown"></span>
                Training Data
              </div>
              <div className="stat-value">
                <span className="big">2,542</span>
                <span className="small">defaulted mortgages</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">
                <span className="stat-icon yellow"></span>
                Output
              </div>
              <div className="stat-value">Predicted LGD %</div>
            </div>
          </div>
        </div>

        <div className="banner-right">
          <div className="accuracy-card">
            <span className="accuracy-label">Accuracy</span>
            <span className="accuracy-value">20.7%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LgdModelBanner;
