import React from 'react';
import { 
  ZoomIn, ZoomOut, Maximize2, Undo2, Redo2, 
  Map, Sparkles, Sliders
} from 'lucide-react';

interface BottomControlsProps {
  zoom: number; // e.g. 0.85
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitToScreen: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  showMinimap: boolean;
  onToggleMinimap: () => void;
}

export const BottomControls: React.FC<BottomControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToScreen,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  showMinimap,
  onToggleMinimap
}) => {
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="fixed bottom-4 right-4 z-30 flex items-center gap-2 select-none">
      {/* Undo / Redo Pill */}
      <div className="flex items-center bg-white/95 backdrop-blur-md border border-[#e2e8f0] rounded-xl shadow-[0_12px_24px_-6px_rgba(15,23,42,0.12),0_4px_8px_-4px_rgba(15,23,42,0.06)] p-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo action (Ctrl+Z)"
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo action (Ctrl+Y)"
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Zoom and Fit-to-Screen Pill */}
      <div className="flex items-center bg-white/95 backdrop-blur-md border border-[#e2e8f0] rounded-xl shadow-[0_12px_24px_-6px_rgba(15,23,42,0.12),0_4px_8px_-4px_rgba(15,23,42,0.06)] p-1 gap-1">
        <button
          onClick={onZoomOut}
          title="Zoom Out (-)"
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Click to reset to 100% */}
        <button
          onClick={onResetZoom}
          title="Reset Zoom to 100%"
          className="px-2 py-1 text-xs font-mono-code font-bold text-slate-700 hover:text-[#006194] hover:bg-slate-100 rounded transition-colors min-w-[50px] text-center"
        >
          {zoomPercent}%
        </button>

        <button
          onClick={onZoomIn}
          title="Zoom In (+)"
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-slate-200" />

        <button
          onClick={onFitToScreen}
          title="Fit All 8 Stages to Screen (Shift+1)"
          className="p-1.5 text-slate-600 hover:text-[#006194] hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-slate-200" />

        <button
          onClick={onToggleMinimap}
          title={showMinimap ? 'Hide Minimap Radar' : 'Show Minimap Radar'}
          className={`p-1.5 rounded-lg transition-colors ${
            showMinimap 
              ? 'bg-[#006194]/10 text-[#006194]' 
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Map className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
