import React from 'react';
import { X, Keyboard, MousePointer, Hand, Link2, StickyNote, PlusSquare, Maximize2 } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-[#006194]" />
            <h2 className="text-sm font-bold text-slate-900">
              CEDA Innovation Canvas // Keyboard Shortcuts & Guide
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <span className="text-slate-700 flex items-center gap-1.5 font-medium">
                <MousePointer className="w-3.5 h-3.5 text-slate-500" />
                Select / Inspect
              </span>
              <kbd className="px-2 py-0.5 bg-white border border-slate-300 rounded font-mono-code font-bold text-slate-800 shadow-2xs">
                V
              </kbd>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <span className="text-slate-700 flex items-center gap-1.5 font-medium">
                <Hand className="w-3.5 h-3.5 text-slate-500" />
                Hand / Pan
              </span>
              <kbd className="px-2 py-0.5 bg-white border border-slate-300 rounded font-mono-code font-bold text-slate-800 shadow-2xs">
                H / Space
              </kbd>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <span className="text-slate-700 flex items-center gap-1.5 font-medium">
                <PlusSquare className="w-3.5 h-3.5 text-slate-500" />
                New Proposal
              </span>
              <kbd className="px-2 py-0.5 bg-white border border-slate-300 rounded font-mono-code font-bold text-slate-800 shadow-2xs">
                N
              </kbd>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <span className="text-slate-700 flex items-center gap-1.5 font-medium">
                <Link2 className="w-3.5 h-3.5 text-slate-500" />
                Connect Cards
              </span>
              <kbd className="px-2 py-0.5 bg-white border border-slate-300 rounded font-mono-code font-bold text-slate-800 shadow-2xs">
                C
              </kbd>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <span className="text-slate-700 flex items-center gap-1.5 font-medium">
                <StickyNote className="w-3.5 h-3.5 text-slate-500" />
                Sticky Note Memo
              </span>
              <kbd className="px-2 py-0.5 bg-white border border-slate-300 rounded font-mono-code font-bold text-slate-800 shadow-2xs">
                S
              </kbd>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <span className="text-slate-700 flex items-center gap-1.5 font-medium">
                <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                Fit to Screen
              </span>
              <kbd className="px-2 py-0.5 bg-white border border-slate-300 rounded font-mono-code font-bold text-slate-800 shadow-2xs">
                Shift + 1
              </kbd>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3 space-y-1.5 text-slate-600">
            <h4 className="font-mono-code font-bold text-[11px] uppercase text-slate-700">
              Technical Canvas Navigation Tips
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-[11.5px] leading-relaxed">
              <li><strong>Zooming:</strong> Hold <kbd className="font-mono-code text-[10px] bg-slate-100 px-1 border rounded">Ctrl</kbd> or <kbd className="font-mono-code text-[10px] bg-slate-100 px-1 border rounded">Cmd</kbd> and scroll your mouse wheel, or use the bottom zoom buttons.</li>
              <li><strong>Stage Dragging:</strong> Drag any proposal card and drop it onto another swimlane column to transition its pipeline stage.</li>
              <li><strong>Dependency Wire:</strong> With the link tool active, click any card edge anchor to link it with an upstream or downstream project.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
