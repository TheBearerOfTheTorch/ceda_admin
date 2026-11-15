import React from 'react';
import { ProjectCardData, StageConfig } from '../../types/ceda';
import { RadarChart } from './RadarChart';
import { useAuth } from '../../context/AuthContext.tsx';
import { 
  CheckCircle2, Clock, Check, ArrowRight, ArrowUpRight, 
  MoreHorizontal, Fingerprint, Sparkles, Building2, User, 
  Award, ShieldCheck, FileCheck 
} from 'lucide-react';

interface ProjectCardProps {
  project: ProjectCardData;
  stage: StageConfig;
  isSelected?: boolean;
  onSelect: (project: ProjectCardData) => void;
  onAdvance?: (project: ProjectCardData) => void;
  onOpenEvaluateModal?: (project: ProjectCardData) => void;
  onOpenAdjudicateModal?: (project: ProjectCardData) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  stage,
  isSelected,
  onSelect,
  onAdvance,
  onOpenEvaluateModal,
  onOpenAdjudicateModal,
}) => {
  const { currentUser } = useAuth();

  const formatBWP = (amount: number) => {
    return new Intl.NumberFormat('en-BW', {
      style: 'currency',
      currency: 'BWP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const isEvaluator = currentUser?.role === 'Evaluator';
  const isAdjudicator = currentUser?.role === 'Adjudicator';
  const isAdmin = currentUser?.role === 'Administrator';
  const isSubmitter = currentUser?.role === 'Submitter';

  return (
    <div
      onClick={() => onSelect(project)}
      style={{
        borderLeftColor: stage.color,
        borderLeftWidth: '3.5px'
      }}
      className={`group relative w-[320px] bg-white rounded-xl border border-[#e2e8f0] p-3.5 cursor-pointer transition-all duration-150 select-none ${
        isSelected
          ? 'shadow-lg ring-2 ring-[#0284c7] border-[#0284c7]'
          : 'shadow-[0_1px_3px_0_rgba(15,23,42,0.04)] hover:shadow-[0_8px_16px_-4px_rgba(15,23,42,0.08),0_2px_6px_-2px_rgba(15,23,42,0.04)] hover:border-slate-300'
      }`}
    >
      {/* Top Header: Tag [INT-118], Date, Context Menu */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono-code text-[11px] font-bold text-slate-800 tracking-tight">
            {project.stageTag}
          </span>
          {project.kycStatus === 'Passed KYC' && (
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono-code font-bold px-1.5 py-0.2 rounded border border-emerald-200">
              Passed KYC
            </span>
          )}
          {project.compositeScore && (
            <span className="bg-orange-50 text-orange-700 text-[10px] font-mono-code font-bold px-1.5 py-0.2 rounded border border-orange-200">
              Composite {project.compositeScore}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <span className="font-mono-code text-[10px] text-slate-400">
            {project.lastUpdated}
          </span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onSelect(project);
            }}
            className="p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-[13.5px] font-bold text-[#0f172a] leading-snug mb-1 group-hover:text-[#006194] transition-colors">
        {project.title}
      </h4>

      {/* Subtitle / Description */}
      <p className="text-[11.5px] text-slate-500 line-clamp-2 leading-relaxed mb-2.5">
        {project.description}
      </p>

      {/* Tags / Badges */}
      {project.tags.length > 0 && !project.radarMetrics && !project.complianceRows && (
        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
          {project.tags.map((t, idx) => (
            <span
              key={idx}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                t === 'Docs Verified'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              {t === 'Docs Verified' && <Check className="w-2.5 h-2.5" />}
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Screening Compliance Rows */}
      {project.complianceRows && (
        <div className="space-y-1 mb-2.5 bg-slate-50/70 p-2 rounded-lg border border-slate-100 text-[10.5px] font-mono-code">
          {project.complianceRows.map((row, idx) => (
            <div key={idx} className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{row.label}</span>
              </span>
              <span className="font-bold text-slate-800">{row.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Radar Chart for Evaluation Stage */}
      {project.radarMetrics && (
        <div className="mb-2.5">
          <RadarChart metrics={project.radarMetrics} />
        </div>
      )}

      {/* Intake Progress Text */}
      {project.intakeProgressText && (
        <div className="flex items-center justify-between text-[11px] font-mono-code mb-2.5">
          <span className="text-slate-500">Intake Completeness</span>
          <span className="font-bold text-[#006194]">85% Ingested</span>
        </div>
      )}

      {/* Telemetry Row */}
      <div className="flex items-end justify-between pt-2 border-t border-slate-100 text-[11px]">
        <div>
          <div className="text-[9.5px] font-mono-code uppercase font-semibold text-slate-400">
            {stage.id === 'screening' ? 'ESTIMATED ASSET' : 'REQUEST'}
          </div>
          <div className="font-mono-code font-bold text-slate-900 text-xs mt-0.5">
            {formatBWP(project.fundingRequested)}
          </div>
        </div>

        {project.cipaNumber && (
          <div className="flex items-center gap-1 text-[10.5px] font-mono-code text-[#006194] bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
            <Fingerprint className="w-3 h-3" />
            <span>{project.cipaNumber}</span>
          </div>
        )}

        {project.tags.includes('Ready for Eval') && (
          <span className="text-[10px] font-mono-code font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
            Ready for Eval
          </span>
        )}

        {project.leadEvaluator && (
          <div className="text-right">
            <div className="text-[10px] text-slate-400">
              Lead: {project.leadEvaluator}
            </div>
            {project.quorumMet && (
              <span className="text-[10px] font-mono-code font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                Quorum Met
              </span>
            )}
          </div>
        )}
      </div>

      {/* Role-Specific Action Buttons */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5">
        {/* Evaluator Button */}
        {isEvaluator ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenEvaluateModal?.(project);
            }}
            className="w-full py-1.5 px-2 bg-sky-50 hover:bg-sky-100 text-[#006194] font-bold text-[11px] rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-sky-200 shadow-2xs"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Score & Evaluate (Evaluator)</span>
          </button>
        ) : isAdjudicator ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenAdjudicateModal?.(project);
            }}
            className="w-full py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-emerald-200 shadow-2xs"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Adjudicate Decision (Board)</span>
          </button>
        ) : isSubmitter ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(project);
            }}
            className="w-full py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-slate-200"
          >
            <span>View Dossier & Feedback</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        ) : (
          /* Administrator / Standard Promote */
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdvance?.(project);
            }}
            className="w-full py-1.5 px-2 bg-sky-50/80 hover:bg-sky-100 text-[#006194] font-semibold text-[11px] rounded-lg flex items-center justify-between transition-colors group/btn"
          >
            <span className="flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
              <span>Promote Stage</span>
            </span>
            <ArrowUpRight className="w-3 h-3 opacity-60" />
          </button>
        )}
      </div>
    </div>
  );
};
