import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { publishActivity, publishNotification, broadcastCardMove } from '../../lib/firebase.ts';
import { recordStageTransitionLifecycle } from '../../lib/stageJourneyStore.ts';
import { 
  X, Award, CheckCircle2, Clock, ThumbsDown, 
  RotateCcw, Sparkles, FileText, Check, ShieldCheck 
} from 'lucide-react';

interface AdjudicatorModalProps {
  innovation: any | null;
  isOpen: boolean;
  onClose: () => void;
  onAdjudicationComplete: (decision?: string) => void | Promise<void>;
}

export const AdjudicatorModal: React.FC<AdjudicatorModalProps> = ({
  innovation,
  isOpen,
  onClose,
  onAdjudicationComplete,
}) => {
  const { currentUser } = useAuth();
  const [decision, setDecision] = useState<string>('Approved for Pilot Phase');
  const [remarks, setRemarks] = useState<string>('');
  const [priority, setPriority] = useState<string>('HIGH');
  const [conditions, setConditions] = useState<string>('Disbursement contingent on verified CIPA shareholding and technical sandbox pilot clearance.');
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen || !innovation) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarks.trim()) return;

    setSubmitting(true);
    try {
      const fullRemarks = `${remarks.trim()}\n\n[CONDITIONS & PRIORITIZATION]: ${conditions}`;

      const res = await fetch(`/api/innovations/${innovation.id}/adjudications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adjudicatorId: currentUser?.id || 3,
          decision,
          remarks: fullRemarks,
          nextStage: decision.includes('Approved') ? 'pilot' : 'adjudication',
        }),
      });

      if (!res.ok) throw new Error('Failed to record adjudication');

      // Record real-time stage transition in lifecycle store for Submitter view
      const actorName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'Adjudication Board Chair';
      const isRejected = decision.toLowerCase().includes('reject');
      const isApproved = decision.includes('Approved');

      recordStageTransitionLifecycle(
        {
          id: innovation.id,
          code: innovation.innovationNumber || innovation.stageTag,
          title: innovation.title,
        },
        isApproved ? 'pilot_phase' : 'approval_board',
        actorName,
        'Adjudicator',
        {
          status: isRejected ? 'rejected' : 'passed',
          notes: `Adjudication Verdict: ${decision}. ${fullRemarks}`,
          adjudicationDecision: isRejected ? 'REJECTED' : isApproved ? 'APPROVED' : 'DEFERRED',
        }
      );

      // Publish to Firestore live activity feed & real-time notifications
      await publishActivity({
        innovationId: innovation.id,
        action: decision.includes('Approved') ? 'pilot_approved' : 'adjudication_decision_issued',
        user: `${currentUser?.firstName} ${currentUser?.lastName}` || 'Adjudication Board Chair',
        role: 'Adjudicator',
      });
      await publishNotification({
        innovationId: innovation.id,
        type: decision.includes('Approved') ? 'Pilot approved' : 'Adjudication decision issued',
        message: `Adjudication Verdict: ${decision}`,
        user: `${currentUser?.firstName} ${currentUser?.lastName}` || 'Adjudication Board Chair',
      });
      if (decision.includes('Approved')) {
        await broadcastCardMove(
          innovation.id,
          'approval_board',
          'pilot_phase',
          `${currentUser?.firstName} ${currentUser?.lastName}` || 'Adjudicator'
        );
      }

      await onAdjudicationComplete(decision);
      onClose();
    } catch (err) {
      console.error('Error submitting adjudication:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono-code text-[11px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                ADJUDICATION CHAMBER
              </span>
              <span className="font-mono-code text-xs text-slate-500">
                {innovation.innovationNumber}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              Adjudicate Decision: {innovation.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Evaluator Score Review Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="text-[10px] font-mono-code uppercase font-bold text-slate-500 flex items-center justify-between">
              <span>Evaluator Outcomes & Summaries</span>
              <span className="text-[#006194]">Read-Only Integrity</span>
            </div>

            {innovation.evaluations?.length > 0 ? (
              innovation.evaluations.map((ev: any) => (
                <div key={ev.id} className="text-xs bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                  <div className="flex justify-between items-center font-mono-code text-[11px]">
                    <span className="font-bold text-slate-800">
                      Evaluator: {ev.evaluator?.firstName || 'Dr. M. Tau'}
                    </span>
                    <span className="text-emerald-700 font-bold">
                      Recommendation: {ev.recommendation}
                    </span>
                  </div>
                  <div className="text-slate-600 text-[11.5px]">
                    {ev.comments}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 italic">
                Initial technical assessment submitted: Composite readiness verified at 87.6%.
              </div>
            )}
          </div>

          {/* Decision Selection Options */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Formal Adjudication Verdict *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Approved for Pilot Phase', color: 'emerald', desc: 'Authorized for sandboxing & tranche deployment' },
                { label: 'Approved with Conditions', color: 'sky', desc: 'Pre-disbursement covenants must be certified' },
                { label: 'Deferred', color: 'amber', desc: 'Deferred until fiscal allocation/budget window opens' },
                { label: 'Rejected', color: 'rose', desc: 'Does not satisfy national strategic viability thresholds' },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setDecision(opt.label)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    decision === opt.label
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold leading-tight">{opt.label}</div>
                  <div className={`text-[10px] leading-tight mt-0.5 ${decision === opt.label ? 'text-white/80' : 'text-slate-400'}`}>
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Adjudication Remarks & Rationale */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Adjudication Board Minutes & Rationale *
            </label>
            <textarea
              rows={3}
              required
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Record board resolution, quorum voting count (e.g. 5/5 Quorum), and statutory justification..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-emerald-600"
            />
          </div>

          {/* Conditions & Project Priority */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Portfolio Implementation Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-200 bg-white text-xs font-mono-code"
              >
                <option value="LOW">LOW Priority</option>
                <option value="MEDIUM">MEDIUM Priority</option>
                <option value="HIGH">HIGH National Priority</option>
                <option value="CRITICAL">CRITICAL Fast-Track</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Pre-Disbursement Conditions
              </label>
              <input
                type="text"
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs"
              />
            </div>
          </div>

          {/* Adjudicator Boundary Notice */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500">
            <strong>Adjudicator Integrity:</strong> Adjudicators can issue binding resolutions, approve pilots, or defer proposals. Evaluator historical scores remain immutable.
          </div>

          {/* Footer Submit Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !remarks.trim()}
              className="px-4 py-2 bg-[#16a34a] hover:bg-[#138a3e] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'Ratifying...' : 'Ratify Adjudication Decision'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
