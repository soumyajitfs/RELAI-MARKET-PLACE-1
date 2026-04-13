import React, { useMemo } from 'react';
import ShapChart from '../PatientCollectability/ShapChart';
import '../PatientCollectability/ShapAnalysis.css';

const CAT_THEME = {
  'Super High': { color: '#047857', bg: 'rgba(16,185,129,0.07)', border: '#10b981' },
  High: { color: '#047857', bg: 'rgba(16,185,129,0.07)', border: '#10b981' },
  Medium: { color: '#92400e', bg: 'rgba(245,158,11,0.07)', border: '#f59e0b' },
  Low: { color: '#b91c1c', bg: 'rgba(239,68,68,0.07)', border: '#ef4444' },
};

const probabilityLabelMap = {
  Collectability: 'Collectability Probability',
  'Right Party Contact (RPC)': 'RPC Probability',
  'Conversion Likelihood': 'Conversion Probability',
  'AML Alert Risk': 'Risk Probability',
  'Churn Risk': 'Churn Probability',
  'Late Payment Risk': 'Late Interest Probability',
  'Claim Denial': 'Claim Denial Probability',
  'Underwriting Approval': 'Confidence Score Probability',
  'Customer Lifecycle': 'Prediction probability',
};

/**
 * Same layout as PatientCollectability ShapAnalysis; driven by buildLifecycleShapData.
 */
const CustomerLifecycleShapAnalysis = ({ shapData }) => {
  const features = useMemo(() => shapData?.features || [], [shapData]);
  const predictedCategory = shapData?.predictedCategory || '';
  const categoryDisplayLabel = shapData?.categoryDisplayLabel || predictedCategory;
  const categoryContextLabel = shapData?.categoryContextLabel || 'Customer Lifecycle';
  const factorContextLabel = shapData?.factorContextLabel || '';
  const legendHighText = shapData?.legendHighText || 'Increases predicted output';
  const legendLowText = shapData?.legendLowText || 'Decreases predicted output';

  const { leftFactors, rightFactors } = useMemo(() => {
    if (features.length === 0) return { leftFactors: [], rightFactors: [] };
    const sorted = [...features];

    if (predictedCategory === 'High' || predictedCategory === 'Super High') {
      const positiveOnly = sorted.filter((f) => f.impact >= 0);
      positiveOnly.sort((a, b) => b.impact - a.impact);
      const top6 = positiveOnly.slice(0, 6);
      return { leftFactors: top6.slice(0, 3), rightFactors: top6.slice(3, 6) };
    }
    if (predictedCategory === 'Low') {
      const negativeOnly = sorted.filter((f) => f.impact < 0);
      negativeOnly.sort((a, b) => a.impact - b.impact);
      const top6 = negativeOnly.slice(0, 6);
      return { leftFactors: top6.slice(0, 3), rightFactors: top6.slice(3, 6) };
    }
    const positiveSorted = sorted.filter((f) => f.impact >= 0).sort((a, b) => b.impact - a.impact);
    const negativeSorted = sorted.filter((f) => f.impact < 0).sort((a, b) => a.impact - b.impact);
    return { leftFactors: positiveSorted.slice(0, 3), rightFactors: negativeSorted.slice(0, 3) };
  }, [features, predictedCategory]);

  const top3Toward = leftFactors;
  const top3Against = rightFactors;

  if (!shapData) return null;

  const { facsNumber, probability, primaryMetric, probabilityLabel: overrideProbLabel } = shapData;
  const pct = (probability * 100).toFixed(2);

  const theme = CAT_THEME[predictedCategory] || CAT_THEME.Low;
  const resolvedCategory = predictedCategory || 'Low';
  const resolvedDisplayCategory = categoryDisplayLabel || resolvedCategory;
  /** Lifecycle models: badge shows use-case name only (no "High —" / "Medium —" prefix). */
  const catBadgeLabel = categoryContextLabel;

  const isLow = predictedCategory === 'Low';
  const probabilityLabel =
    overrideProbLabel ||
    probabilityLabelMap[categoryContextLabel] ||
    'Prediction probability';

  const withFactorContext = (text) =>
    factorContextLabel ? `${text} ${factorContextLabel}` : text;
  const singleLabel = withFactorContext('TOP FACTORS');

  const allFactors = [...top3Toward, ...top3Against];
  const maxAbsAll = allFactors.length > 0 ? Math.max(...allFactors.map((t) => Math.abs(t.impact))) : 1;
  const useCompactProbBox = allFactors.length <= 1;

  const bottomLabel = primaryMetric ? primaryMetric.label : probabilityLabel;
  const bottomValue = primaryMetric ? primaryMetric.value : `${pct}%`;

  return (
    <div className="shap-analysis-section">
      <hr className="my-4" />

      <h4 className="fw-bold mb-1">SHAP Analysis</h4>
      <small className="text-muted d-block mb-3">
        Showing SHAP analysis for Account # {facsNumber}
      </small>

      <div className="card shap-card">
        <div className="card-body">
          <h5 className="shap-title">Why this prediction?</h5>

          <div className="shap-two-col">
            <div className="shap-col-chart">
              <ShapChart
                features={features}
                predictedCategory={predictedCategory}
                categoryLabel={resolvedDisplayCategory}
              />

              <div className="shap-legend text-center mt-2">
                <span className="legend-green">
                  <i
                    className="bi bi-circle-fill"
                    style={{ fontSize: '6px', marginRight: '4px', verticalAlign: 'middle' }}
                  />
                  {legendHighText}
                </span>
                <span className="mx-2" style={{ color: '#cbd5e1' }}>
                  |
                </span>
                <span className="legend-red">
                  <i
                    className="bi bi-circle-fill"
                    style={{ fontSize: '6px', marginRight: '4px', verticalAlign: 'middle' }}
                  />
                  {legendLowText}
                </span>
              </div>
            </div>

            <div className="shap-col-info">
              <div className="info-badges">
                <span
                  className="shap-cat-badge"
                  style={{ color: theme.color, background: theme.bg, borderColor: theme.border }}
                >
                  <i className="bi bi-tag-fill" style={{ fontSize: '10px' }} />
                  {catBadgeLabel}
                </span>
              </div>

              <div className="info-divider" />

              <div
                className={`top-factors-label text-center mb-3 ${
                  isLow ? 'top-factors-label--against' : 'top-factors-label--toward'
                }`}
                style={{ justifyContent: 'center' }}
              >
                <i className={`bi ${isLow ? 'bi-arrow-down-circle-fill' : 'bi-arrow-up-circle-fill'}`} />
                {singleLabel}
              </div>

              <div className="factors-two-col">
                <div className="top-factors-compact">
                  {top3Toward.map((f, idx) => {
                    const isPos = f.impact >= 0;
                    const barColor = isPos ? '#10b981' : '#ef4444';
                    const scoreColor = isPos ? '#047857' : '#b91c1c';
                    const sign = isPos ? '+' : '';
                    const barW = (Math.abs(f.impact) / maxAbsAll) * 100;
                    return (
                      <div key={idx} className="tf-row">
                        <div className="tf-rank" style={{ color: theme.color }}>
                          #{idx + 1}
                        </div>
                        <div className="tf-body">
                          <div className="tf-name-line">
                            <span className="tf-name">{f.name}</span>
                            <span className="tf-score" style={{ color: scoreColor }}>
                              {sign}
                              {f.impact.toFixed(2)}
                            </span>
                          </div>
                          <span className="tf-val">= {f.value}</span>
                          <div className="tf-bar-track">
                            <div className="tf-bar-fill" style={{ width: `${barW}%`, background: barColor }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="top-factors-compact">
                  {top3Against.map((f, idx) => {
                    const isPos = f.impact >= 0;
                    const barColor = isPos ? '#10b981' : '#ef4444';
                    const scoreColor = isPos ? '#047857' : '#b91c1c';
                    const sign = isPos ? '+' : '';
                    const barW = (Math.abs(f.impact) / maxAbsAll) * 100;
                    const rankNum = idx + 4;
                    return (
                      <div key={idx} className="tf-row">
                        <div className="tf-rank" style={{ color: theme.color }}>
                          #{rankNum}
                        </div>
                        <div className="tf-body">
                          <div className="tf-name-line">
                            <span className="tf-name">{f.name}</span>
                            <span className="tf-score" style={{ color: scoreColor }}>
                              {sign}
                              {f.impact.toFixed(2)}
                            </span>
                          </div>
                          <span className="tf-val">= {f.value}</span>
                          <div className="tf-bar-track">
                            <div className="tf-bar-fill" style={{ width: `${barW}%`, background: barColor }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="info-divider" />

              <div
                className={`shap-prob-box-bottom ${useCompactProbBox ? 'shap-prob-box-bottom--compact' : ''}`}
              >
                <span className="prob-label-bottom">{bottomLabel}</span>
                <span className="prob-value-bottom" style={{ color: theme.color }}>
                  {bottomValue}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerLifecycleShapAnalysis;
