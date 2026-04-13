import React, { useRef, useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';

/* ── Refined colour palette ── */
const COLORS = {
  posBar:   'rgba(16, 185, 129, 0.85)',   // emerald-500
  posHover: 'rgba(16, 185, 129, 1)',
  posLabel: '#047857',                     // emerald-700
  posLabelBg: 'rgba(16,185,129,0.08)',
  posLabelBorder: 'rgba(16,185,129,0.22)',
  posBadgeBg: 'rgba(16,185,129,0.06)',
  posBadgeBorder: 'rgba(16,185,129,0.18)',
  posBadgeText: '#065f46',

  negBar:   'rgba(239, 68, 68, 0.82)',     // red-500
  negHover: 'rgba(239, 68, 68, 1)',
  negLabel: '#b91c1c',                     // red-700
  negLabelBg: 'rgba(239,68,68,0.07)',
  negLabelBorder: 'rgba(239,68,68,0.20)',
  negBadgeBg: 'rgba(239,68,68,0.05)',
  negBadgeBorder: 'rgba(239,68,68,0.16)',
  negBadgeText: '#991b1b',

  tickText:  '#334155',   // slate-700
  gridZero:  'rgba(100,116,139,0.20)',
  gridFaint: 'rgba(0,0,0,0.03)',
  tooltipBg: '#0f172a',   // slate-900
};

const ShapChart = ({ features, predictedCategory, categoryLabel }) => {
  const isPos = (idx) => features[idx].impact >= 0;
  const chartRef = useRef(null);
  const [barYPositions, setBarYPositions] = useState([]);

  /* Plugin that captures the exact Y pixel position of every bar after draw */
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
    labels: features.map(f => f.name),
    datasets: [
      {
        data: features.map(f => f.impact),
        backgroundColor: features.map((_, i) => isPos(i) ? COLORS.posBar : COLORS.negBar),
        hoverBackgroundColor: features.map((_, i) => isPos(i) ? COLORS.posHover : COLORS.negHover),
        borderColor: 'rgba(255,255,255,0.6)',
        borderWidth: 1,
        barThickness: 20,
        borderRadius: 4,
        borderSkipped: false,
        clip: false,
      },
    ],
  };

  const maxAbsImpact = Math.max(0.01, ...features.map(f => Math.abs(f.impact)));

  const chartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    clip: false,
    layout: {
      padding: { right: 40, left: 12, top: 8, bottom: 8 },
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
            return [
              `SHAP Impact: ${sign}${f.impact.toFixed(4)}`,
              `Value: ${f.value}`,
            ];
          },
        },
      },
      datalabels: {
        display: true,
        anchor: 'end',
        align: 'right',
        offset: 6,
        formatter: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`,
        font: { size: 11, weight: '700', family: "'Inter', sans-serif" },
        color: (ctx) => isPos(ctx.dataIndex) ? COLORS.posLabel : COLORS.negLabel,
        backgroundColor: (ctx) => isPos(ctx.dataIndex) ? COLORS.posLabelBg : COLORS.negLabelBg,
        borderColor: (ctx) => isPos(ctx.dataIndex) ? COLORS.posLabelBorder : COLORS.negLabelBorder,
        borderWidth: 1,
        borderRadius: 5,
        padding: { top: 3, bottom: 3, left: 8, right: 8 },
      },
    },
    scales: {
      x: {
        min: -maxAbsImpact * 1.6,
        max:  maxAbsImpact * 1.6,
        grid: {
          color: (ctx) =>
            ctx.tick?.value === 0 ? COLORS.gridZero : COLORS.gridFaint,
          lineWidth: (ctx) => ctx.tick?.value === 0 ? 1.5 : 0.5,
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

  const chartHeight = Math.max(features.length * 48, 380);

  const catLabel = String(categoryLabel || predictedCategory || '').toUpperCase();

  return (
    <div className="shap-chart-wrapper">
      {/* ── Header row: uses same col-7/col-5 grid so labels align with content ── */}
      <div className="shap-chart-header row g-0">
        <div className="col-7 d-flex align-items-center" style={{ padding: '10px 0' }}>
          {/* FEATURES label — right-aligned to sit above the Y-axis feature names */}
          <span className="shap-chart-header__left" style={{ width: '45%', textAlign: 'right', paddingRight: '12px', borderRight: '2px solid #e2e8f0', marginRight: '0', paddingTop: '4px', paddingBottom: '4px' }}>FEATURES</span>
          {/* Category label — centered in the remaining chart area */}
          <span className="shap-chart-header__center" style={{ width: '55%', textAlign: 'center' }}>
            <strong>Category: {catLabel}</strong>
          </span>
        </div>
        <div className="col-5 d-flex align-items-center" style={{ padding: '10px 16px' }}>
          <span className="shap-chart-header__right">FEATURE VALUES</span>
        </div>
      </div>

      <div className="row g-0 align-items-stretch">

        {/* ---- CHART ---- */}
        <div className="col-7">
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

            <div className="shap-feature-separator" />

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
        </div>

        {/* ---- FEATURE VALUES ---- */}
        <div className="col-5" style={{ position: 'relative', height: `${chartHeight}px` }}>
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
              <span className={`fv-badge ${f.impact >= 0 ? 'fv-badge--pos' : 'fv-badge--neg'}`}>
                {f.value}
              </span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default ShapChart;
