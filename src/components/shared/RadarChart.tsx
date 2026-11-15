import React from 'react';
import { RadarMetrics } from '../../types/ceda';

interface RadarChartProps {
  metrics: RadarMetrics;
  onPromote?: () => void;
}

export const RadarChart: React.FC<RadarChartProps> = ({ metrics, onPromote }) => {
  // 4 or 5 axes spider chart
  // Points calculated in 120x100 box with center at (60, 50)
  const cx = 60;
  const cy = 48;
  const maxR = 34;

  // Values normalized 0..1
  const rImpact = (metrics.impact / 100) * maxR;
  const rFeas = (metrics.feasibility / 100) * maxR;
  const rViab = (metrics.viability / 100) * maxR;
  const rNat = (metrics.natAlign / 100) * maxR;

  // Angles: Top (Impact), Right (Feasibility), Bottom (Viability), Left (NatAlign)
  const pImpact = `${cx},${cy - rImpact}`;
  const pFeas = `${cx + rFeas * 0.95},${cy + rFeas * 0.3}`;
  const pViab = `${cx},${cy + rViab}`;
  const pNat = `${cx - rNat * 0.95},${cy + rNat * 0.3}`;

  const polyPoints = `${pImpact} ${pFeas} ${pViab} ${pNat}`;

  // Outer reference ring
  const gridR1 = maxR * 0.5;
  const gridR2 = maxR;

  return (
    <div className="relative bg-slate-50/90 rounded-lg p-2.5 border border-slate-100 flex items-center justify-between">
      {/* Spider Chart SVG */}
      <div className="relative w-32 h-24 shrink-0">
        <svg viewBox="0 0 120 100" className="w-full h-full overflow-visible">
          {/* Concentric grid polygons */}
          <polygon
            points={`${cx},${cy - gridR2} ${cx + gridR2 * 0.95},${cy + gridR2 * 0.3} ${cx},${cy + gridR2} ${cx - gridR2 * 0.95},${cy + gridR2 * 0.3}`}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          <polygon
            points={`${cx},${cy - gridR1} ${cx + gridR1 * 0.95},${cy + gridR1 * 0.3} ${cx},${cy + gridR1} ${cx - gridR1 * 0.95},${cy + gridR1 * 0.3}`}
            fill="none"
            stroke="#edf2f7"
            strokeWidth="1"
          />
          {/* Axis lines */}
          <line x1={cx} y1={cy - maxR} x2={cx} y2={cy + maxR} stroke="#e2e8f0" strokeWidth="0.75" />
          <line x1={cx - maxR} y1={cy} x2={cx + maxR} y2={cy} stroke="#e2e8f0" strokeWidth="0.75" />

          {/* Data Polygon */}
          <polygon
            points={polyPoints}
            fill="rgba(234, 88, 12, 0.15)"
            stroke="#ea580c"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Vertex dots */}
          <circle cx={cx} cy={cy - rImpact} r="2" fill="#ea580c" />
          <circle cx={cx + rFeas * 0.95} cy={cy + rFeas * 0.3} r="2" fill="#ea580c" />
          <circle cx={cx} cy={cy + rViab} r="2" fill="#ea580c" />
          <circle cx={cx - rNat * 0.95} cy={cy + rNat * 0.3} r="2" fill="#ea580c" />
        </svg>
      </div>

      {/* Numeric Telemetry Labels */}
      <div className="flex-1 pl-2 text-[10.5px] font-mono-code space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Impact:</span>
          <span className="font-bold text-emerald-600">{metrics.impact}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Feasibility:</span>
          <span className="font-bold text-slate-700">{metrics.feasibility}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Viability:</span>
          <span className="font-bold text-slate-700">{metrics.viability}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Nat. Align:</span>
          <span className="font-bold text-sky-700">{metrics.natAlign}%</span>
        </div>
      </div>
    </div>
  );
};
