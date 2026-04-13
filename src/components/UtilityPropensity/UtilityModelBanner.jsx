import React from 'react';

const UtilityModelBanner = () => {
  return (
    <div className="model-banner">
      <div className="banner-content">
        <div className="banner-left">
          {/* Badges Row */}
          <div className="badges-row">
            <span className="badge-classification">Classification Model</span>
            <span className="badge-status">
              <span className="status-dot"></span>
              Active Usecase
            </span>
          </div>
          
          {/* Description */}
          <p className="banner-description">
            Propensity to Pay (P2P) model to predict the likelihood of repayment.
          </p>
          
          {/* Stats Grid */}
          <div className="stats-grid">
            {/* Algorithm */}
            <div className="stat-card">
              <div className="stat-label">
                <span className="stat-icon blue"></span>
                Algorithm
              </div>
              <div className="stat-value">Gradient Boosting</div>
            </div>
            
            {/* Training Data */}
            <div className="stat-card">
              <div className="stat-label">
                <span className="stat-icon brown"></span>
                Training Data
              </div>
              <div className="stat-value">
                <span className="big">10K</span>
                <span className="small">records</span>
              </div>
            </div>
            
            {/* Output */}
            <div className="stat-card">
              <div className="stat-label">
                <span className="stat-icon yellow"></span>
                Output
              </div>
              <div className="output-badges">
                <span className="badge-high">High-P2P</span>
                <span className="badge-medium">Medium-P2P</span>
                <span className="badge-low">Low-P2P</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Accuracy Card */}
        <div className="banner-right">
          <div className="accuracy-card">
            <span className="accuracy-label">Accuracy</span>
            <span className="accuracy-value">77%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UtilityModelBanner;

