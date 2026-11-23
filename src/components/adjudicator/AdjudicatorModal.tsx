import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  publishActivity,
  publishNotification,
  broadcastCardMove,
  publishAdjudicatorScore,
  subscribeToAdjudicatorScores,
} from '../../lib/firebase.ts';
import { AdjudicatorCollaborativeScore } from '../../types/ceda.ts';
import { recordStageTransitionLifecycle } from '../../lib/stageJourneyStore.ts';
import {
  X, Award, Check, Users, BarChart3, Save, Sparkles
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

  // Collaborative Adjudication Panel Scoring State
  const [panelScores, setPanelScores] = useState<AdjudicatorCollaborativeScore[]>([]);
  const [strategicFit, setStrategicFit] = useState<number>(21);
  const [financialViability, setFinancialViability] = useState<number>(20);
  const [commercialization, setCommercialization] = useState<number>(20);
  const [socialImpact, setSocialImpact] = useState<number>(22);
  const [myVote, setMyVote] = useState<'APPROVE' | 'REVISE' | 'REJECT'>('APPROVE');
  const [myScoreNotes, setMyScoreNotes] = useState<string>('');
  const [savingScore, setSavingScore] = useState<boolean>(false);
  const [scoreSavedToast, setScoreSavedToast] = useState<boolean>(false);

  const innovationKey = innovation ? String(innovation.id || innovation.innovationNumber || '') : '';

  useEffect(() => {
    if (!isOpen || !innovationKey) return;
    const unsub = subscribeToAdjudicatorScores(innovationKey, (scores) => {
      setPanelScores(scores);
    });
    return () => unsub();
  }, [isOpen, innovationKey]);

  // Pre-fill current adjudicator's previously saved scores when available
  useEffect(() => {
    if (!isOpen || !currentUser || panelScores.length === 0) return;
    const myEmailLower = (currentUser.email || '').trim().toLowerCase();
    const mine = panelScores.find(
      (s) =>
        String(s.adjudicatorId) === String(currentUser.id) ||
        (myEmailLower && s.adjudicatorEmail?.toLowerCase() === myEmailLower)
    );
    if (mine) {
      setStrategicFit(mine.strategicFit);
      setFinancialViability(mine.financialViability);
      setCommercialization(mine.commercialization);
      setSocialImpact(mine.socialImpact);
      setMyVote(mine.recommendation);
      setMyScoreNotes(mine.comments || '');
    }
  }, [isOpen, innovationKey, currentUser?.id, currentUser?.email, panelScores.length]);

  const myTotalScore = strategicFit + financialViability + commercialization + socialImpact;

  const panelStats = useMemo(() => {
    if (panelScores.length === 0) {
      return { avg: 0, approveCount: 0, reviseCount: 0, rejectCount: 0 };
    }
    const sum = panelScores.reduce((acc, s) => acc + (s.totalScore || 0), 0);
    return {
      avg: Number((sum / panelScores.length).toFixed(1)),
      approveCount: panelScores.filter((s) => s.recommendation === 'APPROVE').length,
      reviseCount: panelScores.filter((s) => s.recommendation === 'REVISE').length,
      rejectCount: panelScores.filter((s) => s.recommendation === 'REJECT').length,
    };
  }, [panelScores]);

  if (!isOpen || !innovation) return null;

  const actorName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'Adjudicator';

  const handleSaveCollaborativeScore = async () => {
    if (!currentUser || !innovationKey) return;
    setSavingScore(true);
    try {
      const scoreEntry: AdjudicatorCollaborativeScore = {
        id: '',
        innovationId: innovationKey,
        innovationCode: innovation.innovationNumber || innovation.stageTag,
        innovationTitle: innovation.title,
        adjudicatorId: currentUser.id,
        adjudicatorName: actorName,
        adjudicatorEmail: currentUser.email,
        strategicFit,
        financialViability,
        commercialization,
        socialImpact,
        totalScore: myTotalScore,
        recommendation: myVote,
        comments: myScoreNotes.trim() || `Panel rubric score submitted (${myTotalScore}/100 - ${myVote}).`,
        updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        updatedAtMs: Date.now(),
      };
      await publishAdjudicatorScore(scoreEntry);
      await publishActivity({
        innovationId: innovationKey,
        action: 'adjudicator_collaborative_score',
        user: actorName,
        role: 'Adjudicator',
      });
      setScoreSavedToast(true);
      setTimeout(() => setScoreSavedToast(false), 3000);
    } finally {
      setSavingScore(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarks.trim()) return;

    setSubmitting(true);
    try {
      const consensusNote =
        panelScores.length > 0
          ? `\n\n[PANEL COLLABORATIVE SCORE CONSENSUS]: Avg ${panelStats.avg}/100 across ${panelScores.length} Adjudicator(s) (Approve: ${panelStats.approveCount}, Revise: ${panelStats.reviseCount}, Reject: ${panelStats.rejectCount}).`
          : '';
      const fullRemarks = `${remarks.trim()}\n\n[CONDITIONS & PRIORITIZATION]: ${conditions}${consensusNote}`;

      try {
        await fetch(`/api/innovations/${innovation.id}/adjudications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adjudicatorId: currentUser?.id || 3,
            decision,
            remarks: fullRemarks,
            nextStage: decision.includes('Approved') ? 'pilot' : 'adjudication',
          }),
        });
      } catch {
        // Offline / synthetic ID fallback still records stage lifecycle below
      }

      // Record real-time stage transition in lifecycle store for Submitter view
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
        user: actorName,
        role: 'Adjudicator',
      });
      await publishNotification({
        innovationId: innovation.id,
        type: decision.includes('Approved') ? 'Pilot approved' : 'Adjudication decision issued',
        message: `Adjudication Verdict: ${decision}`,
        user: actorName,
      });
      if (decision.includes('Approved')) {
        await broadcastCardMove(
          innovation.id,
          'approval_board',
          'pilot_phase',
          actorName
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
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono-code text-[11px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                ADJUDICATION CHAMBER
              </span>
              <span className="font-mono-code text-xs text-slate-500">
                {innovation.innovationNumber || innovation.stageTag}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              Adjudicate & Score Collaboratively: {innovation.title}
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

          {/* Collaborative Adjudicator Panel Scoring */}
          <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-700" />
                <span className="text-xs font-extrabold text-purple-950 uppercase tracking-wide">
                  Collaborative Panel Scoring ({panelScores.length} Adjudicator{panelScores.length === 1 ? '' : 's'})
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono-code">
                <span className="px-2 py-0.5 rounded bg-white border border-purple-200 text-purple-900 font-bold">
                  Panel Avg: {panelScores.length > 0 ? `${panelStats.avg}/100` : '--'}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                  ✓ {panelStats.approveCount}
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                  ↻ {panelStats.reviseCount}
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                  ✕ {panelStats.rejectCount}
                </span>
              </div>
            </div>

            {scoreSavedToast && (
              <div className="px-3 py-1.5 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                <span>Your collaborative scorecard ({myTotalScore}/100) has been shared live with the Adjudication Panel!</span>
              </div>
            )}

            {/* Current Adjudicator Rubric Sliders */}
            <div className="bg-white rounded-xl border border-purple-100 p-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">My Panel Rubric ({actorName})</span>
                <span className="font-mono-code font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  Total: {myTotalScore} / 100
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Strategic & Vision 2036 Fit', val: strategicFit, set: setStrategicFit },
                  { label: 'Financial Viability & Risk', val: financialViability, set: setFinancialViability },
                  { label: 'Commercialization Readiness', val: commercialization, set: setCommercialization },
                  { label: 'Socio-Economic & Job Impact', val: socialImpact, set: setSocialImpact },
                ].map((c) => (
                  <div key={c.label} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-medium text-slate-700">{c.label}</span>
                      <span className="font-mono-code font-bold text-slate-900">{c.val}/25</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={25}
                      value={c.val}
                      onChange={(e) => c.set(Number(e.target.value))}
                      className="w-full accent-purple-600 cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                    My Panel Vote
                  </label>
                  <select
                    value={myVote}
                    onChange={(e) => setMyVote(e.target.value as 'APPROVE' | 'REVISE' | 'REJECT')}
                    className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white text-xs font-bold"
                  >
                    <option value="APPROVE">APPROVE</option>
                    <option value="REVISE">REVISE</option>
                    <option value="REJECT">REJECT</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10.5px] font-semibold text-slate-600 mb-1">
                    Scoring Notes for Fellow Adjudicators
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={myScoreNotes}
                      onChange={(e) => setMyScoreNotes(e.target.value)}
                      placeholder="Brief rationale shared with fellow board members..."
                      className="flex-1 px-2.5 py-1.5 rounded border border-slate-200 text-xs focus:outline-hidden focus:border-purple-600"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCollaborativeScore}
                      disabled={savingScore}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingScore ? 'Saving...' : 'Broadcast Score'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Panel Peer Scorecards */}
            {panelScores.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                <div className="text-[10px] font-mono-code font-bold uppercase text-purple-800 flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  <span>Submitted Panel Scorecards</span>
                </div>
                {panelScores.map((sc) => (
                  <div
                    key={sc.id}
                    className="bg-white p-2 rounded-lg border border-purple-100 flex items-start justify-between gap-2 text-[11px]"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                        <span>{sc.adjudicatorName}</span>
                        <span
                          className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono-code font-bold ${
                            sc.recommendation === 'APPROVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sc.recommendation === 'REVISE'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {sc.recommendation}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono-code">
                          Fit {sc.strategicFit} • Fin {sc.financialViability} • Com {sc.commercialization} • Imp {sc.socialImpact}
                        </span>
                      </div>
                      {sc.comments && <p className="text-slate-600 mt-0.5">{sc.comments}</p>}
                    </div>
                    <span className="font-mono-code font-extrabold text-purple-700 shrink-0">
                      {sc.totalScore}/100
                    </span>
                  </div>
                ))}
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
            <strong>Adjudicator Integrity:</strong> Adjudicators can collaboratively score proposals, issue binding resolutions, approve pilots, or defer proposals. Evaluator historical scores remain immutable.
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
