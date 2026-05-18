import React from 'react';

const ProbabilityFormula = ({ baseValue, shapSum, logOdds, probability }) => {
  const pct = (probability * 100).toFixed(2);
  const signedSum = shapSum >= 0 ? `+${shapSum.toFixed(3)}` : shapSum.toFixed(3);

  return (
    <div className="prob-formula">
      <h5 className="fw-bold mb-3">
        Probability Decomposition &amp; Formula
      </h5>

      <div className="formula-card">

        {/* Step 1 */}
        <div className="formula-step">
          <strong>1. Base log-odds from model:</strong>{' '}
          <code>{baseValue.toFixed(3)}</code>
        </div>

        {/* Step 2 */}
        <div className="formula-step">
          <strong>2. Sum of all feature contributions:</strong>{' '}
          <code>{signedSum}</code>
        </div>

        {/* Step 3 */}
        <div className="formula-step">
          <strong>3. Calculate final log-odds:</strong>
          <div className="formula-indent">
            <code>log_odds = base_value + Σ(feature contributions)</code>
          </div>
          <div className="formula-indent">
            <code>= {baseValue.toFixed(3)} + ({signedSum})</code>
          </div>
          <div className="formula-indent">
            <code>= {logOdds.toFixed(3)}</code>
          </div>
        </div>

        {/* Step 4 */}
        <div className="formula-step">
          <strong>4. Convert log-odds to probability:</strong>
          <div className="formula-indent">
            <code>probability = 1 / (1 + e^(-log_odds))</code>
          </div>
          <div className="formula-indent">
            <code>= 1 / (1 + e^(-({logOdds.toFixed(3)})))</code>
          </div>
        </div>

        {/* Final result */}
        <div className="formula-result">
          <strong>Final Predicted Probability:</strong>{' '}
          <span className="prob-value">{pct}%</span>
        </div>

      </div>
    </div>
  );
};

export default ProbabilityFormula;
