import React from 'react';
import { 
  MousePointer, Hand, PlusSquare, Link2, StickyNote, 
  HelpCircle, Eye, EyeOff, Sparkles, Filter
} from 'lucide-react';

export type CanvasTool = 'select' | 'pan' | 'new-card' | 'connector' | 'sticky';

interface ToolDockProps {
  activeTool: CanvasTool;
  onSelectTool: (tool: CanvasTool) => void;
  showConnectors: boolean;
  onToggleConnectors: () => void;
  onOpenShortcuts: () => void;
  onTriggerAiAssist: () => void;
}

export const ToolDock: React.FC<ToolDockProps> = ({
  activeTool,
  onSelectTool,
  showConnectors,
  onToggleConnectors,
  onOpenShortcuts,
  onTriggerAiAssist
}) => {
  return (
    <aside 
      aria-label="Canvas Tool Dock"
      className="fixed right-4 top-20 z-30 flex flex-col items-center bg-white/95 backdrop-blur-md border border-[#e2e8f0] rounded-xl shadow-[0_12px_24px_-6px_rgba(15,23,42,0.12),0_4px_8px_-4px_rgba(15,23,42,0.06)] p-1.5 gap-1 select-none"
    >
      {/* Pointer / Select tool */}
      <button
        onClick={() => onSelectTool('select')}
        title="Selection Tool (V) - Click & drag cards or inspect dossier"
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
          activeTool === 'select'
            ? 'bg-[#006194] text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <MousePointer className="w-4 h-4" />
      </button>

      {/* Hand / Pan tool */}
      <button
        onClick={() => onSelectTool('pan')}
        title="Hand Tool (H / Space) - Click and drag to pan across the infinite 8-stage canvas"
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
          activeTool === 'pan'
            ? 'bg-[#006194] text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <Hand className="w-4 h-4" />
      </button>

      <div className="w-6 h-[1px] bg-slate-200 my-0.5" />

      {/* Insert Project Card */}
      <button
        onClick={() => onSelectTool('new-card')}
        title="Insert New Proposal Card (N) - Place a new idea into the pipeline"
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
          activeTool === 'new-card'
            ? 'bg-[#006194] text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <PlusSquare className="w-4 h-4" />
      </button>

      {/* Connector Wire Tool */}
      <button
        onClick={() => onSelectTool('connector')}
        title="Connector Wire Tool (C) - Click two project cards to draw a dependency or supply-chain link"
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
          activeTool === 'connector'
            ? 'bg-[#006194] text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <Link2 className="w-4 h-4" />
      </button>

      {/* Sticky Note Insert */}
      <button
        onClick={() => onSelectTool('sticky')}
        title="Reviewer Sticky Memo (S) - Click anywhere on canvas to drop an evaluation note"
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
          activeTool === 'sticky'
            ? 'bg-[#ea580c] text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <StickyNote className="w-4 h-4" />
      </button>

      <div className="w-6 h-[1px] bg-slate-200 my-0.5" />

      {/* Toggle Connectors Visibility */}
      <button
        onClick={onToggleConnectors}
        title={showConnectors ? 'Hide Connector Tracks' : 'Show Connector Tracks'}
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
          showConnectors ? 'text-[#006194] bg-sky-50' : 'text-slate-400 hover:bg-slate-100'
        }`}
      >
        {showConnectors ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>

      {/* AI Simulation / Assist Trigger */}
      <button
        onClick={onTriggerAiAssist}
        title="AI Pipeline Analysis - Evaluate portfolio risk & throughput velocity"
        className="w-9 h-9 rounded-lg flex items-center justify-center text-indigo-600 hover:bg-indigo-50 transition-all"
      >
        <Sparkles className="w-4 h-4" />
      </button>

      {/* Keyboard Shortcuts Help */}
      <button
        onClick={onOpenShortcuts}
        title="Keyboard Shortcuts & Canvas Guide"
        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
    </aside>
  );
};
