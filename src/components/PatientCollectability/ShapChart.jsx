import React, { useRef, useState } from 'react';
import {
  formatShapFeatureValueForUi,
  formatShapImpactLabel,
  chartVisualTone,
  negligibleShapImpact,
} from '../../utils/shapDisplayFormat';
import { Bar } from 'react-chartjs-2';

/* ── Refined colour palette ── */
const COLORS = {
  posBar: 'rgba(16, 185, 129, 0.85)',
  posHover: 'rgba(16, 185, 129, 1)',
  posLabel: '#047857',
  posLabelBg: 'rgba(16,185,129,0.08)',
  posLabelBorder: 'rgba(16,185,129,0.22)',
  posBadgeBg: 'rgba(16,185,129,0.06)',
  posBadgeBorder: 'rgba(16,185,129,0.18)',
  posBadgeText: '#065f46',

  negBar: 'rgba(239, 68, 68, 0.82)',
  negHover: 'rgba(239, 68, 68, 1)',
  negLabel: '#b91c1c',
  negLabelBg: 'rgba(239,68,68,0.07)',
  negLabelBorder: 'rgba(239,68,68,0.20)',
  negBadgeBg: 'rgba(239,68,68,0.05)',
  negBadgeBorder: 'rgba(239,68,68,0.16)',
  negBadgeText: '#991b1b',

  neutralBar: 'rgba(148, 163, 184, 0.35)',
  neutralHover: 'rgba(148, 163, 184, 0.55)',
  neutralLabel: '#475569',
  neutralLabelBg: 'rgba(148, 163, 184, 0.12)',
  neutralLabelBorder: 'rgba(148, 163, 184, 0.35)',

  tickText: '#334155',
  gridZero: 'rgba(100,116,139,0.20)',
  gridFaint: 'rgba(0,0,0,0.03)',
  tooltipBg: '#0f172a',
};

const barPaint = (tone) => {
  if (tone === 'pos') return { bar: COLORS.posBar, hover: COLORS.posHover };
  if (tone === 'neg') return { bar: COLORS.negBar, hover: COLORS.negHover };
  return { bar: COLORS.neutralBar, hover: COLORS.neutralHover };
};

const labelPaint = (tone) => {
  if (tone === 'pos') {
    return {
      color: COLORS.posLabel,
      backgroundColor: COLORS.posLabelBg,
      borderColor: COLORS.posLabelBorder,
    };
  }
  if (tone === 'neg') {
    return {
      color: COLORS.negLabel,
      backgroundColor: COLORS.negLabelBg,
      borderColor: COLORS.negLabelBorder,
    };
  }
  return {
    color: COLORS.neutralLabel,
    backgroundColor: COLORS.neutralLabelBg,
    borderColor: COLORS.neutralLabelBorder,
  };
};

const ShapChart = ({
  features,
  predictedCategory,
  categoryLabel,
  invertImpactColors = false,
  /** Credit Card EAD: keep SHAP value pills on the right (clear of the x=0 grid line). */
  impactLabelsOnRight = false,
  /** Optional override for column headings. */
  headerLabels = null,
  /** Few features (e.g. LGD): shorter chart, no 380px minimum. */
  compact = false,
  /** Rendered at chart footer when compact (e.g. Mortgage LGD). */
  legendHighText = null,
  legendLowText = null,
}) => {
  const chartRef = useRef(null);
  const [barYPositions, setBarYPositions] = useState([]);

  const positionCapturePlugin = useRef({
    id: 'barPositionCapture',
    afterDraw: (chart) => {
      const meta = chart.getDatasetMeta(0);
      if (!meta?.data?.length) return;
      const ys = meta.data.map((bar) => bar.y);
      setBarYPositions((prev) => {
        if (prev.length === ys.length && prev.every((v, i) => Math.abs(v - ys[i]) < 0.5)) return prev;
        return ys;
      });
    },
  });

  const chartData = {
    labels: features.map((f) => f.name),
    datasets: [
      {
        data: features.map((f) => f.impact),
        backgroundColor: features.map((f) => barPaint(chartVisualTone(f.impact, invertImpactColors)).bar),
        hoverBackgroundColor: features.map((f) => barPaint(chartVisualTone(f.impact, invertImpactColors)).hover),
        borderColor: 'rgba(255,255,255,0.6)',
        borderWidth: 1,
        barThickness: compact ? 26 : 20,
        borderRadius: 4,
        borderSkipped: false,
        clip: false,
      },
    ],
  };

  const maxAbsImpact = Math.max(0.01, ...features.map((f) => Math.abs(f.impact)));

  const labelsRight = invertImpactColors || impactLabelsOnRight;
  const pad = labelsRight
    ? { right: 72, left: 20, top: 10, bottom: 10 }
    : { right: 40, left: 12, top: 8, bottom: 8 };

  const chartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    clip: false,
    layout: {
      padding: pad,
    },
    plugins: {
      title: { display: false },
      legend: { display: false },
      tooltip: {
        backgroundColor: COLORS.tooltipBg,
        titleFont: { size: 13, weight: '600', family: "'Inter', sans-serif" },
        bodyFont: { size: 12, weight: '400', family: "'Inter', sans-serif" },
        padding: { top: 10, bottom: 10, left: 14, right: 14 },
        cornerRadius: 8,
        displayColors: false,
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        callbacks: {
          title: (items) => features[items[0].dataIndex].name,
          label: (ctx) => {
            const f = features[ctx.dataIndex];
            const sign = f.impact >= 0 ? '+' : '';
            return [`SHAP Impact: ${sign}${f.impact.toFixed(4)}`, `Value: ${f.value}`];
          },
        },
      },
      datalabels: {
        display: true,
        anchor: (ctx) => {
          const imp = features[ctx.dataIndex].impact;
          if (negligibleShapImpact(imp)) return 'center';
          if (labelsRight) return 'end';
          return imp > 0 ? 'end' : 'start';
        },
        align: (ctx) => {
          const imp = features[ctx.dataIndex].impact;
          if (negligibleShapImpact(imp)) return labelsRight ? 'right' : 'center';
          if (labelsRight) return 'right';
          return imp > 0 ? 'right' : 'left';
        },
        offset: (ctx) => {
          const imp = features[ctx.dataIndex].impact;
          if (negligibleShapImpact(imp)) return labelsRight ? 22 : 0;
          return labelsRight ? 16 : 6;
        },
        formatter: (v) => formatShapImpactLabel(Number(v)),
        font: { size: 11, weight: '700', family: "'Inter', sans-serif" },
        color: (ctx) => {
          const t = chartVisualTone(features[ctx.dataIndex].impact, invertImpactColors);
          return labelPaint(t).color;
        },
        backgroundColor: (ctx) => {
          const t = chartVisualTone(features[ctx.dataIndex].impact, invertImpactColors);
          return labelPaint(t).backgroundColor;
        },
        borderColor: (ctx) => {
          const t = chartVisualTone(features[ctx.dataIndex].impact, invertImpactColors);
          return labelPaint(t).borderColor;
        },
        borderWidth: 1,
        borderRadius: 5,
        padding: { top: 3, bottom: 3, left: 8, right: 8 },
      },
    },
    scales: {
      x: {
        min: -maxAbsImpact * 1.6,
        max: maxAbsImpact * 1.6,
        grid: {
          color: (ctx) => (ctx.tick?.value === 0 ? COLORS.gridZero : COLORS.gridFaint),
          lineWidth: (ctx) => (ctx.tick?.value === 0 ? 1.5 : 0.5),
        },
        ticks: { display: false },
        border: { display: false },
      },
      y: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          display: false,
        },
      },
    },
    animation: { duration: 700, easing: 'easeOutQuart' },
  };

  const chartHeight = compact
    ? Math.max(features.length * 52 + 24, 108)
    : Math.max(features.length * 48, 380);

  const catLabel = String(categoryLabel || predictedCategory || '').toUpperCase();
  const showCompactLegend = compact && legendHighText && legendLowText;

  const renderShapLegend = () => (
    <div className="shap-legend shap-legend--chart-end text-center">
      <span className="legend-green">
        <i className="bi bi-circle-fill" style={{ fontSize: '6px', marginRight: '4px', verticalAlign: 'middle' }} />
        {legendHighText}
      </span>
      <span className="mx-2" style={{ color: '#cbd5e1' }}>|</span>
      <span className="legend-red">
        <i className="bi bi-circle-fill" style={{ fontSize: '6px', marginRight: '4px', verticalAlign: 'middle' }} />
        {legendLowText}
      </span>
    </div>
  );

  const renderChartBody = () => (
    <div className="shap-left-body" style={{ height: `${chartHeight}px` }}>
      <div className="shap-feature-col">
        {features.map((f, idx) => (
          <div
            key={`feature-${idx}`}
            className="shap-feature-name-row"
            style={
              barYPositions.length > idx
                ? {
                    top: `${barYPositions[idx]}px`,
                    transform: 'translateY(-50%)',
                  }
                : { visibility: 'hidden' }
            }
            title={f.name}
          >
            {f.name}
          </div>
        ))}
      </div>

      {!compact && <div className="shap-feature-separator" />}

      <div className="shap-bars-col">
        <div style={{ height: `${chartHeight}px`, position: 'relative' }}>
          <Bar
            ref={chartRef}
            data={chartData}
            options={chartOptions}
            plugins={[positionCapturePlugin.current]}
          />
        </div>
      </div>
    </div>
  );

  const renderFeatureValuesCol = () => (
    <div className="col-5 shap-fv-col" style={{ position: 'relative', height: `${chartHeight}px` }}>
      {features.map((f, idx) => (
        <div
          key={idx}
          className="fv-row"
          style={
            barYPositions.length > idx
              ? {
                  position: 'absolute',
                  top: `${barYPositions[idx]}px`,
                  transform: 'translateY(-50%)',
                  left: 12,
                }
              : { visibility: 'hidden' }
          }
        >
          <span
            className={`fv-badge fv-badge--${chartVisualTone(f.impact, invertImpactColors)}`}
            title={String(f.value)}
          >
            {formatShapFeatureValueForUi(f.value)}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className={`shap-chart-wrapper${compact ? ' shap-chart-wrapper--compact' : ''}`}>
      <div className="shap-chart-header row g-0">
        <div className="col-7 d-flex align-items-center" style={{ padding: '10px 0' }}>
          <span
            className="shap-chart-header__left"
            style={{
              width: '45%',
              textAlign: 'right',
              paddingRight: '12px',
              borderRight: '2px solid #e2e8f0',
              marginRight: '0',
              paddingTop: '4px',
              paddingBottom: '4px',
            }}
          >
            {headerLabels?.left ?? 'FEATURES'}
          </span>
          <span className="shap-chart-header__center" style={{ width: '55%', textAlign: 'center' }}>
            {headerLabels?.center
              ? <strong>{headerLabels.center}</strong>
              : <strong>Category: {catLabel}</strong>}
          </span>
        </div>
        <div className="col-5 d-flex align-items-center" style={{ padding: '10px 16px' }}>
          <span className="shap-chart-header__right">{headerLabels?.right ?? 'FEATURE VALUES'}</span>
        </div>
      </div>

      {showCompactLegend ? (
        <div className="shap-compact-body">
          <div className="row g-0 align-items-stretch shap-compact-row">
            <div className="col-7 shap-compact-mid">
              <div className="shap-vline-features-bars" aria-hidden />
              {renderChartBody()}
            </div>
            {renderFeatureValuesCol()}
          </div>
          {renderShapLegend()}
        </div>
      ) : (
      <div className="row g-0 align-items-stretch">
        <div className="col-7">{renderChartBody()}</div>
        {renderFeatureValuesCol()}
      </div>
      )}
    </div>
  );
};

export default ShapChart;
