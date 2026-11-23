import React, { useState } from 'react';
import {
  Sparkles, Plus, Slash, ChevronDown, ArrowUpRight,
  Send, CornerDownLeft, CheckCircle2, AlertCircle
} from 'lucide-react';

interface PromptBarProps {
  onExecutePrompt: (promptText: string, mode: string) => void;
  onQuickAction: (actionType: string) => void;
}

export const PromptBar: React.FC<PromptBarProps> = ({
  onExecutePrompt,
  onQuickAction
}) => {
  const [promptText, setPromptText] = useState('');
  const [mode, setMode] = useState<'Balanced' | 'Strict Compliance' | 'High Velocity' | 'Socio-Impact'>('Balanced');
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [lastActionFeedback, setLastActionFeedback] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;

    onExecutePrompt(promptText.trim(), mode);
    setLastActionFeedback(`Executed: "${promptText.trim()}"`);
    setTimeout(() => setLastActionFeedback(null), 3500);
    setPromptText('');
  };

  const handleSelectSuggestion = (text: string) => {
    setPromptText(text);
  };

  const suggestions = [
    'Filter projects with funding > BWP 1.5M',
    'Highlight clean energy & solar initiatives',
    'Simulate batch board quorum approvals',
    'Identify cross-stage supply chain synergies',
    'Show only projects with high youth employment'
  ];

  return (
    <div className="fixed bottom-4 left-4 z-30 max-w-lg w-full select-none">
      {/* Action feedback pill if triggered */}
      {lastActionFeedback && (
        <div className="mb-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-mono-code rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>{lastActionFeedback}</span>
        </div>
      )}

      {/* Main floating prompt container */}
      <div className="bg-white/95 backdrop-blur-md rounded-xl border border-[#cbd5e1] shadow-[0_12px_24px_-6px_rgba(15,23,42,0.12),0_4px_8px_-4px_rgba(15,23,42,0.06)] p-2">
        <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
          {/* Quick Plus (+) Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowQuickMenu(!showQuickMenu)}
              title="Quick Add Menu (+)"
              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            {showQuickMenu && (
              <div className="absolute left-0 bottom-full mb-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
                <div className="px-3 py-1 font-mono-code text-[10px] uppercase text-slate-400 font-bold">
                  Quick Actions
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onQuickAction('new-proposal');
                    setShowQuickMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between"
                >
                  <span>New Proposal Card</span>
                  <span className="font-mono-code text-[10px] text-slate-400">N</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onQuickAction('add-sticky');
                    setShowQuickMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between"
                >
                  <span>Evaluation Memo</span>
                  <span className="font-mono-code text-[10px] text-slate-400">S</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onQuickAction('simulate-pipeline');
                    setShowQuickMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between text-[#006194]"
                >
                  <span>Simulate Board Quorum</span>
                  <Sparkles className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Slash (/) Command Trigger */}
          <button
            type="button"
            onClick={() => {
              setPromptText('/');
            }}
            title="Slash Commands (/)"
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs font-mono-code font-bold transition-colors"
          >
            /
          </button>

          {/* Mode Selector Dropdown ('Balanced', etc.) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowModeDropdown(!showModeDropdown)}
              className="h-7 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
            >
              <span>{mode}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {showModeDropdown && (
              <div className="absolute left-0 bottom-full mb-2 w-44 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 text-xs">
                {(['Balanced', 'Strict Compliance', 'High Velocity', 'Socio-Impact'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMode(m);
                      setShowModeDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between ${mode === m ? 'font-bold text-[#006194] bg-sky-50/50' : 'text-slate-700'
                      }`}
                  >
                    <span>{m}</span>
                    {mode === m && <CheckCircle2 className="w-3 h-3 text-[#006194]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Text Input */}
          <input
            type="text"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="What would you like to change or create?"
            className="flex-1 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden px-2 py-1"
          />

          {/* Execute Submit Button */}
          <button
            type="submit"
            disabled={!promptText.trim()}
            title="Execute (Enter)"
            className="w-7 h-7 rounded-lg bg-[#006194] text-white hover:bg-[#004b73] disabled:opacity-40 disabled:hover:bg-[#006194] flex items-center justify-center transition-colors shadow-xs"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Suggestion Chips Below */}
        <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[10px] text-slate-500 pb-0.5">
          <span className="font-mono-code font-semibold uppercase text-slate-400 text-[9px] shrink-0">
            PROMPT:
          </span>
          {suggestions.slice(0, 3).map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectSuggestion(s)}
              className="shrink-0 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80 px-2 py-0.5 rounded transition-colors text-left"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
