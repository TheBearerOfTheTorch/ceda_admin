import React, { useState } from 'react';
import { ProjectCardData } from '../../types/ceda';
import { PIPELINE_STAGES } from '../../data/mockData';
import { 
  Award, CheckCircle2, AlertTriangle, ShieldCheck, Banknote, 
  User, Check, X, FileText, ArrowRight, Sparkles, Building2
} from 'lucide-react';

interface BoardAdjudicationViewProps {
  projects: ProjectCardData[];
  onSelectProject: (project: ProjectCardData) => void;
  onApproveProject: (projectId: string) => void;
  onDisburseTranche: (projectId: string) => void;
}

export const BoardAdjudicationView: React.FC<BoardAdjudicationViewProps> = ({
  projects,
  onSelectProject,
  onApproveProject,
  onDisburseTranche
}) => {
  const approvalProjects = projects.filter(p => p.stageId === 'approval_board');
  const expertProjects = projects.filter(p => p.stageId === 'expert_review');
  const pilotProjects = projects.filter(p => p.stageId === 'pilot_phase');

  const [activeSubTab, setActiveSubTab] = useState<'pending_board' | 'technical_diligence' | 'sandbox_pilots'>('pending_board');

  const formatBWP = (amount: number) => {
    return new Intl.NumberFormat('en-BW', {
      style: 'currency',
      currency: 'BWP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const totalBoardDemand = approvalProjects.reduce((sum, p) => sum + p.fundingRequested, 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Executive Header Banner */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono-code text-xs font-bold text-[#16a34a] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              BOARD ADJUDICATION CHAMBER
            </span>
            <span className="text-xs text-slate-500 font-mono-code">
              QUORUM: ACTIVE (5/5 DIRECTORS SEATED)
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            CEDA Executive Credit & Capital Allocation Board
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Statutory review of vetted entrepreneurial proposals requiring ministerial and board-level funding clearance.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div>
            <div className="text-[10px] font-mono-code uppercase text-slate-500 font-semibold">
              Pending Adjudication
            </div>
            <div className="text-lg font-bold font-mono-code text-slate-900">
              {approvalProjects.length} Initiatives
            </div>
          </div>
          <div className="w-[1px] h-8 bg-slate-200" />
          <div>
            <div className="text-[10px] font-mono-code uppercase text-slate-500 font-semibold">
              Capital Demand
            </div>
            <div className="text-lg font-bold font-mono-code text-[#16a34a]">
              {formatBWP(totalBoardDemand)}
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('pending_board')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeSubTab === 'pending_board'
              ? 'border-[#16a34a] text-[#16a34a]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Stage 5: Board Docket ({approvalProjects.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('technical_diligence')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeSubTab === 'technical_diligence'
              ? 'border-[#1e40af] text-[#1e40af]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Stage 4: Expert Due Diligence ({expertProjects.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sandbox_pilots')}
          className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeSubTab === 'sandbox_pilots'
              ? 'border-[#d97706] text-[#d97706]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Stage 6: Sandbox Pilots ({pilotProjects.length})</span>
        </button>
      </div>

      {/* Items List */}
      <div className="space-y-4">
        {activeSubTab === 'pending_board' && (
          approvalProjects.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
              No proposals currently awaiting Board sign-off.
            </div>
          ) : (
            approvalProjects.map((project) => (
              <div
                key={project.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-all space-y-4"
              >
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono-code text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {project.id}
                      </span>
                      <span className="text-xs bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                        {project.sector}
                      </span>
                      <span className="text-xs text-slate-500">
                        Promoter: <strong className="text-slate-800">{project.applicant.name}</strong> ({project.applicant.location})
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      {project.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                      {project.description}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] font-mono-code text-slate-400">REQUESTED FACILITY</div>
                    <div className="text-lg font-bold font-mono-code text-[#006194]">
                      {formatBWP(project.fundingRequested)}
                    </div>
                    <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                      {project.projectedJobs} Direct Citizen Jobs
                    </div>
                  </div>
                </div>

                {/* Milestones checklist preview */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="font-mono-code font-bold text-slate-600">Statutory Checks:</span>
                    {project.milestones.map((m) => (
                      <span key={m.id} className="flex items-center gap-1 text-slate-700">
                        {m.completed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        <span className="truncate max-w-[200px]">{m.title}</span>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectProject(project)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors"
                    >
                      Open Full Dossier
                    </button>
                    <button
                      onClick={() => onApproveProject(project.id)}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-[#16a34a] hover:bg-[#138a3e] rounded-md shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Ratify Board Approval
                    </button>
                  </div>
                </div>
              </div>
            ))
          )
        )}

        {activeSubTab === 'technical_diligence' && (
          expertProjects.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono-code text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {project.id}
                    </span>
                    <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded">
                      {project.sector}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{project.title}</h3>
                  <p className="text-xs text-slate-600 mt-1">{project.description}</p>
                </div>
                <button
                  onClick={() => onSelectProject(project)}
                  className="px-3 py-1.5 text-xs font-semibold text-[#1e40af] bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                >
                  Review Technical Report
                </button>
              </div>
            </div>
          ))
        )}

        {activeSubTab === 'sandbox_pilots' && (
          pilotProjects.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono-code text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {project.id}
                    </span>
                    <span className="text-xs bg-amber-50 text-amber-800 font-semibold px-2 py-0.5 rounded">
                      SANDBOX TRIAL ACTIVE
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{project.title}</h3>
                  <p className="text-xs text-slate-600 mt-1">{project.description}</p>
                </div>
                <button
                  onClick={() => onSelectProject(project)}
                  className="px-3 py-1.5 text-xs font-semibold text-[#d97706] bg-amber-50 hover:bg-amber-100 rounded-md transition-colors"
                >
                  Inspect Sandbox Telemetry
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
