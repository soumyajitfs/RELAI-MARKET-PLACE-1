import React, { useMemo } from 'react';
import ShapChart from './ShapChart';
import { formatShapFeatureValueForUi, formatShapImpactLabel, chartVisualTone } from '../../utils/shapDisplayFormat';
import './ShapAnalysis.css';

/* ── Refined category palette ── */
const CAT_THEME = {
  'Super High': { color: '#047857', bg: 'rgba(16,185,129,0.07)', border: '#10b981' },
  High:   { color: '#047857', bg: 'rgba(16,185,129,0.07)', border: '#10b981' },
  Medium: { color: '#92400e', bg: 'rgba(245,158,11,0.07)', border: '#f59e0b' },
  Low:    { color: '#b91c1c', bg: 'rgba(239,68,68,0.07)',  border: '#ef4444' },
};

/** EWS: fill up to six factor cards (Amber-style) even when SHAP is one-sided. */
const splitFactorsEwsStyle = (sorted) => {
  const positiveSorted = sorted.filter((f) => f.impact > 0).sort((a, b) => b.impact - a.impact);
  const negativeSorted = sorted.filter((f) => f.impact < 0).sort((a, b) => a.impact - b.impact);
  let left = positiveSorted.slice(0, 3);
  let right = negativeSorted.slice(0, 3);
  const taken = new Set([...left, ...right].map((f) => f.name));
  const byAbs = [...sorted].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  for (const f of byAbs) {
    if (taken.has(f.name)) continue;
    if (left.length + right.length >= 6) break;
    if (left.length < 3) {
      left.push(f);
      taken.add(f.name);
    } else if (right.length < 3) {
      right.push(f);
      taken.add(f.name);
    }
  }
  return { leftFactors: left.slice(0, 3), rightFactors: right.slice(0, 3) };
};

const ShapAnalysis = ({ shapData }) => {
  const features = useMemo(() => shapData?.features || [], [shapData]);
  const predictedCategory = shapData?.predictedCategory || '';
  const themeCategory = shapData?.themeCategory ?? predictedCategory;
  const categoryDisplayLabel = shapData?.categoryDisplayLabel || predictedCategory;
  /** Optional: chart-only title (e.g. Credit Card EAD “% EXPECTED CCF”) so badge/factors match other use cases. */
  const chartHeaderLabel = shapData?.chartHeaderLabel ?? categoryDisplayLabel;
  const categoryContextLabel = shapData?.categoryContextLabel || 'Propensity to Pay (P2P)';
  const factorContextLabel = shapData?.factorContextLabel || '';
  const legendHighText = shapData?.legendHighText || 'Increases probability toward High P2P';
  const legendLowText = shapData?.legendLowText || 'Decreases probability toward Low P2P';
  const invertShapImpactColors = shapData?.invertShapImpactColors === true;
  const impactLabelsOnRight = shapData?.impactLabelsOnRight === true;
  const headerLabels = shapData?.headerLabels || null;
  const compactShap = shapData?.compactShap === true;

  // For High/Low: show top 6 same-direction factors (3 left, 3 right)
  // For Medium: keep existing toward/against behavior
  const { leftFactors, rightFactors } = useMemo(() => {
    if (features.length === 0) return { leftFactors: [], rightFactors: [] };
    const sorted = [...features];

    if (invertShapImpactColors) {
      return splitFactorsEwsStyle(sorted);
    }

    if (predictedCategory === 'High' || predictedCategory === 'Super High') {
      // Top 6 positive (green) factors only
      const positiveOnly = sorted.filter(f => f.impact >= 0);
      positiveOnly.sort((a, b) => b.impact - a.impact);
      const top6 = positiveOnly.slice(0, 6);
      return { leftFactors: top6.slice(0, 3), rightFactors: top6.slice(3, 6) };
    } else if (predictedCategory === 'Low') {
      // Top 6 negative (red) factors only
      const negativeOnly = sorted.filter(f => f.impact < 0);
      negativeOnly.sort((a, b) => a.impact - b.impact);   // most negative first
      const top6 = negativeOnly.slice(0, 6);
      return { leftFactors: top6.slice(0, 3), rightFactors: top6.slice(3, 6) };
    } else {
      // Medium: toward vs against (existing behavior)
      const toward = [...sorted];
      toward.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
      const against = [...sorted];
      against.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
      // For medium, split positive toward and negative against
      const positiveSorted = sorted.filter((f) => f.impact > 0).sort((a, b) => b.impact - a.impact);
      const negativeSorted = sorted.filter((f) => f.impact < 0).sort((a, b) => a.impact - b.impact);
      return { leftFactors: positiveSorted.slice(0, 3), rightFactors: negativeSorted.slice(0, 3) };
    }
  }, [features, predictedCategory, invertShapImpactColors]);

  const compactFactors = useMemo(() => {
    if (!compactShap || features.length === 0) return [];
    return [...features].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  }, [compactShap, features]);

  // Aliases for backward compat in rendering
  const top3Toward = leftFactors;
  const top3Against = rightFactors;

  if (!shapData) return null;

  const { facsNumber, probability } = shapData;
  const probabilityDisplay =
    shapData?.probabilityDisplay != null && String(shapData.probabilityDisplay).trim() !== ''
      ? String(shapData.probabilityDisplay)
      : null;
  const pct = (probability * 100).toFixed(2);

  const theme = CAT_THEME[themeCategory] || CAT_THEME.Low;
  const resolvedCategory = predictedCategory || 'Low';
  const resolvedDisplayCategory = categoryDisplayLabel || resolvedCategory;
  const chartCategoryLabel = chartHeaderLabel || resolvedDisplayCategory;
  /** Credit Card EAD & Borrower Default: badge is only the use-case name (no tier prefix). */
  const hideTierPrefix =
    categoryContextLabel === 'Credit Card EAD Prediction' ||
    categoryContextLabel === 'Borrower Default Prediction' ||
    categoryContextLabel === 'Mortgage LGD Prediction' ||
    categoryContextLabel === 'Personal Loan EAD Prediction';
  const catBadgeLabel = hideTierPrefix
    ? categoryContextLabel
    : `${resolvedDisplayCategory} — ${categoryContextLabel}`;

  const isLow = themeCategory === 'Low';
  const probabilityLabelMap = {
    Collectability: 'Collectability Probability',
    'Right Party Contact (RPC)': 'RPC Probability',
    'Conversion Likelihood': 'Conversion Probability',
    'AML Alert Risk': 'Risk Probability',
    'Churn Risk': 'Churn Probability',
    'Late Payment Risk': 'Late Interest Probability',
    'Claim Denial': 'Claim Denial Probability',
    'Underwriting Approval': 'Confidence Score Probability',
    'EWS Risk Tier': 'Model confidence',
    'PTP Adherence': 'PTP kept probability',
    'Borrower Default Prediction': 'Probability of default',
    'Credit Card EAD Prediction': 'Expected CCF (model output)',
    'Mortgage LGD Prediction': 'Predicted LGD',
    'Personal Loan EAD Prediction': 'Predicted EAD',
  };
  const probabilityLabel = probabilityLabelMap[categoryContextLabel] || 'P2P Probability';

  const withFactorContext = (text) => (
    factorContextLabel ? `${text} ${factorContextLabel}` : text
  );
  const singleLabel = hideTierPrefix
    ? withFactorContext('TOP FACTORS')
    : categoryDisplayLabel
      ? withFactorContext(`TOP ${String(categoryDisplayLabel).toUpperCase()} FACTORS`)
      : predictedCategory === 'Super High' ? withFactorContext('TOP SUPER HIGH FACTORS')
        : predictedCategory === 'High' ? withFactorContext('TOP HIGH FACTORS')
          : predictedCategory === 'Low' ? withFactorContext('TOP LOW FACTORS')
            : withFactorContext('TOP MEDIUM FACTORS');

  const allFactors = compactShap ? compactFactors : [...top3Toward, ...top3Against];
  const maxAbsAll = allFactors.length > 0 ? Math.max(...allFactors.map(t => Math.abs(t.impact))) : 1;
  const useCompactProbBox = compactShap || allFactors.length <= 1;

  const renderFactorRow = (f, idx, rankNum) => {
    const t = chartVisualTone(f.impact, invertShapImpactColors);
    const barColor = t === 'pos' ? '#10b981' : t === 'neg' ? '#ef4444' : '#94a3b8';
    const scoreColor = t === 'pos' ? '#047857' : t === 'neg' ? '#b91c1c' : '#64748b';
    const barW = (Math.abs(f.impact) / maxAbsAll) * 100;
    return (
      <div key={`${f.name}-${idx}`} className="tf-row">
        <div className="tf-rank" style={{ color: theme.color }}>#{rankNum}</div>
        <div className="tf-body">
          <div className="tf-name-line">
            <span className="tf-name">{f.name}</span>
            <span className="tf-score" style={{ color: scoreColor }} title={`${f.impact}`}>
              {formatShapImpactLabel(f.impact)}
            </span>
          </div>
          <span className="tf-val" title={String(f.value)}>
            = {formatShapFeatureValueForUi(f.value)}
          </span>
          <div className="tf-bar-track">
            <div className="tf-bar-fill" style={{ width: `${barW}%`, background: barColor }} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="shap-analysis-section">
      <hr className="my-4" />

      <h4 className="fw-bold mb-1">SHAP Analysis</h4>
      <small className="text-muted d-block mb-3">
        Showing SHAP analysis for Account # {facsNumber}
      </small>

      <div className={`card shap-card${compactShap ? ' shap-card--compact' : ''}`}>
        <div className="card-body">

          {/* ── Title ── */}
          <h5 className="shap-title">Why this prediction?</h5>

          {/* ══════════ TWO-COLUMN LAYOUT ══════════ */}
          <div className={`shap-two-col${compactShap ? ' shap-two-col--compact' : ''}`}>

            {/* ─── LEFT: Chart + Legend ─── */}
            <div className="shap-col-chart">
              <ShapChart
                features={features}
                predictedCategory={predictedCategory}
                categoryLabel={chartCategoryLabel}
                invertImpactColors={invertShapImpactColors}
                impactLabelsOnRight={impactLabelsOnRight}
                headerLabels={headerLabels}
                compact={compactShap}
                legendHighText={compactShap ? legendHighText : null}
                legendLowText={compactShap ? legendLowText : null}
              />

              {!compactShap && (
                <div className="shap-legend text-center mt-2">
                  <span className="legend-green">
                    <i className="bi bi-circle-fill" style={{ fontSize: '6px', marginRight: '4px', verticalAlign: 'middle' }}></i>
                    {legendHighText}
                  </span>
                  <span className="mx-2" style={{ color: '#cbd5e1' }}>|</span>
                  <span className="legend-red">
                    <i className="bi bi-circle-fill" style={{ fontSize: '6px', marginRight: '4px', verticalAlign: 'middle' }}></i>
                    {legendLowText}
                  </span>
                </div>
              )}
            </div>

            {/* ─── RIGHT: Info Panel ─── */}
            <div className="shap-col-info">

              {/* Category badge */}
              <div className="info-badges">
                <span
                  className="shap-cat-badge"
                  style={{ color: theme.color, background: theme.bg, borderColor: theme.border }}
                >
                  <i className="bi bi-tag-fill" style={{ fontSize: '10px' }}></i>
                  {catBadgeLabel}
                </span>
              </div>

              <div className="info-divider" />

              {/* ── Factor grid ── */}
              <div
                className={`top-factors-label text-center ${compactShap ? 'mb-2' : 'mb-3'} ${isLow ? 'top-factors-label--against' : 'top-factors-label--toward'}`}
                style={{ justifyContent: 'center' }}
              >
                <i className={`bi ${isLow ? 'bi-arrow-down-circle-fill' : 'bi-arrow-up-circle-fill'}`}></i>
                {singleLabel}
              </div>

              {compactShap ? (
                <div className="shap-factors-single top-factors-compact">
                  {compactFactors.map((f, idx) => renderFactorRow(f, idx, idx + 1))}
                </div>
              ) : (
              <div className="factors-two-col">

                {/* LEFT column */}
                <div className="top-factors-compact">
                  {top3Toward.map((f, idx) => renderFactorRow(f, idx, idx + 1))}
                </div>

                {/* RIGHT column */}
                <div className="top-factors-compact">
                  {top3Against.map((f, idx) => renderFactorRow(f, idx, idx + 4))}
                </div>

              </div>
              )}

              <div className="info-divider" />

              {/* Predicted Probability */}
              <div className={`shap-prob-box-bottom ${useCompactProbBox ? 'shap-prob-box-bottom--compact' : ''}`}>
                <span className="prob-label-bottom">{probabilityLabel}</span>
                <span className="prob-value-bottom" style={{ color: theme.color }}>
                  {probabilityDisplay ?? `${pct}%`}
                </span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ShapAnalysis;
