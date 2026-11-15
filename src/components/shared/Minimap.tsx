import React from 'react';
import { PIPELINE_STAGES } from '../../data/mockData';
import { ProjectCardData } from '../../types/ceda';

interface MinimapProps {
  projects: ProjectCardData[];
  panX: number;
  panY: number;
  zoom: number;
  onNavigateToStage: (index: number) => void;
  onClose: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  projects,
  panX,
  panY,
  zoom,
  onNavigateToStage,
  onClose
}) => {
  return (
    <div className="fixed bottom-20 right-4 z-30 w-64 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-xl p-3 select-none">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono-code text-[10px] uppercase font-bold text-slate-500 tracking-wider">
          Canvas Radar // 8 Stages
        </span>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-[11px]"
        >
          ✕
        </button>
      </div>

      {/* Mini 8-column visualizer */}
      <div className="grid grid-cols-8 gap-1 h-20 bg-slate-100 rounded-lg p-1.5 border border-slate-200 relative overflow-hidden">
        {PIPELINE_STAGES.map((st, idx) => {
          const stageProjects = projects.filter(p => p.stageId === st.id);
          return (
            <div
              key={st.id}
              onClick={() => onNavigateToStage(idx)}
              style={{ borderColor: st.color }}
              className="h-full rounded border-t-2 bg-white/80 flex flex-col justify-between p-0.5 cursor-pointer hover:bg-white transition-all group"
              title={`${st.name} (${stageProjects.length} projects)`}
            >
              <div className="text-[8px] font-mono-code text-center font-bold text-slate-600 group-hover:text-slate-900">
                {st.tagPrefix}
              </div>

              {/* Dots representing cards in this stage */}
              <div className="flex flex-col gap-0.5 items-center justify-end overflow-hidden">
                {stageProjects.map((p) => (
                  <div
                    key={p.id}
                    style={{ backgroundColor: st.color }}
                    className="w-1.5 h-1.5 rounded-full"
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[9px] font-mono-code text-slate-400 mt-2">
        <span>PAN: {Math.round(-panX)}px</span>
        <span>SCALE: {Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
};
