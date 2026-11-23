import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ProjectCardData, Reviewer, WorkflowCycle } from '../../types/ceda';
import { mapWorkflowStagesToPipelineStages } from '../../lib/stageJourneyStore';
import { useAuth } from '../../context/AuthContext';
import {
  getCanonicalLifecycleKey,
  getLifecycleRecordForIdea,
  IdeaAuditEntry,
  recordIdeaAuditEvent,
  subscribeToLifecycleRecords,
} from '../../lib/stageJourneyStore';
import {
  IdeaAuditFeedItem,
  publishActivity,
  publishNotification,
  subscribeToIdeaAuditEvents,
} from '../../lib/firebase';
import { 
  X, CheckCircle2, AlertCircle, Building2, User, MapPin, 
  Banknote, Briefcase, TrendingUp, ShieldCheck, Clock, FileText, 
  ArrowRight, ArrowLeft, Check, ThumbsUp, ThumbsDown, RotateCcw, 
  ExternalLink, Sparkles, MessageSquare, Plus, Eye, Radio
} from 'lucide-react';

const TAB_LABELS: Record<'overview' | 'financials' | 'compliance' | 'board_votes' | 'audit', string> = {
  overview: 'Project Dossier',
  financials: 'Financial Viability',
  compliance: 'Stage Milestones',
  board_votes: 'Adjudication & Reviewers',
  audit: 'Audit History',
};

interface ProjectDossierModalProps {
  project: ProjectCardData | null;
  onClose: () => void;
  onUpdateProject: (updated: ProjectCardData) => void;
  onAdvanceStage: (projectId: string) => void;
  onRegressStage: (projectId: string) => void;
  workflowCycle?: WorkflowCycle;
}

export const ProjectDossierModal: React.FC<ProjectDossierModalProps> = ({
  project,
  onClose,
  onUpdateProject,
  onAdvanceStage,
  onRegressStage,
  workflowCycle,
}) => {
  const { currentUser } = useAuth();
  const isSubmitter = currentUser?.role === 'Submitter';
  const pipelineStages = useMemo(() => mapWorkflowStagesToPipelineStages(workflowCycle), [workflowCycle]);

  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'compliance' | 'board_votes' | 'audit'>('overview');
  const [newComment, setNewComment] = useState('');
  const [selectedVote, setSelectedVote] = useState<'APPROVE' | 'REVISE' | 'REJECT'>('APPROVE');
  const [lifecycleAudit, setLifecycleAudit] = useState<IdeaAuditEntry[]>([]);
  const [remoteAuditEvents, setRemoteAuditEvents] = useState<IdeaAuditFeedItem[]>([]);
  const lastLogRef = useRef<{ key: string; ts: number } | null>(null);

  const projectIdentifier = project ? String(project.id) : '';

  const logAccessEvent = (
    tabKey: 'overview' | 'financials' | 'compliance' | 'board_votes' | 'audit',
    isInitialOpen: boolean
  ) => {
    if (!project || !currentUser || currentUser.role === 'Submitter') return;
    const actorName = `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.email || 'Official';
    const actorRole = currentUser.role || 'Official';
    const tabLabel = TAB_LABELS[tabKey];
    const dedupeKey = `${project.id}:${actorName}:${tabKey}:${isInitialOpen ? 'open' : 'tab'}`;
    const now = Date.now();
    if (lastLogRef.current && lastLogRef.current.key === dedupeKey && now - lastLogRef.current.ts < 1500) {
      return;
    }
    lastLogRef.current = { key: dedupeKey, ts: now };

    const actionText = isInitialOpen
      ? `Viewed Details & Opened "${tabLabel}" tab`
      : `Accessed "${tabLabel}" tab`;

    recordIdeaAuditEvent(
      {
        id: project.id,
        code: project.stageTag,
        stageTag: project.stageTag,
        title: project.title,
        enterpriseName: project.applicant?.organization,
        submitterName: project.applicant?.name,
        capitalAsk: project.fundingRequested,
        sector: project.sector,
      },
      {
        action: actionText,
        author: `${actorName} (${actorRole})`,
        authorRole: actorRole,
        tabName: tabLabel,
        eventType: isInitialOpen ? 'view' : 'tab_access',
        notes: `${actorName} (${actorRole}) ${isInitialOpen ? 'opened Details view for' : 'navigated to'} ${tabLabel} on "${project.title}".`,
      }
    );

    publishNotification({
      innovationId: project.stageTag || project.id,
      type: isInitialOpen ? 'Idea viewed' : 'Tab accessed',
      message: `${actorName} (${actorRole}) viewed your idea "${project.title}" — ${tabLabel}`,
      user: actorName,
      targetRole: 'Submitter',
      ideaTitle: project.title,
      viewerName: actorName,
      viewerRole: actorRole,
      tabName: tabLabel,
      submitterName: project.applicant?.name,
    }).catch(() => {});

    publishActivity({
      innovationId: project.stageTag || project.id,
      action: isInitialOpen ? 'idea_viewed' : 'tab_accessed',
      user: actorName,
      role: actorRole,
      ideaTitle: project.title,
      tabName: tabLabel,
    }).catch(() => {});
  };

  // Reset tab & log initial "Details" access when opening a project as Admin / Evaluator / Adjudicator
  useEffect(() => {
    if (!project) return;
    setActiveTab('overview');
    const existing = getLifecycleRecordForIdea({
      id: project.id,
      code: project.stageTag,
      title: project.title,
    });
    setLifecycleAudit(existing?.auditLog || []);

    if (currentUser && currentUser.role !== 'Submitter') {
      logAccessEvent('overview', true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectIdentifier]);

  // Subscribe to real-time local + Firestore lifecycle audit log & Firestore idea_audit_logs
  useEffect(() => {
    if (!project) return;

    const refreshLocal = () => {
      const rec = getLifecycleRecordForIdea({
        id: project.id,
        code: project.stageTag,
        title: project.title,
      });
      setLifecycleAudit(rec?.auditLog || []);
    };
    refreshLocal();

    const unsubLifecycle = subscribeToLifecycleRecords(() => {
      refreshLocal();
    });

    const unsubAudit = subscribeToIdeaAuditEvents((events) => {
      setRemoteAuditEvents(events);
    });

    return () => {
      unsubLifecycle();
      unsubAudit();
    };
  }, [projectIdentifier, project?.title, project?.stageTag]);

  const handleSelectTab = (tabKey: 'overview' | 'financials' | 'compliance' | 'board_votes' | 'audit') => {
    setActiveTab(tabKey);
    if (project && currentUser && currentUser.role !== 'Submitter') {
      logAccessEvent(tabKey, false);
    }
  };

  const liveAuditEntries = useMemo(() => {
    if (!project) return [];
    const canonicalKey = getCanonicalLifecycleKey({
      id: project.id,
      code: project.stageTag,
      title: project.title,
    });
    const normTitle = project.title.trim().toLowerCase();

    const matchingRemote = remoteAuditEvents
      .filter(
        (ev) =>
          ev.ideaKey === canonicalKey ||
          ev.ideaId === String(project.id) ||
          ev.ideaTitle.trim().toLowerCase() === normTitle
      )
      .map((ev) => ({
        timestamp: ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now',
        createdAtMs: ev.createdAtMs || 0,
        action: ev.action,
        author: ev.authorRole && !ev.author.includes(ev.authorRole) ? `${ev.author} (${ev.authorRole})` : ev.author,
        tabName: ev.tabName,
        eventType: ev.eventType,
        notes: ev.notes,
      }));

    const localEntries = lifecycleAudit.map((entry) => ({
      timestamp: entry.timestamp,
      createdAtMs: entry.createdAtMs || 0,
      action: entry.action,
      author: entry.author,
      tabName: entry.tabName,
      eventType: entry.eventType,
      notes: entry.notes,
    }));

    const fallbackEntries = (project.auditLog || []).map((entry, idx) => ({
      timestamp: entry.timestamp,
      createdAtMs: idx,
      action: entry.action,
      author: entry.author,
      tabName: undefined,
      eventType: undefined,
      notes: entry.notes,
    }));

    const merged = [...matchingRemote, ...localEntries, ...fallbackEntries];
    const seen = new Set<string>();
    const deduped: typeof merged = [];

    for (const item of merged) {
      const sig = `${item.action}__${item.author}__${item.tabName || ''}__${Math.floor((item.createdAtMs || 0) / 3000)}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      deduped.push(item);
    }

    return deduped.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
  }, [project, lifecycleAudit, remoteAuditEvents]);

  if (!project) return null;

  const currentStage = pipelineStages.find(s => s.id === project.stageId) || pipelineStages[0];
  const currentStageIndex = pipelineStages.findIndex(s => s.id === project.stageId);
  const nextStage = pipelineStages[currentStageIndex + 1];
  const prevStage = pipelineStages[currentStageIndex - 1];

  const formatBWP = (amount: number) => {
    return new Intl.NumberFormat('en-BW', {
      style: 'currency',
      currency: 'BWP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleToggleMilestone = (milestoneId: string) => {
    const updatedMilestones = project.milestones.map(m => {
      if (m.id === milestoneId) {
        return { ...m, completed: !m.completed };
      }
      return m;
    });

    const completedCount = updatedMilestones.filter(m => m.completed).length;
    const progress = Math.round((completedCount / updatedMilestones.length) * 100);

    const updated: ProjectCardData = {
      ...project,
      milestones: updatedMilestones,
      stageProgress: progress,
      lastUpdated: 'Just now',
      auditLog: [
        {
          timestamp: 'Nov 11, 2026 ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: 'Milestone Updated',
          author: 'Board Reviewer',
          notes: `Updated milestone progress to ${progress}%`
        },
        ...project.auditLog
      ]
    };

    onUpdateProject(updated);
  };

  const handleAddReviewerVote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const newVote: Reviewer = {
      id: `rev-${Date.now()}`,
      name: 'Hon. K. Sechele',
      role: 'Board Reviewer',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=faces',
      vote: selectedVote,
      comment: newComment,
      date: 'Nov 11, 2026'
    };

    const updated: ProjectCardData = {
      ...project,
      reviewers: [newVote, ...project.reviewers],
      lastUpdated: 'Just now',
      auditLog: [
        {
          timestamp: 'Nov 11, 2026 ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: `Vote Cast: ${selectedVote}`,
          author: 'Hon. K. Sechele (Board Reviewer)',
          notes: newComment
        },
        ...project.auditLog
      ]
    };

    onUpdateProject(updated);
    setNewComment('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div 
        className="w-full max-w-4xl max-h-[92vh] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Top Header Bar */}
        <div 
          style={{ borderTopColor: currentStage.color, borderTopWidth: '4px' }}
          className="px-6 py-4 border-b border-slate-200 flex items-start justify-between bg-slate-50/70"
        >
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-mono-code text-xs font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-xs">
                {project.id}
              </span>
              <span className="font-mono-code text-xs font-semibold text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded">
                {project.stageTag}
              </span>
              <span 
                style={{ backgroundColor: currentStage.bgColor, color: currentStage.color }}
                className="font-mono-code text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1 uppercase"
              >
                <span style={{ backgroundColor: currentStage.color }} className="w-1.5 h-1.5 rounded-full" />
                Stage {currentStageIndex + 1}/8: {currentStage.name}
              </span>
              <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                {project.sector}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {project.title}
            </h2>
            <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Applicant: <strong className="text-slate-700">{project.applicant.name}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {project.applicant.location}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono-code">
                National ID: {project.applicant.nationalId}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-6 text-xs font-medium text-slate-600">
          <button
            onClick={() => handleSelectTab('overview')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-[#006194] text-[#006194] font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Project Dossier
          </button>
          <button
            onClick={() => handleSelectTab('financials')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'financials'
                ? 'border-[#006194] text-[#006194] font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Banknote className="w-4 h-4" />
            Financial Viability & Jobs
          </button>
          <button
            onClick={() => handleSelectTab('compliance')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'compliance'
                ? 'border-[#006194] text-[#006194] font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Stage Milestones ({project.milestones.filter(m => m.completed).length}/{project.milestones.length})
          </button>
          <button
            onClick={() => handleSelectTab('board_votes')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'board_votes'
                ? 'border-[#006194] text-[#006194] font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Adjudication & Reviewers ({project.reviewers.length})
          </button>
          <button
            onClick={() => handleSelectTab('audit')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'border-[#006194] text-[#006194] font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            Audit History ({liveAuditEntries.length})
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Executive Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h3 className="text-xs font-mono-code font-bold uppercase text-slate-500 mb-2">
                  Executive Brief & Value Proposition
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {project.description}
                </p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {project.tags.map(t => (
                    <span key={t} className="text-xs bg-white text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Key Highlights Metrics Grid */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] font-mono-code text-slate-500 mb-1">CEDA FUNDING</div>
                  <div className="text-base font-bold font-mono-code text-slate-900">{formatBWP(project.fundingRequested)}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Co-financed: {formatBWP(project.coFinancing)}</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] font-mono-code text-slate-500 mb-1">CITIZEN EMPLOYMENT</div>
                  <div className="text-base font-bold font-mono-code text-emerald-700">{project.projectedJobs} Direct Jobs</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Youth quota: ~75%</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] font-mono-code text-slate-500 mb-1">PROJECTED REVENUE</div>
                  <div className="text-base font-bold font-mono-code text-slate-900">{formatBWP(project.projectedAnnualRevenue)}/yr</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Equity stake: {project.equityStakePercent}%</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <div className="text-[11px] font-mono-code text-slate-500 mb-1">RISK PROFILE</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-xs font-mono-code font-bold px-2 py-0.5 rounded ${
                      project.riskRating === 'LOW' ? 'bg-emerald-100 text-emerald-800' :
                      project.riskRating === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {project.riskRating} RISK
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Readiness: {project.stageProgress}%</div>
                </div>
              </div>

              {/* Applicant Enterprise Verification */}
              <div className="border border-slate-200 rounded-lg p-4 bg-white">
                <h3 className="text-xs font-mono-code font-bold uppercase text-slate-500 mb-3 flex items-center justify-between">
                  <span>Applicant & Enterprise Identification</span>
                  <span className="text-emerald-700 bg-emerald-50 text-[10px] px-2 py-0.5 rounded border border-emerald-200">
                    KYC Cleared
                  </span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">Registered Entity</span>
                    <strong className="text-slate-800">{project.applicant.organization}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Principal Citizen</span>
                    <strong className="text-slate-800">{project.applicant.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Omang ID</span>
                    <strong className="font-mono-code text-slate-800">{project.applicant.nationalId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Operational District</span>
                    <strong className="text-slate-800">{project.applicant.location}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="space-y-5">
              <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-4">
                <h3 className="text-xs font-mono-code font-bold uppercase text-slate-500">
                  Financial Capital Structure (Botswana Pula)
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">CEDA Direct Funding Grant & Loan Facility:</span>
                      <span className="font-mono-code font-bold text-slate-900">{formatBWP(project.fundingRequested)}</span>
                    </div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">Citizen / Promoter Co-Financing:</span>
                      <span className="font-mono-code font-bold text-slate-900">{formatBWP(project.coFinancing)}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-2 border-t border-slate-200 font-bold">
                      <span className="text-slate-900">Total Capital Outlay:</span>
                      <span className="font-mono-code text-[#006194]">{formatBWP(project.fundingRequested + project.coFinancing)}</span>
                    </div>
                  </div>

                  {/* Ratio visualizer */}
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                    <div 
                      style={{ width: `${(project.fundingRequested / (project.fundingRequested + project.coFinancing)) * 100}%` }}
                      className="bg-[#006194] h-full" 
                      title="CEDA Share"
                    />
                    <div 
                      style={{ width: `${(project.coFinancing / (project.fundingRequested + project.coFinancing)) * 100}%` }}
                      className="bg-emerald-500 h-full" 
                      title="Promoter Share"
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-mono-code text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-[#006194]" /> CEDA Share ({Math.round((project.fundingRequested / (project.fundingRequested + project.coFinancing)) * 100)}%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-emerald-500" /> Promoter Equity ({Math.round((project.coFinancing / (project.fundingRequested + project.coFinancing)) * 100)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Socio-economic forecast */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/70">
                  <h4 className="text-xs font-mono-code font-bold text-slate-600 mb-2">Direct Employment Generation</h4>
                  <div className="text-2xl font-bold font-mono-code text-slate-900">{project.projectedJobs}</div>
                  <p className="text-xs text-slate-600 mt-1">
                    Verified citizen jobs created across technical, administrative, and frontline field operations.
                  </p>
                </div>
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/70">
                  <h4 className="text-xs font-mono-code font-bold text-slate-600 mb-2">Target Annual Turnover</h4>
                  <div className="text-2xl font-bold font-mono-code text-slate-900">{formatBWP(project.projectedAnnualRevenue)}</div>
                  <p className="text-xs text-slate-600 mt-1">
                    Conservative commercial projection validated by CEDA Economic Evaluation models.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Stage Milestone Verification</h3>
                  <p className="text-xs text-slate-500">
                    All mandatory criteria must be marked complete by the compliance officer before advancement.
                  </p>
                </div>
                <span className="font-mono-code text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                  Readiness: {project.stageProgress}%
                </span>
              </div>

              <div className="space-y-2">
                {project.milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    onClick={() => {
                      if (!isSubmitter) handleToggleMilestone(milestone.id);
                    }}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                      isSubmitter ? 'cursor-default' : 'cursor-pointer'
                    } ${
                      milestone.completed 
                        ? 'bg-emerald-50/50 border-emerald-200' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={milestone.completed}
                      disabled={isSubmitter}
                      onChange={() => {}} // handled by parent onClick
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#006194] focus:ring-[#006194]"
                    />
                    <div className="flex-1">
                      <div className="text-xs font-medium text-slate-800 flex items-center gap-2">
                        <span>{milestone.title}</span>
                        {milestone.requiredForNextStage && (
                          <span className="text-[10px] font-mono-code bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                            REQUIRED
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {milestone.completed ? 'Cleared by Evaluator' : 'Pending verification document'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-sky-50 border border-sky-100 rounded-lg text-xs text-sky-800 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Board Rule:</strong> When all required milestones in {currentStage.name} are satisfied, the project can safely transition to {nextStage?.name || 'completion'}.
                </span>
              </div>
            </div>
          )}

          {activeTab === 'board_votes' && (
            <div className="space-y-6">
              {/* Cast Review Form (Hidden for Submitters) */}
              {!isSubmitter && (
              <form onSubmit={handleAddReviewerVote} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <h3 className="text-xs font-mono-code font-bold uppercase text-slate-700">
                  Cast Official Adjudication Vote / Comment
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedVote('APPROVE')}
                    className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                      selectedVote === 'APPROVE' 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    Approve Clearance
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedVote('REVISE')}
                    className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                      selectedVote === 'REVISE' 
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Request Revisions
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedVote('REJECT')}
                    className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                      selectedVote === 'REJECT' 
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Record formal board rationale, covenant terms, or technical conditions..."
                  className="w-full text-xs p-2.5 rounded border border-slate-200 bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#006194]"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="px-3 py-1.5 bg-[#006194] text-white text-xs font-semibold rounded hover:bg-[#004b73] disabled:opacity-50 transition-colors"
                  >
                    Submit Resolution Note
                  </button>
                </div>
              </form>
              )}

              {/* Log of current reviewers */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono-code font-bold uppercase text-slate-500">
                  Committee & Evaluator Records ({project.reviewers.length})
                </h3>
                {project.reviewers.map((rev) => (
                  <div key={rev.id} className="p-3 bg-white border border-slate-200 rounded-lg flex items-start gap-3">
                    <img 
                      src={rev.avatar} 
                      alt={rev.name}
                      className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <strong className="text-xs text-slate-900">{rev.name}</strong>
                          <span className="text-[11px] text-slate-500">({rev.role})</span>
                        </div>
                        {rev.vote && (
                          <span className={`text-[10px] font-mono-code font-bold px-2 py-0.5 rounded ${
                            rev.vote === 'APPROVE' ? 'bg-emerald-100 text-emerald-800' :
                            rev.vote === 'REVISE' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {rev.vote}
                          </span>
                        )}
                      </div>
                      {rev.comment && (
                        <p className="text-xs text-slate-600 mt-1 italic">
                          "{rev.comment}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono-code font-bold uppercase text-slate-500 flex items-center gap-2">
                  <span>
                    {isSubmitter
                      ? 'Live Viewer Access & Pipeline Audit Log (Your Idea)'
                      : 'Live CEDA Pipeline & Viewer Access Audit Log'}
                  </span>
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Radio className="w-3 h-3 animate-pulse" />
                  LIVE STREAM
                </span>
              </div>

              {liveAuditEntries.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs text-slate-500">
                  No access or screening events logged for this proposal yet. Views and tab accesses appear here in real time.
                </div>
              ) : (
                <div className="space-y-2 border-l-2 border-slate-200 ml-2 pl-4">
                  {liveAuditEntries.map((log, index) => {
                    const isViewEvent = log.eventType === 'view' || log.eventType === 'tab_access';
                    return (
                      <div key={index} className="relative pb-3">
                        <div
                          className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                            isViewEvent
                              ? 'bg-[#006194]'
                              : log.eventType === 'screening'
                                ? 'bg-emerald-500'
                                : 'bg-slate-400'
                          }`}
                        />
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isViewEvent && <Eye className="w-3.5 h-3.5 text-[#006194] shrink-0" />}
                            <strong className="text-slate-800">{log.action}</strong>
                            {log.tabName && (
                              <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-sky-50 text-[#006194] border border-sky-200">
                                {log.tabName}
                              </span>
                            )}
                          </div>
                          <span className="font-mono-code text-[11px] text-slate-400 shrink-0">
                            {log.timestamp}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Viewed / Actioned by: <strong className="text-slate-700">{log.author}</strong>
                        </div>
                        {log.notes && (
                          <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded mt-1 border border-slate-100">
                            {log.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isSubmitter && prevStage ? (
              <button
                onClick={() => onRegressStage(project.id)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to {prevStage.name}
              </button>
            ) : isSubmitter ? (
              <span className="text-[11px] font-mono-code text-slate-500">
                Stage advancement is managed by CEDA Administrators & Evaluators
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Close Dossier
            </button>

            {!isSubmitter && nextStage && (
              <button
                onClick={() => onAdvanceStage(project.id)}
                style={{ backgroundColor: nextStage.color }}
                className="px-4 py-1.5 text-xs font-semibold text-white rounded shadow-xs hover:opacity-95 transition-all flex items-center gap-1.5"
              >
                <span>Advance to {nextStage.name}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
