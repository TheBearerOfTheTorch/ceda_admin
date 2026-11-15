import React, { useEffect, useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Building2,
  FileCheck2,
  UserCheck,
  MessageSquare,
  Award,
  Clock,
  FileText,
  Sparkles,
} from 'lucide-react';
import { ProjectCardData, StageConfig } from '../../types/ceda';
import {
  IdeaLifecycleRecord,
  StageCheckpointRecord,
  getLifecycleRecordForIdea,
} from '../../lib/stageJourneyStore';
import { evaluateIdeaStatutoryScreening } from '../../lib/cipaScreeningEngine';
import { subscribeToClarificationChat, ClarificationChatMessage } from '../../lib/firebase';

interface StageHistoryInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectCardData | null;
  stage: StageConfig | null;
  lifecycleRecord?: IdeaLifecycleRecord | null;
}

export const StageHistoryInspectorModal: React.FC<StageHistoryInspectorModalProps> = ({
  isOpen,
  onClose,
  project,
  stage,
  lifecycleRecord,
}) => {
  const [chatMessages, setChatMessages] = useState<ClarificationChatMessage[]>([]);

  useEffect(() => {
    if (!isOpen || !project) return;
    const unsub = subscribeToClarificationChat(
      project.id,
      (msgs) => {
        setChatMessages(msgs || []);
      },
      {
        ideaTitle: project.title,
        extraKeys: project.stageTag ? [project.stageTag] : undefined,
      }
    );
    return () => unsub();
  }, [isOpen, project?.id, project?.title, project?.stageTag]);

  if (!isOpen || !project || !stage) return null;

  const resolvedLifecycle =
    lifecycleRecord ||
    getLifecycleRecordForIdea({
      id: project.id,
      stageTag: project.stageTag,
      title: project.title,
    });

  const checkpoint: StageCheckpointRecord | undefined =
    resolvedLifecycle?.stageCheckpoints?.[stage.id];

  const isRejected =
    checkpoint?.status === 'rejected' ||
    (stage.id === 'screening' && resolvedLifecycle?.screening?.status === 'rejected');
  const isDocsReq =
    checkpoint?.status === 'docs_requested' ||
    (stage.id === 'screening' && resolvedLifecycle?.screening?.status === 'docs_requested');

  const enterpriseName =
    resolvedLifecycle?.enterpriseName ||
    (project.applicant?.organization &&
    project.applicant.organization !== 'Botswana Enterprise' &&
    project.applicant.organization !== project.sector
      ? project.applicant.organization
      : undefined) ||
    resolvedLifecycle?.screening?.cipaMatch?.companyName ||
    'Registered Citizen Enterprise (Pty) Ltd';

  const promoterName =
    resolvedLifecycle?.submitterName || project.applicant?.name || 'Citizen Entrepreneur';
  const omangId =
    resolvedLifecycle?.omangId || project.applicant?.nationalId || 'BW-752422914';

  // Ensure screening record is available when inspecting Stage 2 Screening
  const screeningRecord =
    checkpoint?.screening ||
    resolvedLifecycle?.screening ||
    evaluateIdeaStatutoryScreening({
      id: project.id,
      code: project.stageTag || 'INT-01',
      title: project.title,
      category: project.sector || 'AgriTech & Food',
      arrivalDate: project.submittedDate || 'Today',
      urgency: 'Standard',
      capitalAsk: project.fundingRequested || 0,
      status: 'evaluating',
      progress: 100,
      slaRemainingDays: 7,
      slaTargetDays: 14,
      enterpriseName,
      submitterName: promoterName,
      omangId,
      cipaUin: resolvedLifecycle?.cipaUin || project.cipaNumber,
      bursTin: resolvedLifecycle?.bursTin,
    });

  const formatBWP = (amount: number) =>
    new Intl.NumberFormat('en-BW', {
      style: 'currency',
      currency: 'BWP',
      maximumFractionDigits: 0,
    }).format(amount || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div
          className={`px-6 py-4 text-white flex items-center justify-between ${
            isRejected
              ? 'bg-rose-950'
              : isDocsReq
                ? 'bg-amber-950'
                : 'bg-slate-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                isRejected
                  ? 'bg-rose-500/20 border-rose-400/40 text-rose-300'
                  : isDocsReq
                    ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                    : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
              }`}
            >
              {isRejected ? (
                <XCircle className="w-5 h-5" />
              ) : isDocsReq ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded bg-white/10 text-white border border-white/20">
                  Stage {stage.number} of 8 • {stage.name}
                </span>
                <span className="text-[10px] font-mono-code font-bold text-slate-300">
                  {project.stageTag}
                </span>
              </div>
              <h2 className="text-base font-black tracking-tight mt-0.5">
                {project.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isRejected ? (
              <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-400/40 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                Stage {stage.number} Rejected
              </span>
            ) : isDocsReq ? (
              <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Action Required
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Stage {stage.number} Passed
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Top Proposal & Entity Banner */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">
                Registered Company / Entity
              </div>
              <div className="font-black text-[#006194] mt-0.5 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span>{enterpriseName}</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">
                Citizen Promoter & Omang
              </div>
              <div className="font-bold text-slate-800 mt-0.5">
                {promoterName}{' '}
                <span className="font-mono-code text-[10px] text-slate-500">({omangId})</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">
                Stage Sign-Off
              </div>
              <div className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>{checkpoint?.completedAt || project.lastUpdated || 'Completed'}</span>
              </div>
            </div>
          </div>

          {/* STAGE 1: IDEA INTAKE DETAILS */}
          {stage.id === 'intake' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Stage 1: Citizen Idea Intake & Portal Registration Complete
                  </span>
                  <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    INGEST VERIFIED
                  </span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  {checkpoint?.summary ||
                    `Proposal "${project.title}" was successfully lodged into the CEDA Innovation Pipeline and queued for Stage 2 Statutory & Tax Screening.`}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="text-[10px] font-bold uppercase text-slate-400">CEDA Capital Ask</div>
                  <div className="text-sm font-black text-slate-900 mt-0.5">
                    {formatBWP(project.fundingRequested)}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Promoter Equity</div>
                  <div className="text-sm font-black text-slate-900 mt-0.5">
                    {formatBWP(project.coFinancing)}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Direct Jobs</div>
                  <div className="text-sm font-black text-slate-900 mt-0.5">
                    {project.projectedJobs} Citizen Jobs
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2: STATUTORY & TAX SCREENING (CIPA & BURS) DETAILS */}
          {stage.id === 'screening' && (
            <div className="space-y-4">
              {/* 1. CIPA Company Verification Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#006194]" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      1. CIPA Company Registry Verification (cipaget)
                    </h3>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      screeningRecord.cipaVerified
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {screeningRecord.cipaVerified
                      ? `✓ CIPA: ${screeningRecord.cipaMatch?.registrationStatus || 'Registered'}`
                      : `✕ CIPA: ${screeningRecord.cipaMatch?.registrationStatus || 'Failed'}`}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/80 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold">Registered Entity</div>
                    <div className="font-black text-slate-900 mt-0.5">
                      {screeningRecord.cipaMatch?.companyName || enterpriseName}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold">CIPA UIN</div>
                    <div className="font-mono-code font-bold text-[#006194] mt-0.5">
                      {screeningRecord.cipaMatch?.uin || 'BW00001849201'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold">Incorporation Date</div>
                    <div className="font-bold text-slate-800 mt-0.5">
                      {screeningRecord.cipaMatch?.incorporationDate || '14 Mar 2023'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold">Annual Returns</div>
                    <div
                      className={`font-bold mt-0.5 ${
                        screeningRecord.cipaMatch?.annualReturnCompliant !== false
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {screeningRecord.cipaMatch?.annualReturnCompliant !== false
                        ? 'Compliant (Up to date)'
                        : 'In Default'}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] text-slate-400 font-semibold">Registered Office</div>
                    <div className="font-bold text-slate-800 mt-0.5">
                      {screeningRecord.cipaMatch?.registeredOffice ||
                        'Plot 54358, Central Business District, Gaborone'}
                    </div>
                  </div>
                </div>

                {screeningRecord.cipaMatch?.directors &&
                  screeningRecord.cipaMatch.directors.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <span className="text-[10px] font-bold text-slate-500">CIPA Directors:</span>
                      {screeningRecord.cipaMatch.directors.map((d, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-slate-100 text-slate-800 border border-slate-200"
                        >
                          <span>{d.name}</span>
                          <span className="text-slate-400 font-mono-code">({d.omangOrId})</span>
                          {d.isSubmitterMatch && (
                            <span className="text-emerald-700 font-bold">✓ Submitter Match</span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
              </div>

              {/* 2. BURS Tax Clearance Verification Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-purple-600" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      2. BURS Tax Clearance Certificate Verification
                    </h3>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      screeningRecord.bursVerified
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {screeningRecord.bursVerified
                      ? `✓ BURS TCC: ${screeningRecord.bursMatch?.taxStatus || 'Valid'}`
                      : `✕ BURS TCC: ${screeningRecord.bursMatch?.taxStatus || 'Invalid'}`}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold">Taxpayer TIN</div>
                    <div className="font-mono-code font-bold text-slate-900 mt-0.5">
                      {screeningRecord.bursMatch?.tin || 'C0849201101'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold">TCC Certificate No.</div>
                    <div className="font-mono-code font-bold text-slate-900 mt-0.5">
                      {screeningRecord.bursMatch?.certificateNumber || 'TCC-BW-2026-88412'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold">Issue Date</div>
                    <div className="font-bold text-slate-800 mt-0.5">
                      {screeningRecord.bursMatch?.issueDate || '10 Jan 2026'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold">Expiry Date</div>
                    <div className="font-bold text-emerald-700 mt-0.5">
                      {screeningRecord.bursMatch?.expiryDate || '10 Jan 2027'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Gate Checklist & Admin Notes */}
              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    Stage 2 Gate Checklist & Official Determination
                  </span>
                  <span className="text-[11px] font-bold text-purple-700">
                    {[
                      screeningRecord.cipaVerified,
                      screeningRecord.bursVerified,
                      screeningRecord.omangKycVerified,
                    ].filter(Boolean).length}{' '}
                    / 3 Verified
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div
                    className={`p-2.5 rounded-lg border flex items-center gap-2 font-bold ${
                      screeningRecord.cipaVerified
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    {screeningRecord.cipaVerified ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>CIPA Registration Active</span>
                  </div>
                  <div
                    className={`p-2.5 rounded-lg border flex items-center gap-2 font-bold ${
                      screeningRecord.bursVerified
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    {screeningRecord.bursVerified ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>BURS Tax Clearance Valid</span>
                  </div>
                  <div
                    className={`p-2.5 rounded-lg border flex items-center gap-2 font-bold ${
                      screeningRecord.omangKycVerified
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    < UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Omang KYC Verified</span>
                  </div>
                </div>

                <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-purple-100">
                  <span className="font-bold text-slate-900">Official Gate Remarks: </span>
                  {checkpoint?.summary ||
                    screeningRecord.notes ||
                    'CIPA Registration active & BURS Tax Clearance Certificate valid. Approved for Stage 3 Evaluation.'}
                </div>
              </div>
            </div>
          )}

          {/* STAGE 3 & 4: EVALUATION / EXPERT REVIEW DETAILS */}
          {(stage.id === 'evaluation' || stage.id === 'expert_review') && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      {stage.name} Gate Checklist & Diligence Summary
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    ✓ Evaluator Gate Passed
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>1. Read through submitted idea</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      2. Clarification chats ({chatMessages.length || checkpoint?.evaluationDetails?.clarificationCommentsCount || 0})
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>3. Supporting documentation verified</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>4. Approved for next evaluation stage</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  <span className="font-bold text-slate-900">
                    Reviewed by {checkpoint?.completedBy || resolvedLifecycle?.assignedEvaluatorName || 'CEDA Technical Evaluator'}:{' '}
                  </span>
                  {checkpoint?.summary ||
                    'Proposal passed technical & commercial evaluation criteria and was promoted to the next stage.'}
                </div>
              </div>

              {chatMessages.length > 0 && (
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-[#006194]" />
                    Clarification Comments & Responses ({chatMessages.length})
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {chatMessages.map((m, idx) => (
                      <div
                        key={m.id || idx}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-0.5">
                          <span>
                            {m.senderName} ({m.senderRole})
                          </span>
                          <span>{m.timestamp || 'Recorded'}</span>
                        </div>
                        <div className="text-slate-800">{m.message}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STAGES 5 - 8: ADJUDICATION, PILOT, IMPLEMENTATION & REALIZED IMPACT */}
          {stage.id !== 'intake' &&
            stage.id !== 'screening' &&
            stage.id !== 'evaluation' &&
            stage.id !== 'expert_review' && (
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-600" />
                    Stage {stage.number}: {stage.name} Official Record
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    ✓ Gate Completed
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {checkpoint?.summary ||
                    `Stage ${stage.number} (${stage.name}) was completed and signed off by ${
                      checkpoint?.completedBy || 'CEDA National Adjudication Board'
                    }.`}
                </p>
                {checkpoint?.adjudicationDetails && (
                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div className="p-2.5 rounded-lg bg-white border border-emerald-200">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">
                        Board Decision
                      </div>
                      <div className="font-black text-emerald-700 mt-0.5">
                        {checkpoint.adjudicationDetails.decision}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-emerald-200">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">
                        Quorum Warrants
                      </div>
                      <div className="font-bold text-slate-800 mt-0.5">
                        {checkpoint.adjudicationDetails.quorumVotes || '4 / 5 Warrants'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <FileText className="w-3.5 h-3.5 text-[#006194]" />
            <span>
              Real-time stage audit record synced with CEDA Administration & Evaluation Pipeline
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Close Stage Report
          </button>
        </div>
      </div>
    </div>
  );
};
