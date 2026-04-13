import React from 'react';

const CustomerLifecycleModelDetailBanner = ({ useCase }) => {
  if (!useCase) return null;

  const isRegression = useCase.problemType === 'Regression';

  return (
    <div className="model-banner customer-lifecycle-model-banner">
      <div className="banner-content customer-lifecycle-banner-content">
        <div className="banner-left">
          <div className="badges-row">
            {isRegression ? (
              <span className="badge-regression">Regression Model</span>
            ) : (
              <span className="badge-classification">Classification Model</span>
            )}
            <span className="badge-status">
              <span className="status-dot" />
              Active Usecase
            </span>
          </div>

          <p className="banner-description">{useCase.description}</p>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">
                <span className="stat-icon blue"></span>
                Algorithm
              </div>
              <div className="stat-value">{useCase.algorithm}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">
                <span className="stat-icon brown"></span>
                Training Data
              </div>
              <div className="stat-value">
                <span className="big">{useCase.trainingSize.toLocaleString()}</span>
                <span className="small">records</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">
                <span className="stat-icon yellow"></span>
                Output
              </div>
              {useCase.outputMode === 'predictedValue' ? (
                <div className="stat-value lifecycle-output-value">Predicted Value</div>
              ) : (
                <div className="output-badges">
                  <span className="badge-high">High</span>
                  <span className="badge-medium">Medium</span>
                  <span className="badge-low">Low</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerLifecycleModelDetailBanner;
