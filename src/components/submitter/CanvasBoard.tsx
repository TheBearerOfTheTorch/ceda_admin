import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  ProjectCardData,
  StageConfig,
  DependencyConnector,
  CanvasDensity,
  StageId,
  WorkflowCycle,
} from '../../types/ceda';
import { ProjectCard } from '../shared/ProjectCard';
import { StageHistoryInspectorModal } from './StageHistoryInspectorModal';
import {
  MoreVertical,
  Navigation,
  Hand,
  Minus,
  Plus,
  Edit3,
  MessageSquare,
  Image,
  Palette,
  Star,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  X,
  RotateCcw,
  Trash2,
  Grid3X3,
} from 'lucide-react';
import {
  broadcastCardMove,
  subscribeToClarificationChat,
  ClarificationChatMessage,
} from '../../lib/firebase.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export type CanvasTheme = 'slate_dots' | 'blueprint' | 'warm_paper' | 'dark_studio' | 'clean_grid';
import {
  getLifecycleRecordForIdea,
  loadAllLifecycleRecords,
  subscribeToLifecycleRecords,
  IdeaLifecycleRecord,
  recordStageTransitionLifecycle,
  mapWorkflowStagesToPipelineStages,
} from '../../lib/stageJourneyStore';

interface InkStroke {
  id: string;
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

interface SubmitterReviewerCommentItem {
  id: string;
  project: ProjectCardData;
  author: string;
  role: string;
  message: string;
  timestamp: string;
  source: 'review' | 'clarification';
}

interface CanvasBoardProps {
  projects: ProjectCardData[];
  connectors: DependencyConnector[];
  density: CanvasDensity;
  onDensityChange: (density: CanvasDensity) => void;
  zoom: number;
  panX: number;
  panY: number;
  onPanChange: (x: number, y: number) => void;
  onZoomChange: (zoom: number) => void;
  onSelectProject: (project: ProjectCardData) => void;
  onAdvanceProject: (projectId: string) => void;
  onMoveProjectStage: (projectId: string, newStageId: StageId) => void;
  onOpenEvaluateModal?: (project: ProjectCardData) => void;
  onOpenAdjudicateModal?: (project: ProjectCardData) => void;
  canvasTheme?: CanvasTheme;
  onCanvasThemeChange?: (theme: CanvasTheme) => void;
  showGrid?: boolean;
  onToggleGrid?: () => void;
  workflowCycle?: WorkflowCycle;
  faqCount?: number;
  onOpenFaqModal?: (tab: 'faq' | 'feedback') => void;
}

export const CanvasBoard: React.FC<CanvasBoardProps> = ({
  projects,
  connectors,
  density,
  onDensityChange,
  zoom,
  panX,
  panY,
  onPanChange,
  onZoomChange,
  onSelectProject,
  onAdvanceProject,
  onMoveProjectStage,
  onOpenEvaluateModal,
  onOpenAdjudicateModal,
  canvasTheme: externalCanvasTheme,
  onCanvasThemeChange,
  showGrid: externalShowGrid,
  onToggleGrid,
  workflowCycle,
  faqCount = 0,
  onOpenFaqModal,
}) => {
  const { currentUser } = useAuth();
  const pipelineStages = useMemo(() => mapWorkflowStagesToPipelineStages(workflowCycle), [workflowCycle]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'pan' | 'pen'>('select');
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);

  // Canvas Theme & Grid (synced with App state or fallback local state)
  const [localTheme, setLocalTheme] = useState<CanvasTheme>('slate_dots');
  const [localShowGrid, setLocalShowGrid] = useState(true);
  const activeTheme = externalCanvasTheme ?? localTheme;
  const activeShowGrid = externalShowGrid ?? localShowGrid;
  const [isThemePanelOpen, setIsThemePanelOpen] = useState(false);

  // Reviewer Comments Panel State & Live Clarification Comments across Submitter's Ideas
  const [isCommentsPanelOpen, setIsCommentsPanelOpen] = useState(false);
  const [clarificationCommentsByIdea, setClarificationCommentsByIdea] = useState<
    Record<string, ClarificationChatMessage[]>
  >({});

  // Pen Tool Freehand Ink Strokes State (persisted per submitter in localStorage)
  const inkStorageKey = `ceda_submitter_ink_strokes_${currentUser?.id || 'default'}_v1`;
  const [inkStrokes, setInkStrokes] = useState<InkStroke[]>(() => {
    try {
      const saved = localStorage.getItem(inkStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeStroke, setActiveStroke] = useState<InkStroke | null>(null);
  const [penColor, setPenColor] = useState('#006194');
  const [penWidth, setPenWidth] = useState(3);

  // Live Lifecycle Records from Admin Screening, Evaluator & Adjudicator actions
  const [lifecycleMap, setLifecycleMap] = useState<Record<string, IdeaLifecycleRecord>>(() =>
    loadAllLifecycleRecords()
  );

  // Stage History Inspector Modal state (when clicking a green/red round stage circle)
  const [inspectingStageItem, setInspectingStageItem] = useState<{
    project: ProjectCardData;
    stage: StageConfig;
    lifecycle?: IdeaLifecycleRecord | null;
  } | null>(null);

  useEffect(() => {
    setLifecycleMap(loadAllLifecycleRecords());
    const unsub = subscribeToLifecycleRecords((updated) => {
      setLifecycleMap({ ...updated });
    });
    return () => unsub();
  }, []);

  // Enrich projects with their live stage, company name, and screening status from the lifecycle store
  const enrichedProjects = useMemo(() => {
    const stageOrder: StageId[] = pipelineStages.map((s) => s.id);
    return projects.map((proj) => {
      const lifecycle = getLifecycleRecordForIdea({
        id: proj.id,
        stageTag: proj.stageTag,
        title: proj.title,
      });
      if (!lifecycle) return { project: proj, lifecycle: null };

      const projStageIdx = stageOrder.indexOf(proj.stageId);
      const lcStageIdx = stageOrder.indexOf(lifecycle.currentStageId);
      const effectiveStageId =
        lcStageIdx > projStageIdx ? lifecycle.currentStageId : proj.stageId;
      const effectiveStageMeta =
        pipelineStages.find((s) => s.id === effectiveStageId) || pipelineStages[0];

      const suffix = proj.stageTag?.match(/\d+/)?.[0] || String(proj.id).slice(-3);
      const nextStageTag = `[${effectiveStageMeta.tagPrefix}-${suffix}]`;

      const updatedOrg =
        lifecycle.enterpriseName ||
        lifecycle.screening?.cipaMatch?.companyName ||
        proj.applicant.organization;

      const nextTags = Array.from(
        new Set([
          ...proj.tags.filter((t) => t !== 'pending'),
          ...(lifecycle.screening?.status === 'verified' ? ['Docs Verified', 'CIPA + BURS Verified'] : []),
          ...(lifecycle.overallStatus === 'rejected' ? ['Rejected at Screening'] : []),
        ])
      );

      return {
        project: {
          ...proj,
          stageId: effectiveStageId,
          stageTag: nextStageTag,
          applicant: {
            ...proj.applicant,
            organization: updatedOrg,
            name: lifecycle.submitterName || proj.applicant.name,
            nationalId: lifecycle.omangId || proj.applicant.nationalId,
          },
          cipaNumber:
            lifecycle.cipaUin ||
            lifecycle.screening?.cipaMatch?.uin ||
            proj.cipaNumber,
          kycStatus:
            lifecycle.screening?.status === 'verified'
              ? ('Docs Verified' as const)
              : proj.kycStatus,
          tags: nextTags,
        },
        lifecycle,
      };
    });
  }, [projects, lifecycleMap]);

  // Persist Pen ink strokes per submitter
  useEffect(() => {
    try {
      localStorage.setItem(inkStorageKey, JSON.stringify(inkStrokes));
    } catch {
      // ignore storage quota errors
    }
  }, [inkStrokes, inkStorageKey]);

  // Reload ink strokes if submitter changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(inkStorageKey);
      setInkStrokes(saved ? JSON.parse(saved) : []);
    } catch {
      setInkStrokes([]);
    }
  }, [inkStorageKey]);

  // Subscribe to real-time Clarification & Evaluation comments across all of this submitter's ideas
  const projectChatKeysSignature = useMemo(
    () =>
      enrichedProjects
        .map((item) => item.project.id || item.project.stageTag)
        .filter(Boolean)
        .join('|'),
    [enrichedProjects]
  );

  useEffect(() => {
    const keys = projectChatKeysSignature ? projectChatKeysSignature.split('|') : [];
    if (keys.length === 0) {
      setClarificationCommentsByIdea({});
      return;
    }
    const unsubs = keys.map((ideaKey) =>
      subscribeToClarificationChat(ideaKey, (msgs) => {
        setClarificationCommentsByIdea((prev) => ({ ...prev, [ideaKey]: msgs }));
      })
    );
    return () => {
      unsubs.forEach((u) => u());
    };
  }, [projectChatKeysSignature]);

  // Combine both formal Evaluator/Adjudicator review notes and real-time Clarification Desk messages
  const allReviewerComments = useMemo<SubmitterReviewerCommentItem[]>(() => {
    const items: SubmitterReviewerCommentItem[] = [];
    const seen = new Set<string>();

    enrichedProjects.forEach(({ project }) => {
      const chatKey = project.id || project.stageTag;
      // 1) Evaluation / Adjudication review comments
      (project.reviewers || []).forEach((rev, idx) => {
        const text = rev.comment?.trim();
        if (!text) return;
        const uid = `rev-${project.id}-${rev.name}-${idx}`;
        if (seen.has(uid)) return;
        seen.add(uid);
        items.push({
          id: uid,
          project,
          author: rev.name || 'Assigned Official',
          role: rev.role || 'Evaluator',
          message: text,
          timestamp: rev.date || 'Recent review',
          source: 'review',
        });
      });

      // 2) Live Clarification Chat messages from Evaluators/Admins/Adjudicators (and thread replies)
      const msgs = clarificationCommentsByIdea[chatKey] || [];
      msgs.forEach((msg) => {
        const uid = `chat-${chatKey}-${msg.id}`;
        if (seen.has(uid)) return;
        seen.add(uid);
        items.push({
          id: uid,
          project,
          author: msg.senderName || 'Reviewer',
          role: msg.senderRole || 'Evaluator',
          message: msg.message,
          timestamp: msg.timestamp || 'Live message',
          source: 'clarification',
        });
      });
    });

    return items.reverse();
  }, [enrichedProjects, clarificationCommentsByIdea]);

  // Canvas Theme background & grid helper matching Admin workspace themes
  const themeStyles: Record<CanvasTheme, { bg: string; pattern: string; size: string; isDark?: boolean }> = {
    slate_dots: {
      bg: '#f8fafc',
      pattern: 'radial-gradient(#cbd5e1 1.3px, transparent 1.3px)',
      size: '22px 22px',
    },
    blueprint: {
      bg: '#f0f7ff',
      pattern: 'linear-gradient(to right, rgba(2,132,199,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(2,132,199,0.08) 1px, transparent 1px)',
      size: '24px 24px',
    },
    warm_paper: {
      bg: '#faf8f5',
      pattern: 'radial-gradient(#d6d3d1 1.2px, transparent 1.2px)',
      size: '20px 20px',
    },
    dark_studio: {
      bg: '#0f172a',
      pattern: 'radial-gradient(rgba(148,163,184,0.22) 1.2px, transparent 1.2px)',
      size: '22px 22px',
      isDark: true,
    },
    clean_grid: {
      bg: '#ffffff',
      pattern: 'linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)',
      size: '28px 28px',
    },
  };
  const currentThemeCfg = themeStyles[activeTheme] || themeStyles.slate_dots;

  const getCanvasPointFromEvent = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.round((e.clientX - rect.left - panX) / zoom),
      y: Math.round((e.clientY - rect.top - panY) / zoom),
    };
  };

  // Mouse pan & pen drawing handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'pen' && e.button === 0) {
      const pt = getCanvasPointFromEvent(e);
      setActiveStroke({
        id: `stroke_${Date.now()}`,
        color: penColor,
        width: penWidth,
        points: [pt],
      });
      return;
    }

    if (
      activeTool === 'pan' ||
      e.button === 1 ||
      (e.target as HTMLElement).tagName === 'SECTION' ||
      (e.target as HTMLElement).dataset.canvasBg === 'true'
    ) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - panX, y: e.clientY - panY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (activeTool === 'pen' && activeStroke) {
      const pt = getCanvasPointFromEvent(e);
      setActiveStroke((prev) =>
        prev ? { ...prev, points: [...prev.points, pt] } : null
      );
      return;
    }
    if (isPanning) {
      onPanChange(e.clientX - startPan.x, e.clientY - startPan.y);
    }
  };

  const handleMouseUp = () => {
    if (activeStroke) {
      if (activeStroke.points.length > 1) {
        setInkStrokes((prev) => [...prev, activeStroke]);
      }
      setActiveStroke(null);
    }
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.4), 2.2);
      onZoomChange(newZoom);
    } else {
      onPanChange(panX - e.deltaX, panY - e.deltaY);
    }
  };

  const getStageColumnX = (stageIndex: number) => {
    return 32 + stageIndex * (320 + 24);
  };

  const handleDropCard = (projectId: string, newStageId: StageId) => {
    if (currentUser?.role === 'Submitter') return;
    const item = enrichedProjects.find((p) => p.project.id === projectId);
    const proj = item?.project;
    if (proj && proj.stageId !== newStageId) {
      const actorName = `${currentUser?.firstName || 'CEDA'} ${currentUser?.lastName || 'Official'}`.trim();
      recordStageTransitionLifecycle(
        {
          id: proj.id,
          stageTag: proj.stageTag,
          title: proj.title,
          enterpriseName: proj.applicant?.organization,
          submitterName: proj.applicant?.name,
          omangId: proj.applicant?.nationalId,
          cipaUin: proj.cipaNumber,
          capitalAsk: proj.fundingRequested,
          sector: proj.sector,
        },
        newStageId,
        actorName,
        currentUser?.role || 'Official'
      );
      onMoveProjectStage(projectId, newStageId);
      broadcastCardMove(
        parseInt(projectId.replace(/\D/g, '')) || 101,
        proj.stageId,
        newStageId,
        actorName
      );
    }
  };

  return (
    <div className="flex-1 relative h-[calc(100vh-56px)] overflow-hidden flex flex-col bg-[#f8fafc]">
      {/* Canvas Sub-Header Bar */}
      <div className="h-10 bg-white border-b border-[#e2e8f0] px-6 flex items-center justify-between text-xs select-none shrink-0 z-10 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-slate-800">Active Pipeline Workspace</span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500 font-mono-code text-[11px]">{pipelineStages.length} STAGES SYNCED</span>
          <span className="text-slate-300">•</span>
          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10.5px]">
            Click any green stage circle to view CIPA, BURS & evaluation records
          </span>
        </div>

        {/* Right: Submitter FAQ & Feedback + DENSITY: Compact | Normal | Expanded */}
        <div className="flex items-center gap-2">
          {currentUser?.role === 'Submitter' && onOpenFaqModal && (
            <>
              <button
                type="button"
                onClick={() => onOpenFaqModal('faq')}
                className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#006194] border border-sky-200 font-bold text-[11px] transition-colors cursor-pointer"
              >
                FAQs ({faqCount})
              </button>
              <button
                type="button"
                onClick={() => onOpenFaqModal('feedback')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-[11px] transition-colors cursor-pointer"
              >
                Feedback
              </button>
            </>
          )}
          <span className="font-mono-code text-[10.5px] uppercase font-bold text-slate-400">
            DENSITY:
          </span>
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-600">
            {(['Compact', 'Normal', 'Expanded'] as CanvasDensity[]).map((d) => (
              <button
                key={d}
                onClick={() => onDensityChange(d)}
                className={`px-2 py-0.5 rounded transition-colors ${density === d
                  ? 'bg-sky-100 text-[#006194] font-bold shadow-2xs'
                  : 'hover:text-slate-900'
                  }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Pan/Zoom 2D Canvas Area with Dynamic Theme & Grid */}
      <div
        ref={containerRef}
        data-canvas-bg="true"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          backgroundColor: currentThemeCfg.bg,
          backgroundImage: activeShowGrid ? currentThemeCfg.pattern : 'none',
          backgroundSize: currentThemeCfg.size,
        }}
        className={`flex-1 relative overflow-hidden ${activeTool === 'pen'
          ? 'cursor-crosshair'
          : activeTool === 'pan'
            ? isPanning
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : 'cursor-default'
          }`}
      >
        {/* Infinite Artboard Container */}
        <div
          data-canvas-bg="true"
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isPanning ? 'none' : 'transform 0.05s ease-out',
          }}
          className="absolute left-0 top-0 w-[3400px] h-[2400px] select-none"
        >
          {/* SVG Dotted Bezier Connector Tracks + Freehand Pen Ink Strokes */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
            {[...inkStrokes, ...(activeStroke ? [activeStroke] : [])].map((stroke) => {
              const d = stroke.points
                .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                .join(' ');
              return (
                <path
                  key={stroke.id}
                  d={d}
                  fill="none"
                  stroke={stroke.color}
                  strokeWidth={stroke.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.92"
                />
              );
            })}
            {connectors.map((conn) => {
              const fromProj = enrichedProjects.find((p) => p.project.id === conn.fromProjectId)?.project;
              const toProj = enrichedProjects.find((p) => p.project.id === conn.toProjectId)?.project;
              if (!fromProj || !toProj) return null;

              const fromStageIndex = pipelineStages.findIndex((s) => s.id === fromProj.stageId);
              const toStageIndex = pipelineStages.findIndex((s) => s.id === toProj.stageId);
              if (fromStageIndex === -1 || toStageIndex === -1) return null;

              const x1 = getStageColumnX(fromStageIndex) + 320;
              const y1 = 120;
              const x2 = getStageColumnX(toStageIndex);
              const y2 = 180;
              const midX = (x1 + x2) / 2;

              return (
                <g key={conn.id}>
                  <path
                    d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    opacity="0.8"
                  />
                  <circle cx={x1} cy={y1} r="3.5" fill="#0284c7" />
                  <circle cx={x2} cy={y2} r="3.5" fill="#006194" />
                </g>
              );
            })}
          </svg>

          {/* Dynamic Stage Column Headers + Row-by-Row Idea Stage Journey Tracks */}
          <div className="absolute left-8 top-6 pb-24">
            {/* Row 1: Dynamic Stage Column Headers */}
            <div className="flex items-start gap-6 mb-5">
              {pipelineStages.map((stage, stageColIdx) => {
                const stageCount = enrichedProjects.filter(
                  (item) => item.project.stageId === stage.id
                ).length;

                return (
                  <div
                    key={`${stage.id}-${stage.number}-${stageColIdx}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const projectId =
                        e.dataTransfer.getData('text/plain') || draggedProjectId;
                      if (projectId) {
                        handleDropCard(projectId, stage.id);
                      }
                      setDraggedProjectId(null);
                    }}
                    className="w-[320px] shrink-0"
                  >
                    <div className="bg-white rounded-xl border border-[#e2e8f0] px-3.5 py-2.5 flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2">
                        <span
                          style={{ backgroundColor: stage.color }}
                          className="w-2.5 h-2.5 rounded-full"
                        />
                        <span className="text-xs font-bold text-slate-900 tracking-tight">
                          {stage.number}. {stage.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          style={{ backgroundColor: stage.bgColor, color: stage.color }}
                          className="text-[11px] font-mono-code font-bold px-2 py-0.5 rounded-full"
                        >
                          {stageCount} Active
                        </span>
                        <button className="text-slate-400 hover:text-slate-600 p-0.5 rounded">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Row-by-Row Idea Progression Tracks (Matching User Wireframe) */}
            <div className="space-y-6">
              {enrichedProjects.map(({ project, lifecycle }) => {
                const activeStageIdx = Math.max(
                  0,
                  pipelineStages.findIndex((s) => s.id === project.stageId)
                );
                const isRejectedOverall =
                  lifecycle?.overallStatus === 'rejected' ||
                  lifecycle?.screening?.status === 'rejected';

                return (
                  <div
                    key={project.id}
                    className="relative flex items-center gap-6"
                  >
                    {pipelineStages.map((stage, stageIdx) => {
                      const isCompletedPastStage = stageIdx < activeStageIdx;
                      const isCurrentStage = stageIdx === activeStageIdx;
                      const checkpoint = lifecycle?.stageCheckpoints?.[stage.id];
                      const isStageRejected =
                        checkpoint?.status === 'rejected' ||
                        (isCurrentStage && isRejectedOverall);

                      return (
                        <div
                          key={`${stage.id}-${stage.number}-${stageIdx}`}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const droppedId =
                              e.dataTransfer.getData('text/plain') || draggedProjectId;
                            if (droppedId) {
                              handleDropCard(droppedId, stage.id);
                            }
                            setDraggedProjectId(null);
                          }}
                          className="w-[320px] shrink-0 relative flex items-center justify-center min-h-[190px]"
                        >
                          {/* 1. Completed Past Stage: Green Round Circle Card + Dashed Connector Line to Next Stage */}
                          {isCompletedPastStage && (
                            <>
                              {/* Dashed Connector Line from this Stage Circle to the Next Stage */}
                              <div
                                className="absolute top-1/2 -translate-y-1/2 pointer-events-none z-0"
                                style={{
                                  left: '50%',
                                  width:
                                    stageIdx === activeStageIdx - 1
                                      ? 'calc(50% + 24px)'
                                      : 'calc(100% + 24px)',
                                }}
                              >
                                <div className="w-full border-t-[2.5px] border-dashed border-emerald-500/80" />
                              </div>

                              {/* Clickable Green Round Circle Card */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectingStageItem({
                                    project,
                                    stage,
                                    lifecycle,
                                  });
                                }}
                                title={`Click to inspect Stage ${stage.number} (${stage.name}) verification details for "${project.title}"`}
                                className="group relative z-10 flex flex-col items-center focus:outline-none cursor-pointer"
                              >
                                <div className="w-28 h-28 rounded-full bg-emerald-50 hover:bg-emerald-100/90 border-[3px] border-emerald-500 shadow-md hover:shadow-xl hover:scale-105 transition-all flex flex-col items-center justify-center p-2.5 text-center ring-4 ring-emerald-500/15">
                                  <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xs mb-1">
                                    <CheckCircle2 className="w-4 h-4" />
                                  </div>
                                  <span className="text-[11px] font-black text-emerald-950 leading-tight">
                                    {stage.number}. {stage.name}
                                  </span>
                                  <span className="text-[9.5px] font-extrabold text-emerald-700 mt-0.5">
                                    {stage.id === 'intake'
                                      ? '✓ Ingest Passed'
                                      : stage.id === 'screening'
                                        ? '✓ CIPA & BURS OK'
                                        : '✓ Gate Passed'}
                                  </span>
                                  <span className="mt-1 px-2 py-0.5 rounded-full bg-white/90 border border-emerald-300 text-[8.5px] font-bold text-emerald-800 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-colors">
                                    Click to Inspect
                                  </span>
                                </div>

                                {/* Idea Identifier Pill under Circle */}
                                <div className="mt-2 px-2.5 py-0.5 rounded-full bg-white/95 border border-slate-200 shadow-2xs text-[10px] font-bold text-slate-700 max-w-[240px] truncate">
                                  <span className="font-mono-code text-emerald-700 mr-1">
                                    {project.stageTag}
                                  </span>
                                  <span>{project.title}</span>
                                </div>
                              </button>
                            </>
                          )}

                          {/* 2. Current Active Stage: Rectangular Idea Card (or Rejected Stage Card) */}
                          {isCurrentStage && (
                            <div
                              draggable={currentUser?.role !== 'Submitter'}
                              onDragStart={(e) => {
                                if (currentUser?.role === 'Submitter') return;
                                e.dataTransfer.setData('text/plain', project.id);
                                setDraggedProjectId(project.id);
                              }}
                              className="relative z-10 w-[320px]"
                            >
                              {/* Optional Rejected or Verified Banner above Active Card */}
                              {isStageRejected ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInspectingStageItem({
                                      project,
                                      stage,
                                      lifecycle,
                                    });
                                  }}
                                  className="w-full mb-2 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-between shadow-md transition-colors cursor-pointer"
                                >
                                  <span className="flex items-center gap-1.5">
                                    <XCircle className="w-4 h-4 shrink-0" />
                                    <span>Rejected at Stage {stage.number} ({stage.name})</span>
                                  </span>
                                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded">
                                    View Report →
                                  </span>
                                </button>
                              ) : lifecycle?.screening?.status === 'verified' ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const screeningStage =
                                      pipelineStages.find((s) => s.id === 'screening') || stage;
                                    setInspectingStageItem({
                                      project,
                                      stage: screeningStage,
                                      lifecycle,
                                    });
                                  }}
                                  className="w-full mb-2 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-bold flex items-center justify-between shadow-2xs transition-colors cursor-pointer"
                                >
                                  <span className="flex items-center gap-1.5 truncate">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span className="truncate">
                                      🟢 CIPA & BURS Verified ({project.applicant.organization})
                                    </span>
                                  </span>
                                  <span className="text-[9.5px] font-extrabold text-emerald-700 shrink-0 ml-1 underline">
                                    Details
                                  </span>
                                </button>
                              ) : null}

                              <ProjectCard
                                project={project}
                                stage={stage}
                                onSelect={onSelectProject}
                                onAdvance={(p) => onAdvanceProject(p.id)}
                                onOpenEvaluateModal={onOpenEvaluateModal}
                                onOpenAdjudicateModal={onOpenAdjudicateModal}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Floating FigJam/Miro Tool Dock (Collaboration tools removed for Submitter) */}
        <aside
          aria-label="Canvas Workspace Tools"
          className="fixed right-4 top-28 z-30 flex flex-col items-center bg-white border border-[#e2e8f0] rounded-2xl shadow-xl p-1.5 gap-1 select-none"
        >
          <button
            onClick={() => setActiveTool('select')}
            title="Navigation Tool (V)"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${activeTool === 'select'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <Navigation className="w-4 h-4 -rotate-45" />
          </button>

          <button
            onClick={() => setActiveTool('pan')}
            title="Pan Hand Tool (H)"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${activeTool === 'pan'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <Hand className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setActiveTool((prev) => (prev === 'pen' ? 'select' : 'pen'));
              setIsThemePanelOpen(false);
              setIsCommentsPanelOpen(false);
            }}
            title="Pencil & Canvas Annotation Pen"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${activeTool === 'pen'
              ? 'bg-[#006194] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setIsCommentsPanelOpen((prev) => !prev);
              setIsThemePanelOpen(false);
            }}
            title={`Reviewer Comments (${allReviewerComments.length})`}
            className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isCommentsPanelOpen
              ? 'bg-[#006194] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <MessageSquare className="w-4 h-4" />
            {allReviewerComments.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#006194] text-white border border-white text-[9px] font-bold flex items-center justify-center">
                {allReviewerComments.length > 99 ? '99+' : allReviewerComments.length}
              </span>
            )}
          </button>

          <button
            title="Add Media / Diagrams"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <Image className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setIsThemePanelOpen((prev) => !prev);
              setIsCommentsPanelOpen(false);
            }}
            title="Canvas Color Theme & Grid"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isThemePanelOpen
              ? 'bg-[#006194] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
          >
            <Palette className="w-4 h-4" />
          </button>

          <button
            title="Bookmarked Initiatives"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <Star className="w-4 h-4" />
          </button>
        </aside>

        {/* Active Pen Tool Controls Popover */}
        {activeTool === 'pen' && (
          <div className="fixed right-20 top-44 z-30 bg-white/95 backdrop-blur-md border border-[#e2e8f0] rounded-2xl shadow-xl p-3 w-64 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-[#006194]" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                  Canvas Pen Tool
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTool('select')}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                title="Exit Pen Tool"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10.5px] text-slate-500">
              Click and drag directly on the canvas to sketch or mark notes.
            </p>
            <div className="flex items-center gap-1.5 pt-0.5">
              {['#006194', '#0284c7', '#10b981', '#f59e0b', '#e11d48', '#1e293b'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPenColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full transition-transform ${penColor === c ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'hover:scale-105'
                    }`}
                  title={`Ink color ${c}`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">Thickness</span>
              <div className="flex items-center gap-1">
                {[2, 3, 5, 8].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setPenWidth(w)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${penWidth === w
                      ? 'bg-[#006194] text-white border-[#006194]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    {w}px
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
              <button
                type="button"
                disabled={inkStrokes.length === 0}
                onClick={() => setInkStrokes((prev) => prev.slice(0, -1))}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10.5px] font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <RotateCcw className="w-3 h-3" />
                Undo
              </button>
              <button
                type="button"
                disabled={inkStrokes.length === 0}
                onClick={() => setInkStrokes([])}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10.5px] font-bold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-40"
              >
                <Trash2 className="w-3 h-3" />
                Clear ({inkStrokes.length})
              </button>
            </div>
          </div>
        )}

        {/* Reviewer Comments Panel across all Submitter Ideas */}
        {isCommentsPanelOpen && (
          <div className="fixed right-20 top-28 z-30 bg-white border border-[#e2e8f0] rounded-2xl shadow-2xl w-96 max-h-[70vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-150">
            <div className="px-4 py-3 bg-[#0c1a2e] text-white flex items-center justify-between shrink-0">
              <div>
                <h4 className="text-xs font-bold flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                  Reviewer & Clarification Comments
                </h4>
                <p className="text-[10px] text-slate-300 mt-0.5">
                  Feedback received across {enrichedProjects.length} submitted{' '}
                  {enrichedProjects.length === 1 ? 'idea' : 'ideas'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCommentsPanelOpen(false)}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50/70">
              {allReviewerComments.length === 0 ? (
                <div className="py-10 px-4 text-center">
                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No reviewer comments yet</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Evaluation notes and live clarification messages from assigned Evaluators or Adjudicators will appear here automatically.
                  </p>
                </div>
              ) : (
                allReviewerComments.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="inline-block text-[9.5px] font-mono-code font-bold text-[#006194] bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
                          {item.project.stageTag}
                        </span>
                        <h5 className="text-xs font-bold text-slate-900 truncate mt-1">
                          {item.project.title}
                        </h5>
                      </div>
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${item.source === 'clarification'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                      >
                        {item.source === 'clarification' ? 'Clarification' : 'Evaluation'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2">
                      "{item.message}"
                    </p>

                    <div className="flex items-center justify-between pt-0.5 text-[10px]">
                      <span className="text-slate-500 font-semibold">
                        {item.author} ({item.role}) • {item.timestamp}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectProject(item.project);
                          setIsCommentsPanelOpen(false);
                        }}
                        className="font-bold text-[#006194] hover:underline"
                      >
                        Open Dossier →
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Canvas Color Theme & Grid Panel */}
        {isThemePanelOpen && (
          <div className="fixed right-20 top-56 z-30 bg-white border border-[#e2e8f0] rounded-2xl shadow-2xl p-4 w-72 space-y-3 animate-in fade-in slide-in-from-right-4 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-[#006194]" />
                <h4 className="text-xs font-bold text-slate-900">Theme & Canvas Layout</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsThemePanelOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {(
                [
                  { id: 'slate_dots', label: 'Slate Dots (Default)', swatch: '#f8fafc' },
                  { id: 'blueprint', label: 'Blueprint Grid', swatch: '#f0f7ff' },
                  { id: 'warm_paper', label: 'Warm Drafting Paper', swatch: '#faf8f5' },
                  { id: 'clean_grid', label: 'Clean White Grid', swatch: '#ffffff' },
                  { id: 'dark_studio', label: 'Dark Studio', swatch: '#0f172a' },
                ] as { id: CanvasTheme; label: string; swatch: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    if (onCanvasThemeChange) {
                      onCanvasThemeChange(opt.id);
                    } else {
                      setLocalTheme(opt.id);
                    }
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${activeTheme === opt.id
                    ? 'border-[#006194] bg-sky-50 text-[#006194] shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      style={{ backgroundColor: opt.swatch }}
                      className="w-4 h-4 rounded-md border border-slate-300 shrink-0"
                    />
                    {opt.label}
                  </span>
                  {activeTheme === opt.id && (
                    <span className="w-2 h-2 rounded-full bg-[#006194]" />
                  )}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Grid3X3 className="w-3.5 h-3.5 text-slate-500" />
                Show Grid / Dots
              </span>
              <button
                type="button"
                onClick={() => {
                  if (onToggleGrid) {
                    onToggleGrid();
                  } else {
                    setLocalShowGrid((prev) => !prev);
                  }
                }}
                className={`px-3 py-1 rounded-lg text-[10.5px] font-bold transition-colors ${activeShowGrid
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {activeShowGrid ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Card Density
              </span>
              <div className="grid grid-cols-3 gap-1">
                {(['Compact', 'Normal', 'Expanded'] as CanvasDensity[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onDensityChange(d)}
                    className={`py-1.5 rounded-lg text-[10.5px] font-bold capitalize border ${density === d
                      ? 'bg-[#006194] text-white border-[#006194]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom-Left Minimap ("CANVAS RADAR / Dynamic Stages") */}
        <div className="fixed bottom-4 left-84 z-30 bg-white/95 backdrop-blur-md rounded-2xl border border-[#e2e8f0] shadow-xl p-3 select-none w-52">
          <div className="flex items-center justify-between text-[9.5px] font-mono-code font-bold text-slate-400 uppercase mb-2">
            <span>Canvas Radar</span>
            <span>{pipelineStages.length} Stages</span>
          </div>

          <div className="relative h-14 bg-slate-50 rounded-xl p-1 border border-slate-100 flex items-center justify-between gap-1 overflow-hidden">
            {pipelineStages.map((st, stIdx) => (
              <div
                key={`${st.id}-${st.number}-${stIdx}`}
                style={{ backgroundColor: st.color }}
                className="flex-1 h-full rounded opacity-35"
              />
            ))}

            <div
              style={{
                left: `${Math.max(4, Math.min(120, (-panX / 2800) * 160))}%`,
                width: '45%',
              }}
              className="absolute top-1 bottom-1 bg-[#0284c7]/20 border border-[#0284c7] rounded shadow-xs pointer-events-none transition-all duration-75"
            />
          </div>
        </div>

        {/* Bottom-Center Floating Controls Pill */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center bg-white border border-[#e2e8f0] rounded-2xl shadow-xl p-1 gap-1 select-none">
          <button
            onClick={() => setActiveTool('select')}
            className={`p-2 rounded-xl transition-colors ${activeTool === 'select'
              ? 'bg-[#006194] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
              }`}
          >
            <Navigation className="w-4 h-4 -rotate-45" />
          </button>

          <button
            onClick={() => setActiveTool('pan')}
            className={`p-2 rounded-xl transition-colors ${activeTool === 'pan'
              ? 'bg-[#006194] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
              }`}
          >
            <Hand className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-slate-200 mx-1" />

          <button
            onClick={() => onZoomChange(Math.max(0.4, zoom - 0.15))}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <span className="px-2 font-mono-code font-bold text-xs text-slate-700 min-w-[50px] text-center">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={() => onZoomChange(Math.min(2.2, zoom + 0.15))}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-slate-200 mx-1" />

          <button
            onClick={() => {
              onZoomChange(0.85);
              onPanChange(30, 20);
            }}
            className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-[#006194] hover:bg-slate-100 rounded-lg transition-colors"
          >
            Fit
          </button>
        </div>
      </div>

      {/* Stage Verification & Audit Inspector Modal (Opens when clicking any Green/Red Stage Circle) */}
      <StageHistoryInspectorModal
        isOpen={!!inspectingStageItem}
        onClose={() => setInspectingStageItem(null)}
        project={inspectingStageItem?.project || null}
        stage={inspectingStageItem?.stage || null}
        lifecycleRecord={inspectingStageItem?.lifecycle || null}
      />
    </div>
  );
};
