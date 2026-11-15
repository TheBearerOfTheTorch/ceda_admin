import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { publishActivity, publishNotification } from '../../lib/firebase.ts';
import { recordStageTransitionLifecycle } from '../../lib/stageJourneyStore.ts';
import { ClarificationChatModal } from '../shared/ClarificationChatModal.tsx';
import {
  X, CheckCircle2, AlertTriangle, ShieldCheck,
  Sparkles, Check, Sliders, ArrowRight, MessageSquare
} from 'lucide-react';

interface EvaluatorModalProps {
  innovation: any | null;
  isOpen: boolean;
  onClose: () => void;
  onEvaluationComplete: (recommendation?: string) => void;
  presenceMap?: Record<string | number, 'online' | 'reviewing' | 'editing' | 'offline'>;
}

export const EvaluatorModal: React.FC<EvaluatorModalProps> = ({
  innovation,
  isOpen,
  onClose,
  onEvaluationComplete,
  presenceMap = {},
}) => {
  const { currentUser } = useAuth();

  const [innovationScore, setInnovationScore] = useState<number>(8);
  const [feasibilityScore, setFeasibilityScore] = useState<number>(7);
  const [impactScore, setImpactScore] = useState<number>(9);
  const [scalabilityScore, setScalabilityScore] = useState<number>(6);
  const [comments, setComments] = useState<string>('');
  const [recommendation, setRecommendation] = useState<string>('Proceed to Expert Review');
  const [strengths, setStrengths] = useState<string>('High citizen impact, scalable technology, clean ESG profile.');
  const [risks, setRisks] = useState<string>('Supply chain dependency on imported components; seasonal harvest risks.');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);

  if (!isOpen || !innovation) return null;

  const compositeAverage = ((innovationScore + feasibilityScore + impactScore + scalabilityScore) / 4).toFixed(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comments.trim()) return;

    setSubmitting(true);
    try {
      const fullComments = `${comments.trim()}\n\n[STRENGTHS]: ${strengths}\n[RISKS & WEAKNESSES]: ${risks}`;

      const res = await fetch(`/api/innovations/${innovation.id}/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluatorId: currentUser?.id || 2,
          innovationScore,
          feasibilityScore,
          impactScore,
          scalabilityScore,
          comments: fullComments,
          recommendation,
        }),
      });

      if (!res.ok) throw new Error('Failed to record evaluation');

      // Record real-time stage transition in lifecycle store for Submitter view
      const actorName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'Evaluator';
      const isRejected = recommendation.toLowerCase().includes('reject');
      const nextStageId = isRejected
        ? 'evaluation'
        : recommendation.includes('Adjudication')
          ? 'approval_board'
          : 'expert_review';

      recordStageTransitionLifecycle(
        {
          id: innovation.id,
          code: innovation.innovationNumber || innovation.stageTag,
          title: innovation.title,
        },
        nextStageId,
        actorName,
        'Evaluator',
        {
          status: isRejected ? 'rejected' : 'passed',
          notes: `Evaluation completed (${compositeAverage}/10) — ${recommendation}. ${fullComments}`,
          score: Number(compositeAverage),
        }
      );

      // Publish to Firestore live activity feed & notifications
      await publishActivity({
        innovationId: innovation.id,
        action: 'evaluation_completed',
        user: `${currentUser?.firstName} ${currentUser?.lastName}` || 'Evaluator',
        role: 'Evaluator',
      });
      await publishNotification({
        innovationId: innovation.id,
        type: 'Evaluation completed',
        message: `Evaluation completed (${compositeAverage}/10) — ${recommendation}`,
        user: `${currentUser?.firstName} ${currentUser?.lastName}` || 'Evaluator',
        targetRole: 'Adjudicator',
      });

      onEvaluationComplete(recommendation);
      onClose();
    } catch (err) {
      console.error('Error submitting evaluation:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono-code text-[11px] font-bold text-[#006194] bg-sky-100 px-2 py-0.5 rounded">
                EVALUATION WORKSPACE
              </span>
              <span className="font-mono-code text-xs text-slate-500">
                {innovation.innovationNumber}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              Score & Assess: {innovation.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Clarification Chat CTA for Evaluator */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-700 shrink-0" />
              <div>
                <div className="text-xs font-bold text-amber-900">Need Clarity from the Submitter?</div>
                <div className="text-[11px] text-amber-800">
                  Chat directly with the citizen submitter in real time before submitting your score.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="px-3 py-1.5 bg-[#006194] hover:bg-[#004e75] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Clarification Chat</span>
            </button>
          </div>

          {/* Rubric Composite Score Indicator */}
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono-code uppercase font-bold text-[#006194]">
                Weighted Evaluation Rubric
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Technical, commercial feasibility, and socio-economic viability
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono-code text-slate-500">COMPOSITE</span>
              <div className="text-xl font-bold font-mono-code text-[#006194]">
                {compositeAverage} / 10
              </div>
            </div>
          </div>

          {/* 4 Score Sliders / Numerical Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Innovation & Originality</span>
                <span className="font-mono-code text-[#006194]">{innovationScore}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={innovationScore}
                onChange={(e) => setInnovationScore(Number(e.target.value))}
                className="w-full accent-[#006194]"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Technical Feasibility</span>
                <span className="font-mono-code text-[#006194]">{feasibilityScore}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={feasibilityScore}
                onChange={(e) => setFeasibilityScore(Number(e.target.value))}
                className="w-full accent-[#006194]"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Socio-Economic Impact</span>
                <span className="font-mono-code text-[#006194]">{impactScore}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={impactScore}
                onChange={(e) => setImpactScore(Number(e.target.value))}
                className="w-full accent-[#006194]"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Scalability / Cost Ratio</span>
                <span className="font-mono-code text-[#006194]">{scalabilityScore}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={scalabilityScore}
                onChange={(e) => setScalabilityScore(Number(e.target.value))}
                className="w-full accent-[#006194]"
              />
            </div>
          </div>

          {/* Qualitative Assessment */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Evaluator Analysis & Summary Comments *
            </label>
            <textarea
              rows={3}
              required
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Detail your findings on market sizing, technical readiness level, and operational feasibility..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#006194]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Identified Strengths & Value Drivers</label>
              <input
                type="text"
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Key Risks & Weaknesses</label>
              <input
                type="text"
                value={risks}
                onChange={(e) => setRisks(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-200 text-xs"
              />
            </div>
          </div>

          {/* Formal Recommendation */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Evaluator Stage Recommendation
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Proceed to Expert Review',
                'Approve for Adjudication',
                'Request Information',
                'Do Not Proceed',
              ].map((rec) => (
                <button
                  key={rec}
                  type="button"
                  onClick={() => setRecommendation(rec)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${recommendation === rec
                      ? 'bg-[#006194] text-white border-[#006194] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  {rec}
                </button>
              ))}
            </div>
          </div>

          {/* Role Boundary Notice */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500">
            <strong>Evaluator Boundary:</strong> Your scores and recommendation will be compiled for the Adjudication panel. Evaluators cannot make final funding authorizations.
          </div>

          {/* Submit Action */}
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
              disabled={submitting || !comments.trim()}
              className="px-4 py-2 bg-[#006194] hover:bg-[#004b73] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'Submitting to PostgreSQL...' : 'Submit Evaluation Report'}</span>
            </button>
          </div>
        </form>
      </div>

      <ClarificationChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        innovationId={innovation.id}
        innovationTitle={innovation.title}
        innovationNumber={innovation.innovationNumber}
        submitterName={innovation.submitter?.firstName ? `${innovation.submitter.firstName} ${innovation.submitter.lastName || ''}`.trim() : 'Citizen Submitter'}
        evaluatorName={currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'Evaluator'}
        evaluatorId={currentUser?.id}
        presenceMap={presenceMap}
      />
    </div>
  );
};
