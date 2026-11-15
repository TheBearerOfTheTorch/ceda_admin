import React, { useState } from 'react';
import { 
  X, Layers, UserCheck, Award, ArrowRight, 
  Sparkles, AlertCircle, CheckCircle2, TrendingDown, TrendingUp
} from 'lucide-react';
import { SubmissionBatchQueue, AdminPersonnel } from '../../types/ceda';

interface BatchAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  queues: SubmissionBatchQueue[];
  personnel: AdminPersonnel[];
  selectedQueueId?: string;
  selectedPersonnelId?: number;
  onConfirmAssignment: (queueId: string, personnelId: number, count: number, notes?: string) => void;
}

export const BatchAssignModal: React.FC<BatchAssignModalProps> = ({
  isOpen,
  onClose,
  queues,
  personnel,
  selectedQueueId,
  selectedPersonnelId,
  onConfirmAssignment
}) => {
  if (!isOpen) return null;

  // Filter queues that have unassigned ideas
  const availableQueues = queues.filter(q => q.unassignedCount > 0);
  const activeQueue = queues.find(q => q.id === selectedQueueId) || availableQueues[0] || queues[0];

  // Candidates: only Evaluators and Adjudicators can be assigned ideas
  const assignablePersonnel = personnel.filter(p => p.role === 'Evaluator' || p.role === 'Adjudicator');
  const [activeQueueId, setActiveQueueId] = useState<string>(activeQueue ? activeQueue.id : (queues[0]?.id || ''));
  const [assigneeId, setAssigneeId] = useState<number>(
    selectedPersonnelId || (assignablePersonnel[0]?.id || 101)
  );

  const currentQueue = queues.find(q => q.id === activeQueueId) || queues[0];
  const maxAvailable = currentQueue ? currentQueue.unassignedCount : 10;

  // Default to 10 ideas or whatever is available if less than 10
  const [count, setCount] = useState<number>(Math.min(10, maxAvailable > 0 ? maxAvailable : 1));
  const [notes, setNotes] = useState<string>('Standard Vision 2036 Technical Appraisal Cohort');

  const targetPersonnel = personnel.find(p => p.id === assigneeId) || assignablePersonnel[0];

  const handleApplyCount = (amt: number) => {
    const clamped = Math.max(1, Math.min(amt, maxAvailable));
    setCount(clamped);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQueue || !targetPersonnel || count <= 0) return;
    onConfirmAssignment(currentQueue.id, targetPersonnel.id, count, notes);
    onClose();
  };

  const queueRemaining = Math.max(0, (currentQueue?.unassignedCount || 0) - count);
  const targetNewLoad = (targetPersonnel?.assignedIdeasCount || 0) + count;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-[#006194] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Batch Ideas Assignment</h3>
              <p className="text-xs text-slate-500">Route incoming queue volume to designated Evaluator or Adjudicator</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* 1. Source Queue Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Source Incoming Queue:
            </label>
            <select
              value={activeQueueId}
              onChange={(e) => {
                setActiveQueueId(e.target.value);
                const q = queues.find(item => item.id === e.target.value);
                if (q) {
                  setCount(Math.min(10, q.unassignedCount > 0 ? q.unassignedCount : 1));
                }
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-[#006194] focus:bg-white focus:outline-hidden"
            >
              {queues.map((q) => (
                <option key={q.id} value={q.id} disabled={q.unassignedCount === 0}>
                  {q.batchCode} • {q.category} ({q.unassignedCount} unassigned ideas) {q.unassignedCount === 0 ? '- [DEPLETED]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Queue Snapshot Card */}
          {currentQueue && (
            <div className="p-3 bg-sky-50/60 border border-sky-100 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">
                  Batch Details
                </span>
                <span className="font-bold text-slate-900 text-xs">
                  {currentQueue.category}
                </span>
                <span className="text-slate-500 block text-[11px]">
                  Avg Ask: BWP {currentQueue.averageCapitalAsk.toLocaleString()} • Urgency: {currentQueue.urgency}
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-[#006194]">
                  {currentQueue.unassignedCount}
                </span>
                <span className="text-[10px] text-slate-500 block font-medium">Unassigned Ideas</span>
              </div>
            </div>
          )}

          {/* 2. Assignee Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Assign Ideas To Evaluator / Adjudicator:
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-[#006194] focus:bg-white focus:outline-hidden"
            >
              <optgroup label="Evaluators (Initial & Technical Diligence)">
                {assignablePersonnel
                  .filter(p => p.role === 'Evaluator')
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.department} (Current Load: {p.assignedIdeasCount} ideas)
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Adjudicators (Formal Decision & Quorum)">
                {assignablePersonnel
                  .filter(p => p.role === 'Adjudicator')
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.department} (Current Load: {p.assignedIdeasCount} ideas)
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {/* 3. Batch Size Counter & Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700">
                Number of Ideas to Assign:
              </label>
              <span className="text-sm font-extrabold text-[#006194]">
                {count} {count === 1 ? 'Idea' : 'Ideas'}
              </span>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={1}
              max={Math.max(1, maxAvailable)}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
              disabled={maxAvailable === 0}
              className="w-full accent-[#006194] cursor-pointer"
            />

            {/* Preset buttons */}
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => handleApplyCount(5)}
                disabled={maxAvailable < 5}
                className="flex-1 py-1 px-2 text-xs font-semibold rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
              >
                5 Ideas
              </button>
              <button
                type="button"
                onClick={() => handleApplyCount(10)}
                disabled={maxAvailable < 10}
                className="flex-1 py-1 px-2 text-xs font-semibold rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
              >
                10 Ideas
              </button>
              <button
                type="button"
                onClick={() => handleApplyCount(Math.ceil(maxAvailable / 2))}
                disabled={maxAvailable === 0}
                className="flex-1 py-1 px-2 text-xs font-semibold rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
              >
                Half ({Math.ceil(maxAvailable / 2)})
              </button>
              <button
                type="button"
                onClick={() => handleApplyCount(maxAvailable)}
                disabled={maxAvailable === 0}
                className="flex-1 py-1 px-2 text-xs font-semibold rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-40"
              >
                All ({maxAvailable})
              </button>
            </div>
          </div>

          {/* Real-time Impact Simulator Box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Assignment Impact Projection
            </span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 bg-white rounded-md border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-[11px] block">Queue Depletion:</span>
                  <span className="font-bold text-slate-800">
                    {currentQueue?.unassignedCount} → <span className="text-rose-600 font-extrabold">{queueRemaining}</span>
                  </span>
                </div>
                <TrendingDown className="w-4 h-4 text-rose-500" />
              </div>

              <div className="p-2 bg-white rounded-md border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-[11px] block">Assignee Load:</span>
                  <span className="font-bold text-slate-800">
                    {targetPersonnel?.assignedIdeasCount} → <span className="text-emerald-600 font-extrabold">{targetNewLoad}</span>
                  </span>
                </div>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-medium text-slate-600 mb-1">
              Assignment Directives / Turnaround Note (Optional):
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden"
              placeholder="e.g. Please expedite technical diligence within 5 days"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={maxAvailable === 0 || count <= 0}
              className="px-4 py-2 text-xs font-bold text-white bg-[#006194] hover:bg-[#004e75] rounded-lg transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-40"
            >
              <span>Confirm Assignment ({count} Ideas)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
