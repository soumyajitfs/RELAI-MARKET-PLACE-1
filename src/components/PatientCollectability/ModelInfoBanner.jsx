import React from 'react';

const ModelInfoBanner = () => {
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
            Machine learning model that predicts patient payment likelihood 
            based on historical financial behavior, demographic data, and payment patterns.
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
                <span className="big">32.8K</span>
                <span className="small">patient records</span>
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
            <span className="accuracy-value">83%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelInfoBanner;
