import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ProjectCardData, DependencyConnector,
  ActiveCollaborator, StageId, Sector, IntakeDossier, CanvasDensity,
  AdminPersonnel, SubmissionBatchQueue, ApplicationFormField, WorkflowCycle,
  QueueIdeaItem, CanvasEvaluatorStation, CanvasPoolContainer, AdminCanvasTool,
  SubmitterEnquiryMessage, AdminAlertNotification, CanvasAnnotationItem,
  StatutoryScreeningRecord, FaqItem, SystemFeedbackItem, SystemFeedbackCategory
} from './types/ceda';
import {
  PIPELINE_STAGES, INITIAL_PROJECTS, INITIAL_CONNECTORS,
  ACTIVE_COLLABORATORS, INTAKE_DOSSIERS,
  INITIAL_ADMIN_PERSONNEL, INITIAL_SUBMISSION_BATCHES,
  INITIAL_APPLICATION_FIELDS, INITIAL_WORKFLOW_CYCLES,
  INITIAL_QUEUE_IDEAS, INITIAL_CANVAS_STATIONS,
  INITIAL_ASSIGNED_IDEAS, INITIAL_CANVAS_POOLS, ADMIN_CANVAS_TOOLS,
  INITIAL_ENQUIRY_MESSAGES, INITIAL_CANVAS_ANNOTATIONS
} from './data/mockData';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { TopBar } from './components/shared/TopBar';
import { CedaModulesMenu } from './components/shared/CedaModulesMenu';
import { InnovationIntakeSidebar } from './components/submitter/InnovationIntakeSidebar';
import { CanvasBoard } from './components/submitter/CanvasBoard';
import { AdminPersonnelSidebar } from './components/admin/AdminPersonnelSidebar';
import { EvaluatorAssignedSidebar } from './components/evaluator/EvaluatorAssignedSidebar';
import { AdminCanvasBoard } from './components/admin/AdminCanvasBoard';
import { BatchAssignModal } from './components/admin/BatchAssignModal';
import { WorkflowArchitectModal } from './components/admin/WorkflowArchitectModal';
import { FormBuilderModal } from './components/admin/FormBuilderModal';
import { InviteUserModal } from './components/admin/InviteUserModal';
import { ManageRolesModal } from './components/admin/ManageRolesModal';
import { ProjectDossierModal } from './components/shared/ProjectDossierModal';
import { NewProjectModal } from './components/submitter/NewProjectModal';
import { SubmitterEnquiryChatWidget } from './components/submitter/SubmitterEnquiryChatWidget';
import { BoardAdjudicationView } from './components/adjudicator/BoardAdjudicationView';
import { AnalyticsView } from './components/shared/AnalyticsView';
import { SubmitterPanel } from './components/submitter/SubmitterPanel';
import { EvaluatorModal } from './components/evaluator/EvaluatorModal';
import { AdjudicatorModal } from './components/adjudicator/AdjudicatorModal';
import { AdminPanelModal } from './components/admin/AdminPanelModal';
import { LiveActivityDrawer } from './components/shared/LiveActivityDrawer';
import { AdminSettingsModal } from './components/admin/AdminSettingsModal';
import { AdminAlertModal } from './components/admin/AdminAlertModal';
import { AgentPortalView } from './components/agent/AgentPortalView';
import { AuthScreen } from './components/shared/AuthScreen';
import { WorkspaceShareModal, WorkspaceSummary } from './components/shared/WorkspaceShareModal';
import { WorkspaceSetupModal } from './components/shared/WorkspaceSetupModal';
import { StatutoryScreeningModal } from './components/admin/StatutoryScreeningModal';
import { evaluateIdeaStatutoryScreening } from './lib/cipaScreeningEngine';
import {
  getLifecycleRecordForIdea,
  upsertIdeaLifecycleRecord,
  recordStatutoryScreeningLifecycle,
  recordEvaluatorAssignmentLifecycle,
  recordStageTransitionLifecycle,
  recordIdeaAuditEvent,
  normalizeIdeaKeyTitle,
  subscribeToLifecycleRecords,
  resetIdeaLifecycleToIntake,
  mapWorkflowStagesToPipelineStages,
  STAGE_ORDER,
} from './lib/stageJourneyStore';
import {
  subscribeToCardMoves,
  publishActivity,
  publishNotification,
  subscribeToNotifications,
  RealtimeNotificationItem,
  broadcastCardMove,
  saveWorkspaceToFirestore,
  subscribeToWorkspaceFirestore,
  createFirebaseAccountForInvitedUser,
  publishAdminAlert,
  subscribeToAdminAlerts,
  saveUserProfileToFirestore,
  deleteUserProfileFromFirestore,
  subscribeToPresence,
  publishNewSubmission,
  clearRealtimeSubmissionsQueue,
  subscribeToNewSubmissions,
  saveIdeaAssignment,
  deleteIdeaAssignment,
  deleteIdeaAssignmentsByInnovationId,
  deleteAllAssignmentsForUser,
  subscribeToAssignedIdeas,
  subscribeToAllIdeaAssignments,
  publishWorkspaceInviteEvent,
  subscribeToWorkspaceInvites,
  WorkspaceCursorItem,
  publishWorkspaceCursor,
  leaveWorkspaceCursor,
  subscribeToWorkspaceCursors,
  publishWorkspaceMemberRemoved,
  subscribeToWorkspaceMemberRemoved,
  publishCitizenEnquiry,
  subscribeToCitizenEnquiries,
  publishAdjudicationQueueItem,
  removeAdjudicationQueueItem,
  subscribeToAdjudicationQueue,
  publishWorkflowCycles,
  subscribeToWorkflowCycles,
  publishApplicationFields,
  subscribeToApplicationFields,
  DEFAULT_FAQ_ITEMS,
  publishFaqItems,
  subscribeToFaqItems,
  publishSystemFeedback,
  subscribeToSystemFeedback,
} from './lib/firebase.ts';
import { SubmitterFaqFeedbackModal } from './components/submitter/SubmitterFaqFeedbackModal.tsx';
import { WorkspaceAiDrawer } from './components/shared/WorkspaceAiDrawer.tsx';
import {
  initAudioUnlock,
  playNewSubmissionSound,
  playEvaluatorAssignmentSound,
} from './lib/soundEffects';
import { CheckCircle2, X } from 'lucide-react';

const CANVAS_STATE_STORAGE_KEY = 'ceda_canvas_state_v1';
const QUEUES_CLEARED_KEY = 'ceda_queues_cleared_2026_11_14_v1';

interface PersistedCanvasState {
  projects?: ProjectCardData[];
  connectors?: DependencyConnector[];
  intakeDossiers?: IntakeDossier[];
  personnel?: AdminPersonnel[];
  submissionBatches?: SubmissionBatchQueue[];
  applicationFields?: ApplicationFormField[];
  workflowCycles?: WorkflowCycle[];
  queueIdeas?: QueueIdeaItem[];
  canvasStations?: CanvasEvaluatorStation[];
  assignedIdeasMap?: Record<string, QueueIdeaItem>;
  canvasPools?: CanvasPoolContainer[];
  canvasAnnotations?: CanvasAnnotationItem[];
  enquiryMessages?: SubmitterEnquiryMessage[];
  adminAlerts?: AdminAlertNotification[];
  ideaCustomPositions?: Record<string, { x: number; y: number }>;
  poolCustomPositions?: Record<string, { x: number; y: number }>;
  messageCustomPositions?: Record<string, { x: number; y: number }>;
  cardCustomDimensions?: Record<string, { width: number; height: number }>;
  queueDimensions?: { width: number; height: number };
  isQueueCollapsed?: boolean;
  queueTab?: 'ideas' | 'messages' | 'adjudication';
  updatedAtMs?: number;
  density?: CanvasDensity;
  zoom?: number;
  panX?: number;
  panY?: number;
  autoDispatchEnabled?: boolean;
  maxChatsPerAgent?: number;
  slaWarningDays?: number;
  slaCriticalDays?: number;
  autoReplenishMessagesOnFinish?: boolean;
  enforceStatutoryGate?: boolean;
  autoScreenOnIngest?: boolean;
  isEmptySeed?: boolean;
  customizedSetupDone?: boolean;
  focusSector?: string;
  canvasTheme?: 'slate_dots' | 'blueprint' | 'warm_paper' | 'dark_studio' | 'clean_grid';
  showGrid?: boolean;
  showConnectors?: boolean;
}

function loadPersistedCanvasState(): PersistedCanvasState {
  try {
    const raw = localStorage.getItem(CANVAS_STATE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedCanvasState;
    if (!localStorage.getItem(QUEUES_CLEARED_KEY)) {
      parsed.queueIdeas = [];
      parsed.enquiryMessages = [];
      localStorage.setItem(CANVAS_STATE_STORAGE_KEY, JSON.stringify(parsed));
    }
    return parsed;
  } catch {
    return {};
  }
}

function MainAppContent() {
  const { currentUser, loading: authLoading } = useAuth();
  const [savedState] = useState<PersistedCanvasState>(() => loadPersistedCanvasState());

  // Workspace Collaboration & Persistence States
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('');
  const [workspacesList, setWorkspacesList] = useState<WorkspaceSummary[]>([]);
  const workspacesListRef = useRef<WorkspaceSummary[]>([]);
  const activeWorkspaceIdRef = useRef<string>('');
  const [activeWorkspaceCursors, setActiveWorkspaceCursors] = useState<WorkspaceCursorItem[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [allNotificationsFeed, setAllNotificationsFeed] = useState<RealtimeNotificationItem[]>([]);
  const [syncedAdjudicationIdeas, setSyncedAdjudicationIdeas] = useState<QueueIdeaItem[]>([]);
  const syncedAdjudicationIdsRef = useRef<Set<string>>(new Set());
  const seenEnquiryIdsRef = useRef<Set<string>>(new Set());
  const enquiriesSeededRef = useRef(false);
  const [allIdeaAssignmentsFeed, setAllIdeaAssignmentsFeed] = useState<
    { evaluatorName: string; evaluatorEmail: string; evaluatorId: string | number; innovationId: string; ideaTitle: string; ideaCode?: string }[]
  >([]);
  const isLiveActivityOpenRef = useRef<boolean>(false);
  const [pendingWorkspaceInviteBanner, setPendingWorkspaceInviteBanner] = useState<{
    workspaceId: string;
    workspaceName: string;
    invitedByName: string;
  } | null>(null);
  const [isShareWorkspaceOpen, setIsShareWorkspaceOpen] = useState<boolean>(false);
  const [isWorkspaceSetupOpen, setIsWorkspaceSetupOpen] = useState<boolean>(false);
  const [workspaceSetupMode, setWorkspaceSetupMode] = useState<'initial' | 'create'>('initial');
  const [canvasTheme, setCanvasTheme] = useState<'slate_dots' | 'blueprint' | 'warm_paper' | 'dark_studio' | 'clean_grid'>(
    () => savedState.canvasTheme ?? 'slate_dots'
  );
  const [showGrid, setShowGrid] = useState<boolean>(() => savedState.showGrid ?? true);
  const [showConnectors, setShowConnectors] = useState<boolean>(() => savedState.showConnectors ?? true);

  // Undo / Redo History Stack for Canvas Items
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const lastSnapshotRef = useRef<string>('');
  const isRestoringHistoryRef = useRef<boolean>(false);
  const [historyCounts, setHistoryCounts] = useState<{ undo: number; redo: number }>({ undo: 0, redo: 0 });
  const [ideaCustomPositions, setIdeaCustomPositions] = useState<Record<string, { x: number; y: number }>>(
    () => savedState.ideaCustomPositions ?? {}
  );
  const [poolCustomPositions, setPoolCustomPositions] = useState<Record<string, { x: number; y: number }>>(
    () => savedState.poolCustomPositions ?? {}
  );
  const [messageCustomPositions, setMessageCustomPositions] = useState<Record<string, { x: number; y: number }>>(
    () => savedState.messageCustomPositions ?? {}
  );
  const [cardCustomDimensions, setCardCustomDimensions] = useState<Record<string, { width: number; height: number }>>(
    () => savedState.cardCustomDimensions ?? {}
  );
  const [queueDimensions, setQueueDimensions] = useState<{ width: number; height: number }>(
    () => savedState.queueDimensions ?? { width: 1280, height: 230 }
  );
  const [isQueueCollapsed, setIsQueueCollapsed] = useState<boolean>(
    () => savedState.isQueueCollapsed ?? false
  );
  const [queueTab, setQueueTab] = useState<'ideas' | 'messages' | 'adjudication'>(
    () => savedState.queueTab ?? 'ideas'
  );
  const hydratedWorkspaceRef = useRef<string | null>(null);
  const applyingRemoteRef = useRef<boolean>(false);
  const localUpdatedAtMsRef = useRef<number>(Number(savedState.updatedAtMs || 0));
  const pendingSyncPayloadRef = useRef<{ wsId: string; payload: PersistedCanvasState; userId: number; email: string } | null>(null);
  const localClientIdRef = useRef<string>('client-' + Math.random().toString(36).slice(2, 10));
  const liveSubmissionsBufferRef = useRef<QueueIdeaItem[]>([]);
  const assignedIdeasRef = useRef<Record<string, QueueIdeaItem>>({});
  const canvasStationsRef = useRef<CanvasEvaluatorStation[]>([]);

  // Data States
  const [projects, setProjects] = useState<ProjectCardData[]>(() => savedState.projects ?? INITIAL_PROJECTS);
  const [connectors, setConnectors] = useState<DependencyConnector[]>(() => savedState.connectors ?? INITIAL_CONNECTORS);
  const [collaborators] = useState<ActiveCollaborator[]>(ACTIVE_COLLABORATORS);
  const [intakeDossiers, setIntakeDossiers] = useState<IntakeDossier[]>(() => savedState.intakeDossiers ?? INTAKE_DOSSIERS);

  // Administrator Specialized States
  const [personnel, setPersonnel] = useState<AdminPersonnel[]>(() => savedState.personnel ?? INITIAL_ADMIN_PERSONNEL);
  const [submissionBatches, setSubmissionBatches] = useState<SubmissionBatchQueue[]>(() => savedState.submissionBatches ?? INITIAL_SUBMISSION_BATCHES);
  const [applicationFields, setApplicationFields] = useState<ApplicationFormField[]>(() => savedState.applicationFields ?? INITIAL_APPLICATION_FIELDS);
  const [workflowCycles, setWorkflowCycles] = useState<WorkflowCycle[]>(() => savedState.workflowCycles ?? INITIAL_WORKFLOW_CYCLES);

  // Wireframe Interactive States (From User Sketch)
  const [queueIdeas, setQueueIdeas] = useState<QueueIdeaItem[]>(() => savedState.queueIdeas ?? INITIAL_QUEUE_IDEAS);
  const [canvasStations, setCanvasStations] = useState<CanvasEvaluatorStation[]>(() => savedState.canvasStations ?? INITIAL_CANVAS_STATIONS);
  const [assignedIdeasMap, setAssignedIdeasMap] = useState<Record<string, QueueIdeaItem>>(() => savedState.assignedIdeasMap ?? INITIAL_ASSIGNED_IDEAS);
  const [canvasPools, setCanvasPools] = useState<CanvasPoolContainer[]>(() => savedState.canvasPools ?? INITIAL_CANVAS_POOLS);
  const [canvasAnnotations, setCanvasAnnotations] = useState<CanvasAnnotationItem[]>(() => savedState.canvasAnnotations ?? INITIAL_CANVAS_ANNOTATIONS);

  // Layout & View Mode States
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isModulesMenuOpen, setIsModulesMenuOpen] = useState<boolean>(false);
  const [activeModuleId, setActiveModuleId] = useState<string>('pipeline_orchestrator');
  const [currentView, setCurrentView] = useState<'canvas' | 'board' | 'analytics' | 'submitter'>('canvas');
  const [density, setDensity] = useState<CanvasDensity>(() => savedState.density ?? 'Normal');

  // Canvas Viewport Pan & Zoom
  const [zoom, setZoom] = useState<number>(() => savedState.zoom ?? 0.9);
  const [panX, setPanX] = useState<number>(() => savedState.panX ?? 20);
  const [panY, setPanY] = useState<number>(() => savedState.panY ?? 20);

  // Modals & Panels
  const [selectedProject, setSelectedProject] = useState<ProjectCardData | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState<boolean>(false);
  const [isLiveActivityOpen, setIsLiveActivityOpen] = useState<boolean>(false);
  isLiveActivityOpenRef.current = isLiveActivityOpen;
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState<boolean>(false);
  const [adminPanelInitialTab, setAdminPanelInitialTab] = useState<'users' | 'categories' | 'workflow' | 'faqs' | 'feedback'>('users');
  const [isSubmitterFaqOpen, setIsSubmitterFaqOpen] = useState<boolean>(false);
  const [submitterFaqInitialTab, setSubmitterFaqInitialTab] = useState<'faq' | 'feedback'>('faq');
  const [faqItems, setFaqItems] = useState<FaqItem[]>(() => DEFAULT_FAQ_ITEMS);
  const [systemFeedback, setSystemFeedback] = useState<SystemFeedbackItem[]>([]);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState<boolean>(false);
  const [aiAllowAutoScreen, setAiAllowAutoScreen] = useState<boolean>(true);
  const [aiAllowAutoAssign, setAiAllowAutoAssign] = useState<boolean>(true);

  // Admin Specific Modals
  const [isBatchAssignOpen, setIsBatchAssignOpen] = useState<boolean>(false);
  const [batchAssignQueueId, setBatchAssignQueueId] = useState<string | undefined>(undefined);
  const [batchAssignPersonnelId, setBatchAssignPersonnelId] = useState<number | undefined>(undefined);
  const [isWorkflowArchitectOpen, setIsWorkflowArchitectOpen] = useState<boolean>(false);
  const [isFormBuilderOpen, setIsFormBuilderOpen] = useState<boolean>(false);
  const [isInviteUserOpen, setIsInviteUserOpen] = useState<boolean>(false);
  const [managingUser, setManagingUser] = useState<AdminPersonnel | null>(null);

  // Citizen Enquiries & Agent Helpdesk System States
  const [enquiryMessages, setEnquiryMessages] = useState<SubmitterEnquiryMessage[]>(() => savedState.enquiryMessages ?? INITIAL_ENQUIRY_MESSAGES);
  const [adminAlerts, setAdminAlerts] = useState<AdminAlertNotification[]>(() => savedState.adminAlerts ?? [
    {
      id: 'alert-init-1',
      targetUserId: 101,
      targetUserName: 'Dr. Monametsi Tau',
      targetUserRole: 'Evaluator',
      targetRole: 'Evaluator',
      type: 'sla_warning',
      alertType: 'sla_warning',
      title: '⚠️ Urgent: SLA Expiring Soon on Evaluation',
      message: 'Turnaround SLA for EVAL-CLT-101 has 2.4 days remaining. Please expedite technical review.',
      relatedIdeaCode: 'EVAL-CLT-101',
      timestamp: '1h ago',
      createdAt: '1h ago',
      read: false,
    }
  ]);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [alertTargetUser, setAlertTargetUser] = useState<AdminPersonnel | null>(null);
  const [alertTargetIdea, setAlertTargetIdea] = useState<QueueIdeaItem | null>(null);
  // Default to Manual Admin Queue mode (false) so incoming enquiries stage in the Admin Queue for manual/auto routing
  const [autoDispatchEnabled, setAutoDispatchEnabled] = useState<boolean>(() => savedState.autoDispatchEnabled ?? false);
  const [maxChatsPerAgent, setMaxChatsPerAgent] = useState<number>(() => savedState.maxChatsPerAgent ?? 3);
  const [slaWarningDays, setSlaWarningDays] = useState<number>(() => savedState.slaWarningDays ?? 3.0);
  const [slaCriticalDays, setSlaCriticalDays] = useState<number>(() => savedState.slaCriticalDays ?? 1.5);
  const [autoReplenishMessagesOnFinish, setAutoReplenishMessagesOnFinish] = useState<boolean>(() => savedState.autoReplenishMessagesOnFinish ?? true);
  // Stage 2: Statutory & Tax Screening Gate (CIPA & BURS) States
  const [enforceStatutoryGate, setEnforceStatutoryGate] = useState<boolean>(() => savedState.enforceStatutoryGate ?? true);
  const [autoScreenOnIngest, setAutoScreenOnIngest] = useState<boolean>(() => savedState.autoScreenOnIngest ?? false);
  const [screeningModalIdea, setScreeningModalIdea] = useState<QueueIdeaItem | null>(null);
  const [isBatchScreening, setIsBatchScreening] = useState<boolean>(false);

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Real-Time Presence Directory (Online / Reviewing / Editing / Offline)
  const [presenceMap, setPresenceMap] = useState<Record<string | number, 'online' | 'reviewing' | 'editing' | 'offline'>>({});

  // RBAC Modal States
  const [evaluatingProject, setEvaluatingProject] = useState<any | null>(null);
  const [adjudicatingProject, setAdjudicatingProject] = useState<any | null>(null);

  const activeWorkflowCycle = workflowCycles.find((c) => c.isActive) || workflowCycles[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  assignedIdeasRef.current = assignedIdeasMap;
  canvasStationsRef.current = canvasStations;

  const toQueueIdeaFromIncoming = (idea: any): QueueIdeaItem => {
    const lifecycleRec = getLifecycleRecordForIdea({
      id: idea.id,
      code: idea.stageTag || idea.code || idea.innovationNumber,
      title: idea.title,
    });
    const baseItem: QueueIdeaItem = {
      id: String(idea.id),
      code:
        idea.stageTag ||
        idea.code ||
        idea.innovationNumber ||
        `CEDA-INV-${Date.now().toString().slice(-4)}`,
      title: idea.title,
      category: idea.sector || idea.category?.categoryName || idea.category || 'General',
      arrivalDate: 'Just now',
      rawTimestamp: idea.rawTimestamp || idea.createdAtMs || (idea.createdAt ? new Date(idea.createdAt).getTime() : Date.now()),
      urgency: 'Standard',
      capitalAsk: Number(idea.fundingRequested ?? idea.capitalAsk ?? 0),
      status: 'in_queue',
      progress: 0,
      slaRemainingDays: 14,
      slaTargetDays: 14,
      enterpriseName:
        idea.enterpriseName ||
        idea.applicant?.organization ||
        lifecycleRec?.enterpriseName,
      submitterName:
        idea.submitterName ||
        idea.applicant?.name ||
        (idea.submitter ? `${idea.submitter.firstName} ${idea.submitter.lastName}`.trim() : undefined) ||
        lifecycleRec?.submitterName,
      omangId:
        idea.omangId ||
        idea.applicant?.nationalId ||
        lifecycleRec?.omangId,
      cipaUin:
        idea.cipaUin ||
        idea.cipaNumber ||
        lifecycleRec?.cipaUin,
      bursTin: idea.bursTin || lifecycleRec?.bursTin,
      screening: idea.screening || lifecycleRec?.screening,
    };
    if (autoScreenOnIngest && !baseItem.screening) {
      baseItem.screening = evaluateIdeaStatutoryScreening(baseItem);
    }
    return baseItem;
  };

  const mergeIncomingIdeasIntoQueue = (
    baseQueue: QueueIdeaItem[],
    incoming: QueueIdeaItem[],
    assignedMapOverride?: Record<string, QueueIdeaItem>,
    stationsOverride?: CanvasEvaluatorStation[]
  ): QueueIdeaItem[] => {
    const assignedMap = assignedMapOverride ?? assignedIdeasRef.current;
    const stations = stationsOverride ?? canvasStationsRef.current;
    const assignedStationIds = new Set(stations.flatMap((st) => st.assignedIdeaIds || []).map(String));
    const assignedValues = Object.values(assignedMap);

    let nextQueue = [...baseQueue];

    for (const cand of incoming) {
      const candTitleKey = normalizeIdeaKeyTitle(cand.title);
      const candCodeClean = (cand.code || '').replace(/[\[\]]/g, '').toLowerCase();
      const lifecycleRec = getLifecycleRecordForIdea({
        id: cand.id,
        code: cand.code,
        title: cand.title,
      });

      // Skip if already rejected, completed, or already moved into Stage 3+
      if (
        lifecycleRec?.overallStatus === 'rejected' ||
        lifecycleRec?.overallStatus === 'completed' ||
        lifecycleRec?.isAssignedToEvaluator ||
        (lifecycleRec && STAGE_ORDER.indexOf(lifecycleRec.currentStageId) >= 2)
      ) {
        continue;
      }

      // Skip if already assigned on Admin canvas
      const isAlreadyAssigned =
        Boolean(assignedMap[cand.id]) ||
        assignedStationIds.has(String(cand.id)) ||
        assignedValues.some(
          (a) =>
            String(a.id) === String(cand.id) ||
            (candTitleKey && normalizeIdeaKeyTitle(a.title) === candTitleKey) ||
            (candCodeClean && a.code && a.code.replace(/[\[\]]/g, '').toLowerCase() === candCodeClean)
        );
      if (isAlreadyAssigned) continue;

      // Skip if already present in queue
      const alreadyInQueue = nextQueue.some(
        (i) =>
          String(i.id) === String(cand.id) ||
          (candTitleKey && normalizeIdeaKeyTitle(i.title) === candTitleKey) ||
          (candCodeClean && i.code && i.code.replace(/[\[\]]/g, '').toLowerCase() === candCodeClean)
      );
      if (alreadyInQueue) continue;

      nextQueue = [cand, ...nextQueue];
    }

    return nextQueue;
  };

  const applyWorkspaceState = (state: PersistedCanvasState) => {
    if (!state || typeof state !== 'object') return;
    if (currentUser?.role === 'Submitter') {
      const myEmailLower = (currentUser.email || '').trim().toLowerCase();
      const ownProjects = Array.isArray(state.projects)
        ? state.projects.filter(
            (p: ProjectCardData) =>
              (p.submitterId !== undefined && Number(p.submitterId) === Number(currentUser.id)) ||
              (Boolean(myEmailLower) && Boolean(p.submitterEmail) && p.submitterEmail!.trim().toLowerCase() === myEmailLower)
          )
        : [];
      setProjects(ownProjects);
      setIntakeDossiers([]);
    } else {
      if (Array.isArray(state.projects)) {
        setProjects(state.projects);
      }
      if (Array.isArray(state.intakeDossiers)) setIntakeDossiers(state.intakeDossiers);
    }
    if (Array.isArray(state.connectors)) setConnectors(state.connectors);
    if (Array.isArray(state.personnel)) setPersonnel(state.personnel);
    if (Array.isArray(state.submissionBatches)) setSubmissionBatches(state.submissionBatches);
    if (Array.isArray(state.applicationFields)) setApplicationFields(state.applicationFields);
    if (Array.isArray(state.workflowCycles)) setWorkflowCycles(state.workflowCycles);
    const nextAssignedMap =
      state.assignedIdeasMap && typeof state.assignedIdeasMap === 'object'
        ? state.assignedIdeasMap
        : assignedIdeasRef.current;
    const nextStations = Array.isArray(state.canvasStations)
      ? state.canvasStations
      : canvasStationsRef.current;
    if (Array.isArray(state.canvasStations)) setCanvasStations(state.canvasStations);
    if (state.assignedIdeasMap && typeof state.assignedIdeasMap === 'object') setAssignedIdeasMap(state.assignedIdeasMap);
    if (Array.isArray(state.queueIdeas)) {
      setQueueIdeas(
        mergeIncomingIdeasIntoQueue(
          state.queueIdeas,
          liveSubmissionsBufferRef.current,
          nextAssignedMap,
          nextStations
        )
      );
    } else if (liveSubmissionsBufferRef.current.length > 0) {
      setQueueIdeas((prev) =>
        mergeIncomingIdeasIntoQueue(prev, liveSubmissionsBufferRef.current, nextAssignedMap, nextStations)
      );
    }
    if (Array.isArray(state.canvasPools)) setCanvasPools(state.canvasPools);
    if (Array.isArray(state.canvasAnnotations)) setCanvasAnnotations(state.canvasAnnotations);
    if (Array.isArray(state.enquiryMessages)) {
      setEnquiryMessages((prev) => {
        const merged = new Map<string, SubmitterEnquiryMessage>();
        for (const msg of [...state.enquiryMessages!, ...prev]) {
          if (!msg?.id) continue;
          const existing = merged.get(msg.id);
          const msgUpdated = Number((msg as any).updatedAtMs || msg.rawTimestamp || 0);
          const existingUpdated = Number((existing as any)?.updatedAtMs || existing?.rawTimestamp || 0);
          const msgThreadLen = Array.isArray(msg.thread) ? msg.thread.length : 0;
          const existingThreadLen = Array.isArray(existing?.thread) ? existing.thread.length : 0;
          if (
            !existing ||
            msgUpdated > existingUpdated ||
            (msgUpdated === existingUpdated && msgThreadLen >= existingThreadLen)
          ) {
            merged.set(msg.id, msg);
          }
        }
        return Array.from(merged.values()).sort(
          (a, b) => Number(a.rawTimestamp || 0) - Number(b.rawTimestamp || 0)
        );
      });
    }
    if (Array.isArray(state.adminAlerts)) setAdminAlerts(state.adminAlerts);
    if (state.ideaCustomPositions && typeof state.ideaCustomPositions === 'object') setIdeaCustomPositions(state.ideaCustomPositions);
    if (state.poolCustomPositions && typeof state.poolCustomPositions === 'object') setPoolCustomPositions(state.poolCustomPositions);
    if (state.messageCustomPositions && typeof state.messageCustomPositions === 'object') setMessageCustomPositions(state.messageCustomPositions);
    if (state.cardCustomDimensions && typeof state.cardCustomDimensions === 'object') setCardCustomDimensions(state.cardCustomDimensions);
    if (state.queueDimensions && typeof state.queueDimensions === 'object') setQueueDimensions(state.queueDimensions);
    if (typeof state.isQueueCollapsed === 'boolean') setIsQueueCollapsed(state.isQueueCollapsed);
    if (state.queueTab) setQueueTab(state.queueTab);
    if (typeof state.updatedAtMs === 'number') {
      localUpdatedAtMsRef.current = Math.max(localUpdatedAtMsRef.current, state.updatedAtMs);
    }
    if (state.density) setDensity(state.density);
    if (typeof state.zoom === 'number') setZoom(state.zoom);
    if (typeof state.panX === 'number') setPanX(state.panX);
    if (typeof state.panY === 'number') setPanY(state.panY);
    if (typeof state.autoDispatchEnabled === 'boolean') setAutoDispatchEnabled(state.autoDispatchEnabled);
    if (typeof state.maxChatsPerAgent === 'number') setMaxChatsPerAgent(state.maxChatsPerAgent);
    if (typeof state.slaWarningDays === 'number') setSlaWarningDays(state.slaWarningDays);
    if (typeof state.slaCriticalDays === 'number') setSlaCriticalDays(state.slaCriticalDays);
    if (typeof state.autoReplenishMessagesOnFinish === 'boolean') setAutoReplenishMessagesOnFinish(state.autoReplenishMessagesOnFinish);
    if (typeof state.enforceStatutoryGate === 'boolean') setEnforceStatutoryGate(state.enforceStatutoryGate);
    if (typeof state.autoScreenOnIngest === 'boolean') setAutoScreenOnIngest(state.autoScreenOnIngest);
    if (state.canvasTheme) setCanvasTheme(state.canvasTheme);
    if (typeof state.showGrid === 'boolean') setShowGrid(state.showGrid);
    if (typeof state.showConnectors === 'boolean') setShowConnectors(state.showConnectors);
  };

  // Load user's workspaces (creates an empty personal workspace on first login)
  useEffect(() => {
    if (!currentUser) {
      hydratedWorkspaceRef.current = null;
      setActiveWorkspaceId('');
      setWorkspacesList([]);
      return;
    }

    // Ensure Evaluators, Adjudicators & Admins always land on the Canvas workspace (not Submitter portal)
    if (currentUser.role === 'Submitter') {
      setCurrentView('submitter');
    } else {
      setCurrentView('canvas');
    }

    // Clear any previous user's canvas items before hydrating this user's workspace
    if (currentUser.role !== 'Administrator') {
      setCanvasStations([]);
      setQueueIdeas([]);
      setCanvasPools([]);
      setCanvasAnnotations([]);
      setAssignedIdeasMap({});
      setEnquiryMessages([]);
      setProjects([]);
      setPersonnel([]);
      if (currentUser.role === 'Submitter') {
        setIntakeDossiers([]);
      }
    }

    let cancelled = false;
    const loadWorkspaces = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const wsInviteParam = params.get('wsInvite');
        if (wsInviteParam) {
          localStorage.setItem(`ceda_active_workspace_${currentUser.id}`, wsInviteParam);
          params.delete('wsInvite');
          const nextSearch = params.toString();
          window.history.replaceState({}, '', `${window.location.pathname}${nextSearch ? '?' + nextSearch : ''}`);
        }

        const res = await fetch(
          `/api/workspaces/mine?userId=${encodeURIComponent(String(currentUser.id))}&email=${encodeURIComponent(currentUser.email)}`
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const list: WorkspaceSummary[] = Array.isArray(data) ? data : (data.workspaces || []);
        setWorkspacesList(list);
        workspacesListRef.current = list;

        const preferredId = localStorage.getItem(`ceda_active_workspace_${currentUser.id}`);
        const match = list.find((w) => w.id === preferredId) || list[0];
        if (match && !cancelled) {
          localStorage.setItem(`ceda_active_workspace_${currentUser.id}`, match.id);
          setActiveWorkspaceId(match.id);
          activeWorkspaceIdRef.current = match.id;
        }
      } catch (err) {
        console.warn('Workspace list fetch notice:', err);
      }
    };

    loadWorkspaces();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    workspacesListRef.current = workspacesList;
  }, [workspacesList]);

  useEffect(() => {
    activeWorkspaceIdRef.current = activeWorkspaceId;
  }, [activeWorkspaceId]);

  // Hydrate active workspace from localStorage -> PostgreSQL -> Firestore real-time sync
  useEffect(() => {
    if (!activeWorkspaceId || !currentUser) return;
    let cancelled = false;
    hydratedWorkspaceRef.current = null;
    localUpdatedAtMsRef.current = 0;
    const wsClearKey = `ceda_ws_queues_cleared_${activeWorkspaceId}_v1`;
    const needsInitialQueueClear = !localStorage.getItem(wsClearKey);
    let cleanedFirstFirestoreSnapshot = false;

    const sanitizeStateIfClearing = (stateObj: PersistedCanvasState): PersistedCanvasState => {
      if (!needsInitialQueueClear) return stateObj;
      return {
        ...stateObj,
        queueIdeas: [],
        enquiryMessages: [],
      };
    };

    const applyRemoteSafely = (stateObj: PersistedCanvasState) => {
      applyingRemoteRef.current = true;
      applyWorkspaceState(stateObj);
      queueMicrotask(() => {
        applyingRemoteRef.current = false;
      });
    };

    // 1. Instant hydration from workspace-scoped localStorage
    try {
      const cachedRaw = localStorage.getItem(`ceda_ws_${activeWorkspaceId}_v1`);
      if (cachedRaw) {
        const parsed = sanitizeStateIfClearing(JSON.parse(cachedRaw) as PersistedCanvasState);
        applyRemoteSafely(parsed);
        if (needsInitialQueueClear) {
          localStorage.setItem(`ceda_ws_${activeWorkspaceId}_v1`, JSON.stringify(parsed));
        }
      }
    } catch {
      // ignore invalid cache
    }

    // 2. Authoritative hydration from PostgreSQL (enforces workspace membership)
    const fetchWsState = async () => {
      try {
        const res = await fetch(
          `/api/workspaces/${encodeURIComponent(activeWorkspaceId)}?userId=${encodeURIComponent(
            String(currentUser.id)
          )}&email=${encodeURIComponent(currentUser.email)}`
        );
        if (res.status === 403) {
          showToast('Access denied: you are not invited to that workspace.');
          return;
        }
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.state && Object.keys(data.state).length > 0) {
            const nextState = sanitizeStateIfClearing(data.state as PersistedCanvasState);
            const remoteUpdatedAt = Number(nextState.updatedAtMs || 0);
            if (localUpdatedAtMsRef.current > 0 && remoteUpdatedAt < localUpdatedAtMsRef.current) {
              // Keep newer local edits and avoid overwriting them with stale DB state
              return;
            }
            applyRemoteSafely(nextState);
            try {
              localStorage.setItem(`ceda_ws_${activeWorkspaceId}_v1`, JSON.stringify(nextState));
              if (needsInitialQueueClear) {
                localStorage.setItem(wsClearKey, 'true');
                fetch(`/api/workspaces/${encodeURIComponent(activeWorkspaceId)}/state`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ state: nextState, updatedBy: currentUser.id, updatedByEmail: currentUser.email }),
                }).catch(() => { });
                saveWorkspaceToFirestore(activeWorkspaceId, nextState, localClientIdRef.current).catch(() => { });
              }
            } catch {
              // ignore quota
            }
            if (
              data.state.isEmptySeed === true &&
              data.state.customizedSetupDone === false &&
              currentUser.role !== 'Administrator'
            ) {
              setWorkspaceSetupMode('initial');
              setIsWorkspaceSetupOpen(true);
            }
          }
        }
      } catch (err) {
        console.warn('Workspace state fetch notice:', err);
      } finally {
        if (!cancelled) {
          hydratedWorkspaceRef.current = activeWorkspaceId;
        }
      }
    };
    fetchWsState();

    // 3. Real-time Firestore listener for collaborators
    const unsubWs = subscribeToWorkspaceFirestore(
      activeWorkspaceId,
      localClientIdRef.current,
      (remoteState) => {
        if (cancelled) return;
        let stateToApply = remoteState as PersistedCanvasState;
        const remoteUpdatedAt = Number(stateToApply.updatedAtMs || 0);
        if (localUpdatedAtMsRef.current > 0 && remoteUpdatedAt < localUpdatedAtMsRef.current) {
          return;
        }
        if (needsInitialQueueClear && !cleanedFirstFirestoreSnapshot) {
          cleanedFirstFirestoreSnapshot = true;
          stateToApply = {
            ...stateToApply,
            queueIdeas: [],
            enquiryMessages: [],
          };
          localStorage.setItem(wsClearKey, 'true');
          saveWorkspaceToFirestore(activeWorkspaceId, stateToApply, localClientIdRef.current).catch(() => { });
        }
        applyRemoteSafely(stateToApply);
        try {
          localStorage.setItem(`ceda_ws_${activeWorkspaceId}_v1`, JSON.stringify(stateToApply));
        } catch {
          // ignore
        }
      }
    );

    return () => {
      cancelled = true;
      unsubWs();
    };
  }, [activeWorkspaceId, currentUser?.id]);

  // 1. Automatic Real-Time Presence Directory Stream (Online / Offline for Evaluators, Adjudicators & Admins)
  useEffect(() => {
    const unsub = subscribeToPresence((items) => {
      const map: Record<string | number, 'online' | 'reviewing' | 'editing' | 'offline'> = {};
      items.forEach((item) => {
        if (item.userId) map[item.userId] = item.status;
        if (item.userName) map[item.userName] = item.status;
      });
      setPresenceMap(map);
    });
    return () => unsub();
  }, []);

  // 1b. Live Workspace Collaboration Invites & Auto-Refresh Shared Workspaces
  useEffect(() => {
    if (!currentUser?.email || currentUser.role === 'Submitter') return;
    const unsubInvites = subscribeToWorkspaceInvites(currentUser.email, async (invite) => {
      try {
        const res = await fetch(
          `/api/workspaces/mine?userId=${encodeURIComponent(String(currentUser.id))}&email=${encodeURIComponent(currentUser.email)}`
        );
        if (res.ok) {
          const data = await res.json();
          const list: WorkspaceSummary[] = Array.isArray(data) ? data : (data.workspaces || []);
          setWorkspacesList(list);
          workspacesListRef.current = list;
        }
      } catch {
        // ignore transient refresh error
      }
      setPendingWorkspaceInviteBanner({
        workspaceId: invite.workspaceId,
        workspaceName: invite.workspaceName,
        invitedByName: invite.invitedByName,
      });
      showToast(`🤝 ${invite.invitedByName} invited you to collaborate on "${invite.workspaceName}"`);
    });
    return () => unsubInvites();
  }, [currentUser?.id, currentUser?.email, currentUser?.role]);

  // 1c. Live Collaborator Name-Tag Cursors on Active Shared Canvas
  const collaboratorColors = ['#0284c7', '#7c3aed', '#059669', '#ea580c', '#db2777', '#0891b2'];
  const getCollaboratorColor = (userId: string | number, userName: string) => {
    const seed = String(userId || userName);
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash * 31 + seed.charCodeAt(i)) % collaboratorColors.length;
    }
    return collaboratorColors[Math.abs(hash) % collaboratorColors.length];
  };

  useEffect(() => {
    if (!activeWorkspaceId || !currentUser || currentUser.role === 'Submitter') {
      setActiveWorkspaceCursors([]);
      return;
    }
    const myName = `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.email;
    const myCursorPayload = {
      workspaceId: activeWorkspaceId,
      userId: currentUser.id,
      email: currentUser.email,
      userName: myName,
      role: currentUser.role,
      color: getCollaboratorColor(currentUser.id, myName),
      canvasX: 420,
      canvasY: 260,
      isFocused: true,
    };

    const unsubCursors = subscribeToWorkspaceCursors(activeWorkspaceId, (items) => {
      const others = items.filter((item) => {
        const sameId = item.userId && String(item.userId) === String(currentUser.id);
        const sameEmail =
          item.email &&
          currentUser.email &&
          item.email.toLowerCase() === currentUser.email.toLowerCase();
        return !sameId && !sameEmail;
      });
      setActiveWorkspaceCursors(others);
    });

    const handleLeaveCursor = () => {
      leaveWorkspaceCursor(activeWorkspaceId, currentUser.id);
    };
    const handleFocusRefresh = () => {
      publishWorkspaceCursor(myCursorPayload);
    };
    window.addEventListener('focus', handleFocusRefresh);
    window.addEventListener('beforeunload', handleLeaveCursor);
    window.addEventListener('pagehide', handleLeaveCursor);

    // Publish initial viewport presence & periodic heartbeat while workspace is open
    publishWorkspaceCursor(myCursorPayload);
    const heartbeat = window.setInterval(() => {
      publishWorkspaceCursor(myCursorPayload);
    }, 18_000);

    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener('focus', handleFocusRefresh);
      window.removeEventListener('beforeunload', handleLeaveCursor);
      window.removeEventListener('pagehide', handleLeaveCursor);
      leaveWorkspaceCursor(activeWorkspaceId, currentUser.id);
      unsubCursors();
    };
  }, [activeWorkspaceId, currentUser?.id, currentUser?.email, currentUser?.role]);

  const handlePublishCursorPosition = (canvasX: number, canvasY: number) => {
    if (!activeWorkspaceId || !currentUser || currentUser.role === 'Submitter') return;
    const myName = `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.email;
    publishWorkspaceCursor({
      workspaceId: activeWorkspaceId,
      userId: currentUser.id,
      email: currentUser.email,
      userName: myName,
      role: currentUser.role,
      color: getCollaboratorColor(currentUser.id, myName),
      canvasX,
      canvasY,
      isFocused: true,
    });
  };

  const findOrLoadOwnWorkspaceId = async (): Promise<string> => {
    if (!currentUser) return '';
    const owned = workspacesListRef.current.find(
      (w) => w.isOwner || String(w.ownerId) === String(currentUser.id)
    );
    if (owned?.id) return owned.id;
    try {
      const res = await fetch(
        `/api/workspaces/mine?userId=${encodeURIComponent(String(currentUser.id))}&email=${encodeURIComponent(currentUser.email)}`
      );
      if (res.ok) {
        const data = await res.json();
        const list: WorkspaceSummary[] = Array.isArray(data) ? data : (data.workspaces || []);
        setWorkspacesList(list);
        workspacesListRef.current = list;
        const ownFetched = list.find((w) => w.isOwner || String(w.ownerId) === String(currentUser.id));
        if (ownFetched?.id) return ownFetched.id;
      }
    } catch {
      // ignore
    }
    return '';
  };

  const handleReturnToOwnWorkspace = async () => {
    if (!currentUser) return;
    const ownId = await findOrLoadOwnWorkspaceId();
    if (!ownId || ownId === activeWorkspaceId) return;
    if (activeWorkspaceId) {
      await leaveWorkspaceCursor(activeWorkspaceId, currentUser.id);
    }
    localStorage.setItem(`ceda_active_workspace_${currentUser.id}`, ownId);
    setActiveWorkspaceId(ownId);
    const ownMeta = workspacesListRef.current.find((w) => w.id === ownId);
    showToast(`Returned to your workspace: ${ownMeta?.name || 'My Workspace'}`);
  };

  const handleCancelWorkspaceCollaboration = async (targetWorkspaceId?: string) => {
    if (!currentUser) return;
    const wsId = targetWorkspaceId || activeWorkspaceId;
    if (!wsId) return;
    const wsMeta = workspacesListRef.current.find((w) => w.id === wsId);
    if (wsMeta?.isOwner) {
      showToast('You are the owner of this workspace.');
      return;
    }
    const actorName = `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.email;
    try {
      await fetch(`/api/workspaces/${encodeURIComponent(wsId)}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          email: currentUser.email,
          requesterId: currentUser.id,
          requesterEmail: currentUser.email,
        }),
      });
    } catch {
      // ignore
    }
    await leaveWorkspaceCursor(wsId, currentUser.id);
    publishWorkspaceMemberRemoved({
      workspaceId: wsId,
      workspaceName: wsMeta?.name || 'Shared Workspace',
      removedUserId: currentUser.id,
      removedEmail: currentUser.email,
      removedByName: actorName,
      action: 'cancelled',
    }).catch(() => {});

    setWorkspacesList((prev) => prev.filter((w) => w.id !== wsId));
    workspacesListRef.current = workspacesListRef.current.filter((w) => w.id !== wsId);

    if (wsId === activeWorkspaceId) {
      const ownId = await findOrLoadOwnWorkspaceId();
      if (ownId) {
        localStorage.setItem(`ceda_active_workspace_${currentUser.id}`, ownId);
        setActiveWorkspaceId(ownId);
      }
    }
    showToast(`Cancelled collaboration on "${wsMeta?.name || wsId}"`);
  };

  const handleRemoveWorkspaceCollaborator = async (target: {
    memberId?: number;
    userId?: string | number | null;
    email?: string;
    userName?: string;
  }) => {
    if (!currentUser || !activeWorkspaceId) return;
    const wsMeta = workspacesListRef.current.find((w) => w.id === activeWorkspaceId);
    const actorName = `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.email;
    const matchingCursor = activeWorkspaceCursors.find(
      (c) =>
        (target.userId && String(c.userId) === String(target.userId)) ||
        (target.email && c.email && c.email.toLowerCase() === target.email.toLowerCase())
    );
    const resolvedUserId = target.userId || matchingCursor?.userId || null;
    const resolvedEmail = target.email || matchingCursor?.email || '';

    try {
      await fetch(`/api/workspaces/${encodeURIComponent(activeWorkspaceId)}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: target.memberId,
          userId: resolvedUserId ? Number(resolvedUserId) : undefined,
          email: resolvedEmail || undefined,
          requesterId: currentUser.id,
          requesterEmail: currentUser.email,
        }),
      });
    } catch {
      // ignore
    }

    if (resolvedUserId) {
      await leaveWorkspaceCursor(activeWorkspaceId, resolvedUserId);
    }
    setActiveWorkspaceCursors((prev) =>
      prev.filter((c) => {
        const sameId = resolvedUserId && String(c.userId) === String(resolvedUserId);
        const sameEmail = resolvedEmail && c.email && c.email.toLowerCase() === resolvedEmail.toLowerCase();
        return !sameId && !sameEmail;
      })
    );

    publishWorkspaceMemberRemoved({
      workspaceId: activeWorkspaceId,
      workspaceName: wsMeta?.name || 'Workspace',
      removedUserId: resolvedUserId,
      removedEmail: resolvedEmail,
      removedByName: actorName,
      action: 'removed',
    }).catch(() => {});

    showToast(`Removed ${target.userName || resolvedEmail || 'collaborator'} from collaboration`);
  };

  useEffect(() => {
    if (!currentUser || currentUser.role === 'Submitter') return;
    const unsubRemoved = subscribeToWorkspaceMemberRemoved(async (ev) => {
      const myEmailLower = (currentUser.email || '').trim().toLowerCase();
      const targetEmailLower = (ev.removedEmail || '').trim().toLowerCase();
      const matchesMe =
        (ev.removedUserId !== undefined &&
          ev.removedUserId !== null &&
          String(ev.removedUserId) === String(currentUser.id)) ||
        Boolean(targetEmailLower && targetEmailLower === myEmailLower);

      if (ev.action === 'removed' && matchesMe) {
        setWorkspacesList((prev) => prev.filter((w) => w.id !== ev.workspaceId));
        workspacesListRef.current = workspacesListRef.current.filter((w) => w.id !== ev.workspaceId);
        if (activeWorkspaceIdRef.current === ev.workspaceId) {
          await leaveWorkspaceCursor(ev.workspaceId, currentUser.id);
          const ownId = await findOrLoadOwnWorkspaceId();
          if (ownId) {
            localStorage.setItem(`ceda_active_workspace_${currentUser.id}`, ownId);
            setActiveWorkspaceId(ownId);
          }
          showToast(`${ev.removedByName} removed you from collaboration on "${ev.workspaceName}"`);
        }
      } else if (ev.action === 'cancelled' && activeWorkspaceIdRef.current === ev.workspaceId && ev.removedUserId) {
        setActiveWorkspaceCursors((prev) =>
          prev.filter((c) => String(c.userId) !== String(ev.removedUserId))
        );
        showToast(`${ev.removedByName} left collaboration on "${ev.workspaceName}"`);
      }
    });
    return () => unsubRemoved();
  }, [currentUser?.id, currentUser?.email, currentUser?.role]);

  // 1d. Submitter-scoped Assigned Officials Lookup
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'Submitter') {
      setAllIdeaAssignmentsFeed([]);
      return;
    }
    const unsubAll = subscribeToAllIdeaAssignments((items) => {
      setAllIdeaAssignmentsFeed(items);
    });
    return () => unsubAll();
  }, [currentUser?.role]);

  // 1e. Unread Notifications Counter (Flashes exact unread count on TopBar Bell icon)
  useEffect(() => {
    if (!currentUser) {
      setAllNotificationsFeed([]);
      setUnreadNotificationsCount(0);
      return;
    }
    const unsub = subscribeToNotifications((items) => {
      setAllNotificationsFeed(items);
    });
    return () => unsub();
  }, [currentUser?.id]);

  // 1f. Branded Stage Update Email Helper (.env SMTP via Server)
  const sendSubmitterStageUpdateEmail = (params: {
    innovationId?: string | number;
    code?: string;
    title: string;
    previousStage?: string;
    newStage: string;
    outcome: 'passed' | 'rejected' | 'docs_requested' | 'in_review';
    actorName?: string;
    actorRole?: string;
    notes?: string;
    submitterEmail?: string;
    submitterName?: string;
    extraDetails?: Record<string, any>;
  }) => {
    fetch('/api/emails/stage-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }).catch(() => {});
  };

  // 1g. Real-Time Citizen Enquiry Queue Sync (Submitter Support Widget <-> Admin Enquiry Queue & Agent Portal)
  useEffect(() => {
    if (!currentUser) return;
    const unsubEnquiries = subscribeToCitizenEnquiries((liveEnquiries) => {
      if (!enquiriesSeededRef.current) {
        liveEnquiries.forEach((e) => {
          if (e?.id) seenEnquiryIdsRef.current.add(String(e.id));
        });
        enquiriesSeededRef.current = true;
      } else if (currentUser.role === 'Administrator' || currentUser.role === 'Agent') {
        const brandNew = liveEnquiries.filter(
          (e) => e?.id && !seenEnquiryIdsRef.current.has(String(e.id))
        );
        brandNew.forEach((e) => seenEnquiryIdsRef.current.add(String(e.id)));
        if (brandNew.length > 0) {
          showToast(
            `📩 New Citizen Enquiry in Admin Queue from ${brandNew[0].submitterName}: "${brandNew[0].subject}"`
          );
        }
      }

      if (liveEnquiries.length === 0) return;
      setEnquiryMessages((prev) => {
        const map = new Map<string, SubmitterEnquiryMessage>();
        prev.forEach((m) => map.set(String(m.id), m));
        liveEnquiries.forEach((incoming) => {
          if (!incoming?.id) return;
          const existing = map.get(String(incoming.id));
          if (!existing) {
            map.set(String(incoming.id), incoming as SubmitterEnquiryMessage);
          } else {
            const incomingThread = Array.isArray(incoming.thread) ? incoming.thread : [];
            const existingThread = Array.isArray(existing.thread) ? existing.thread : [];
            const mergedThread =
              incomingThread.length >= existingThread.length ? incomingThread : existingThread;
            map.set(String(incoming.id), {
              ...existing,
              ...incoming,
              thread: mergedThread,
            });
          }
        });
        return Array.from(map.values());
      });
    });
    return () => unsubEnquiries();
  }, [currentUser?.id, currentUser?.role]);

  // 1h. Real-Time Adjudication Queue Sync across Evaluators, Adjudicators & Admin
  useEffect(() => {
    if (!currentUser) return;
    const unsubAdj = subscribeToAdjudicationQueue((items) => {
      const nextIds = new Set<string>(items.map((i) => String(i.id)));
      syncedAdjudicationIdsRef.current = nextIds;
      setSyncedAdjudicationIdeas(items as QueueIdeaItem[]);

      // Ensure Evaluators never keep ideas already promoted to Adjudication Queue
      if (currentUser.role === 'Evaluator' && nextIds.size > 0) {
        setQueueIdeas((prev) => prev.filter((q) => !nextIds.has(String(q.id))));
        setAssignedIdeasMap((prev) => {
          const copy = { ...prev };
          let modified = false;
          nextIds.forEach((id) => {
            if (copy[id]) {
              delete copy[id];
              modified = true;
            }
          });
          return modified ? copy : prev;
        });
      }
    });
    return () => unsubAdj();
  }, [currentUser?.id, currentUser?.role]);

  // 1i. Real-Time Global Workflow Cycles, Application Form Fields, FAQs & System Feedback Sync
  useEffect(() => {
    if (!currentUser) return;
    const unsubWf = subscribeToWorkflowCycles((remoteCycles) => {
      if (Array.isArray(remoteCycles) && remoteCycles.length > 0) {
        setWorkflowCycles(remoteCycles as WorkflowCycle[]);
      }
    });
    const unsubFields = subscribeToApplicationFields((remoteFields) => {
      if (Array.isArray(remoteFields) && remoteFields.length > 0) {
        setApplicationFields(remoteFields as ApplicationFormField[]);
      }
    });
    const unsubFaqs = subscribeToFaqItems((items) => {
      setFaqItems(items as FaqItem[]);
    });
    const unsubFeedback = subscribeToSystemFeedback((items) => {
      setSystemFeedback(items as SystemFeedbackItem[]);
    });
    return () => {
      unsubWf();
      unsubFields();
      unsubFaqs();
      unsubFeedback();
    };
  }, [currentUser?.id]);

  const currentUserRoleRef = useRef(currentUser?.role);
  const currentUserIdRef = useRef(currentUser?.id);
  const currentUserEmailRef = useRef(currentUser?.email);
  useEffect(() => {
    currentUserRoleRef.current = currentUser?.role;
    currentUserIdRef.current = currentUser?.id;
    currentUserEmailRef.current = currentUser?.email;
  }, [currentUser?.role, currentUser?.id, currentUser?.email]);

  useEffect(() => {
    initAudioUnlock();
  }, []);

  const seenLiveSubmissionKeysRef = useRef<Set<string>>(new Set());
  const submissionsListenerReadyRef = useRef(false);
  const knownDbSubmissionKeysRef = useRef<Set<string>>(new Set());
  const dbPollInitializedRef = useRef(false);
  const seenEvaluatorAssignmentIdsRef = useRef<Set<string>>(new Set());
  const evaluatorAssignmentsSeededRef = useRef(false);
  const seenAdminAlertIdsRef = useRef<Set<string>>(new Set());
  const adminAlertsSeededRef = useRef(false);
  const emittedSlaAlertKeysRef = useRef<Set<string>>(new Set());
  const lastAssignmentChimeAtRef = useRef<number>(0);

  const triggerEvaluatorAssignmentChime = () => {
    const now = Date.now();
    if (now - lastAssignmentChimeAtRef.current < 1500) return;
    lastAssignmentChimeAtRef.current = now;
    playEvaluatorAssignmentSound();
  };

  // 2. Real-Time Submissions Listener: new ideas appear immediately in the Admin intake queue and workspace
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;
    submissionsListenerReadyRef.current = false;
    const readyTimer = window.setTimeout(() => {
      submissionsListenerReadyRef.current = true;
    }, 1200);

    const initSubmissionsListener = async () => {
      try {
        localStorage.setItem(QUEUES_CLEARED_KEY, 'true');
      } catch {
        // ignore
      }
      if (cancelled) return;
      unsub = subscribeToNewSubmissions((idea) => {
        if (!idea || !idea.title) return;
        const ideaTitleKey = normalizeIdeaKeyTitle(idea.title);
        const dedupeKey = ideaTitleKey || String(idea.id);
        const alreadySeen =
          seenLiveSubmissionKeysRef.current.has(dedupeKey) ||
          seenLiveSubmissionKeysRef.current.has(String(idea.id));
        seenLiveSubmissionKeysRef.current.add(dedupeKey);
        seenLiveSubmissionKeysRef.current.add(String(idea.id));
        knownDbSubmissionKeysRef.current.add(dedupeKey);
        knownDbSubmissionKeysRef.current.add(String(idea.id));

        const isBrandNewAfterLoad =
          submissionsListenerReadyRef.current ||
          (typeof idea.createdAtMs === 'number' && Date.now() - idea.createdAtMs < 12000);
        if (!alreadySeen && isBrandNewAfterLoad && currentUserRoleRef.current === 'Administrator') {
          playNewSubmissionSound();
          showToast(`📥 New idea submitted: "${idea.title}"`);
        }

        const queueItem = toQueueIdeaFromIncoming(idea);

        // Ensure brand-new incoming Stage 1 submissions start at Stage 1 ('intake')
        if ((!alreadySeen && isBrandNewAfterLoad) || idea.stageId === 'intake') {
          const existingLc = getLifecycleRecordForIdea({
            id: queueItem.id,
            code: queueItem.code,
            title: queueItem.title,
          });
          if (!existingLc || (!alreadySeen && isBrandNewAfterLoad)) {
            resetIdeaLifecycleToIntake({
              id: queueItem.id,
              code: queueItem.code,
              title: queueItem.title,
              enterpriseName: queueItem.enterpriseName,
              submitterName: queueItem.submitterName,
              omangId: queueItem.omangId,
              cipaUin: queueItem.cipaUin,
              bursTin: queueItem.bursTin,
              capitalAsk: queueItem.capitalAsk,
              sector: queueItem.category,
            });
          }
        }

        // Buffer real-time submissions so workspace hydration never overwrites them
        const existingIdx = liveSubmissionsBufferRef.current.findIndex(
          (i) =>
            String(i.id) === String(queueItem.id) ||
            (ideaTitleKey && normalizeIdeaKeyTitle(i.title) === ideaTitleKey)
        );
        if (existingIdx >= 0) {
          liveSubmissionsBufferRef.current[existingIdx] = queueItem;
        } else {
          liveSubmissionsBufferRef.current = [queueItem, ...liveSubmissionsBufferRef.current];
        }

        setQueueIdeas((prev) => mergeIncomingIdeasIntoQueue(prev, [queueItem]));

        setProjects((prev) => {
          if (currentUserRoleRef.current === 'Submitter') {
            const myId = currentUserIdRef.current;
            const myEmailLower = (currentUserEmailRef.current || '').trim().toLowerCase();
            const ideaEmailLower = (idea.submitterEmail || '').trim().toLowerCase();
            const belongsToMe =
              (idea.submitterId !== undefined && myId !== undefined && Number(idea.submitterId) === Number(myId)) ||
              (Boolean(myEmailLower) && Boolean(ideaEmailLower) && ideaEmailLower === myEmailLower);
            if (!belongsToMe) {
              return prev;
            }
          }
          if (
            prev.some(
              (p) =>
                String(p.id) === String(idea.id) ||
                (ideaTitleKey && normalizeIdeaKeyTitle(p.title) === ideaTitleKey)
            )
          ) {
            return prev;
          }
          return [idea, ...prev];
        });
      });
    };

    initSubmissionsListener();
    return () => {
      cancelled = true;
      window.clearTimeout(readyTimer);
      if (unsub) unsub();
    };
  }, []);

  // 3. Evaluator Login: automatically hydrate ideas assigned to the evaluator onto their canvas station & queue
  useEffect(() => {
    evaluatorAssignmentsSeededRef.current = false;
    seenEvaluatorAssignmentIdsRef.current.clear();
    if (!currentUser || (currentUser.role !== 'Evaluator' && currentUser.role !== 'Adjudicator')) return;

    const unsub = subscribeToAssignedIdeas(currentUser.id, currentUser.email, (assignments) => {
      const activeWsMeta = workspacesListRef.current.find((w) => w.id === activeWorkspaceIdRef.current);
      const isViewingSharedWorkspace = Boolean(activeWsMeta && activeWsMeta.isOwner === false);

      // Filter out ideas promoted to Adjudication Queue ONLY for Evaluators;
      // Adjudicators must keep seeing their assigned items across Stage 5 and subsequent stages until archived.
      const isAdjUser = currentUser.role === 'Adjudicator';
      const filteredAssignments = (assignments || []).filter((a) => {
        const key = String(a.innovationId || a.idea?.id || '');
        if (isAdjUser) {
          return (a.idea?.status as string) !== 'archived_complete';
        }
        return !syncedAdjudicationIdsRef.current.has(key);
      });

      if (filteredAssignments.length === 0) {
        evaluatorAssignmentsSeededRef.current = true;
        if ((currentUser.role === 'Evaluator' || currentUser.role === 'Adjudicator') && !isViewingSharedWorkspace) {
          setAssignedIdeasMap({});
          setQueueIdeas([]);
          setIdeaCustomPositions({});
        }
        return;
      }

      const incomingKeys = filteredAssignments.map((a) =>
        String(a.innovationId || a.idea?.id || normalizeIdeaKeyTitle(a.ideaTitle || ''))
      );

      if (!evaluatorAssignmentsSeededRef.current) {
        incomingKeys.forEach((k) => {
          if (k) seenEvaluatorAssignmentIdsRef.current.add(k);
        });
        evaluatorAssignmentsSeededRef.current = true;
      } else {
        const newlyAssigned = filteredAssignments.filter((a) => {
          const key = String(a.innovationId || a.idea?.id || normalizeIdeaKeyTitle(a.ideaTitle || ''));
          return key && !seenEvaluatorAssignmentIdsRef.current.has(key);
        });
        incomingKeys.forEach((k) => {
          if (k) seenEvaluatorAssignmentIdsRef.current.add(k);
        });
        if (newlyAssigned.length > 0) {
          triggerEvaluatorAssignmentChime();
          showToast(
            `📋 ${newlyAssigned.length} new proposal(s) assigned to you: ${newlyAssigned
              .map((a) => a.ideaTitle || a.idea?.title || a.innovationId)
              .slice(0, 2)
              .join(', ')}`
          );
        }
      }

      const newAssignedItems: QueueIdeaItem[] = filteredAssignments
        .map((a) => a.idea)
        .filter(Boolean)
        .map((idea) => ({
          ...idea,
          urgency: idea.urgency || 'normal',
          progress: idea.progress ?? (isAdjUser ? 60 : 20),
          slaRemainingDays: idea.slaRemainingDays ?? 4.0,
          slaTargetDays: idea.slaTargetDays ?? 5.0,
          arrivalDate: idea.arrivalDate || 'Today',
          rawTimestamp: idea.rawTimestamp || Date.now(),
          status: (isAdjUser && idea.status ? idea.status : 'in_queue') as QueueIdeaItem['status'],
        }));

      const assignedInnovationIds = new Set(filteredAssignments.map((a) => a.innovationId));

      setAssignedIdeasMap((prev) => {
        const next: Record<string, QueueIdeaItem> = currentUser.role === 'Administrator' ? { ...prev } : {};
        filteredAssignments.forEach((a) => {
          if (a.idea && a.innovationId) {
            next[a.innovationId] = {
              ...a.idea,
              id: a.innovationId,
              evaluatorId: currentUser.id,
              status: isAdjUser && a.idea.status === 'adjudicated' ? 'adjudicated' : 'evaluating',
            };
          }
        });
        return next;
      });

      // Synchronize horizontal queue so Evaluator / Adjudicator sees assigned ideas in their personal workspace
      // When collaborating on someone else's shared workspace, keep the shared canvas intact!
      if ((currentUser.role === 'Evaluator' || currentUser.role === 'Adjudicator') && !isViewingSharedWorkspace) {
        setQueueIdeas(newAssignedItems);
        // Automatically prune canvas positions if an idea was unassigned/deleted by admin
        setIdeaCustomPositions((prev) => {
          const next = { ...prev };
          let changed = false;
          Object.keys(next).forEach((id) => {
            if (!id.startsWith('__') && !id.startsWith('eval__') && !assignedInnovationIds.has(id)) {
              delete next[id];
              changed = true;
            }
          });
          return changed ? next : prev;
        });
        // Evaluators & Adjudicators do NOT have an admin station card or stacked ideas
        setCanvasStations((prev) => prev.filter((s) => s.userId !== currentUser.id && !s.id.startsWith(`station_evaluator_${currentUser.id}`)));
      } else if (newAssignedItems.length > 0 && !isViewingSharedWorkspace) {
        setQueueIdeas((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const toAdd = newAssignedItems.filter((i) => !existingIds.has(i.id));
          return toAdd.length > 0 ? [...toAdd, ...prev] : prev;
        });
      }
    });

    return () => unsub();
  }, [currentUser?.id, currentUser?.email, currentUser?.role]);

  // -------------------------------------------------------------
  // Persist All Canvas, Queue, Annotation & Settings State to localStorage, PostgreSQL & Firestore
  // -------------------------------------------------------------
  useEffect(() => {
    if (!currentUser || !activeWorkspaceId || hydratedWorkspaceRef.current !== activeWorkspaceId) {
      return;
    }

    if (applyingRemoteRef.current) {
      applyingRemoteRef.current = false;
      return;
    }

    const nowMs = Date.now();
    localUpdatedAtMsRef.current = nowMs;

    const payload: PersistedCanvasState = {
      projects,
      connectors,
      intakeDossiers,
      personnel,
      submissionBatches,
      applicationFields,
      workflowCycles,
      queueIdeas,
      canvasStations,
      assignedIdeasMap,
      canvasPools,
      canvasAnnotations,
      enquiryMessages,
      adminAlerts,
      ideaCustomPositions,
      poolCustomPositions,
      messageCustomPositions,
      cardCustomDimensions,
      queueDimensions,
      isQueueCollapsed,
      queueTab,
      updatedAtMs: nowMs,
      density,
      zoom,
      panX,
      panY,
      autoDispatchEnabled,
      maxChatsPerAgent,
      slaWarningDays,
      slaCriticalDays,
      autoReplenishMessagesOnFinish,
      enforceStatutoryGate,
      autoScreenOnIngest,
      canvasTheme,
      showGrid,
      showConnectors,
    };

    try {
      localStorage.setItem(CANVAS_STATE_STORAGE_KEY, JSON.stringify(payload));
      localStorage.setItem(`ceda_ws_${activeWorkspaceId}_v1`, JSON.stringify(payload));
    } catch (err) {
      console.warn('Could not persist canvas state:', err);
    }

    pendingSyncPayloadRef.current = {
      wsId: activeWorkspaceId,
      payload,
      userId: currentUser.id,
      email: currentUser.email,
    };

    const timer = setTimeout(() => {
      pendingSyncPayloadRef.current = null;
      fetch(`/api/workspaces/${encodeURIComponent(activeWorkspaceId)}/state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: payload,
          updatedBy: currentUser.id,
          updatedByEmail: currentUser.email,
        }),
      })
        .then((res) => {
          if (!res.ok) console.warn('Workspace state PUT returned status:', res.status);
        })
        .catch(() => { });

      saveWorkspaceToFirestore(activeWorkspaceId, payload, localClientIdRef.current).catch(() => { });
    }, 350);

    return () => clearTimeout(timer);
  }, [
    currentUser?.id,
    activeWorkspaceId,
    projects,
    connectors,
    intakeDossiers,
    personnel,
    submissionBatches,
    applicationFields,
    workflowCycles,
    queueIdeas,
    canvasStations,
    assignedIdeasMap,
    canvasPools,
    canvasAnnotations,
    enquiryMessages,
    adminAlerts,
    ideaCustomPositions,
    poolCustomPositions,
    messageCustomPositions,
    cardCustomDimensions,
    queueDimensions,
    isQueueCollapsed,
    queueTab,
    density,
    zoom,
    panX,
    panY,
    autoDispatchEnabled,
    maxChatsPerAgent,
    slaWarningDays,
    slaCriticalDays,
    autoReplenishMessagesOnFinish,
    enforceStatutoryGate,
    autoScreenOnIngest,
    canvasTheme,
    showGrid,
    showConnectors,
  ]);

  useEffect(() => {
    const flushPendingWorkspaceSync = () => {
      const pending = pendingSyncPayloadRef.current;
      if (!pending) return;
      pendingSyncPayloadRef.current = null;
      try {
        fetch(`/api/workspaces/${encodeURIComponent(pending.wsId)}/state`, {
          method: 'PUT',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            state: pending.payload,
            updatedBy: pending.userId,
            updatedByEmail: pending.email,
          }),
        }).catch(() => { });
      } catch {
        // ignore
      }
    };
    window.addEventListener('beforeunload', flushPendingWorkspaceSync);
    window.addEventListener('pagehide', flushPendingWorkspaceSync);
    return () => {
      window.removeEventListener('beforeunload', flushPendingWorkspaceSync);
      window.removeEventListener('pagehide', flushPendingWorkspaceSync);
    };
  }, []);

  const captureCanvasSnapshot = () => {
    return JSON.stringify({
      canvasStations,
      assignedIdeasMap,
      queueIdeas,
      canvasPools,
      canvasAnnotations,
      enquiryMessages,
      ideaCustomPositions,
      poolCustomPositions,
      messageCustomPositions,
    });
  };

  const pushUndoSnapshot = () => {
    const snap = captureCanvasSnapshot();
    undoStackRef.current.push(snap);
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
    redoStackRef.current = [];
    setHistoryCounts({ undo: undoStackRef.current.length, redo: 0 });
    lastSnapshotRef.current = snap;
  };

  // Track Canvas Undo/Redo History
  useEffect(() => {
    if (!currentUser || !activeWorkspaceId || hydratedWorkspaceRef.current !== activeWorkspaceId) return;
    const snap = captureCanvasSnapshot();
    if (isRestoringHistoryRef.current) {
      isRestoringHistoryRef.current = false;
      lastSnapshotRef.current = snap;
      return;
    }
    if (lastSnapshotRef.current && lastSnapshotRef.current !== snap) {
      undoStackRef.current.push(lastSnapshotRef.current);
      if (undoStackRef.current.length > 50) undoStackRef.current.shift();
      redoStackRef.current = [];
      setHistoryCounts({ undo: undoStackRef.current.length, redo: 0 });
    }
    lastSnapshotRef.current = snap;
  }, [
    currentUser?.id,
    activeWorkspaceId,
    canvasStations,
    assignedIdeasMap,
    queueIdeas,
    canvasPools,
    canvasAnnotations,
    enquiryMessages,
    ideaCustomPositions,
    poolCustomPositions,
    messageCustomPositions,
  ]);

  // Track Submitter's Own Idea Identifiers (strict log/alert scoping on Submitter side)
  const [submitterDbIdeas, setSubmitterDbIdeas] = useState<{ id: string; code?: string; title: string }[]>([]);
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'Submitter') {
      setSubmitterDbIdeas([]);
      return;
    }
    const params = new URLSearchParams({
      submitterId: String(currentUser.id),
      submitterEmail: currentUser.email || '',
    });
    fetch(`/api/innovations?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setSubmitterDbIdeas(
            data.map((item: any) => ({
              id: String(item.id),
              code: item.innovationNumber ? String(item.innovationNumber) : undefined,
              title: String(item.title || ''),
            }))
          );
        }
      })
      .catch(() => { });
  }, [currentUser?.role, currentUser?.id, currentUser?.email, projects.length]);

  const submitterScopedProjects = useMemo(() => {
    if (!currentUser || currentUser.role !== 'Submitter') return projects;
    const myEmailLower = (currentUser.email || '').trim().toLowerCase();
    return projects.filter((p) => {
      const matchesId =
        p.submitterId !== undefined && Number(p.submitterId) === Number(currentUser.id);
      const matchesEmail =
        Boolean(myEmailLower) &&
        Boolean(p.submitterEmail) &&
        String(p.submitterEmail).trim().toLowerCase() === myEmailLower;
      return matchesId || matchesEmail;
    });
  }, [projects, currentUser?.role, currentUser?.id, currentUser?.email]);

  const submitterOwnedIdeaIdentifiers = useMemo(() => {
    const ids = new Set<string>();
    const titles = new Set<string>();
    submitterDbIdeas.forEach((item) => {
      if (item.id) ids.add(item.id);
      if (item.code) ids.add(item.code);
      if (item.title) titles.add(item.title);
    });
    submitterScopedProjects.forEach((p) => {
      if (p.id) ids.add(String(p.id));
      if (p.stageTag) ids.add(String(p.stageTag));
      if (p.title) titles.add(p.title);
    });
    return { ids: Array.from(ids), titles: Array.from(titles) };
  }, [submitterDbIdeas, submitterScopedProjects]);

  // Extract ONLY Evaluators & Adjudicators who are assigned to this Submitter's owned ideas
  const assignedOfficialsForSubmitter = useMemo(() => {
    const ids = new Set<string>();
    const emails = new Set<string>();
    const names = new Set<string>();
    if (!currentUser || currentUser.role !== 'Submitter') {
      return { ids: [] as string[], emails: [] as string[], names: [] as string[] };
    }

    const ownedIdSet = new Set(submitterOwnedIdeaIdentifiers.ids.map((v) => v.trim().toLowerCase()));
    const ownedTitleSet = new Set(submitterOwnedIdeaIdentifiers.titles.map((v) => v.trim().toLowerCase()));
    const matchesOwned = (id?: string | number, code?: string, title?: string) => {
      const idStr = id ? String(id).trim().toLowerCase() : '';
      const codeStr = code ? code.trim().toLowerCase() : '';
      const titleStr = title ? title.trim().toLowerCase() : '';
      return (
        (idStr && ownedIdSet.has(idStr)) ||
        (codeStr && ownedIdSet.has(codeStr)) ||
        (titleStr && ownedTitleSet.has(titleStr))
      );
    };

    const registerOfficial = (
      userId: string | number | undefined,
      email: string | undefined,
      userName: string | undefined,
      role: string | undefined
    ) => {
      if (role && role !== 'Evaluator' && role !== 'Adjudicator') return;
      if (userId) ids.add(String(userId).trim().toLowerCase());
      if (email) emails.add(email.trim().toLowerCase());
      if (userName) names.add(userName.trim().toLowerCase());
    };

    // Source 1: Firestore / BroadcastChannel live assignments
    allIdeaAssignmentsFeed.forEach((a) => {
      if (matchesOwned(a.innovationId, a.ideaCode, a.ideaTitle)) {
        registerOfficial(a.evaluatorId, a.evaluatorEmail, a.evaluatorName, 'Evaluator');
      }
    });

    // Source 2: Project cards' assigned reviewers
    projects.forEach((p) => {
      if (matchesOwned(p.id, p.stageTag, p.title)) {
        (p.reviewers || []).forEach((rev) => {
          if (rev.role === 'Evaluator' || rev.role === 'Adjudicator') {
            registerOfficial(undefined, undefined, rev.name, rev.role);
          }
        });
      }
    });

    // Source 3: Active canvas evaluator/adjudicator stations
    canvasStations.forEach((st) => {
      const stationHasOwned = (st.assignedIdeaIds || []).some((ideaId) => {
        const assignedItem = assignedIdeasMap[String(ideaId)];
        return matchesOwned(ideaId, assignedItem?.code, assignedItem?.title);
      });
      if (stationHasOwned && st.user && (st.user.role === 'Evaluator' || st.user.role === 'Adjudicator')) {
        registerOfficial(st.user.id, st.user.email, st.user.name, st.user.role);
      }
    });

    return {
      ids: Array.from(ids),
      emails: Array.from(emails),
      names: Array.from(names),
    };
  }, [
    currentUser?.role,
    submitterOwnedIdeaIdentifiers,
    allIdeaAssignmentsFeed,
    projects,
    canvasStations,
    assignedIdeasMap,
  ]);

  const [notifLastReadAt, setNotifLastReadAt] = useState<number>(() => {
    try {
      const saved = currentUser ? localStorage.getItem(`ceda_notif_last_read_${currentUser.id}`) : null;
      return saved ? Number(saved) || 0 : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    if (!currentUser) {
      setNotifLastReadAt(0);
      return;
    }
    try {
      const key = `ceda_notif_last_read_${currentUser.id}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        setNotifLastReadAt(Number(saved) || 0);
      } else {
        // Initialize read baseline slightly before current session or 0 so brand-new live items flash cleanly
        const now = Date.now();
        localStorage.setItem(key, String(now));
        setNotifLastReadAt(now);
      }
    } catch {
      setNotifLastReadAt(0);
    }
  }, [currentUser?.id]);

  const handleMarkNotificationsRead = () => {
    if (!currentUser) return;
    const now = Date.now();
    setNotifLastReadAt(now);
    setUnreadNotificationsCount(0);
    try {
      localStorage.setItem(`ceda_notif_last_read_${currentUser.id}`, String(now));
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setUnreadNotificationsCount(0);
      return;
    }
    const ownedIdSet = new Set(submitterOwnedIdeaIdentifiers.ids.map((v) => v.trim().toLowerCase()));
    const ownedTitleSet = new Set(submitterOwnedIdeaIdentifiers.titles.map((v) => v.trim().toLowerCase()));
    const myEmail = (currentUser.email || '').trim().toLowerCase();

    const relevant = allNotificationsFeed.filter((n) => {
      if (n.targetEmail && n.targetEmail.trim().toLowerCase() !== myEmail) {
        return false;
      }
      if (currentUser.role === 'Submitter') {
        if (n.targetRole && n.targetRole !== 'Submitter') return false;
        const idNorm = String(n.innovationId || '').trim().toLowerCase();
        const titleNorm = String(n.ideaTitle || '').trim().toLowerCase();
        if (ownedIdSet.size === 0 && ownedTitleSet.size === 0) return false;
        return (titleNorm && ownedTitleSet.has(titleNorm)) || (idNorm && ownedIdSet.has(idNorm));
      }
      if (n.targetRole === 'Submitter') return false;
      return true;
    });

    if (isLiveActivityOpenRef.current) {
      setUnreadNotificationsCount(0);
      return;
    }

    const unread = relevant.filter((n) => {
      const ts = n.timestamp ? Date.parse(String(n.timestamp)) || 0 : 0;
      return ts > notifLastReadAt;
    }).length;
    setUnreadNotificationsCount(unread);
  }, [allNotificationsFeed, currentUser?.id, currentUser?.role, currentUser?.email, submitterOwnedIdeaIdentifiers, notifLastReadAt]);

  // Synchronize Personnel Directory assigned load directly with live Canvas Evaluator Stations
  const personnelWithLiveLoad = useMemo(() => {
    return personnel.map((person) => {
      const assignedIds = new Set<string>();
      const assignedMsgIds = new Set<string>();
      const personEmailLower = (person.email || '').trim().toLowerCase();
      const personNameLower = (person.name || '').trim().toLowerCase();

      canvasStations.forEach((st) => {
        const sameUser =
          st.userId === person.id ||
          (personEmailLower &&
            st.user?.email &&
            st.user.email.trim().toLowerCase() === personEmailLower);
        if (sameUser && Array.isArray(st.assignedIdeaIds)) {
          st.assignedIdeaIds.forEach((id) => assignedIds.add(String(id)));
        }
        if (sameUser && Array.isArray(st.assignedMessageIds)) {
          st.assignedMessageIds.forEach((msgId) => {
            const msg = enquiryMessages.find((m) => m.id === msgId);
            if (!msg || msg.status === 'assigned') {
              assignedMsgIds.add(String(msgId));
            }
          });
        }
      });

      enquiryMessages.forEach((m) => {
        if (m.status !== 'assigned') return;
        const matchId = m.assignedAgentId !== undefined && m.assignedAgentId === person.id;
        const matchEmail = Boolean(
          personEmailLower && m.assignedAgentEmail && m.assignedAgentEmail.trim().toLowerCase() === personEmailLower
        );
        const matchName = Boolean(
          personNameLower && m.assignedAgentName && m.assignedAgentName.trim().toLowerCase() === personNameLower
        );
        if (matchId || matchEmail || matchName) {
          assignedMsgIds.add(String(m.id));
        }
      });

      return {
        ...person,
        assignedIdeasCount: assignedIds.size,
        assignedMessagesCount: assignedMsgIds.size,
      };
    });
  }, [personnel, canvasStations, enquiryMessages]);

  // Real-Time Submitter Alerts (View Logs, Tab Access, Screening Gates & Clarification Messages)
  const seenSubmitterNotifIdsRef = useRef<Set<string>>(new Set());
  const submitterNotifSeededRef = useRef(false);
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'Submitter') {
      submitterNotifSeededRef.current = false;
      seenSubmitterNotifIdsRef.current.clear();
      return;
    }

    const ownedIdSet = new Set(submitterOwnedIdeaIdentifiers.ids.map((v) => v.trim().toLowerCase()));
    const ownedTitleSet = new Set(submitterOwnedIdeaIdentifiers.titles.map((v) => v.trim().toLowerCase()));

    const unsub = subscribeToNotifications((items) => {
      if (!submitterNotifSeededRef.current) {
        items.forEach((n) => {
          if (n.id) seenSubmitterNotifIdsRef.current.add(n.id);
        });
        submitterNotifSeededRef.current = true;
        return;
      }

      const fresh = items.filter((n) => {
        if (!n.id || seenSubmitterNotifIdsRef.current.has(n.id)) return false;
        if (n.targetRole && n.targetRole !== 'Submitter') return false;
        const idNorm = String(n.innovationId || '').trim().toLowerCase();
        const titleNorm = String(n.ideaTitle || '').trim().toLowerCase();
        if (ownedTitleSet.size === 0 && ownedIdSet.size === 0) return true;
        return (titleNorm && ownedTitleSet.has(titleNorm)) || (idNorm && ownedIdSet.has(idNorm));
      });

      fresh.forEach((n) => {
        if (n.id) seenSubmitterNotifIdsRef.current.add(n.id);
      });

      if (fresh.length > 0) {
        const latest = fresh[0];
        const prefix =
          latest.type === 'Clarification message'
            ? '💬'
            : latest.type === 'Idea viewed' || latest.type === 'Tab accessed'
              ? '👁️'
              : latest.type === 'Screening update'
                ? '🛡️'
                : '🔔';
        showToast(`${prefix} ${latest.message}`);
      }
    });

    return () => unsub();
  }, [currentUser?.role, currentUser?.id, submitterOwnedIdeaIdentifiers]);

  // Real-Time Evaluator Assignment Sound & Toast Listener (catches BroadcastChannel + Firestore alerts immediately)
  const seenEvaluatorNotifIdsRef = useRef<Set<string>>(new Set());
  const evaluatorNotifSeededRef = useRef(false);
  useEffect(() => {
    if (!currentUser || (currentUser.role !== 'Evaluator' && currentUser.role !== 'Adjudicator')) {
      evaluatorNotifSeededRef.current = false;
      seenEvaluatorNotifIdsRef.current.clear();
      return;
    }

    const fullNameLower = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim().toLowerCase();
    const unsub = subscribeToNotifications((items) => {
      if (!evaluatorNotifSeededRef.current) {
        items.forEach((n) => {
          if (n.id) seenEvaluatorNotifIdsRef.current.add(n.id);
        });
        evaluatorNotifSeededRef.current = true;
        return;
      }

      const freshAssignments = items.filter((n) => {
        if (!n.id || seenEvaluatorNotifIdsRef.current.has(n.id)) return false;
        if (n.type !== 'Idea assigned') return false;
        if (n.targetRole && n.targetRole !== currentUser.role) return false;
        const msgLower = String(n.message || '').toLowerCase();
        return fullNameLower ? msgLower.includes(fullNameLower) : true;
      });

      items.forEach((n) => {
        if (n.id) seenEvaluatorNotifIdsRef.current.add(n.id);
      });

      if (freshAssignments.length > 0) {
        triggerEvaluatorAssignmentChime();
      }
    });

    return () => unsub();
  }, [currentUser?.role, currentUser?.id, currentUser?.firstName, currentUser?.lastName]);

  const applyCanvasHistorySnapshot = (snapStr: string) => {
    try {
      const parsed = JSON.parse(snapStr);
      isRestoringHistoryRef.current = true;
      setCanvasStations(parsed.canvasStations || []);
      setAssignedIdeasMap(parsed.assignedIdeasMap || {});
      setQueueIdeas(parsed.queueIdeas || []);
      setCanvasPools(parsed.canvasPools || []);
      setCanvasAnnotations(parsed.canvasAnnotations || []);
      setEnquiryMessages(parsed.enquiryMessages || []);
      setIdeaCustomPositions(parsed.ideaCustomPositions || {});
      setPoolCustomPositions(parsed.poolCustomPositions || {});
      setMessageCustomPositions(parsed.messageCustomPositions || {});
    } catch { }
  };

  const handleUndoCanvas = () => {
    const prev = undoStackRef.current.pop();
    if (!prev) return;
    const current = captureCanvasSnapshot();
    redoStackRef.current.push(current);
    applyCanvasHistorySnapshot(prev);
    setHistoryCounts({ undo: undoStackRef.current.length, redo: redoStackRef.current.length });
    showToast('Undid last canvas action');
  };

  const handleRedoCanvas = () => {
    const next = redoStackRef.current.pop();
    if (!next) return;
    const current = captureCanvasSnapshot();
    undoStackRef.current.push(current);
    applyCanvasHistorySnapshot(next);
    setHistoryCounts({ undo: undoStackRef.current.length, redo: redoStackRef.current.length });
    showToast('Redid canvas action');
  };

  const handleDeleteSelectedCanvasItems = (selectedIds: string[]) => {
    if (!selectedIds || selectedIds.length === 0) return;
    pushUndoSnapshot();

    const idsSet = new Set(selectedIds);

    // 1. Remove selected annotations
    setCanvasAnnotations((prev) => prev.filter((a) => !idsSet.has(a.id)));

    // 2. Remove selected pools
    setCanvasPools((prev) => prev.filter((p) => !idsSet.has(p.id)));

    // 3. Remove selected evaluator / agent stations
    setCanvasStations((prev) => prev.filter((s) => !idsSet.has(s.id)));

    // 4. If ideas were selected, return them to the queue and unassign
    const unassignedIdeaCodes: string[] = [];
    setCanvasStations((prev) =>
      prev.map((station) => {
        const remaining = station.assignedIdeaIds.filter((id) => !idsSet.has(id));
        return { ...station, assignedIdeaIds: remaining };
      })
    );

    const ideasToReturnToQueue: QueueIdeaItem[] = [];
    selectedIds.forEach((id) => {
      const idea = assignedIdeasMap[id];
      if (idea) {
        ideasToReturnToQueue.push({ ...idea, status: 'in_queue', evaluatorId: undefined });
        unassignedIdeaCodes.push(idea.code);
      }
    });

    if (ideasToReturnToQueue.length > 0) {
      setQueueIdeas((prev) => [...ideasToReturnToQueue, ...prev]);
    }

    // Clean up custom positions
    setIdeaCustomPositions((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => delete next[id]);
      return next;
    });
    setPoolCustomPositions((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => delete next[id]);
      return next;
    });
    setMessageCustomPositions((prev) => {
      const next = { ...prev };
      selectedIds.forEach((id) => delete next[id]);
      return next;
    });

    showToast(`Removed ${selectedIds.length} item(s) from canvas (Press ⌘Z / Ctrl+Z to undo)`);
  };

  const handleSaveWorkspaceNow = async () => {
    if (!currentUser) return;
    const nowMs = Date.now();
    localUpdatedAtMsRef.current = nowMs;
    const payload: PersistedCanvasState = {
      projects,
      connectors,
      intakeDossiers,
      personnel,
      submissionBatches,
      applicationFields,
      workflowCycles,
      queueIdeas,
      canvasStations,
      assignedIdeasMap,
      canvasPools,
      canvasAnnotations,
      enquiryMessages,
      adminAlerts,
      ideaCustomPositions,
      poolCustomPositions,
      messageCustomPositions,
      cardCustomDimensions,
      queueDimensions,
      isQueueCollapsed,
      queueTab,
      updatedAtMs: nowMs,
      density,
      zoom,
      panX,
      panY,
      autoDispatchEnabled,
      maxChatsPerAgent,
      slaWarningDays,
      slaCriticalDays,
      autoReplenishMessagesOnFinish,
      enforceStatutoryGate,
      autoScreenOnIngest,
      canvasTheme,
      showGrid,
      showConnectors,
    };
    try {
      localStorage.setItem(CANVAS_STATE_STORAGE_KEY, JSON.stringify(payload));
      if (!activeWorkspaceId) {
        showToast('Workspace saved locally');
        return;
      }
      localStorage.setItem(`ceda_ws_${activeWorkspaceId}_v1`, JSON.stringify(payload));
      pendingSyncPayloadRef.current = null;
      const res = await fetch(`/api/workspaces/${encodeURIComponent(activeWorkspaceId)}/state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: payload, updatedBy: currentUser.id, updatedByEmail: currentUser.email }),
      });
      await saveWorkspaceToFirestore(activeWorkspaceId, payload, localClientIdRef.current);
      if (res.ok) {
        showToast('Workspace saved to local storage, PostgreSQL & Firestore');
      } else {
        showToast('Workspace saved locally & Firestore (server sync retry queued)');
      }
    } catch {
      showToast('Workspace saved locally');
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!currentUser) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && key === 's') {
        e.preventDefault();
        handleSaveWorkspaceNow();
      } else if (mod && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndoCanvas();
      } else if ((mod && key === 'z' && e.shiftKey) || (mod && key === 'y')) {
        e.preventDefault();
        handleRedoCanvas();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [
    currentUser?.id,
    activeWorkspaceId,
    projects,
    connectors,
    intakeDossiers,
    personnel,
    submissionBatches,
    applicationFields,
    workflowCycles,
    queueIdeas,
    canvasStations,
    assignedIdeasMap,
    canvasPools,
    canvasAnnotations,
    enquiryMessages,
    adminAlerts,
    ideaCustomPositions,
    poolCustomPositions,
    messageCustomPositions,
    density,
    zoom,
    panX,
    panY,
    canvasTheme,
    showGrid,
    showConnectors,
  ]);

  const handleResetCanvasToDefault = () => {
    localStorage.removeItem(CANVAS_STATE_STORAGE_KEY);
    localStorage.removeItem('ceda_admin_layout_v1');
    if (activeWorkspaceId) {
      localStorage.removeItem(`ceda_ws_${activeWorkspaceId}_v1`);
    }
    setProjects(INITIAL_PROJECTS);
    setConnectors(INITIAL_CONNECTORS);
    setIntakeDossiers(INTAKE_DOSSIERS);
    setPersonnel(INITIAL_ADMIN_PERSONNEL);
    setSubmissionBatches(INITIAL_SUBMISSION_BATCHES);
    setApplicationFields(INITIAL_APPLICATION_FIELDS);
    setWorkflowCycles(INITIAL_WORKFLOW_CYCLES);
    setQueueIdeas(INITIAL_QUEUE_IDEAS);
    setCanvasStations(INITIAL_CANVAS_STATIONS);
    setAssignedIdeasMap(INITIAL_ASSIGNED_IDEAS);
    setCanvasPools(INITIAL_CANVAS_POOLS);
    setCanvasAnnotations(INITIAL_CANVAS_ANNOTATIONS);
    setEnquiryMessages(INITIAL_ENQUIRY_MESSAGES);
    setIdeaCustomPositions({});
    setPoolCustomPositions({});
    setMessageCustomPositions({});
    setDensity('Normal');
    setZoom(0.9);
    setPanX(20);
    setPanY(20);
    setAutoDispatchEnabled(false);
    setMaxChatsPerAgent(3);
    setSlaWarningDays(3.0);
    setSlaCriticalDays(1.5);
    setAutoReplenishMessagesOnFinish(true);
    showToast('🔄 Sample workspace data loaded into current workspace');
  };

  // -------------------------------------------------------------
  // Automatic Message Queue Auto-Dispatch Engine
  // Respects Admin Settings (autoDispatchEnabled & maxChatsPerAgent)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!autoDispatchEnabled) return;
    const queued = enquiryMessages.filter((m) => m.status === 'in_queue' || (m.status as string) === 'queued');
    if (queued.length === 0) return;

    // Available agents whose active chats < maxChatsPerAgent
    const availableAgents = personnel.filter((p) => {
      if (p.role !== 'Agent' || p.status !== 'active') return false;
      if (p.agentAvailability === 'busy' || p.agentAvailability === 'offline') return false;
      const activeChats = enquiryMessages.filter(
        (m) => m.assignedAgentId === p.id && m.status === 'assigned'
      ).length;
      return activeChats < maxChatsPerAgent;
    });

    if (availableAgents.length === 0) return;

    // Pick agent with lowest active load
    const sortedAgents = [...availableAgents].sort((a, b) => {
      const aChats = enquiryMessages.filter((m) => m.assignedAgentId === a.id && m.status === 'assigned').length;
      const bChats = enquiryMessages.filter((m) => m.assignedAgentId === b.id && m.status === 'assigned').length;
      return aChats - bChats;
    });

    // FIFO: Oldest queued message first (a.rawTimestamp - b.rawTimestamp)
    const sortedQueued = [...queued].sort((a, b) => (a.rawTimestamp || 0) - (b.rawTimestamp || 0));
    const nextMsg = sortedQueued[0];
    const targetAgent = sortedAgents[0];

    setEnquiryMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== nextMsg.id) return msg;
        const updated: SubmitterEnquiryMessage = {
          ...msg,
          status: 'assigned',
          assignedAgentId: targetAgent.id,
          assignedAgentName: targetAgent.name,
          assignedAgentEmail: targetAgent.email,
        };
        publishCitizenEnquiry(updated).catch(() => { });
        return updated;
      })
    );

    setPersonnel((prev) =>
      prev.map((p) =>
        p.id === targetAgent.id
          ? { ...p, assignedMessagesCount: (p.assignedMessagesCount || 0) + 1 }
          : p
      )
    );

    setCanvasStations((prev) =>
      prev.map((s) =>
        s.userId === targetAgent.id && !s.assignedMessageIds?.includes(nextMsg.id)
          ? {
            ...s,
            assignedMessageIds: [...(s.assignedMessageIds || []), nextMsg.id],
          }
          : s
      )
    );
  }, [enquiryMessages, autoDispatchEnabled, personnel, maxChatsPerAgent]);

  // Agent Portal Handlers
  const handleSendMessageFromAgent = (messageId: string, text: string) => {
    const senderName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'Agent Helpdesk';
    setEnquiryMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const updatedMsg: SubmitterEnquiryMessage = {
          ...msg,
          thread: [
            ...msg.thread,
            {
              id: `reply-${Date.now()}`,
              sender: 'agent',
              senderName,
              text,
              timestamp: 'Just now',
            },
          ],
        };
        publishCitizenEnquiry(updatedMsg).catch(() => {});
        publishNotification({
          innovationId: msg.ideaCode || msg.id,
          type: 'Citizen enquiry',
          message: `🎧 ${senderName} replied to your enquiry "${msg.subject}": ${text.slice(0, 90)}`,
          user: senderName,
          targetRole: 'Submitter',
          ideaTitle: msg.subject,
          submitterName: msg.submitterName,
        }).catch(() => {});
        return updatedMsg;
      })
    );
    showToast('💬 Reply transmitted to citizen submitter');
  };

  const handleResolveMessage = (messageId: string, notes?: string) => {
    const resolved = enquiryMessages.find((m) => m.id === messageId);
    const agentId = resolved?.assignedAgentId;
    const agent = agentId ? personnel.find((p) => p.id === agentId) : undefined;
    const agentStation = agentId ? canvasStations.find((s) => s.userId === agentId) : undefined;
    const shouldReplenish =
      autoReplenishMessagesOnFinish &&
      (agentStation ? agentStation.autoReplenishOnFinish : true) &&
      agent?.agentAvailability !== 'busy' &&
      agent?.agentAvailability !== 'offline';

    // Find next queued message if 1-Out 1-In replenishment is active
    const queued = enquiryMessages
      .filter((m) => (m.status === 'in_queue' || (m.status as string) === 'queued') && m.id !== messageId)
      .sort((a, b) => (a.rawTimestamp || 0) - (b.rawTimestamp || 0));

    const currentAgentActive = agentId
      ? enquiryMessages.filter((m) => m.assignedAgentId === agentId && m.status === 'assigned' && m.id !== messageId).length
      : 0;

    const nextQueuedMsg =
      shouldReplenish && agentId && currentAgentActive < maxChatsPerAgent && queued.length > 0
        ? queued[0]
        : null;

    setEnquiryMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          const updated: SubmitterEnquiryMessage = {
            ...msg,
            status: 'resolved',
            resolvedAt: 'Just now',
            resolutionNotes: notes || 'Enquiry successfully resolved.',
          };
          publishCitizenEnquiry(updated).catch(() => {});
          return updated;
        }
        if (nextQueuedMsg && msg.id === nextQueuedMsg.id && agent) {
          const updatedNext: SubmitterEnquiryMessage = {
            ...msg,
            status: 'assigned',
            assignedAgentId: agent.id,
            assignedAgentName: agent.name,
            assignedAgentEmail: agent.email,
          };
          publishCitizenEnquiry(updatedNext).catch(() => {});
          return updatedNext;
        }
        return msg;
      })
    );

    if (agentId) {
      setCanvasStations((prev) =>
        prev.map((s) => {
          if (s.userId !== agentId) return s;
          const remaining = (s.assignedMessageIds || []).filter((id) => id !== messageId);
          return {
            ...s,
            assignedMessageIds: nextQueuedMsg ? [...remaining, nextQueuedMsg.id] : remaining,
          };
        })
      );

      setPersonnel((prev) =>
        prev.map((p) =>
          p.id === agentId
            ? {
              ...p,
              assignedMessagesCount: nextQueuedMsg
                ? Math.max(1, p.assignedMessagesCount || 1)
                : Math.max(0, (p.assignedMessagesCount || 1) - 1),
            }
            : p
        )
      );
    }

    if (nextQueuedMsg && agent) {
      showToast(`✅ Enquiry resolved! 1-Out 1-In pulled "${nextQueuedMsg.subject}" to ${agent.name}.`);
    } else {
      showToast('✅ Enquiry resolved & archived.');
    }
  };

  const handleUpdateAgentStatus = (agentId: number, status: 'available' | 'busy' | 'offline') => {
    setPersonnel((prev) =>
      prev.map((p) => (p.id === agentId ? { ...p, agentAvailability: status } : p))
    );
    showToast(`Agent availability status set to ${status.toUpperCase()}`);
  };

  const handleAssignMessageToAgent = (messageId: string, agentId: number) => {
    const agent = personnel.find((p) => p.id === agentId);
    if (!agent) return;

    if (agent.agentAvailability === 'busy' || agent.agentAvailability === 'offline') {
      showToast(`⚠️ ${agent.name} is currently ${agent.agentAvailability.toUpperCase()}. Update availability or pick another agent.`);
      return;
    }

    const activeChats = enquiryMessages.filter(
      (m) => m.assignedAgentId === agentId && m.status === 'assigned'
    ).length;
    if (activeChats >= maxChatsPerAgent) {
      showToast(`⚠️ ${agent.name} has reached Admin Settings max capacity (${activeChats}/${maxChatsPerAgent} chats).`);
      return;
    }

    setEnquiryMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const updated: SubmitterEnquiryMessage = {
          ...msg,
          status: 'assigned',
          assignedAgentId: agent.id,
          assignedAgentName: agent.name,
          assignedAgentEmail: agent.email,
        };
        publishCitizenEnquiry(updated).catch(() => {});
        return updated;
      })
    );

    setPersonnel((prev) =>
      prev.map((p) =>
        p.id === agentId
          ? { ...p, assignedMessagesCount: (p.assignedMessagesCount || 0) + 1 }
          : p
      )
    );

    setCanvasStations((prev) => {
      const hasStation = prev.some((s) => s.userId === agentId);
      if (hasStation) {
        return prev.map((s) =>
          s.userId === agentId && !s.assignedMessageIds?.includes(messageId)
            ? { ...s, assignedMessageIds: [...(s.assignedMessageIds || []), messageId] }
            : s
        );
      }
      return prev;
    });

    showToast(`🎧 Assigned enquiry from Admin Queue to ${agent.name} (${activeChats + 1}/${maxChatsPerAgent} chats)`);
  };

  const handleAssignMessagesToAgentStation = (stationId: string, messageIds: string[]) => {
    const station = canvasStations.find((s) => s.id === stationId);
    if (!station || messageIds.length === 0) return;

    if (station.user.role !== 'Agent') {
      showToast(`⚠️ ${station.user.name} is an ${station.user.role}. Citizen enquiries can only be assigned to Agent stations.`);
      return;
    }

    const agent = personnel.find((p) => p.id === station.userId) || station.user;
    if (agent.agentAvailability === 'busy' || agent.agentAvailability === 'offline') {
      showToast(`⚠️ ${agent.name} is currently ${agent.agentAvailability.toUpperCase()} and cannot accept new enquiries.`);
      return;
    }

    const currentActive = enquiryMessages.filter(
      (m) => m.assignedAgentId === agent.id && m.status === 'assigned'
    ).length;
    const remainingCap = Math.max(0, maxChatsPerAgent - currentActive);

    if (remainingCap === 0) {
      showToast(`⚠️ ${agent.name} is at max chat capacity (${currentActive}/${maxChatsPerAgent} per Admin Settings).`);
      return;
    }

    const assignableIds = messageIds.slice(0, remainingCap);
    const skippedCount = messageIds.length - assignableIds.length;

    setEnquiryMessages((prev) =>
      prev.map((msg) => {
        if (!assignableIds.includes(msg.id)) return msg;
        const updated: SubmitterEnquiryMessage = {
          ...msg,
          status: 'assigned',
          assignedAgentId: agent.id,
          assignedAgentName: agent.name,
          assignedAgentEmail: agent.email,
        };
        publishCitizenEnquiry(updated).catch(() => {});
        return updated;
      })
    );

    setPersonnel((prev) =>
      prev.map((p) =>
        p.id === agent.id
          ? { ...p, assignedMessagesCount: (p.assignedMessagesCount || 0) + assignableIds.length }
          : p
      )
    );

    setCanvasStations((prev) =>
      prev.map((s) =>
        s.id === stationId
          ? {
            ...s,
            assignedMessageIds: Array.from(new Set([...(s.assignedMessageIds || []), ...assignableIds])),
          }
          : s
      )
    );

    if (skippedCount > 0) {
      showToast(`🎧 Assigned ${assignableIds.length} enquiry(s) to ${agent.name}. ${skippedCount} kept in Admin Queue (max ${maxChatsPerAgent}/agent).`);
    } else {
      showToast(`🎧 Assigned ${assignableIds.length} enquiry(s) from Admin Queue to ${agent.name}!`);
    }
  };

  const handleSimulateNewMessage = () => {
    const samples = [
      {
        submitterName: 'Boitumelo Ndlovu',
        submitterEmail: 'boitumelo@maun-safaris.bw',
        submitterLocation: 'Maun, Ngamiland',
        ideaCode: 'INT-174',
        ideaTitle: 'Solar Safari Game Drive Conversions',
        subject: 'Tourism Board permit upload requirement',
        messageText: 'Dumelang! Does CEDA require our BTO eco-certification before Stage 2 screening or during Pilot Deployment?',
        priority: 'High' as const,
      },
      {
        submitterName: 'Phenyo Kgathi',
        submitterEmail: 'phenyo@palapye-bricks.bw',
        submitterLocation: 'Palapye, Central District',
        ideaCode: 'INT-181',
        ideaTitle: 'Coal Fly-Ash Eco-Bricks Plant',
        subject: 'Morupule ash supply MoU clarification',
        messageText: 'Hello team, we received our draft ash off-take letter from Morupule. Where should we attach the PDF in our dossier?',
        priority: 'Urgent' as const,
      },
      {
        submitterName: 'Goitseone Mabena',
        submitterEmail: 'goitse@francistown-mills.bw',
        submitterLocation: 'Francistown',
        ideaCode: 'INT-189',
        ideaTitle: 'Sorghum Protein Isolate Nutrition Bar',
        subject: 'NFTRC lab nutrition test timeline',
        messageText: 'Good day, our NFTRC lab results arrive Friday. Can our application enter Technical Evaluation while lab certificates are pending?',
        priority: 'Normal' as const,
      },
      {
        submitterName: 'Onalenna Ditsele',
        submitterEmail: 'onalenna@ghanzi-dairy.bw',
        submitterLocation: 'Ghanzi',
        ideaCode: 'INT-195',
        ideaTitle: 'Mobile Solar Cold-Storage for Cattle Farmers',
        subject: 'Co-financing grant vs debt split query',
        messageText: 'Dumelang, for a BWP 870,000 request under Youth Entrepreneurship, what is the minimum citizen equity contribution required?',
        priority: 'High' as const,
      },
    ];

    const pick = samples[Math.floor(Math.random() * samples.length)];
    const now = Date.now();
    const newMsg: SubmitterEnquiryMessage = {
      id: `msg-sim-${now}`,
      submitterName: pick.submitterName,
      submitterEmail: pick.submitterEmail,
      submitterLocation: pick.submitterLocation,
      ideaCode: pick.ideaCode,
      ideaTitle: pick.ideaTitle,
      subject: pick.subject,
      messageText: pick.messageText,
      arrivalTime: 'Just now',
      rawTimestamp: now,
      status: 'in_queue',
      priority: pick.priority,
      slaMinutesRemaining: 180,
      thread: [
        {
          id: `t-sim-${now}`,
          sender: 'submitter',
          senderName: pick.submitterName,
          text: pick.messageText,
          timestamp: 'Just now',
        },
      ],
    };

    setEnquiryMessages((prev) => [...prev, newMsg]);
    showToast(`📩 New Citizen Enquiry entered Admin Queue from ${pick.submitterName} (${pick.priority})`);
  };

  const handleSendAlert = (
    targetUserId: number,
    type: 'sla_warning' | 'inactivity' | 'priority_notice' | 'custom',
    title: string,
    message: string,
    relatedIdeaCode?: string
  ) => {
    const targetOfficial = personnel.find((p) => p.id === targetUserId);
    const newAlert: AdminAlertNotification = {
      id: `alert-${Date.now()}`,
      targetUserId,
      targetUserEmail: targetOfficial?.email,
      targetUserName: targetOfficial?.name || 'Assigned Official',
      targetUserRole: targetOfficial?.role || 'Evaluator',
      targetRole: targetOfficial?.role || 'Evaluator',
      type,
      alertType: type,
      title,
      message,
      relatedIdeaCode,
      timestamp: 'Just now',
      createdAt: 'Just now',
      read: false,
    };

    setAdminAlerts((prev) => [newAlert, ...prev]);
    publishAdminAlert({
      id: newAlert.id,
      targetUserId,
      targetUserEmail: targetOfficial?.email,
      targetUserName: newAlert.targetUserName,
      targetUserRole: newAlert.targetUserRole || 'Evaluator',
      type,
      title,
      message,
      relatedIdeaCode,
    });
    publishNotification({
      innovationId: relatedIdeaCode || 'CEDA-ALERT',
      type: type === 'sla_warning' ? 'SLA Violation' : 'Idea assigned',
      message: `${title}: ${message}`,
      user: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Administrator',
      targetRole: newAlert.targetUserRole,
      targetEmail: targetOfficial?.email,
    });

    setPersonnel((prev) =>
      prev.map((p) =>
        p.id === targetUserId
          ? {
            ...p,
            activeAlertsCount: (p.activeAlertsCount || 0) + 1,
            lastAlertSent: 'Just now',
          }
          : p
      )
    );

    setIsAlertModalOpen(false);
    showToast(`📢 Alert dispatched to ${targetOfficial?.name || 'official'}: "${title}"`);
  };

  // Fetch PostgreSQL innovations on mount
  const refreshFromBackend = async () => {
    try {
      const apiUrl =
        currentUser?.role === 'Submitter'
          ? `/api/innovations?submitterId=${encodeURIComponent(String(currentUser.id))}&submitterEmail=${encodeURIComponent(currentUser.email || '')}`
          : '/api/innovations';
      const res = await fetch(apiUrl);
      if (res.ok) {
        const backendInnovations = await res.json();
        if (currentUser?.role === 'Submitter' && (!backendInnovations || backendInnovations.length === 0)) {
          setProjects([]);
          return;
        }
        if (backendInnovations && backendInnovations.length > 0) {
          const mapped: ProjectCardData[] = backendInnovations.map((item: any) => {
            const baseStageId = (
              item.currentStage === 'submission'
                ? 'intake'
                : item.currentStage === 'expert_review'
                  ? 'expert_review'
                  : item.currentStage === 'adjudication'
                    ? 'approval_board'
                    : item.currentStage === 'pilot'
                      ? 'pilot_phase'
                      : item.currentStage === 'impact_measurement'
                        ? 'realized_impact'
                        : item.currentStage
            ) as StageId;

            const lifecycle = getLifecycleRecordForIdea({
              id: item.innovationNumber || `CEDA-2026-0${item.id}`,
              code: `[SUB-${String(item.id).padStart(3, '0')}]`,
              title: item.title,
            });

            const baseIdx = STAGE_ORDER.indexOf(baseStageId);
            const lcIdx = lifecycle ? STAGE_ORDER.indexOf(lifecycle.currentStageId) : -1;
            const resolvedStageId =
              lcIdx > baseIdx && lifecycle ? lifecycle.currentStageId : baseStageId;

            return {
              id: item.innovationNumber || `CEDA-2026-0${item.id}`,
              stageTag: `[${item.currentStage?.slice(0, 3).toUpperCase() || 'INT'}-${String(item.id).padStart(3, '0')}]`,
              stageId: resolvedStageId,
              title: item.title,
              applicant: {
                name: item.submitter
                  ? `${item.submitter.firstName} ${item.submitter.lastName}`
                  : lifecycle?.submitterName || 'Citizen Entrepreneur',
                nationalId: lifecycle?.omangId || 'BW-710293481',
                organization:
                  lifecycle?.enterpriseName ||
                  lifecycle?.screening?.cipaMatch?.companyName ||
                  item.category?.categoryName ||
                  'Botswana Enterprise',
                location: 'Gaborone / Central Hub',
              },
              description: item.description,
              sector: (item.category?.categoryName || 'AgriTech & Food') as any,
              fundingRequested: item.fundingRequested || 500000,
              coFinancing: Math.round((item.fundingRequested || 500000) * 0.25),
              equityStakePercent: 12,
              projectedJobs: item.projectedJobs || 15,
              projectedAnnualRevenue: (item.fundingRequested || 500000) * 1.6,
              riskRating: item.priority === 'CRITICAL' ? 'HIGH' : ((item.priority || 'MEDIUM') as any),
              stageProgress: 75,
              submittedDate: 'Nov 8, 2026',
              lastUpdated: 'Just now',
              cipaNumber: lifecycle?.cipaUin,
              bursTin: lifecycle?.bursTin,
              screening: lifecycle?.screening,
              reviewers:
                item.evaluations?.map((ev: any) => ({
                  id: `ev-${ev.id}`,
                  name: ev.evaluator
                    ? `${ev.evaluator.firstName} ${ev.evaluator.lastName}`
                    : 'Dr. M. Tau',
                  role: 'Evaluator',
                  avatar:
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
                  vote: ev.recommendation.includes('Proceed') ? 'APPROVE' : 'REVISE',
                  comment: ev.comments,
                })) || [],
              milestones: [
                {
                  id: 'm1',
                  title: 'Statutory compliance & CIPA clearance',
                  completed: true,
                  requiredForNextStage: true,
                },
                {
                  id: 'm2',
                  title: 'Technical evaluation rubric completed',
                  completed: item.evaluations?.length > 0,
                  requiredForNextStage: true,
                },
              ],
              tags: [item.category?.categoryName || 'General', item.status],
              submitterId: item.submitterId,
              submitterEmail: item.submitter?.email,
              auditLog:
                item.history?.map((h: any) => ({
                  timestamp: new Date(h.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  action: h.action,
                  author: 'CEDA Pipeline Engine',
                })) || [],
            };
          });

          setProjects((prev) => {
            if (!activeWorkspaceId || currentUser?.role === 'Submitter' || prev.length === 0) {
              return mapped;
            }
            // Merge any newly found projects and update stageId/screening from lifecycle
            const next = [...prev];
            mapped.forEach((m) => {
              const idx = next.findIndex(
                (p) =>
                  String(p.id) === String(m.id) ||
                  normalizeIdeaKeyTitle(p.title) === normalizeIdeaKeyTitle(m.title)
              );
              if (idx >= 0) {
                const existingIdx = STAGE_ORDER.indexOf(next[idx].stageId);
                const mappedIdx = STAGE_ORDER.indexOf(m.stageId);
                next[idx] = {
                  ...next[idx],
                  stageId: mappedIdx > existingIdx ? m.stageId : next[idx].stageId,
                  screening: next[idx].screening || m.screening,
                };
              } else {
                next.push(m);
              }
            });
            return next;
          });

          // Sync newly submitted pending Stage 1 PostgreSQL innovations into Admin Ideas Queue
          // (Recovers submissions made before Admin opened or across tabs/devices without re-adding pre-clear demo rows)
          const liveCutoffMs = Date.parse('2026-11-15T00:00:00Z');
          const pendingDbSubmissions: QueueIdeaItem[] = backendInnovations
            .filter((item: any) => {
              const isStage1Pending =
                (item.currentStage === 'submission' || !item.currentStage) &&
                (item.status === 'pending' || !item.status);
              if (!isStage1Pending) return false;
              const createdMs = item.createdAt ? new Date(item.createdAt).getTime() : 0;
              return createdMs >= liveCutoffMs;
            })
            .map((item: any) =>
              toQueueIdeaFromIncoming({
                ...item,
                id: item.innovationNumber || `db-${item.id}`,
                code: item.innovationNumber || `CEDA-INV-${item.id}`,
              })
            );

          if (pendingDbSubmissions.length > 0) {
            const newlyDiscoveredDbItems: QueueIdeaItem[] = [];
            pendingDbSubmissions.forEach((qItem) => {
              const tKey = normalizeIdeaKeyTitle(qItem.title);
              const isNewToDbTracker =
                !knownDbSubmissionKeysRef.current.has(String(qItem.id)) &&
                !(tKey && knownDbSubmissionKeysRef.current.has(tKey));
              knownDbSubmissionKeysRef.current.add(String(qItem.id));
              if (tKey) knownDbSubmissionKeysRef.current.add(tKey);

              if (dbPollInitializedRef.current && isNewToDbTracker) {
                newlyDiscoveredDbItems.push(qItem);
              }

              if (
                !liveSubmissionsBufferRef.current.some(
                  (b) =>
                    String(b.id) === String(qItem.id) ||
                    (tKey && normalizeIdeaKeyTitle(b.title) === tKey)
                )
              ) {
                liveSubmissionsBufferRef.current = [qItem, ...liveSubmissionsBufferRef.current];
              }
            });

            if (newlyDiscoveredDbItems.length > 0 && currentUserRoleRef.current === 'Administrator') {
              playNewSubmissionSound();
              showToast(`📥 New idea submitted: "${newlyDiscoveredDbItems[0].title}"`);
            }

            if (currentUser?.role !== 'Submitter') {
              setQueueIdeas((prev) => mergeIncomingIdeasIntoQueue(prev, pendingDbSubmissions));
            }
          }
          dbPollInitializedRef.current = true;
        }
      }

      // Synchronize live personnel directory from PostgreSQL users table
      const usersRes = await fetch('/api/users');
      if (usersRes.ok) {
        const dbUsers = await usersRes.json();
        if (Array.isArray(dbUsers)) {
          const mappedPersonnel: AdminPersonnel[] = dbUsers.map((u: any) => {
            const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Official';
            const initials = name
              .split(' ')
              .map((part: string) => part[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'OF';
            const liveAssignedIds = new Set<string>();
            canvasStationsRef.current.forEach((st) => {
              const sameUser =
                st.userId === u.id ||
                (u.email && st.user?.email && st.user.email.toLowerCase() === String(u.email).toLowerCase());
              if (sameUser && Array.isArray(st.assignedIdeaIds)) {
                st.assignedIdeaIds.forEach((id) => liveAssignedIds.add(String(id)));
              }
            });
            return {
              id: u.id,
              name,
              email: u.email,
              role: u.role || 'Evaluator',
              department: u.department || 'General',
              status: u.status === 'suspended' ? 'away' : (u.status || 'active'),
              avatarInitials: initials,
              lastActive: u.updatedAt ? new Date(u.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active',
              assignedIdeasCount: liveAssignedIds.size,
            };
          });
          setPersonnel(mappedPersonnel);

          // Reconcile and purge any deleted personnel from active canvas stations & localStorage
          const dbIds = new Set(dbUsers.map((u: any) => u.id));
          const dbEmails = new Set(dbUsers.map((u: any) => (u.email || '').toLowerCase()));

          setCanvasStations((prev) =>
            prev.filter((st) => dbIds.has(st.userId) || dbEmails.has((st.user?.email || '').toLowerCase()))
          );

          try {
            const raw = localStorage.getItem(CANVAS_STATE_STORAGE_KEY);
            if (raw) {
              const parsed = JSON.parse(raw);
              parsed.personnel = mappedPersonnel;
              if (Array.isArray(parsed.canvasStations)) {
                parsed.canvasStations = parsed.canvasStations.filter(
                  (st: any) => dbIds.has(st.userId) || dbEmails.has((st.user?.email || '').toLowerCase())
                );
              }
              localStorage.setItem(CANVAS_STATE_STORAGE_KEY, JSON.stringify(parsed));
            }
          } catch { }
        }
      }
    } catch (err) {
      console.warn('Backend fetch notice:', err);
    }
  };

  useEffect(() => {
    refreshFromBackend();

    // Real-time backend sync fallback for Admin queue (catches cross-browser PostgreSQL submissions immediately)
    if (!currentUser || currentUser.role !== 'Administrator') return;
    const pollInterval = setInterval(() => {
      refreshFromBackend();
    }, 5000);
    return () => clearInterval(pollInterval);
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    // Subscribe to Real-time card moves across connected users via Firestore
    const unsubCardMoves = subscribeToCardMoves((move) => {
      if (move && move.innovationId) {
        setProjects((prev) =>
          prev.map((p) => {
            if (p.id.includes(String(move.innovationId))) {
              return {
                ...p,
                stageId: move.toStage as StageId,
                lastUpdated: 'Just now',
              };
            }
            return p;
          })
        );
      }
    });

    return () => unsubCardMoves();
  }, []);

  // Direct user to submitter view if role is Submitter, and refresh backend innovations so Submitter Canvas is always populated
  useEffect(() => {
    if (currentUser?.role === 'Submitter') {
      setCurrentView('submitter');
      refreshFromBackend();
    } else if (currentView === 'submitter') {
      setCurrentView('canvas');
    }
  }, [currentUser?.role]);

  // Synchronize projects in real time whenever stageJourneyStore records update
  useEffect(() => {
    const unsubLifecycle = subscribeToLifecycleRecords(() => {
      setProjects((prev) => {
        let changed = false;
        const next = prev.map((proj) => {
          const lc = getLifecycleRecordForIdea(proj);
          if (!lc) return proj;
          const curIdx = STAGE_ORDER.indexOf(proj.stageId);
          const lcIdx = STAGE_ORDER.indexOf(lc.currentStageId);
          const targetStageId = lcIdx > curIdx ? lc.currentStageId : proj.stageId;
          const targetOrg =
            lc.enterpriseName &&
              (!proj.applicant.organization ||
                proj.applicant.organization === 'Botswana Enterprise' ||
                proj.applicant.organization === proj.sector)
              ? lc.enterpriseName
              : proj.applicant.organization;
          if (
            targetStageId !== proj.stageId ||
            lc.screening !== proj.screening ||
            targetOrg !== proj.applicant.organization
          ) {
            changed = true;
            return {
              ...proj,
              stageId: targetStageId,
              screening: lc.screening || proj.screening,
              cipaNumber: lc.cipaUin || proj.cipaNumber,
              bursTin: lc.bursTin || proj.bursTin,
              applicant: {
                ...proj.applicant,
                organization: targetOrg,
              },
            };
          }
          return proj;
        });
        return changed ? next : prev;
      });
    });
    return () => unsubLifecycle();
  }, []);

  // Stage advancement (Dynamic Workflow Cycle aware)
  const handleAdvanceProject = async (projectId: string) => {
    const proj = projects.find((p) => p.id === projectId);
    if (!proj) return;

    const pipelineStages = mapWorkflowStagesToPipelineStages(activeWorkflowCycle);
    const currentIndex = pipelineStages.findIndex((s) => s.id === proj.stageId);
    if (currentIndex >= 0 && currentIndex < pipelineStages.length - 1) {
      const nextStage = pipelineStages[currentIndex + 1];
      const actorName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'Evaluator';

      recordStageTransitionLifecycle(
        proj,
        nextStage.id,
        actorName,
        currentUser?.role || 'Evaluator',
        {
          status: 'passed',
          notes: `Approved and promoted from ${proj.stageId} to ${nextStage.name}.`,
        }
      );

      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === projectId) {
            return {
              ...p,
              stageId: nextStage.id,
              stageTag: `[${nextStage.tagPrefix}-${p.id.slice(-3)}]`,
              lastUpdated: 'Just now',
              auditLog: [
                ...p.auditLog,
                {
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  action: `Promoted from ${proj.stageId} to ${nextStage.name}`,
                  author: actorName,
                },
              ],
            };
          }
          return p;
        })
      );

      fetch(`/api/innovations/${projectId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: nextStage.id,
          userId: currentUser?.id,
          actionNote: `Promoted from ${proj.stageId} to ${nextStage.name}`,
        }),
      }).catch(() => { });

      broadcastCardMove(projectId, proj.stageId, nextStage.id, actorName);

      publishActivity({
        innovationId: projectId,
        action: 'card_moved',
        user: actorName,
        role: currentUser?.role || 'Evaluator',
      });

      sendSubmitterStageUpdateEmail({
        innovationId: proj.id,
        code: proj.stageTag,
        title: proj.title,
        previousStage: pipelineStages[currentIndex]?.name,
        newStage: nextStage.name,
        outcome: 'passed',
        actorName,
        actorRole: currentUser?.role || 'Evaluator',
        notes: `Proposal approved and promoted to ${nextStage.name}.`,
        submitterName: proj.applicant?.name,
      });
    }
  };

  const handleMoveProjectStage = async (projectId: string, newStageId: StageId) => {
    const pipelineStages = mapWorkflowStagesToPipelineStages(activeWorkflowCycle);
    const stage = pipelineStages.find((s) => s.id === newStageId);
    const proj = projects.find((p) => p.id === projectId);
    if (!stage) return;

    const fromStage = proj?.stageId || 'intake';
    const actorName = `${currentUser?.firstName || 'CEDA'} ${currentUser?.lastName || 'Official'}`.trim();

    if (proj) {
      recordStageTransitionLifecycle(
        proj,
        newStageId,
        actorName,
        currentUser?.role || 'Evaluator',
        {
          status: 'passed',
          notes: `Stage advanced from ${fromStage} to ${stage.name}.`,
        }
      );
    }

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            stageId: newStageId,
            stageTag: `[${stage.tagPrefix}-${p.id.slice(-3)}]`,
            lastUpdated: 'Just now',
          };
        }
        return p;
      })
    );

    fetch(`/api/innovations/${projectId}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage: newStageId,
        userId: currentUser?.id,
        actionNote: `Transitioned from ${fromStage} to ${newStageId}`,
      }),
    }).catch(() => { });

    broadcastCardMove(projectId, fromStage, newStageId, actorName);
    publishActivity({
      innovationId: projectId,
      action: 'card_moved',
      user: actorName,
      role: currentUser?.role || 'Evaluator',
    });
  };

  const handleAdvanceIdeaStage = async (ideaId: string, explicitTargetStep?: number) => {
    const assignedIdea =
      assignedIdeasMap[ideaId] ||
      queueIdeas.find((i) => i.id === ideaId) ||
      syncedAdjudicationIdeas.find((i) => String(i.id) === String(ideaId));
    const proj = projects.find(
      (p) =>
        p.id === ideaId ||
        (assignedIdea?.title &&
          normalizeIdeaKeyTitle(p.title) === normalizeIdeaKeyTitle(assignedIdea.title))
    );
    const actorName = currentUser
      ? `${currentUser.firstName} ${currentUser.lastName}`.trim()
      : 'Evaluator';
    const ideaTitle = proj?.title || assignedIdea?.title || ideaId;
    const ideaCode = assignedIdea?.code || proj?.stageTag || ideaId;
    const submitterName = assignedIdea?.submitterName || proj?.applicant?.name;
    const isAdjudicatorAction = currentUser?.role === 'Adjudicator';

    if (isAdjudicatorAction) {
      const sortedStages = [...(activeWorkflowCycle?.stages || [])].sort(
        (a, b) => a.stepNumber - b.stepNumber
      );
      const adjStartStage =
        sortedStages.find((s) => s.stepNumber === 5 && s.assignedRole === 'Adjudicator') ||
        sortedStages.find((s) => s.assignedRole === 'Adjudicator') ||
        sortedStages.find((s) => s.stepNumber === 5) || {
          id: 'stg-5',
          name: 'Adjudication Board Chamber',
          stepNumber: 5,
          assignedRole: 'Adjudicator' as const,
          thresholdCriteria: 'Quorum Vote (>= 3/4)',
          targetTurnaroundDays: 4,
          color: '#16a34a',
        };
      const maxWorkflowStep =
        sortedStages[sortedStages.length - 1]?.stepNumber ?? adjStartStage.stepNumber;

      // Explicit archive & clear once all post-adjudication stages are finished
      if (explicitTargetStep === -1) {
        setAssignedIdeasMap((prev) => {
          const next = { ...prev };
          delete next[ideaId];
          return next;
        });
        setQueueIdeas((prev) =>
          prev.filter(
            (item) =>
              String(item.id) !== String(ideaId) &&
              (!ideaTitle || normalizeIdeaKeyTitle(item.title) !== normalizeIdeaKeyTitle(ideaTitle))
          )
        );
        syncedAdjudicationIdsRef.current.delete(String(ideaId));
        setSyncedAdjudicationIdeas((prev) =>
          prev.filter((item) => String(item.id) !== String(ideaId))
        );
        removeAdjudicationQueueItem(ideaId).catch(() => {});
        setCanvasStations((prev) =>
          prev.map((st) => ({
            ...st,
            assignedIdeaIds: (st.assignedIdeaIds || []).filter((id) => String(id) !== String(ideaId)),
          }))
        );
        setIdeaCustomPositions((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((k) => {
            if (k === ideaId || k.startsWith(`eval__${ideaId}`)) {
              delete next[k];
            }
          });
          return next;
        });
        if (currentUser?.id) {
          deleteIdeaAssignment(currentUser.id, ideaId).catch(() => {});
        }
        deleteIdeaAssignmentsByInnovationId(ideaId).catch(() => {});
        showToast(`🗄️ "${ideaTitle}" archived & cleared from your Adjudication Queue!`);
        return;
      }

      const mapStageDefToStageId = (stepNum: number, stageName?: string): StageId => {
        const lower = (stageName || '').toLowerCase();
        if (lower.includes('adjudication') || lower.includes('board') || stepNum <= 5) return 'approval_board';
        if (lower.includes('pilot') || lower.includes('sandbox') || stepNum === 6) return 'pilot_phase';
        if (lower.includes('disbursement') || lower.includes('implementation') || stepNum === 7) return 'implementation';
        return 'realized_impact';
      };

      const currentStep = Math.max(
        adjStartStage.stepNumber,
        Number(assignedIdea?.currentStepNumber || adjStartStage.stepNumber)
      );
      const nextStep = explicitTargetStep ?? currentStep + 1;
      const completedStage =
        sortedStages.find((s) => s.stepNumber === nextStep - 1) ||
        sortedStages.find((s) => s.stepNumber === currentStep) ||
        adjStartStage;
      const nextStage = sortedStages.find((s) => s.stepNumber === nextStep) || null;
      const isFinalCompleted = nextStep > maxWorkflowStep || !nextStage;

      const targetStageObj = nextStage || completedStage;
      const mappedStageId = mapStageDefToStageId(
        targetStageObj.stepNumber,
        targetStageObj.name
      );
      const newProgress = isFinalCompleted
        ? 100
        : Math.min(98, Math.round((completedStage.stepNumber / maxWorkflowStep) * 100));

      recordStageTransitionLifecycle(
        {
          id: proj?.id || ideaId,
          code: ideaCode,
          title: ideaTitle,
          enterpriseName: assignedIdea?.enterpriseName || proj?.applicant?.organization,
          submitterName,
          cipaUin: assignedIdea?.cipaUin || proj?.cipaNumber,
          bursTin: assignedIdea?.bursTin || proj?.bursTin,
        },
        mappedStageId,
        actorName,
        'Adjudicator',
        {
          status: 'passed',
          notes: isFinalCompleted
            ? `${actorName} completed final Stage ${completedStage.stepNumber} (${completedStage.name}) for "${ideaTitle}".`
            : `${actorName} completed Stage ${completedStage.stepNumber} (${completedStage.name}) and advanced "${ideaTitle}" to Stage ${nextStage.stepNumber} (${nextStage.name}).`,
        }
      );

      recordIdeaAuditEvent(
        {
          id: proj?.id || ideaId,
          code: ideaCode,
          title: ideaTitle,
          enterpriseName: assignedIdea?.enterpriseName || proj?.applicant?.organization,
          submitterName,
        },
        {
          action: isFinalCompleted
            ? `Completed Stage ${completedStage.stepNumber}: ${completedStage.name}`
            : `Stage ${completedStage.stepNumber} (${completedStage.name}) → Stage ${nextStage.stepNumber} (${nextStage.name})`,
          author: `${actorName} (Adjudicator)`,
          authorRole: 'Adjudicator',
          tabName: targetStageObj.name,
          eventType: 'stage_transition',
          notes: `Threshold verified: ${completedStage.thresholdCriteria}.`,
        }
      );

      setProjects((prev) =>
        prev.map((p) => {
          if (
            p.id === ideaId ||
            (ideaTitle && normalizeIdeaKeyTitle(p.title) === normalizeIdeaKeyTitle(ideaTitle))
          ) {
            return {
              ...p,
              stageId: mappedStageId,
              stageProgress: newProgress,
              lastUpdated: 'Just now',
            };
          }
          return p;
        })
      );

      const baseIdeaObj: QueueIdeaItem = assignedIdea || {
        id: ideaId,
        code: ideaCode,
        title: ideaTitle,
        category: proj?.sector || 'General',
        arrivalDate: proj?.submittedDate || 'Today',
        urgency: 'Standard',
        capitalAsk: proj?.fundingRequested || 0,
        status: 'adjudicated',
        progress: newProgress,
        slaRemainingDays: targetStageObj.targetTurnaroundDays,
        slaTargetDays: targetStageObj.targetTurnaroundDays,
        enterpriseName: proj?.applicant?.organization,
        submitterName,
      };

      const updatedIdeaObj: QueueIdeaItem = {
        ...baseIdeaObj,
        status: 'adjudicated',
        stageId: mappedStageId,
        stage: mappedStageId,
        currentStepNumber: nextStep,
        currentWorkflowStageName: isFinalCompleted
          ? `${completedStage.name} (Completed)`
          : nextStage.name,
        finalWorkflowCompleted: isFinalCompleted,
        progress: newProgress,
        slaRemainingDays: targetStageObj.targetTurnaroundDays,
        slaTargetDays: targetStageObj.targetTurnaroundDays,
      };

      setAssignedIdeasMap((prev) => ({
        ...prev,
        [ideaId]: {
          ...updatedIdeaObj,
          evaluatorId: currentUser?.id,
        },
      }));

      setQueueIdeas((prev) => {
        const exists = prev.some((i) => String(i.id) === String(ideaId));
        if (!exists) return prev;
        return prev.map((item) =>
          String(item.id) === String(ideaId) ? updatedIdeaObj : item
        );
      });

      // Remove from unassigned Adjudication Queue once Stage 5 passes
      syncedAdjudicationIdsRef.current.delete(String(ideaId));
      setSyncedAdjudicationIdeas((prev) =>
        prev.filter((item) => String(item.id) !== String(ideaId))
      );
      removeAdjudicationQueueItem(ideaId).catch(() => {});

      if (currentUser?.id) {
        saveIdeaAssignment({
          innovationId: ideaId,
          ideaTitle,
          evaluatorId: currentUser.id,
          evaluatorEmail: currentUser.email,
          evaluatorName: actorName,
          assignedAt: new Date().toISOString(),
          status: isFinalCompleted ? 'final_completed' : `stage_${nextStep}`,
          idea: updatedIdeaObj,
        }).catch(() => {});
      }

      fetch('/api/innovations/sync-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: proj?.id || ideaId,
          code: ideaCode,
          title: ideaTitle,
          stage: mappedStageId,
          status: 'approved',
          userId: currentUser?.id,
          actionNote: isFinalCompleted
            ? `Completed Stage ${completedStage.stepNumber}: ${completedStage.name}`
            : `Stage ${completedStage.stepNumber} (${completedStage.name}) cleared → Stage ${nextStage.stepNumber} (${nextStage.name}).`,
        }),
      }).catch(() => {});

      sendSubmitterStageUpdateEmail({
        innovationId: proj?.id || ideaId,
        code: ideaCode,
        title: ideaTitle,
        previousStage: `${completedStage.stepNumber}. ${completedStage.name}`,
        newStage: isFinalCompleted
          ? `${completedStage.stepNumber}. ${completedStage.name} (Completed)`
          : `${nextStage.stepNumber}. ${nextStage.name}`,
        outcome: 'passed',
        actorName,
        actorRole: 'Adjudicator',
        notes: isFinalCompleted
          ? `Your proposal "${ideaTitle}" has completed all stages through ${completedStage.stepNumber}. ${completedStage.name}.`
          : `Your proposal "${ideaTitle}" cleared Stage ${completedStage.stepNumber} (${completedStage.name}) and advanced to Stage ${nextStage.stepNumber} (${nextStage.name}).`,
        submitterName,
      });

      showToast(
        isFinalCompleted
          ? `🎉 "${ideaTitle}" completed all workflow stages through Stage ${completedStage.stepNumber}!`
          : `✅ Stage ${completedStage.stepNumber} (${completedStage.name}) cleared → Stage ${nextStage.stepNumber} (${nextStage.name}) active!`
      );

      publishNotification({
        innovationId: ideaId,
        type: 'Pilot approved',
        message: isFinalCompleted
          ? `Stage ${completedStage.stepNumber} (${completedStage.name}) completed for "${ideaTitle}".`
          : `Stage ${completedStage.stepNumber} (${completedStage.name}) cleared → Stage ${nextStage.stepNumber} (${nextStage.name}) for "${ideaTitle}".`,
        user: actorName,
        targetRole: nextStage?.assignedRole || 'Administrator',
      }).catch(console.warn);

      publishActivity({
        innovationId: ideaId,
        action: 'stage_advanced',
        user: actorName,
        role: 'Adjudicator',
      });
      return;
    }

    // Record Stage 3 (Evaluation) & Stage 4 (Expert Review) completion and promote to Stage 5 (Approval Board)
    recordStageTransitionLifecycle(
      {
        id: proj?.id || ideaId,
        code: ideaCode,
        title: ideaTitle,
        enterpriseName: assignedIdea?.enterpriseName || proj?.applicant?.organization,
        submitterName,
        cipaUin: assignedIdea?.cipaUin || proj?.cipaNumber,
        bursTin: assignedIdea?.bursTin || proj?.bursTin,
      },
      'approval_board',
      actorName,
      currentUser?.role || 'Evaluator',
      {
        status: 'passed',
        notes: `Evaluator ${actorName} completed the 4-Step Evaluation Gate (read proposal, clarification stream, supporting docs, and approval gate) and promoted "${ideaTitle}" to the Adjudication Board.`,
      }
    );

    // 1) Build promoted Adjudication Queue entry and broadcast across Evaluator -> Adjudicator -> Admin
    const promotedAdjItem: QueueIdeaItem & { stageId?: string; stage?: string } = {
      ...(assignedIdea || {
        id: ideaId,
        code: ideaCode,
        title: ideaTitle,
        category: proj?.sector || 'General',
        arrivalDate: proj?.submittedDate || 'Today',
        urgency: 'Standard' as const,
        capitalAsk: proj?.fundingRequested || 0,
        status: 'completed' as const,
        progress: 100,
        slaRemainingDays: 0,
        slaTargetDays: 14,
        enterpriseName: proj?.applicant?.organization,
        submitterName,
      }),
      id: ideaId,
      code: ideaCode,
      title: ideaTitle,
      progress: 100,
      status: 'completed',
      stageId: 'approval_board',
      stage: 'adjudication',
    };

    syncedAdjudicationIdsRef.current.add(String(ideaId));
    setSyncedAdjudicationIdeas((prev) => {
      const rest = prev.filter((item) => String(item.id) !== String(ideaId));
      return [promotedAdjItem, ...rest];
    });
    publishAdjudicationQueueItem(promotedAdjItem).catch(() => {});

    setProjects((prev) =>
      prev.map((p) => {
        if (
          p.id === ideaId ||
          (ideaTitle && normalizeIdeaKeyTitle(p.title) === normalizeIdeaKeyTitle(ideaTitle))
        ) {
          return {
            ...p,
            stageId: 'approval_board',
            lastUpdated: 'Just now',
          };
        }
        return p;
      })
    );

    // 2) Remove the promoted idea from the Evaluator's queue, sidebar, and active evaluation dock
    setAssignedIdeasMap((prev) => {
      const next = { ...prev };
      delete next[ideaId];
      return next;
    });

    setQueueIdeas((prev) =>
      prev.filter(
        (item) =>
          String(item.id) !== String(ideaId) &&
          (!ideaTitle || normalizeIdeaKeyTitle(item.title) !== normalizeIdeaKeyTitle(ideaTitle))
      )
    );

    setCanvasStations((prev) =>
      prev.map((st) => ({
        ...st,
        assignedIdeaIds: (st.assignedIdeaIds || []).filter((id) => String(id) !== String(ideaId)),
      }))
    );

    setIdeaCustomPositions((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k === ideaId || k.startsWith(`eval__${ideaId}`)) {
          delete next[k];
        }
      });
      return next;
    });

    if (currentUser?.id) {
      deleteIdeaAssignment(currentUser.id, ideaId).catch(() => {});
    }
    deleteIdeaAssignmentsByInnovationId(ideaId).catch(() => {});

    fetch('/api/innovations/sync-stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: proj?.id || ideaId,
        code: ideaCode,
        title: ideaTitle,
        stage: 'adjudication',
        status: 'in_review',
        userId: currentUser?.id,
        actionNote: `Approved by Evaluator (${actorName}) and moved to Adjudication Queue.`,
      }),
    }).catch(() => {});

    sendSubmitterStageUpdateEmail({
      innovationId: proj?.id || ideaId,
      code: ideaCode,
      title: ideaTitle,
      previousStage: 'Technical Evaluation',
      newStage: 'Board Adjudication',
      outcome: 'passed',
      actorName,
      actorRole: currentUser?.role || 'Evaluator',
      notes: `Your innovation proposal "${ideaTitle}" has passed Technical Evaluation and entered the National Adjudication Queue.`,
      submitterName,
    });

    showToast(`🚀 "${ideaTitle}" moved to Adjudication Queue & cleared from your Evaluation Queue!`);

    publishNotification({
      innovationId: ideaId,
      type: 'Evaluation completed',
      message: `Technical review concluded: Proposal "${ideaTitle}" was approved and moved to the Adjudication Queue.`,
      user: actorName,
      targetRole: 'Adjudicator',
    }).catch(console.warn);

    publishActivity({
      innovationId: ideaId,
      action: 'stage_advanced',
      user: actorName,
      role: currentUser?.role || 'Evaluator',
    });
  };

  // Convert intake dossier from left sidebar to Stage 1 card (for Non-Admins)
  const handleAdvanceDossierToStage1 = (dossier: IntakeDossier) => {
    const uniqueSuffix = `${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 89)}`;
    const newProject: ProjectCardData = {
      id: `CEDA-INV-${uniqueSuffix}`,
      stageTag: `[INT-${uniqueSuffix.slice(-4)}]`,
      stageId: 'intake',
      title: dossier.title,
      applicant: {
        name: dossier.author,
        nationalId: `BW-${Math.floor(100000000 + Math.random() * 900000000)}`,
        organization: dossier.organization,
        location: 'Gaborone / Regional Hub',
      },
      description: dossier.description,
      sector: 'AgriTech & Food',
      fundingRequested: dossier.capitalAsk,
      coFinancing: Math.round(dossier.capitalAsk * 0.25),
      equityStakePercent: 12,
      projectedJobs: Math.round(dossier.score / 4),
      projectedAnnualRevenue: Math.round(dossier.capitalAsk * 1.8),
      riskRating: 'LOW',
      stageProgress: 25,
      submittedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      lastUpdated: 'Just now',
      tags: [dossier.sectorTag, 'Docs Verified'],
      reviewers: [
        {
          id: 'rev-1',
          name: 'P. Dube',
          role: 'Regional Ingest Officer',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
        },
      ],
      milestones: [
        { id: 'm1', title: 'KYC verified & valid Omang', completed: true, requiredForNextStage: true },
        { id: 'm2', title: 'Technical Proposal Documentation', completed: true, requiredForNextStage: true },
      ],
      auditLog: [
        {
          timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: 'Transferred from Intake Dossiers to Active Stage 1',
          author: 'Ingest Gateway',
        },
      ],
    };

    resetIdeaLifecycleToIntake({
      id: newProject.id,
      code: newProject.stageTag,
      title: newProject.title,
      enterpriseName: newProject.applicant?.organization,
      submitterName: newProject.applicant?.name,
      omangId: newProject.applicant?.nationalId,
      capitalAsk: newProject.fundingRequested,
      sector: newProject.sector,
    });

    const stagedQueueIdea: QueueIdeaItem = {
      id: String(newProject.id),
      code: newProject.stageTag,
      title: newProject.title,
      category: newProject.sector || 'General',
      arrivalDate: 'Just now',
      rawTimestamp: Date.now(),
      urgency: 'Standard',
      capitalAsk: newProject.fundingRequested || 0,
      status: 'in_queue',
      progress: 0,
      slaRemainingDays: 14,
      slaTargetDays: 14,
      enterpriseName: newProject.applicant?.organization,
      submitterName: newProject.applicant?.name,
      omangId: newProject.applicant?.nationalId,
    };

    setProjects((prev) => [newProject, ...prev]);
    setQueueIdeas((prev) => mergeIncomingIdeasIntoQueue(prev, [stagedQueueIdea]));
    setIntakeDossiers((prev) => prev.filter((d) => d.id !== dossier.id));

    publishNewSubmission({
      ...newProject,
      enterpriseName: newProject.applicant?.organization,
      submitterName: newProject.applicant?.name,
      omangId: newProject.applicant?.nationalId,
    }).catch(() => {});
  };

  const handleAddNewProject = async (newProj: ProjectCardData) => {
    const normalizedProj: ProjectCardData = {
      ...newProj,
      stageId: 'intake',
      submitterId: currentUser?.id,
      submitterEmail: currentUser?.email,
    };
    setProjects((prev) => [normalizedProj, ...prev]);

    // Also immediately stage into Admin Intake Queue with Registered Company / Entity, UIN & BURS TIN
    const queueIdea: QueueIdeaItem = {
      id: String(normalizedProj.id),
      code: normalizedProj.stageTag || `CEDA-INV-${Date.now().toString().slice(-4)}`,
      title: normalizedProj.title,
      category: normalizedProj.sector || 'General',
      arrivalDate: 'Just now',
      rawTimestamp: Date.now(),
      urgency: 'Standard',
      capitalAsk: normalizedProj.fundingRequested || 0,
      status: 'in_queue',
      progress: 0,
      slaRemainingDays: 14,
      slaTargetDays: 14,
      enterpriseName: normalizedProj.applicant?.organization,
      submitterName: normalizedProj.applicant?.name,
      omangId: normalizedProj.applicant?.nationalId,
      cipaUin: normalizedProj.cipaNumber,
      bursTin: (normalizedProj as any).bursTin,
    };
    if (autoScreenOnIngest) {
      queueIdea.screening = evaluateIdeaStatutoryScreening(queueIdea);
    }
    const newTitleKey = normalizeIdeaKeyTitle(queueIdea.title);
    seenLiveSubmissionKeysRef.current.add(String(queueIdea.id));
    if (newTitleKey) seenLiveSubmissionKeysRef.current.add(newTitleKey);
    knownDbSubmissionKeysRef.current.add(String(queueIdea.id));
    if (newTitleKey) knownDbSubmissionKeysRef.current.add(newTitleKey);
    if (currentUserRoleRef.current === 'Administrator') {
      playNewSubmissionSound();
    }

    // Force fresh Stage 1 lifecycle record so new submissions always begin at Stage 1 ('intake')
    resetIdeaLifecycleToIntake({
      id: queueIdea.id,
      code: queueIdea.code,
      title: queueIdea.title,
      enterpriseName: queueIdea.enterpriseName,
      submitterName: queueIdea.submitterName,
      omangId: queueIdea.omangId,
      cipaUin: queueIdea.cipaUin,
      bursTin: queueIdea.bursTin,
      capitalAsk: queueIdea.capitalAsk,
      sector: queueIdea.category,
    });

    liveSubmissionsBufferRef.current = [
      queueIdea,
      ...liveSubmissionsBufferRef.current.filter(
        (b) => normalizeIdeaKeyTitle(b.title) !== normalizeIdeaKeyTitle(queueIdea.title)
      ),
    ];
    setQueueIdeas((prev) => mergeIncomingIdeasIntoQueue(prev, [queueIdea]));

    // Broadcast across all connected clients via Firestore & BroadcastChannel
    publishNewSubmission({
      ...normalizedProj,
      enterpriseName: normalizedProj.applicant?.organization,
      submitterName: normalizedProj.applicant?.name,
      omangId: normalizedProj.applicant?.nationalId,
      cipaUin: normalizedProj.cipaNumber,
      bursTin: (normalizedProj as any).bursTin,
    }).catch((err) =>
      console.warn('Firestore new submission broadcast notice:', err)
    );

    try {
      const postRes = await fetch('/api/innovations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newProj.title,
          description: newProj.description,
          fundingRequested: newProj.fundingRequested,
          projectedJobs: newProj.projectedJobs,
          priority: newProj.riskRating === 'HIGH' ? 'HIGH' : 'MEDIUM',
          submitterId: currentUser?.id || 4,
          categoryId: 1,
        }),
      });
      if (postRes.ok) {
        const createdRow = await postRes.json();
        if (createdRow?.innovationNumber) {
          // Ensure cross-browser DB ID/innovationNumber match shares same metadata
          upsertIdeaLifecycleRecord(
            {
              id: createdRow.innovationNumber,
              code: createdRow.innovationNumber,
              title: queueIdea.title,
              enterpriseName: queueIdea.enterpriseName,
              submitterName: queueIdea.submitterName,
              omangId: queueIdea.omangId,
              cipaUin: queueIdea.cipaUin,
              bursTin: queueIdea.bursTin,
              capitalAsk: queueIdea.capitalAsk,
              sector: queueIdea.category,
            },
            (prev) => prev
          );
        }
      }

      publishActivity({
        innovationId: newProj.id,
        action: 'new_idea_submitted',
        user: currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'Citizen Submitter',
        role: 'Submitter',
      });
      publishNotification({
        innovationId: newProj.id,
        type: 'New idea submitted',
        message: `New citizen proposal "${newProj.title}" submitted into Intake Queue`,
        user: currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'Citizen Submitter',
        targetRole: 'Administrator',
      });
      showToast(`Submitted "${newProj.title}" into CEDA Intake Queue!`);
    } catch (err) { }
  };

  // -------------------------------------------------------------
  // Administrator Operations: Batch Assignments & Queue Depletion
  // -------------------------------------------------------------
  const handleConfirmBatchAssignment = (
    queueId: string,
    personnelId: number,
    count: number,
    notes?: string
  ) => {
    const queue = submissionBatches.find((q) => q.id === queueId);
    const targetOfficial = personnel.find((p) => p.id === personnelId);

    if (!queue || !targetOfficial) return;

    const actualCount = Math.min(count, queue.unassignedCount);

    // 1. Decrement the unassigned queue count
    setSubmissionBatches((prev) =>
      prev.map((q) => {
        if (q.id === queueId) {
          return {
            ...q,
            unassignedCount: Math.max(0, q.unassignedCount - actualCount),
          };
        }
        return q;
      })
    );

    // 2. Increment the official's assigned workload
    setPersonnel((prev) =>
      prev.map((p) => {
        if (p.id === personnelId) {
          return {
            ...p,
            assignedIdeasCount: p.assignedIdeasCount + actualCount,
            status: p.assignedIdeasCount + actualCount > 10 ? 'busy' : 'active',
          };
        }
        return p;
      })
    );

    // 3. Toast confirmation
    const newQueueCount = Math.max(0, queue.unassignedCount - actualCount);
    showToast(
      `Assigned ${actualCount} ideas from ${queue.batchCode} to ${targetOfficial.name}. Queue reduced to ${newQueueCount} ideas.`
    );

    // 4. Log live activity & notification
    publishActivity({
      innovationId: queue.batchCode,
      action: 'idea_assigned',
      user: `${currentUser?.firstName || 'Admin'} ${currentUser?.lastName || 'Operations'}`,
      role: 'Administrator',
    });
    publishNotification({
      innovationId: queue.batchCode,
      type: 'Idea assigned',
      message: `${actualCount} ideas from ${queue.batchCode} assigned to ${targetOfficial.name}`,
      user: `${currentUser?.firstName || 'Admin'} ${currentUser?.lastName || 'Operations'}`,
      targetRole: 'Evaluator',
    });
  };

  // Quick assign button on canvas cards
  const handleQuickAssign = (queueId: string, count: number) => {
    const queue = submissionBatches.find((q) => q.id === queueId);
    if (!queue || queue.unassignedCount === 0) return;

    // Pick evaluator with lowest workload
    const evaluators = personnel.filter((p) => p.role === 'Evaluator');
    if (evaluators.length === 0) return;

    const sortedByLoad = [...evaluators].sort((a, b) => a.assignedIdeasCount - b.assignedIdeasCount);
    const chosenEvaluator = sortedByLoad[0];

    handleConfirmBatchAssignment(queueId, chosenEvaluator.id, count, 'Quick Batch Allocation');
  };

  // Subscribe to real-time Firebase Admin & SLA Alerts
  useEffect(() => {
    if (!currentUser) return;
    const unsubAlerts = subscribeToAdminAlerts((remoteAlerts) => {
      if (!remoteAlerts || remoteAlerts.length === 0) return;

      const userEmailLower = (currentUser.email || '').trim().toLowerCase();
      const userRole = currentUser.role;
      const isInitialSeed = !adminAlertsSeededRef.current;

      const newlyArrivedTargeted: AdminAlertNotification[] = [];
      remoteAlerts.forEach((a) => {
        if (!a.id) return;
        const alreadySeen = seenAdminAlertIdsRef.current.has(a.id);
        seenAdminAlertIdsRef.current.add(a.id);
        if (alreadySeen) return;

        const targetEmailLower = (a.targetUserEmail || '').trim().toLowerCase();
        const isForMe =
          userRole !== 'Submitter' &&
          (a.targetUserId === currentUser.id ||
            (userEmailLower && targetEmailLower && targetEmailLower === userEmailLower) ||
            (!a.targetUserId && !targetEmailLower && a.targetUserRole === userRole));

        const isRecent =
          !isInitialSeed ||
          (typeof a.createdAtMs === 'number' && Date.now() - a.createdAtMs < 15000);

        if (isForMe && isRecent) {
          newlyArrivedTargeted.push(a);
        }
      });
      adminAlertsSeededRef.current = true;

      if (newlyArrivedTargeted.length > 0 && (userRole === 'Evaluator' || userRole === 'Adjudicator')) {
        triggerEvaluatorAssignmentChime();
        const firstAlert = newlyArrivedTargeted[0];
        showToast(`⚠️ SLA / Priority Alert: ${firstAlert.title} — ${firstAlert.message}`);
      }

      setAdminAlerts((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const newOnes = remoteAlerts.filter((a) => a.id && !existingIds.has(a.id));
        if (newOnes.length === 0) return prev;
        return [...newOnes, ...prev].slice(0, 50);
      });
    });
    return () => unsubAlerts();
  }, [currentUser?.id, currentUser?.email, currentUser?.role]);

  // Administrator Operations: Register New Official in Firebase Auth + PostgreSQL & Send Verification Email
  const handleInviteUser = async (
    newUser: Omit<AdminPersonnel, 'id' | 'avatarInitials' | 'lastActive' | 'assignedIdeasCount'> & { password?: string }
  ): Promise<{ inviteUrl?: string; emailInfo?: string } | void> => {
    const normalizedEmail = newUser.email.trim().toLowerCase();
    const existing = personnel.find((p) => p.email.trim().toLowerCase() === normalizedEmail);
    if (existing) {
      alert(`A user account with email "${newUser.email}" already exists in the system.`);
      throw new Error(`A user account with email "${newUser.email}" already exists.`);
    }

    const initials = newUser.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'OF';

    const createdPersonnel: AdminPersonnel = {
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      department: newUser.department,
      status: newUser.status,
      id: Date.now(),
      avatarInitials: initials,
      lastActive: 'Invited',
      assignedIdeasCount: 0,
    };

    setPersonnel((prev) => [createdPersonnel, ...prev]);

    try {
      const tempPassword = newUser.password || `Ceda#${Math.floor(1000 + Math.random() * 8999)}`;
      // 1. Create real Firebase Authentication account & send Firebase email verification
      const fbResult = await createFirebaseAccountForInvitedUser({
        email: newUser.email,
        password: tempPassword,
        displayName: newUser.name,
        continueUrl: window.location.origin,
      });

      // 2. Sync user (with real firebaseUid) & invitation record into PostgreSQL
      const parts = newUser.name.trim().split(/\s+/);
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUser.email,
          firstName: parts[0] || 'Official',
          lastName: parts.slice(1).join(' ') || '',
          role: newUser.role,
          department: newUser.department,
          password: tempPassword,
          firebaseUid: fbResult.firebaseUid || undefined,
          invitedBy: currentUser?.id,
          invitedByName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'CEDA Administrator',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setPersonnel((prev) => prev.filter((p) => p.id !== createdPersonnel.id));
        alert(errData.error || `A user account with email "${newUser.email}" already exists.`);
        throw new Error(errData.error || 'Failed to create user account');
      }

      const data = await res.json();
      if (data.user?.id) {
        setPersonnel((prev) =>
          prev.map((p) => (p.id === createdPersonnel.id ? { ...p, id: data.user.id } : p))
        );
      }

      // 3. Save user profile to Firestore users collection
      await saveUserProfileToFirestore({
        id: data.user?.id,
        firebaseUid: fbResult.firebaseUid || data.user?.firebaseUid,
        email: newUser.email,
        firstName: parts[0] || 'Official',
        lastName: parts.slice(1).join(' ') || '',
        role: newUser.role,
        department: newUser.department,
        status: 'active',
      });

      // 4. Publish real-time Firebase notification for CEDA Workspace onboarding
      await publishNotification({
        innovationId: 'CEDA-WORKSPACE',
        type: 'Idea assigned',
        message: `${newUser.name} (${newUser.email}) was added to CEDA Workspace as ${newUser.role}.`,
        user: currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'CEDA Administrator',
        targetRole: newUser.role,
      });

      const emailSummary = fbResult.verificationEmailSent
        ? `Firebase Auth account created & verification email sent to ${newUser.email} showing they have been added to CEDA Workspace.`
        : fbResult.alreadyExists
          ? `User already exists in Firebase Auth. Account updated in PostgreSQL & invite link ready for ${newUser.email}.`
          : data.emailStatus?.sent
            ? `Account created & invitation email sent to ${newUser.email}.`
            : `Firebase/PostgreSQL account created for ${newUser.email}${fbResult.error ? ` (${fbResult.error})` : ''}. Share the activation link below.`;

      showToast(`Created Firebase + PostgreSQL account for ${newUser.name}!`);
      return {
        inviteUrl: data.inviteUrl,
        emailInfo: emailSummary,
      };
    } catch (err) {
      showToast(`Saved ${newUser.name} to personnel directory.`);
      return {};
    }
  };

  // Invite an existing user to collaborate on the user's active workspace
  const handleCollaborateInvite = async (
    targetEmail: string
  ): Promise<{ inviteUrl?: string; message?: string }> => {
    if (!activeWorkspaceId || !currentUser || currentUser.role === 'Submitter') {
      return { message: 'Collaboration is disabled for Submitters or no active workspace is selected.' };
    }
    const normalizedEmail = targetEmail.trim().toLowerCase();
    const inviterName = `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.email;

    // Push latest workspace state immediately so collaborator lands on the live canvas
    await handleSaveWorkspaceNow();

    const res = await fetch(`/api/workspaces/${encodeURIComponent(activeWorkspaceId)}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        invitedBy: currentUser.id,
        invitedByName: inviterName,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Failed to invite collaborator');
      return { message: data.error || 'Failed to invite collaborator' };
    }

    await Promise.all([
      publishWorkspaceInviteEvent({
        workspaceId: activeWorkspaceId,
        workspaceName: activeWorkspaceName,
        invitedEmail: normalizedEmail,
        invitedByName: inviterName,
      }),
      publishNotification({
        innovationId: activeWorkspaceId,
        type: 'Workspace invite',
        targetEmail: normalizedEmail,
        workspaceId: activeWorkspaceId,
        workspaceName: activeWorkspaceName,
        message: `${inviterName} invited you to collaborate live on "${activeWorkspaceName}".`,
        user: inviterName,
      }),
    ]);

    showToast(`Invited ${targetEmail} to collaborate on "${activeWorkspaceName}"!`);
    return {
      inviteUrl: data.inviteUrl,
      message: `${targetEmail} now has live access to "${activeWorkspaceName}" with real-time cursors.`,
    };
  };

  const handleSuspendUser = async (user: AdminPersonnel) => {
    const isCurrentlySuspended = user.status === 'away';
    const nextDbStatus = isCurrentlySuspended ? 'active' : 'suspended';
    const nextUiStatus: 'active' | 'away' = isCurrentlySuspended ? 'active' : 'away';

    setPersonnel((prev) =>
      prev.map((p) => (p.id === user.id ? { ...p, status: nextUiStatus } : p))
    );

    try {
      await fetch(`/api/admin/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextDbStatus }),
      });
      await saveUserProfileToFirestore({
        id: user.id,
        email: user.email,
        firstName: user.name.split(' ')[0] || user.name,
        lastName: user.name.split(' ').slice(1).join(' '),
        role: user.role,
        department: user.department,
        status: nextDbStatus,
      });
      showToast(
        nextDbStatus === 'suspended'
          ? `Suspended account for ${user.name}`
          : `Reactivated account for ${user.name}`
      );
    } catch {
      showToast(`Updated account status for ${user.name}`);
    }
  };

  const handleDeleteUser = async (user: AdminPersonnel) => {
    setPersonnel((prev) => prev.filter((p) => p.id !== user.id));
    setCanvasStations((prev) => prev.filter((s) => s.userId !== user.id));

    // Clear from localStorage cache immediately
    try {
      const raw = localStorage.getItem(CANVAS_STATE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.personnel)) {
          parsed.personnel = parsed.personnel.filter((p: any) => p.id !== user.id && p.email !== user.email);
          localStorage.setItem(CANVAS_STATE_STORAGE_KEY, JSON.stringify(parsed));
        }
      }
    } catch { }

    try {
      const removedByName = currentUser
        ? `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.email
        : 'CEDA Administrator';
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removedByName }),
      });
      const data = await res.json().catch(() => ({}));
      await deleteUserProfileFromFirestore(data.firebaseUid, user.email);
      showToast(`Deleted user account & notified ${user.email}: ${user.name}`);
    } catch {
      showToast(`Removed ${user.name} from directory`);
    }
  };

  // Administrator Operations: Manage Roles & Department
  const handleUpdateUserRole = async (userId: number, updated: Partial<AdminPersonnel>) => {
    setPersonnel((prev) =>
      prev.map((p) => {
        if (p.id === userId) {
          return {
            ...p,
            ...updated,
          };
        }
        return p;
      })
    );

    try {
      await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: updated.role,
          department: updated.department,
        }),
      });
      showToast('Updated official access control and department.');
    } catch (err) { }
  };

  // Administrator Operations: Workflow Architect
  const handleSaveWorkflowCycle = (updatedCycles: WorkflowCycle[], activeCycleId: string) => {
    setWorkflowCycles(updatedCycles);
    publishWorkflowCycles(updatedCycles).catch(() => {});
    const active = updatedCycles.find((c) => c.id === activeCycleId);
    showToast(`Activated Workflow Cycle: "${active?.title || 'Updated'}"!`);
  };

  // Administrator Operations: Application Form Builder
  const handleSaveFields = (updatedFields: ApplicationFormField[]) => {
    setApplicationFields(updatedFields);
    publishApplicationFields(updatedFields).catch(() => {});
    showToast(`Published updated Citizen Application Form with ${updatedFields.length} fields!`);
  };

  // Administrator Operations: Simulate Incoming Ingest Batch
  const handleSimulateNewBatch = () => {
    const randomCode = Math.floor(10 + Math.random() * 89);
    const sectors = ['Mining Automation', 'Eco-Tourism', 'CleanTech', 'Health & BioTech', 'AgriTech'];
    const sector = sectors[Math.floor(Math.random() * sectors.length)];
    const count = Math.floor(8 + Math.random() * 12);

    const newBatch: SubmissionBatchQueue = {
      id: `batch-${Date.now()}`,
      batchCode: `QUEUE-${sector.slice(0, 4).toUpperCase()}-0${randomCode}`,
      category: sector,
      unassignedCount: count,
      averageCapitalAsk: Math.floor(500000 + Math.random() * 1500000),
      arrivalDate: 'Just now',
      urgency: count > 14 ? 'Priority' : 'Standard',
    };

    setSubmissionBatches((prev) => [newBatch, ...prev]);
    showToast(`New incoming ingest stream arrived: ${newBatch.batchCode} with ${count} ideas!`);
  };

  // -------------------------------------------------------------
  // Wireframe Interactive Canvas Handlers (From User Sketch)
  // -------------------------------------------------------------
  const handleAddUserToCanvas = (user: AdminPersonnel, x: number, y: number) => {
    const existing = canvasStations.find((s) => s.userId === user.id);
    if (existing) {
      setCanvasStations((prev) =>
        prev.map((s) => (s.id === existing.id ? { ...s, x, y } : s))
      );
      showToast(`Repositioned ${user.name} on the canvas workspace.`);
      return;
    }

    // Include any already-assigned messages for this agent so they appear on canvas
    const existingAgentMsgIds =
      user.role === 'Agent'
        ? enquiryMessages
          .filter((m) => m.assignedAgentId === user.id && m.status === 'assigned')
          .map((m) => m.id)
        : [];

    const newStation: CanvasEvaluatorStation = {
      id: `station-${user.id}-${Date.now()}`,
      userId: user.id,
      user,
      x: Math.max(40, x),
      y: Math.max(60, y),
      stationType: user.role === 'Agent' ? 'agent' : 'evaluator',
      assignedIdeaIds: [],
      assignedMessageIds: existingAgentMsgIds,
      autoReplenishOnFinish: true,
      targetCapacity: user.role === 'Agent' ? maxChatsPerAgent : 3,
    };

    setCanvasStations((prev) => [...prev, newStation]);
    showToast(`Placed ${user.name} (${user.role}) onto the canvas workspace!`);
  };

  const handleMoveCanvasStation = (stationId: string, x: number, y: number) => {
    setCanvasStations((prev) =>
      prev.map((s) => (s.id === stationId ? { ...s, x, y } : s))
    );
  };

  const handleBatchMoveCanvasStations = (moves: { id: string; x: number; y: number }[]) => {
    setCanvasStations((prev) =>
      prev.map((s) => {
        const found = moves.find((m) => m.id === s.id);
        return found ? { ...s, x: found.x, y: found.y } : s;
      })
    );
  };

  const handleRemoveCanvasStation = (stationId: string) => {
    const station = canvasStations.find((s) => s.id === stationId);
    if (!station) return;

    const orphanedIds = Array.isArray(station.assignedIdeaIds) ? station.assignedIdeaIds : [];
    const orphanedMsgIds = Array.isArray(station.assignedMessageIds) ? station.assignedMessageIds : [];
    const isAgentStation = station.user.role === 'Agent';

    if (orphanedIds.length > 0 || orphanedMsgIds.length > 0) {
      pushUndoSnapshot();
    }

    if (orphanedIds.length > 0) {
      // Keep every assigned idea right on the canvas as an unassigned card so zero ideas are lost
      setIdeaCustomPositions((prev) => {
        const next = { ...prev };
        orphanedIds.forEach((ideaId, idx) => {
          if (!next[ideaId]) {
            next[ideaId] = {
              x: station.x + 320,
              y: station.y + idx * 130,
            };
          }
        });
        return next;
      });

      setAssignedIdeasMap((prev) => {
        const next = { ...prev };
        orphanedIds.forEach((ideaId) => {
          const existing = next[ideaId];
          if (existing) {
            next[ideaId] = {
              ...existing,
              evaluatorId: undefined,
              status: 'in_queue',
            };
            upsertIdeaLifecycleRecord(
              {
                id: existing.id,
                code: existing.code,
                title: existing.title,
                enterpriseName: existing.enterpriseName,
                submitterName: existing.submitterName,
                omangId: existing.omangId,
                cipaUin: existing.cipaUin,
                bursTin: existing.bursTin,
                capitalAsk: existing.capitalAsk,
                sector: existing.category,
              },
              (rec) => ({
                ...rec,
                isAssignedToEvaluator: false,
                assignedEvaluatorId: undefined,
                assignedEvaluatorName: undefined,
              })
            );
          }
          deleteIdeaAssignment(station.userId, ideaId).catch(() => { });
        });
        return next;
      });
    }

    // Always wipe any persisted idea assignments for this removed official so their queue is completely reset
    deleteAllAssignmentsForUser(station.userId, station.user.email).catch(() => { });

    // Also reset assigned citizen enquiries back to Admin's queue when an Agent is removed
    const matchingEnquiries = enquiryMessages.filter(
      (msg) =>
        msg.status !== 'resolved' &&
        (orphanedMsgIds.includes(msg.id) ||
          (isAgentStation && (msg.assignedAgentId === station.userId || (station.user.email && msg.assignedAgentEmail?.toLowerCase() === station.user.email.toLowerCase()))))
    );
    if (matchingEnquiries.length > 0) {
      const updatedMap = new Map<string, SubmitterEnquiryMessage>();
      matchingEnquiries.forEach((msg) => {
        const resetMsg: SubmitterEnquiryMessage = {
          ...msg,
          status: 'in_queue',
          assignedAgentId: undefined,
          assignedAgentName: undefined,
          assignedAgentEmail: undefined,
        };
        updatedMap.set(msg.id, resetMsg);
        publishCitizenEnquiry(resetMsg).catch(console.warn);
      });
      setEnquiryMessages((prev) => prev.map((m) => updatedMap.get(m.id) || m));
    }

    setPersonnel((prev) =>
      prev.map((p) =>
        p.id === station.userId
          ? { ...p, assignedIdeasCount: 0, assignedMessagesCount: 0 }
          : p
      )
    );

    setCanvasStations((prev) => prev.filter((s) => s.id !== stationId));
    const resetCount = orphanedIds.length + matchingEnquiries.length;
    showToast(
      resetCount > 0
        ? `Removed ${station.user.name}. Queue reset and ${resetCount} item(s) returned for reassignment.`
        : `Removed ${station.user.name} station from canvas and reset queue.`
    );
  };

  const handleAssignIdeasToStation = (stationId: string, ideaIds: string[]) => {
    const station = canvasStations.find((s) => s.id === stationId);
    if (!station || !ideaIds || ideaIds.length === 0) return;

    const isAssigningToAdjudicator = station.user.role === 'Adjudicator';

    // Filter from queueIdeas, evaluatorAssignedIdeas, adjudicationQueueIdeas, syncedAdjudicationIdeas, assignedIdeasMap, or projects
    const ideasToAssign: QueueIdeaItem[] = ideaIds
      .map((id) => {
        const inQueue = queueIdeas.find((i) => i.id === id);
        if (inQueue) return inQueue;

        const inEval = evaluatorAssignedIdeas.find((i) => i.id === id);
        if (inEval) return inEval;

        const inAdj =
          adjudicationQueueIdeas.find((i) => String(i.id) === String(id)) ||
          syncedAdjudicationIdeas.find((i) => String(i.id) === String(id));
        if (inAdj) return inAdj;

        if (assignedIdeasMap[id]) return assignedIdeasMap[id];

        const inProj = projects.find((p) => p.id === id);
        if (inProj) {
          return {
            id: inProj.id,
            code: inProj.stageTag || inProj.id,
            title: inProj.title,
            category: inProj.sector || 'AgriTech & Food',
            urgency: 'Priority' as const,
            progress: inProj.stageProgress ?? 20,
            slaRemainingDays: 3.5,
            slaTargetDays: 5.0,
            arrivalDate: inProj.submittedDate || 'Today',
            rawTimestamp: Date.now(),
            status: 'evaluating' as const,
            capitalAsk: inProj.fundingRequested,
            enterpriseName: inProj.applicant?.organization,
            submitterName: inProj.applicant?.name,
          };
        }
        return null;
      })
      .filter(Boolean) as QueueIdeaItem[];

    if (ideasToAssign.length === 0) return;

    // Enforce Stage 2 Statutory & Tax Screening Gate (CIPA & BURS) if enabled by Administrator
    // Proposals already promoted to Adjudication have already cleared Stage 2 & Technical Evaluation.
    let finalIdeasToAssign = ideasToAssign.map((idea) => {
      if (idea.screening?.status === 'verified') return idea;
      const lifecycle = getLifecycleRecordForIdea({
        id: idea.id,
        code: idea.code,
        title: idea.title,
      });
      return lifecycle?.screening ? { ...idea, screening: lifecycle.screening } : idea;
    });
    if (currentUser?.role === 'Administrator' && enforceStatutoryGate && !isAssigningToAdjudicator) {
      const verified = finalIdeasToAssign.filter((i) => i.screening?.status === 'verified');
      const unverified = finalIdeasToAssign.filter((i) => i.screening?.status !== 'verified');

      if (verified.length === 0) {
        const firstBlocked = unverified[0];
        showToast(
          `🔒 Stage 2 Gate Enforced: "${firstBlocked.code}" must pass CIPA & BURS Statutory Screening before assigning to an evaluator (or toggle Gate in Settings).`
        );
        if (unverified.length === 1) {
          setScreeningModalIdea(firstBlocked);
        }
        return;
      }

      if (unverified.length > 0) {
        finalIdeasToAssign = verified;
        showToast(
          `🔒 Assigned ${verified.length} verified idea(s). ${unverified.length} unscreened idea(s) kept in queue (Stage 2 CIPA & BURS Gate active).`
        );
      }
    }

    const assignedIdsSet = new Set(finalIdeasToAssign.map((i) => i.id));
    const assignedCodesSet = new Set(
      finalIdeasToAssign.map((i) => (i.code || '').replace(/[\[\]]/g, '').trim()).filter(Boolean)
    );
    const assignedTitlesSet = new Set(
      finalIdeasToAssign.map((i) => normalizeIdeaKeyTitle(i.title)).filter(Boolean)
    );

    // Record lifecycle event (Stage 3 Evaluator assignment vs Stage 5 Adjudicator assignment)
    finalIdeasToAssign.forEach((idea) => {
      if (isAssigningToAdjudicator) {
        recordIdeaAuditEvent(idea, {
          action: `Assigned to Adjudicator: ${station.user.name} for Stage 5 Board Adjudication`,
          author: currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'Administrator',
          authorRole: 'Administrator',
          tabName: 'Stage 5 Adjudication Assignment',
          eventType: 'stage_transition',
          notes: `Assigned proposal "${idea.title}" to Adjudicator ${station.user.name} for National Board quorum decision.`,
        });
      } else {
        recordEvaluatorAssignmentLifecycle(idea, station.user.name, station.userId);
      }
    });

    // Advance matching projects to Stage 3 (Evaluation) or Stage 5 (Approval Board) so Submitter view updates immediately
    setProjects((prev) =>
      prev.map((p) => {
        const pTitleKey = normalizeIdeaKeyTitle(p.title);
        const matchedIdea = finalIdeasToAssign.find(
          (i) =>
            String(i.id) === String(p.id) ||
            (pTitleKey && normalizeIdeaKeyTitle(i.title) === pTitleKey)
        );
        if (!matchedIdea) return p;
        return {
          ...p,
          stageId: isAssigningToAdjudicator
            ? (STAGE_ORDER.indexOf(p.stageId) < 4 ? 'approval_board' : p.stageId)
            : (STAGE_ORDER.indexOf(p.stageId) < 2 ? 'evaluation' : p.stageId),
          screening: matchedIdea.screening || p.screening,
          lastUpdated: 'Just now',
        };
      })
    );

    const adjStageDef = isAssigningToAdjudicator
      ? ([...(activeWorkflowCycle?.stages || [])]
          .sort((a, b) => a.stepNumber - b.stepNumber)
          .find((s) => s.stepNumber === 5 && s.assignedRole === 'Adjudicator') ||
          [...(activeWorkflowCycle?.stages || [])].find((s) => s.assignedRole === 'Adjudicator') ||
          [...(activeWorkflowCycle?.stages || [])].find((s) => s.stepNumber === 5))
      : undefined;

    setAssignedIdeasMap((prev) => {
      const updated = { ...prev };
      finalIdeasToAssign.forEach((idea) => {
        updated[idea.id] = {
          ...idea,
          evaluatorId: station.userId,
          status: isAssigningToAdjudicator ? 'completed' : 'evaluating',
          progress: isAssigningToAdjudicator ? 55 : Math.floor(10 + Math.random() * 25),
          ...(isAssigningToAdjudicator
            ? {
                stageId: 'approval_board',
                stage: 'adjudication',
                currentStepNumber: adjStageDef?.stepNumber ?? 5,
                currentWorkflowStageName: adjStageDef?.name ?? 'Adjudication Board Chamber',
                slaRemainingDays: adjStageDef?.targetTurnaroundDays ?? 4,
                slaTargetDays: adjStageDef?.targetTurnaroundDays ?? 4,
              }
            : {}),
        } as QueueIdeaItem;
      });
      return updated;
    });

    setCanvasStations((prev) =>
      prev.map((s) =>
        s.id === stationId
          ? {
            ...s,
            assignedIdeaIds: Array.from(new Set([...s.assignedIdeaIds, ...finalIdeasToAssign.map((i) => i.id)])),
            targetCapacity: Math.max(s.targetCapacity, s.assignedIdeaIds.length + finalIdeasToAssign.length),
          }
          : s
      )
    );

    setQueueIdeas((prev) =>
      prev.filter((i) => {
        const codeClean = (i.code || '').replace(/[\[\]]/g, '').trim();
        const titleClean = normalizeIdeaKeyTitle(i.title);
        return (
          !assignedIdsSet.has(i.id) &&
          !(codeClean && assignedCodesSet.has(codeClean)) &&
          !(titleClean && assignedTitlesSet.has(titleClean))
        );
      })
    );

    setPersonnel((prev) =>
      prev.map((p) =>
        p.id === station.userId
          ? { ...p, assignedIdeasCount: p.assignedIdeasCount + finalIdeasToAssign.length }
          : p
      )
    );

    // 1. Dispatch real-time notification to the assigned official
    publishNotification({
      innovationId: finalIdeasToAssign[0]?.id || 'ASSIGNMENT',
      type: 'Idea assigned',
      message: `${finalIdeasToAssign.length} proposal(s) assigned to ${station.user.name}: ${finalIdeasToAssign.map((i) => i.title).join(', ')}`,
      user: currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'Administrator',
      targetRole: station.user.role,
    }).catch(console.warn);

    // 2. Dispatch custom system assignment email to the assigned official
    if (station.user?.email) {
      fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: station.user.email,
          recipientName: station.user.name,
          subject: `CEDA Assignment: ${finalIdeasToAssign.length} Proposal(s) Assigned for ${isAssigningToAdjudicator ? 'Board Adjudication' : 'Evaluation'}`,
          title: isAssigningToAdjudicator ? 'New Proposals Assigned for Board Adjudication' : 'New Ideas Assigned for Your Evaluation',
          message: `You have been assigned ${finalIdeasToAssign.length} proposal(s) on the CEDA Innovation Canvas: ${finalIdeasToAssign.map((i) => `"${i.title}"`).join(', ')}. Please log in to complete ${isAssigningToAdjudicator ? 'board adjudication and decision sanctioning' : 'technical screening and scoring'}.`,
          badge: 'ACTION REQUIRED',
          actionUrl: window.location.origin,
          actionText: isAssigningToAdjudicator ? 'Open Adjudicator Canvas' : 'Open Evaluator Canvas',
          details: {
            'Official Assigned': station.user.name,
            'Total Assigned Ideas': `${finalIdeasToAssign.length} proposals`,
            'Assigned Ideas': finalIdeasToAssign.map((i) => `${i.code || i.id}: ${i.title}`).join(', '),
          },
        }),
      })
        .then((res) => {
          if (!res.ok && res.status === 404) {
            console.info('Backend notification route is pending server reload.');
          }
        })
        .catch((err) => console.warn('Assignment email notice:', err));
    }

    // 3. Persist assignment to Firestore for evaluator/adjudicator cross-device & cross-login hydration
    finalIdeasToAssign.forEach((idea) => {
      const enrichedIdea = isAssigningToAdjudicator
        ? ({
            ...idea,
            stageId: 'approval_board',
            stage: 'adjudication',
            currentStepNumber: adjStageDef?.stepNumber ?? 5,
            currentWorkflowStageName: adjStageDef?.name ?? 'Adjudication Board Chamber',
            slaRemainingDays: adjStageDef?.targetTurnaroundDays ?? 4,
            slaTargetDays: adjStageDef?.targetTurnaroundDays ?? 4,
            progress: 55,
          } as any)
        : idea;
      saveIdeaAssignment({
        innovationId: idea.id,
        ideaTitle: idea.title,
        evaluatorId: station.userId,
        evaluatorEmail: station.user.email,
        evaluatorName: station.user.name,
        assignedAt: new Date().toISOString(),
        status: isAssigningToAdjudicator ? 'adjudication' : 'evaluating',
        idea: enrichedIdea,
      }).catch(console.warn);
    });

    showToast(`Assigned ${finalIdeasToAssign.length} proposal(s) to ${station.user.name} (${station.user.role})!`);
  };

  const handleReassignIdeaBetweenStations = (
    ideaId: string,
    fromStationId: string,
    toStationId: string
  ) => {
    if (fromStationId === toStationId) return;
    const fromStation = canvasStations.find((s) => s.id === fromStationId);
    const toStation = canvasStations.find((s) => s.id === toStationId);
    if (!fromStation || !toStation) return;

    const isReassigningToAdjudicator = toStation.user.role === 'Adjudicator';
    const existingIdea = assignedIdeasMap[ideaId];
    const updatedIdea: QueueIdeaItem | undefined = existingIdea
      ? {
          ...existingIdea,
          evaluatorId: toStation.userId,
          status: 'evaluating',
          ...(isReassigningToAdjudicator
            ? {
                stageId: 'approval_board',
                currentStepNumber:
                  existingIdea.currentStepNumber && existingIdea.currentStepNumber >= 5
                    ? existingIdea.currentStepNumber
                    : 5,
                currentWorkflowStageName:
                  existingIdea.currentWorkflowStageName || 'Adjudication Board Chamber',
              }
            : {}),
        }
      : undefined;

    setCanvasStations((prev) =>
      prev.map((s) => {
        if (s.id === fromStationId) {
          return { ...s, assignedIdeaIds: s.assignedIdeaIds.filter((id) => id !== ideaId) };
        }
        if (s.id === toStationId) {
          const nextIds = s.assignedIdeaIds.includes(ideaId)
            ? s.assignedIdeaIds
            : [...s.assignedIdeaIds, ideaId];
          return {
            ...s,
            assignedIdeaIds: nextIds,
            targetCapacity: Math.max(s.targetCapacity, nextIds.length),
          };
        }
        return s;
      })
    );

    if (updatedIdea) {
      setAssignedIdeasMap((prev) => ({
        ...prev,
        [ideaId]: updatedIdea,
      }));
    }

    setPersonnel((prev) =>
      prev.map((p) => {
        if (p.id === fromStation.userId) {
          return { ...p, assignedIdeasCount: Math.max(0, p.assignedIdeasCount - 1) };
        }
        if (p.id === toStation.userId) {
          return { ...p, assignedIdeasCount: p.assignedIdeasCount + 1 };
        }
        return p;
      })
    );

    const ideaCode = existingIdea?.code || ideaId;
    deleteIdeaAssignment(fromStation.userId, ideaId).catch(console.warn);

    if (updatedIdea) {
      if (isReassigningToAdjudicator) {
        recordIdeaAuditEvent(updatedIdea, {
          action: `Reassigned to Adjudicator: ${toStation.user.name} for Stage 5 Board Adjudication`,
          author: currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'Administrator',
          authorRole: 'Administrator',
          tabName: 'Stage 5 Adjudication Reassignment',
          eventType: 'stage_transition',
          notes: `Reassigned proposal "${updatedIdea.title}" from ${fromStation.user.name} to Adjudicator ${toStation.user.name}.`,
        });
      } else {
        recordEvaluatorAssignmentLifecycle(updatedIdea, toStation.user.name, toStation.userId);
      }

      saveIdeaAssignment({
        innovationId: String(updatedIdea.id),
        ideaTitle: updatedIdea.title,
        evaluatorId: toStation.userId,
        evaluatorEmail: toStation.user.email || '',
        evaluatorName: toStation.user.name,
        assignedAt: new Date().toISOString(),
        status: 'assigned',
        idea: updatedIdea,
      }).catch(console.warn);

      publishNotification({
        innovationId: String(updatedIdea.id),
        type: 'Idea assigned',
        message: `Proposal reassigned to ${toStation.user.name}: ${updatedIdea.title}`,
        user: currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'Administrator',
        targetRole: toStation.user.role,
      }).catch(console.warn);
    }

    showToast(`Reassigned ${ideaCode} from ${fromStation.user.name} to ${toStation.user.name}`);
  };

  const handleResolveIdeaForStation = (stationId: string, ideaId: string) => {
    const station = canvasStations.find((s) => s.id === stationId);
    if (!station) return;

    deleteIdeaAssignment(station.userId, ideaId).catch(console.warn);

    const remainingIds = station.assignedIdeaIds.filter((id) => id !== ideaId);

    if (station.autoReplenishOnFinish && queueIdeas.length > 0) {
      const nextIdea = queueIdeas[0];
      const replenishedIdea: QueueIdeaItem = {
        ...nextIdea,
        evaluatorId: station.userId,
        status: 'evaluating',
        progress: 10,
      };

      setAssignedIdeasMap((prev) => ({
        ...prev,
        [replenishedIdea.id]: replenishedIdea,
      }));

      setQueueIdeas((prev) => prev.slice(1));

      setCanvasStations((prev) =>
        prev.map((s) =>
          s.id === stationId
            ? { ...s, assignedIdeaIds: [...remainingIds, replenishedIdea.id] }
            : s
        )
      );

      showToast(
        `🎉 Idea resolved! Auto-replenished: ${replenishedIdea.code} from Queue to ${station.user.name} (Maintaining ${station.assignedIdeaIds.length} ideas)!`
      );
    } else {
      setCanvasStations((prev) =>
        prev.map((s) =>
          s.id === stationId
            ? { ...s, assignedIdeaIds: remainingIds }
            : s
        )
      );

      setPersonnel((prev) =>
        prev.map((p) =>
          p.id === station.userId
            ? { ...p, assignedIdeasCount: Math.max(0, p.assignedIdeasCount - 1) }
            : p
        )
      );

      showToast(`Idea resolved! 1 capacity freed for ${station.user.name}.`);
    }
  };

  const handleToggleAutoReplenish = (stationId: string) => {
    setCanvasStations((prev) =>
      prev.map((s) => {
        if (s.id === stationId) {
          const nextVal = !s.autoReplenishOnFinish;
          showToast(
            `"1-Out 1-In" auto refill ${nextVal ? 'ENABLED' : 'DISABLED'} for ${s.user.name}.`
          );
          return { ...s, autoReplenishOnFinish: nextVal };
        }
        return s;
      })
    );
  };

  const handleAddPoolToCanvas = (tool: AdminCanvasTool, x: number, y: number) => {
    const newPool: CanvasPoolContainer = {
      id: `pool-${Date.now()}`,
      title: tool.name,
      type: tool.type,
      x: Math.max(40, x),
      y: Math.max(380, y),
      userIds: tool.type === 'evaluator_pool' ? [102, 103, 104] : [105, 106, 107],
      color: tool.color,
    };

    setCanvasPools((prev) => [...prev, newPool]);
    showToast(`Added ${tool.name} container to the canvas workspace.`);
  };

  const handleAddUserToPool = (poolId: string, userId: number) => {
    const official = personnel.find((p) => p.id === userId);
    setCanvasPools((prev) =>
      prev.map((pool) => {
        if (pool.id === poolId) {
          if (pool.userIds.includes(userId)) return pool;
          return { ...pool, userIds: [...pool.userIds, userId] };
        }
        return pool;
      })
    );
    showToast(`Added ${official?.name || 'User'} to pool!`);
  };

  const handleRemovePool = (poolId: string) => {
    setCanvasPools((prev) => prev.filter((p) => p.id !== poolId));
    showToast('Removed pool container from canvas.');
  };

  // -------------------------------------------------------------
  // Stage 2: Statutory & Tax Screening (CIPA `cipaget` + BURS)
  // -------------------------------------------------------------
  const enrichQueueIdeaWithProjectData = (idea: QueueIdeaItem): QueueIdeaItem => {
    const matchedProj = projects.find(
      (p) =>
        String(p.id) === String(idea.id) ||
        (p.title && idea.title && p.title.trim().toLowerCase() === idea.title.trim().toLowerCase()) ||
        (p.stageTag && idea.code && p.stageTag.replace(/[\[\]]/g, '') === idea.code.replace(/[\[\]]/g, ''))
    );
    const lifecycleRec = getLifecycleRecordForIdea(idea);

    const titleBasedFallback = `${idea.title} (Pty) Ltd`.toLowerCase();
    const rawEnt = (idea.enterpriseName || '').trim();
    const validIdeaEnterprise =
      rawEnt &&
        rawEnt.toLowerCase() !== titleBasedFallback &&
        rawEnt.toLowerCase() !== (idea.title || '').trim().toLowerCase()
        ? rawEnt
        : undefined;

    const projOrg = matchedProj?.applicant?.organization?.trim();
    const validProjEnterprise =
      projOrg &&
        projOrg !== 'Botswana Enterprise' &&
        projOrg !== 'Unregistered Venture' &&
        projOrg.toLowerCase() !== (matchedProj?.sector || '').toLowerCase()
        ? projOrg
        : undefined;

    const resolvedEnterprise =
      validIdeaEnterprise || validProjEnterprise || lifecycleRec?.enterpriseName;
    const resolvedSubmitter =
      idea.submitterName || matchedProj?.applicant?.name || lifecycleRec?.submitterName;
    const resolvedOmang =
      idea.omangId || matchedProj?.applicant?.nationalId || lifecycleRec?.omangId;
    const resolvedUin =
      idea.cipaUin || matchedProj?.cipaNumber || lifecycleRec?.cipaUin;
    const resolvedTin =
      idea.bursTin || (matchedProj as any)?.bursTin || lifecycleRec?.bursTin;

    // Preserve screening record from idea or shared lifecycle store; never wipe out verified status
    let cleanedScreening = idea.screening || lifecycleRec?.screening;
    if (
      cleanedScreening?.cipaMatch?.companyName &&
      cleanedScreening.cipaMatch.companyName.toLowerCase() === titleBasedFallback &&
      resolvedEnterprise
    ) {
      cleanedScreening = {
        ...cleanedScreening,
        cipaMatch: {
          ...cleanedScreening.cipaMatch,
          companyName: resolvedEnterprise,
        },
      };
    }

    return {
      ...idea,
      enterpriseName: resolvedEnterprise,
      submitterName: resolvedSubmitter,
      omangId: resolvedOmang,
      cipaUin: resolvedUin,
      bursTin: resolvedTin,
      screening: cleanedScreening,
    };
  };

  // Automatically reconcile assigned ideas, persist their Stage 2/3 lifecycle, and deduplicate the Admin Queue
  useEffect(() => {
    // 1. Ensure all ideas currently assigned to Evaluator Stations on the canvas have their verified Stage 2 & Stage 3 lifecycle persisted
    const assignedIdsInStations = new Set<string>();
    const assignedCodesInStations = new Set<string>();
    const assignedTitlesInStations = new Set<string>();

    canvasStations.forEach((station) => {
      if (station.stationType === 'agent') return;
      (station.assignedIdeaIds || []).forEach((ideaId) => {
        assignedIdsInStations.add(String(ideaId));
        const inMap = assignedIdeasMap[ideaId];
        const inQueue = queueIdeas.find((q) => String(q.id) === String(ideaId));
        const inProj = projects.find((p) => String(p.id) === String(ideaId));
        const sourceIdea = inMap || inQueue;

        const code = sourceIdea?.code || inProj?.stageTag || '';
        const title = sourceIdea?.title || inProj?.title || '';
        if (code) assignedCodesInStations.add(code.replace(/[\[\]]/g, '').trim());
        if (title) assignedTitlesInStations.add(normalizeIdeaKeyTitle(title));

        if (sourceIdea || inProj) {
          const baseItem: QueueIdeaItem = sourceIdea
            ? enrichQueueIdeaWithProjectData(sourceIdea)
            : {
              id: String(inProj!.id),
              code: inProj!.stageTag || String(inProj!.id),
              title: inProj!.title,
              category: inProj!.sector || 'General',
              arrivalDate: inProj!.submittedDate || 'Today',
              urgency: 'Standard',
              capitalAsk: inProj!.fundingRequested || 0,
              status: 'evaluating',
              progress: 20,
              slaRemainingDays: 14,
              slaTargetDays: 14,
              enterpriseName: inProj!.applicant?.organization,
              submitterName: inProj!.applicant?.name,
              omangId: inProj!.applicant?.nationalId,
              cipaUin: inProj!.cipaNumber,
              bursTin: inProj!.bursTin,
            };

          const existingLifecycle = getLifecycleRecordForIdea(baseItem);
          const needsLifecycleSync =
            !existingLifecycle ||
            existingLifecycle.screening?.status !== 'verified' ||
            STAGE_ORDER.indexOf(existingLifecycle.currentStageId) < 2;

          if (needsLifecycleSync) {
            const computed = evaluateIdeaStatutoryScreening({
              ...baseItem,
              enterpriseName: baseItem.enterpriseName || 'Ithindi (pty) Ltd',
            });
            const verifiedScreening: StatutoryScreeningRecord = {
              ...computed,
              status: 'verified',
              cipaVerified: true,
              bursVerified: true,
              omangKycVerified: true,
              verifiedBy: 'CEDA Administrator',
              verifiedAt: computed.verifiedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              notes: 'Passed Stage 2 CIPA & BURS Statutory Screening Gate and assigned for Stage 3 Technical Evaluation.',
            };
            recordEvaluatorAssignmentLifecycle(
              { ...baseItem, screening: verifiedScreening },
              station.user?.name || 'Assigned Evaluator',
              station.userId
            );
          }
        }
      });
    });

    if (queueIdeas.length === 0) return;

    // 2. Filter out any duplicate ideas in queueIdeas that are already assigned to an Evaluator station (or rejected), and enrich remaining items
    let changed = false;
    const filteredAndEnriched: QueueIdeaItem[] = [];

    for (const item of queueIdeas) {
      const enriched = enrichQueueIdeaWithProjectData(item);
      const codeClean = (enriched.code || '').replace(/[\[\]]/g, '').trim();
      const titleClean = normalizeIdeaKeyTitle(enriched.title);
      const lifecycle = getLifecycleRecordForIdea(enriched);

      const isAlreadyAssignedOnCanvas =
        currentUser?.role === 'Administrator' &&
        (assignedIdsInStations.has(String(enriched.id)) ||
          (codeClean && assignedCodesInStations.has(codeClean)) ||
          (titleClean && assignedTitlesInStations.has(titleClean)));

      const isRejected = lifecycle?.overallStatus === 'rejected';

      if (isAlreadyAssignedOnCanvas || isRejected) {
        changed = true;
        continue;
      }

      if (
        enriched.enterpriseName !== item.enterpriseName ||
        enriched.submitterName !== item.submitterName ||
        enriched.cipaUin !== item.cipaUin ||
        enriched.bursTin !== item.bursTin ||
        enriched.screening !== item.screening
      ) {
        changed = true;
      }
      filteredAndEnriched.push(enriched);
    }

    if (changed) {
      setQueueIdeas(filteredAndEnriched);
    }
  }, [projects, queueIdeas, canvasStations, assignedIdeasMap, currentUser?.role]);

  const computeLocalStatutoryScreening = (idea: QueueIdeaItem): StatutoryScreeningRecord => {
    const enriched = enrichQueueIdeaWithProjectData(idea);
    return evaluateIdeaStatutoryScreening(enriched);
  };

  const handleAutoScreenSingleIdea = async (idea: QueueIdeaItem): Promise<StatutoryScreeningRecord | null> => {
    const enriched = enrichQueueIdeaWithProjectData(idea);
    let screening: StatutoryScreeningRecord | null = null;
    try {
      const res = await fetch('/api/screening/verify-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: enriched }),
      });
      if (res.ok) {
        const data = await res.json();
        screening = data.screening;
      }
    } catch {
      // Fallback to local engine
    }
    if (!screening) {
      screening = computeLocalStatutoryScreening(enriched);
    }

    const updatedIdea: QueueIdeaItem = {
      ...enriched,
      enterpriseName:
        enriched.enterpriseName ||
        (screening?.cipaMatch?.companyName &&
          screening.cipaMatch.companyName !== 'No Registered Company / Entity Provided'
          ? screening.cipaMatch.companyName
          : enriched.enterpriseName),
      cipaUin:
        enriched.cipaUin ||
        (screening?.cipaMatch?.uin && screening.cipaMatch.uin !== 'NOT-PROVIDED'
          ? screening.cipaMatch.uin
          : enriched.cipaUin),
      bursTin:
        enriched.bursTin ||
        (screening?.bursMatch?.tin && screening.bursMatch.tin !== 'NOT-PROVIDED'
          ? screening.bursMatch.tin
          : enriched.bursTin),
      screening: screening!,
    };

    const actorName = currentUser
      ? `${currentUser.firstName} ${currentUser.lastName}`.trim()
      : 'CEDA Administrator';
    recordStatutoryScreeningLifecycle(updatedIdea, screening!, actorName);

    setQueueIdeas((prev) =>
      prev.map((item) => (item.id === idea.id ? updatedIdea : item))
    );

    if (screening.status === 'verified') {
      setProjects((prev) =>
        prev.map((p) =>
          String(p.id) === String(idea.id) ||
            normalizeIdeaKeyTitle(p.title) === normalizeIdeaKeyTitle(idea.title)
            ? {
              ...p,
              stageId: STAGE_ORDER.indexOf(p.stageId) < 2 ? 'evaluation' : p.stageId,
              screening: screening!,
              lastUpdated: 'Just now',
            }
            : p
        )
      );
    }

    publishNotification({
      innovationId: idea.code || idea.id,
      type: 'Screening update',
      message:
        screening.status === 'verified'
          ? `Stage 2 CIPA & BURS Screening PASSED for "${idea.title}". Promoted to Stage 3 (Technical Evaluation)!`
          : `Stage 2 CIPA & BURS Screening status updated to ${screening.status.toUpperCase()} for "${idea.title}".`,
      user: actorName,
      targetRole: 'Submitter',
      ideaTitle: idea.title,
      viewerName: actorName,
      viewerRole: currentUser?.role || 'Administrator',
      tabName: 'Stage 2 Statutory Screening',
      submitterName: idea.submitterName,
    }).catch(() => { });

    publishActivity({
      innovationId: idea.code || idea.id,
      action: 'screening_updated',
      user: actorName,
      role: currentUser?.role || 'Administrator',
      ideaTitle: idea.title,
    }).catch(() => { });

    showToast(`🛡️ Screened ${idea.code}: ${screening.status.toUpperCase()} via CIPA (cipaget) & BURS`);
    return screening;
  };

  const handleBatchScreenQueueIdeas = async (): Promise<{
    verifiedCount: number;
    partialCount: number;
    failedCount: number;
    totalCount: number;
  }> => {
    if (queueIdeas.length === 0) {
      return { verifiedCount: 0, partialCount: 0, failedCount: 0, totalCount: 0 };
    }
    setIsBatchScreening(true);
    try {
      const enrichedQueue = queueIdeas.map((i) => enrichQueueIdeaWithProjectData(i));
      let resultsMap: Record<string, StatutoryScreeningRecord> = {};
      try {
        const res = await fetch('/api/screening/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ideas: enrichedQueue }),
        });
        if (res.ok) {
          const data = await res.json();
          resultsMap = data.results || {};
        }
      } catch {
        // Fallback if backend unreachable
      }

      let verifiedCount = 0;
      let partialCount = 0;
      let failedCount = 0;
      const verifiedBatchItems: { idea: QueueIdeaItem; record: StatutoryScreeningRecord }[] = [];
      const actorName = currentUser
        ? `${currentUser.firstName} ${currentUser.lastName}`.trim()
        : 'CEDA Administrator';

      setQueueIdeas((prev) =>
        prev.map((idea) => {
          const enriched = enrichQueueIdeaWithProjectData(idea);
          const record = resultsMap[idea.id] || computeLocalStatutoryScreening(enriched);
          if (record.status === 'verified') verifiedCount++;
          else if (record.status === 'partial') partialCount++;
          else failedCount++;

          const nextIdea: QueueIdeaItem = {
            ...enriched,
            screening: record,
          };
          recordStatutoryScreeningLifecycle(nextIdea, record, actorName);
          verifiedBatchItems.push({ idea: nextIdea, record });

          publishNotification({
            innovationId: nextIdea.code || nextIdea.id,
            type: 'Screening update',
            message:
              record.status === 'verified'
                ? `Stage 2 CIPA & BURS Screening PASSED for "${nextIdea.title}". Moved to Stage 3 Evaluation!`
                : `Stage 2 Statutory Screening result (${record.status.toUpperCase()}) recorded for "${nextIdea.title}".`,
            user: actorName,
            targetRole: 'Submitter',
            ideaTitle: nextIdea.title,
            viewerName: actorName,
            viewerRole: currentUser?.role || 'Administrator',
            tabName: 'Batch Statutory Screening',
            submitterName: nextIdea.submitterName,
          }).catch(() => { });

          return nextIdea;
        })
      );

      if (verifiedBatchItems.length > 0) {
        setProjects((prev) =>
          prev.map((p) => {
            const match = verifiedBatchItems.find(
              ({ idea }) =>
                String(p.id) === String(idea.id) ||
                normalizeIdeaKeyTitle(p.title) === normalizeIdeaKeyTitle(idea.title)
            );
            if (!match) return p;
            return {
              ...p,
              stageId:
                match.record.status === 'verified' && STAGE_ORDER.indexOf(p.stageId) < 2
                  ? 'evaluation'
                  : p.stageId,
              screening: match.record,
              lastUpdated: 'Just now',
            };
          })
        );
      }

      showToast(
        `🛡️ CIPA & BURS Batch Screening Complete: ${verifiedCount} Verified, ${partialCount} Partial, ${failedCount} Failed.`
      );
      return { verifiedCount, partialCount, failedCount, totalCount: queueIdeas.length };
    } finally {
      setIsBatchScreening(false);
    }
  };

  const handleAiVerifyAllQueue = async (): Promise<string> => {
    if (queueIdeas.length === 0) {
      return 'Intake Queue is currently empty — no ideas require screening verification.';
    }
    const summary = await handleBatchScreenQueueIdeas();
    return `AI CIPA & BURS Screening verified ${summary.totalCount} queued idea(s): ${summary.verifiedCount} Verified, ${summary.partialCount} Partial, ${summary.failedCount} Failed.`;
  };

  const handleAiAutoAssignQueue = async (
    targetQueue: 'ideas' | 'adjudication' | 'both' = 'ideas',
    maxCount?: number
  ): Promise<string> => {
    const notes: string[] = [];

    if (targetQueue === 'ideas' || targetQueue === 'both') {
      const evaluatorStations = canvasStations.filter((s) => s.user.role === 'Evaluator');
      if (evaluatorStations.length === 0) {
        notes.push('No Evaluator stations are placed on the Admin canvas yet. Drag at least one Evaluator onto the canvas to receive ideas.');
      } else {
        const eligible = enforceStatutoryGate
          ? queueIdeas.filter((i) => i.screening?.status === 'verified')
          : [...queueIdeas];
        const capped = typeof maxCount === 'number' && maxCount > 0 ? eligible.slice(0, maxCount) : eligible;

        if (capped.length === 0) {
          notes.push(
            enforceStatutoryGate && queueIdeas.length > 0
              ? `0 of ${queueIdeas.length} queued ideas are Stage 2 verified yet. Run "AI Verify Queue Now" first or disable the Stage 2 Gate.`
              : 'Intake Queue has no eligible ideas to assign.'
          );
        } else {
          const buckets = new Map<string, string[]>();
          const loads = new Map<string, number>();
          evaluatorStations.forEach((st) => {
            buckets.set(st.id, []);
            loads.set(st.id, st.assignedIdeaIds.length);
          });

          capped.forEach((idea) => {
            const target = [...evaluatorStations].sort(
              (a, b) => (loads.get(a.id) || 0) - (loads.get(b.id) || 0)
            )[0];
            buckets.get(target.id)?.push(idea.id);
            loads.set(target.id, (loads.get(target.id) || 0) + 1);
          });

          let totalAssigned = 0;
          buckets.forEach((ids, stationId) => {
            if (ids.length > 0) {
              handleAssignIdeasToStation(stationId, ids);
              totalAssigned += ids.length;
            }
          });
          notes.push(
            `Load-balanced and assigned ${totalAssigned} Intake Queue idea(s) across ${evaluatorStations.length} Evaluator station(s).`
          );
        }
      }
    }

    if (targetQueue === 'adjudication' || targetQueue === 'both') {
      const adjudicatorStations = canvasStations.filter((s) => s.user.role === 'Adjudicator');
      if (adjudicatorStations.length === 0) {
        notes.push('No Adjudicator stations are placed on the Admin canvas yet.');
      } else {
        const adjList = typeof maxCount === 'number' && maxCount > 0 ? adjudicationQueueIdeas.slice(0, maxCount) : adjudicationQueueIdeas;
        if (adjList.length === 0) {
          notes.push('Adjudication Queue is currently empty.');
        } else {
          const buckets = new Map<string, string[]>();
          const loads = new Map<string, number>();
          adjudicatorStations.forEach((st) => {
            buckets.set(st.id, []);
            loads.set(st.id, st.assignedIdeaIds.length);
          });
          adjList.forEach((idea) => {
            const target = [...adjudicatorStations].sort(
              (a, b) => (loads.get(a.id) || 0) - (loads.get(b.id) || 0)
            )[0];
            buckets.get(target.id)?.push(idea.id);
            loads.set(target.id, (loads.get(target.id) || 0) + 1);
          });
          let adjAssigned = 0;
          buckets.forEach((ids, stationId) => {
            if (ids.length > 0) {
              handleAssignIdeasToStation(stationId, ids);
              adjAssigned += ids.length;
            }
          });
          notes.push(
            `Assigned ${adjAssigned} Adjudication Queue idea(s) across ${adjudicatorStations.length} Adjudicator station(s).`
          );
        }
      }
    }

    const summary = notes.join(' ');
    if (summary) showToast(`🤖 ${summary}`);
    return summary || 'Completed AI queue assignment check.';
  };

  const handleSaveStatutoryScreening = (ideaId: string, screening: StatutoryScreeningRecord) => {
    const actorName = currentUser
      ? `${currentUser.firstName} ${currentUser.lastName}`.trim()
      : 'CEDA Administrator';

    const targetIdea =
      queueIdeas.find((i) => i.id === ideaId) ||
      assignedIdeasMap[ideaId] ||
      screeningModalIdea;

    if (targetIdea) {
      const nextCompanyName =
        screening.cipaMatch?.companyName &&
          screening.cipaMatch.companyName !== 'No Registered Company / Entity Provided'
          ? screening.cipaMatch.companyName
          : targetIdea.enterpriseName;
      const nextUin =
        screening.cipaMatch?.uin && screening.cipaMatch.uin !== 'NOT-PROVIDED'
          ? screening.cipaMatch.uin
          : targetIdea.cipaUin;
      const nextTin =
        screening.bursMatch?.tin && screening.bursMatch.tin !== 'NOT-PROVIDED'
          ? screening.bursMatch.tin
          : targetIdea.bursTin;

      recordStatutoryScreeningLifecycle(
        {
          id: targetIdea.id,
          code: targetIdea.code,
          title: targetIdea.title,
          enterpriseName: nextCompanyName,
          submitterName: targetIdea.submitterName,
          omangId: targetIdea.omangId,
          cipaUin: nextUin,
          bursTin: nextTin,
          capitalAsk: targetIdea.capitalAsk,
          sector: targetIdea.category,
        },
        screening,
        actorName
      );
    }

    setQueueIdeas((prev) =>
      prev.map((item) => {
        if (item.id !== ideaId) return item;
        const nextCompanyName =
          screening.cipaMatch?.companyName &&
            screening.cipaMatch.companyName !== 'No Registered Company / Entity Provided'
            ? screening.cipaMatch.companyName
            : item.enterpriseName;
        const nextUin =
          screening.cipaMatch?.uin && screening.cipaMatch.uin !== 'NOT-PROVIDED'
            ? screening.cipaMatch.uin
            : item.cipaUin;
        const nextTin =
          screening.bursMatch?.tin && screening.bursMatch.tin !== 'NOT-PROVIDED'
            ? screening.bursMatch.tin
            : item.bursTin;
        return {
          ...item,
          enterpriseName: nextCompanyName,
          cipaUin: nextUin,
          bursTin: nextTin,
          screening,
        };
      })
    );

    if (targetIdea) {
      setProjects((prev) =>
        prev.map((p) => {
          if (
            String(p.id) === String(targetIdea.id) ||
            normalizeIdeaKeyTitle(p.title) === normalizeIdeaKeyTitle(targetIdea.title)
          ) {
            return {
              ...p,
              stageId:
                screening.status === 'verified' && STAGE_ORDER.indexOf(p.stageId) < 2
                  ? 'evaluation'
                  : p.stageId,
              screening,
              lastUpdated: 'Just now',
            };
          }
          return p;
        })
      );

      publishNotification({
        innovationId: targetIdea.code || targetIdea.id,
        type: 'Screening update',
        message:
          screening.status === 'verified'
            ? `Stage 2 CIPA & BURS Screening PASSED for "${targetIdea.title}". Moved to Stage 3 (Technical Evaluation)!`
            : `Stage 2 Statutory Screening updated to ${screening.status.toUpperCase()} for "${targetIdea.title}".`,
        user: actorName,
        targetRole: 'Submitter',
        ideaTitle: targetIdea.title,
        viewerName: actorName,
        viewerRole: currentUser?.role || 'Administrator',
        tabName: 'Stage 2 Screening Console',
        submitterName: targetIdea.submitterName,
      }).catch(() => { });

      publishActivity({
        innovationId: targetIdea.code || targetIdea.id,
        action: 'screening_updated',
        user: actorName,
        role: currentUser?.role || 'Administrator',
        ideaTitle: targetIdea.title,
      }).catch(() => { });

      sendSubmitterStageUpdateEmail({
        innovationId: targetIdea.id,
        code: targetIdea.code,
        title: targetIdea.title,
        previousStage: 'Statutory & Tax Screening (Stage 2)',
        newStage: screening.status === 'verified' ? 'Technical Evaluation (Stage 3)' : 'Statutory Screening Update',
        outcome: screening.status === 'verified' ? 'passed' : 'docs_requested',
        actorName,
        actorRole: currentUser?.role || 'Administrator',
        notes: screening.notes || 'Stage 2 CIPA & BURS Statutory Screening verification completed.',
        submitterName: targetIdea.submitterName,
        extraDetails: {
          'CIPA Registration': screening.cipaMatch?.companyName || 'Checked',
          'BURS Tax Clearance': screening.bursVerified ? 'Valid' : 'Pending',
        },
      });
    }

    showToast(
      screening.status === 'verified'
        ? `✅ Stage 2 Gate Passed! Proposal moved to Stage 3 on Submitter pipeline and unlocked for Evaluator assignment.`
        : `Updated Stage 2 Statutory Screening status (${screening.status.toUpperCase()}).`
    );
  };

  const handleRequestStatutoryDocsFromSubmitter = (
    idea: QueueIdeaItem,
    message: string,
    screening: StatutoryScreeningRecord
  ) => {
    const actorName = currentUser
      ? `${currentUser.firstName} ${currentUser.lastName}`.trim()
      : 'Administrator';
    recordStatutoryScreeningLifecycle(idea, screening, actorName);

    setQueueIdeas((prev) =>
      prev.map((item) => (item.id === idea.id ? { ...item, screening } : item))
    );
    publishNotification({
      innovationId: idea.code || idea.id,
      type: 'Screening update',
      message,
      user: actorName,
      targetRole: 'Submitter',
      ideaTitle: idea.title,
      viewerName: actorName,
      viewerRole: currentUser?.role || 'Administrator',
      tabName: 'Stage 2 Statutory Screening',
      submitterName: idea.submitterName,
    }).catch(() => { });
    showToast(`📩 Sent CIPA & BURS Statutory Document request to ${idea.submitterName || 'Submitter'}.`);
  };

  const handleRejectAtStatutoryScreening = (
    idea: QueueIdeaItem,
    reason: string,
    _screening: StatutoryScreeningRecord
  ) => {
    const actorName = currentUser
      ? `${currentUser.firstName} ${currentUser.lastName}`.trim()
      : 'Administrator';
    const rejectedScreening: StatutoryScreeningRecord = {
      ..._screening,
      status: 'rejected',
      notes: reason,
      verifiedBy: actorName,
      verifiedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    recordStatutoryScreeningLifecycle(idea, rejectedScreening, actorName);

    setQueueIdeas((prev) =>
      prev.filter(
        (item) =>
          item.id !== idea.id &&
          normalizeIdeaKeyTitle(item.title) !== normalizeIdeaKeyTitle(idea.title)
      )
    );
    setProjects((prev) =>
      prev.map((p) =>
        String(p.id) === String(idea.id) ||
          normalizeIdeaKeyTitle(p.title) === normalizeIdeaKeyTitle(idea.title)
          ? {
            ...p,
            stageId: 'screening',
            screening: rejectedScreening,
            tags: Array.from(new Set([...(p.tags || []), 'Rejected at Screening'])),
            lastUpdated: 'Just now',
          }
          : p
      )
    );

    sendSubmitterStageUpdateEmail({
      innovationId: idea.id,
      code: idea.code,
      title: idea.title,
      previousStage: 'Statutory & Tax Screening (Stage 2)',
      newStage: 'Statutory Screening (Not Approved)',
      outcome: 'rejected',
      actorName,
      actorRole: currentUser?.role || 'Administrator',
      notes: reason,
      submitterName: idea.submitterName,
    });
    publishNotification({
      innovationId: idea.code || idea.id,
      type: 'Screening update',
      message: `Stage 2 Statutory Screening Rejection (${idea.code}): ${reason}`,
      user: actorName,
      targetRole: 'Submitter',
      ideaTitle: idea.title,
      viewerName: actorName,
      viewerRole: currentUser?.role || 'Administrator',
      tabName: 'Stage 2 Statutory Screening',
      submitterName: idea.submitterName,
    }).catch(() => { });
    showToast(`⛔ Rejected "${idea.code}" at Stage 2 Statutory Screening Gate.`);
  };

  const handleIngestNewLiveIdea = () => {
    const randomNum = Math.floor(100 + Math.random() * 899);
    const profiles = [
      {
        title: 'Solar Powered Cold-Chain Logistics Hub',
        sector: 'CleanTech & Solar',
        enterpriseName: 'Kalahari Solar Cold-Chain (Pty) Ltd',
        submitterName: 'Lesego Modise',
        cipaUin: 'BW00001849201',
        bursTin: 'C0849201101',
        omangId: 'BW-710293481',
      },
      {
        title: 'Smart Borehole IoT Salinity Radar',
        sector: 'AgriTech & Food',
        enterpriseName: 'Ngamiland Smart Borehole Telemetry (Pty) Ltd',
        submitterName: 'Tshepo Kgosidintsi',
        cipaUin: 'BW00002491038',
        bursTin: 'C0249103802',
        omangId: 'BW-604918273',
      },
      {
        title: 'Automated Sorghum Thresher & Bagger',
        sector: 'AgriTech & Food',
        enterpriseName: 'Pandamatenga Agro-Machinery & Milling (Pty) Ltd',
        submitterName: 'Boitumelo Ndlovu',
        cipaUin: 'BW00003109482',
        bursTin: 'C0310948209',
        omangId: 'BW-819204711',
      },
      {
        title: 'Indigenous Botanical Extracts Lab',
        sector: 'Health & BioTech',
        enterpriseName: 'Okavango Phytomedicine & Botanicals (Pty) Ltd',
        submitterName: 'Onalenna Ditsele',
        cipaUin: 'BW00004921904',
        bursTin: 'C0492190405',
        omangId: 'BW-902184910',
      },
      {
        title: 'Biometric Livestock Health Sentry',
        sector: 'AgriTech & Food',
        enterpriseName: 'Tuli Block Biometric Livestock Systems (Pty) Ltd',
        submitterName: 'Phenyo Kgathi',
        cipaUin: 'BW00005582910',
        bursTin: 'C0558291003',
        omangId: 'BW-410293812',
      },
      {
        title: 'Micro-Hydro Kinetic Water Turbine',
        sector: 'CleanTech & Solar',
        enterpriseName: 'Chobe Kinetic Hydro & Clean Energy (Pty) Ltd',
        submitterName: 'Goitseone Mabena',
        cipaUin: 'BW00006712390',
        bursTin: 'C0671239008',
        omangId: 'BW-738192045',
      },
    ];
    const pick = profiles[Math.floor(Math.random() * profiles.length)];

    const baseIdea: QueueIdeaItem = {
      id: `q-idea-${Date.now()}`,
      code: `INV-${pick.sector.slice(0, 3).toUpperCase()}-${randomNum}`,
      title: pick.title,
      category: pick.sector,
      arrivalDate: 'Just now',
      urgency: Math.random() > 0.6 ? 'Fast-Track' : 'Priority',
      capitalAsk: Math.floor(400000 + Math.random() * 1200000),
      status: 'in_queue',
      progress: 0,
      slaRemainingDays: 7.0,
      slaTargetDays: 7,
      enterpriseName: pick.enterpriseName,
      submitterName: pick.submitterName,
      cipaUin: pick.cipaUin,
      bursTin: pick.bursTin,
      omangId: pick.omangId,
    };

    if (autoScreenOnIngest) {
      baseIdea.screening = computeLocalStatutoryScreening(baseIdea);
      setQueueIdeas((prev) => [baseIdea, ...prev]);
      handleAutoScreenSingleIdea(baseIdea);
    } else {
      setQueueIdeas((prev) => [baseIdea, ...prev]);
      showToast(`✨ New citizen idea ingested into queue: ${baseIdea.code} (${baseIdea.title})!`);
    }
  };

  const handleAddAnnotation = (annotation: CanvasAnnotationItem) => {
    setCanvasAnnotations((prev) => [...prev, annotation]);
    showToast(`🏷️ Added "${annotation.text}" ${annotation.type.replace('_', ' ')} to canvas`);
  };

  const handleUpdateAnnotation = (id: string, updates: Partial<CanvasAnnotationItem>) => {
    setCanvasAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const handleRemoveAnnotation = (id: string) => {
    setCanvasAnnotations((prev) => prev.filter((a) => a.id !== id));
    showToast('Removed annotation from canvas.');
  };

  const handleSelectModule = (moduleId: string) => {
    setActiveModuleId(moduleId);
    if (moduleId === 'pipeline_orchestrator') {
      setCurrentView('canvas');
    } else if (moduleId === 'board_approvals') {
      setCurrentView('board');
    } else if (moduleId === 'portfolio_analytics' || moduleId === 'impact_telemetry') {
      setCurrentView('analytics');
    } else if (moduleId === 'workflow_rules') {
      if (currentUser?.role === 'Administrator') {
        setIsWorkflowArchitectOpen(true);
      } else {
        showToast('Workflow Rules configuration is restricted to Administrators.');
      }
    } else {
      setCurrentView('canvas');
    }
  };

  const isAdmin = currentUser?.role === 'Administrator';
  const isEvaluator = currentUser?.role === 'Evaluator';
  const isAdjudicator = currentUser?.role === 'Adjudicator';
  const canUseCustomizableCanvas =
    currentUser?.role === 'Administrator' ||
    currentUser?.role === 'Evaluator' ||
    currentUser?.role === 'Adjudicator';

  const evaluatorAssignedIdeas = useMemo(() => {
    const promotedSet = isAdjudicator
      ? new Set<string>()
      : new Set(syncedAdjudicationIdeas.map((i) => String(i.id)));
    const isActiveForReviewer = (i: QueueIdeaItem) => {
      if (isAdjudicator) {
        return (i.status as string) !== 'archived_complete';
      }
      return i.status !== 'completed' && !promotedSet.has(String(i.id));
    };

    const list = Object.values(assignedIdeasMap).filter(isActiveForReviewer);
    if (list.length > 0) return list;
    const userStation = canvasStations.find((s) => s.userId === currentUser?.id);
    if (userStation && userStation.assignedIdeaIds.length > 0) {
      return queueIdeas.filter(
        (q) => userStation.assignedIdeaIds.includes(q.id) && isActiveForReviewer(q)
      );
    }
    return [];
  }, [isAdjudicator, assignedIdeasMap, canvasStations, currentUser?.id, queueIdeas, syncedAdjudicationIdeas]);

  const adjudicationQueueIdeas = useMemo(() => {
    const adjudicatorAssignedIds = new Set(
      canvasStations
        .filter((s) => s.user.role === 'Adjudicator')
        .flatMap((s) => s.assignedIdeaIds || [])
        .map(String)
    );

    const fromAssigned = Object.values(assignedIdeasMap).filter(
      (idea) =>
        idea.status === 'completed' ||
        (idea as any).stage === 'adjudication' ||
        (idea as any).stageId === 'approval_board'
    );
    const fromProjects: QueueIdeaItem[] = projects
      .filter((p) => p.stageId === 'approval_board' || (p as any).status === 'completed')
      .map((p) => ({
        id: p.id,
        code: `INV-${p.id.slice(-3).toUpperCase()}`,
        title: p.title,
        category: p.sector,
        arrivalDate: p.submittedDate,
        urgency: p.riskRating === 'HIGH' ? 'Fast-Track' : p.riskRating === 'MEDIUM' ? 'Priority' : 'Standard',
        capitalAsk: p.fundingRequested,
        progress: p.stageProgress,
        status: 'completed',
        slaRemainingDays: 0,
        slaTargetDays: 14,
        enterpriseName: p.applicant.organization,
        submitterName: p.applicant.name,
      }));

    const map = new Map<string, QueueIdeaItem>();
    fromProjects.forEach((item) => map.set(String(item.id), item));
    fromAssigned.forEach((item) => map.set(String(item.id), item));
    syncedAdjudicationIdeas.forEach((item) => map.set(String(item.id), item));

    return Array.from(map.values()).filter(
      (item) =>
        !adjudicatorAssignedIds.has(String(item.id)) &&
        item.status !== 'adjudicated' &&
        (item.status as string) !== 'archived_complete' &&
        !item.finalWorkflowCompleted &&
        item.stageId !== 'pilot_phase' &&
        item.stageId !== 'implementation' &&
        item.stageId !== 'realized_impact'
    );
  }, [assignedIdeasMap, projects, syncedAdjudicationIdeas, canvasStations]);

  // Automatic SLA Violation Alert Monitor for Evaluators, Adjudicators & Admin Dispatch
  useEffect(() => {
    if (!currentUser) return;
    if (!isEvaluator && !isAdjudicator && !isAdmin) return;

    if (isEvaluator || isAdjudicator) {
      const breachedIdeas = evaluatorAssignedIdeas.filter(
        (idea) =>
          typeof idea.slaRemainingDays === 'number' &&
          idea.slaRemainingDays <= slaWarningDays &&
          idea.status !== 'adjudicated' &&
          (idea.status as string) !== 'archived_complete'
      );

      breachedIdeas.forEach((idea) => {
        const isCritical = (idea.slaRemainingDays ?? 999) <= slaCriticalDays;
        const severity: 'warning' | 'critical' = isCritical ? 'critical' : 'warning';
        const dedupeKey = `self:${currentUser.id}:${idea.id}:${severity}`;
        if (emittedSlaAlertKeysRef.current.has(dedupeKey)) return;

        const alreadyRecorded = adminAlerts.some(
          (a) =>
            a.type === 'sla_warning' &&
            (a.targetUserId === currentUser.id ||
              (a.targetUserEmail && a.targetUserEmail.toLowerCase() === (currentUser.email || '').toLowerCase())) &&
            a.relatedIdeaCode === idea.code &&
            (isCritical ? a.title.toLowerCase().includes('critical') : true)
        );
        emittedSlaAlertKeysRef.current.add(dedupeKey);
        if (alreadyRecorded) return;

        const alertId = `sla-auto-${currentUser.id}-${idea.id}-${severity}-${Date.now()}`;
        const title = isCritical ? 'Critical SLA Violation' : 'SLA Threshold Warning';
        const message = `"${idea.title}" (${idea.code}) has ${Math.max(0, idea.slaRemainingDays ?? 0)}d remaining (SLA threshold: <= ${isCritical ? slaCriticalDays : slaWarningDays}d).`;
        const officialName = `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.role;

        const newAlert: AdminAlertNotification = {
          id: alertId,
          targetUserId: currentUser.id,
          targetUserEmail: currentUser.email,
          targetUserName: officialName,
          targetUserRole: currentUser.role,
          targetRole: currentUser.role,
          type: 'sla_warning',
          alertType: 'sla_warning',
          title,
          message,
          relatedIdeaCode: idea.code,
          timestamp: 'Just now',
          createdAt: 'Just now',
          read: false,
        };

        setAdminAlerts((prev) => [newAlert, ...prev.slice(0, 49)]);
        publishAdminAlert({
          id: alertId,
          targetUserId: currentUser.id,
          targetUserEmail: currentUser.email,
          targetUserName: officialName,
          targetUserRole: currentUser.role,
          type: 'sla_warning',
          title,
          message,
          relatedIdeaCode: idea.code,
        }).catch(() => {});

        publishNotification({
          innovationId: idea.code || String(idea.id),
          type: 'SLA Violation',
          message: `${title}: ${message}`,
          user: 'CEDA SLA Monitor',
          targetRole: currentUser.role,
          targetEmail: currentUser.email,
          ideaTitle: idea.title,
        }).catch(() => {});

        triggerEvaluatorAssignmentChime();
        showToast(`⚠️ ${title}: "${idea.title}" (${Math.max(0, idea.slaRemainingDays ?? 0)}d left)`);
      });
      return;
    }

    if (isAdmin) {
      canvasStations.forEach((station) => {
        if (station.user.role !== 'Evaluator' && station.user.role !== 'Adjudicator') return;
        (station.assignedIdeaIds || []).forEach((ideaId) => {
          const idea = assignedIdeasMap[ideaId];
          if (
            !idea ||
            typeof idea.slaRemainingDays !== 'number' ||
            idea.slaRemainingDays > slaWarningDays ||
            idea.status === 'adjudicated' ||
            (idea.status as string) === 'archived_complete'
          ) {
            return;
          }
          const isCritical = idea.slaRemainingDays <= slaCriticalDays;
          const severity: 'warning' | 'critical' = isCritical ? 'critical' : 'warning';
          const dedupeKey = `admin-sla:${station.user.id}:${idea.id}:${severity}`;
          if (emittedSlaAlertKeysRef.current.has(dedupeKey)) return;
          emittedSlaAlertKeysRef.current.add(dedupeKey);

          const alertId = `sla-dispatch-${station.user.id}-${idea.id}-${severity}-${Date.now()}`;
          const title = isCritical ? 'Critical SLA Violation' : 'SLA Threshold Warning';
          const message = `Assigned idea "${idea.title}" (${idea.code}) has ${Math.max(0, idea.slaRemainingDays)}d remaining on your desk.`;

          publishAdminAlert({
            id: alertId,
            targetUserId: station.user.id,
            targetUserEmail: station.user.email,
            targetUserName: station.user.name,
            targetUserRole: station.user.role,
            type: 'sla_warning',
            title,
            message,
            relatedIdeaCode: idea.code,
          }).catch(() => {});

          publishNotification({
            innovationId: idea.code || String(idea.id),
            type: 'SLA Violation',
            message: `${title}: ${message}`,
            user: 'CEDA SLA Monitor',
            targetRole: station.user.role,
            targetEmail: station.user.email,
            ideaTitle: idea.title,
          }).catch(() => {});
        });
      });
    }
  }, [
    currentUser?.id,
    currentUser?.email,
    currentUser?.role,
    isAdmin,
    isEvaluator,
    isAdjudicator,
    evaluatorAssignedIdeas,
    canvasStations,
    assignedIdeasMap,
    slaWarningDays,
    slaCriticalDays,
  ]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-300 tracking-wide">
            Loading CEDA Workspace...
          </span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen />;
  }

  const activeWorkspaceName =
    workspacesList.find((w) => w.id === activeWorkspaceId)?.name || 'My Workspace';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f8fafc] text-[#0f172a] font-sans antialiased">
      {/* Real-time Feedback Toast Pill */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#006194] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 border border-sky-400/30">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white ml-2 p-0.5 rounded hover:bg-white/10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Live Workspace Collaboration Invite Prompt */}
      {pendingWorkspaceInviteBanner && currentUser.role !== 'Submitter' && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-50 bg-[#0c1a2e] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-semibold border border-sky-400/40 animate-in fade-in slide-in-from-top-2 duration-200">
          <span>
            🤝 <strong>{pendingWorkspaceInviteBanner.invitedByName}</strong> invited you to collaborate live on{' '}
            <strong>"{pendingWorkspaceInviteBanner.workspaceName}"</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              const targetId = pendingWorkspaceInviteBanner.workspaceId;
              localStorage.setItem(`ceda_active_workspace_${currentUser.id}`, targetId);
              setActiveWorkspaceId(targetId);
              setPendingWorkspaceInviteBanner(null);
              showToast(`Joined shared workspace "${pendingWorkspaceInviteBanner.workspaceName}"`);
            }}
            className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-colors"
          >
            Join Canvas →
          </button>
          <button
            type="button"
            onClick={() => setPendingWorkspaceInviteBanner(null)}
            className="text-slate-300 hover:text-white p-0.5 rounded hover:bg-white/10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Navigation Bar with RBAC Indicator */}
      <TopBar
        onToggleModulesMenu={() => setIsModulesMenuOpen(!isModulesMenuOpen)}
        isModulesMenuOpen={isModulesMenuOpen}
        zoom={zoom}
        onSetZoom={setZoom}
        collaborators={collaborators}
        onOpenAnalytics={() => setCurrentView('analytics')}
        onOpenLiveActivity={() => {
          setIsLiveActivityOpen(true);
          handleMarkNotificationsRead();
        }}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        onOpenSubmitterPanel={() => setCurrentView('submitter')}
        unreadNotificationsCount={unreadNotificationsCount}
        workspaceCollaborators={activeWorkspaceCursors}
        isWorkspaceOwner={workspacesList.find((w) => w.id === activeWorkspaceId)?.isOwner ?? true}
        activeWorkspaceOwnerId={workspacesList.find((w) => w.id === activeWorkspaceId)?.ownerId}
        activeWorkspaceName={activeWorkspaceName}
        onOpenShareWorkspace={() => setIsShareWorkspaceOpen(true)}
        onRemoveCollaborator={handleRemoveWorkspaceCollaborator}
        onReturnToOwnWorkspace={handleReturnToOwnWorkspace}
        onCancelCollaboration={() => handleCancelWorkspaceCollaboration()}
      />

      {/* CEDA Modules Drawer Popover (Anchored under 9-dot launcher) */}
      <CedaModulesMenu
        isOpen={isModulesMenuOpen}
        onClose={() => setIsModulesMenuOpen(false)}
        activeModuleId={activeModuleId}
        onSelectModule={handleSelectModule}
      />

      {/* Main Body Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {currentUser?.role === 'Agent' ? (
          /* Agent Portal View: Live citizen chats, enquiry queue, and handled history */
          <AgentPortalView
            messages={enquiryMessages}
            personnel={personnel}
            onSendMessage={handleSendMessageFromAgent}
            onResolveMessage={handleResolveMessage}
            onUpdateAgentStatus={handleUpdateAgentStatus}
            queueCount={enquiryMessages.filter((m) => m.status === 'in_queue' || (m.status as string) === 'queued').length}
          />
        ) : (
          <>
            {currentView === 'canvas' && (
              <>
                {/* Left Sidebar: Role-Aware */}
                {isAdmin ? (
                  /* Admin Left Sidebar: Personnel & Official Directory */
                  <AdminPersonnelSidebar
                    personnel={personnelWithLiveLoad}
                    isOpen={isSidebarOpen}
                    onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                    onOpenInviteModal={() => setIsInviteUserOpen(true)}
                    onAssignBatchToUser={(user) => {
                      setBatchAssignPersonnelId(user.id);
                      setIsBatchAssignOpen(true);
                    }}
                    onManageUserRole={(user) => setManagingUser(user)}
                    onInviteToWorkspace={(user) => handleCollaborateInvite(user.email)}
                    onSuspendUser={handleSuspendUser}
                    onDeleteUser={handleDeleteUser}
                    onRefreshDirectory={refreshFromBackend}
                    presenceMap={presenceMap}
                  />
                ) : (isEvaluator || isAdjudicator) ? (
                  /* Evaluator / Adjudicator Left Sidebar: Assigned Proposals Dossier */
                  <EvaluatorAssignedSidebar
                    assignedIdeas={evaluatorAssignedIdeas}
                    isOpen={isSidebarOpen}
                    onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                    onOpenInviteModal={() => setIsInviteUserOpen(true)}
                    role={currentUser?.role}
                    onReviewIdea={(idea) => {
                      const proj = projects.find((p) => p.id === idea.id || p.id.includes(idea.id));
                      if (proj) {
                        if (isAdjudicator) {
                          setAdjudicatingProject(proj);
                        } else {
                          setEvaluatingProject(proj);
                        }
                        return;
                      }
                      const syntheticProj: ProjectCardData = {
                        id: idea.id,
                        title: idea.title,
                        stageTag: idea.code || `[INT-${idea.id.slice(-3)}]`,
                        stageId: isAdjudicator ? 'approval_board' : 'evaluation',
                        applicant: {
                          name: idea.submitterName || 'Citizen Promoter',
                          nationalId: idea.omangId || 'BW-902184910',
                          organization: idea.enterpriseName || 'Enterprise Profile',
                          location: 'Gaborone / Regional Hub',
                        },
                        description: idea.title,
                        sector: 'AgriTech & Food',
                        fundingRequested: idea.capitalAsk || 750000,
                        coFinancing: Math.round((idea.capitalAsk || 750000) * 0.15),
                        projectedJobs: 8,
                        projectedAnnualRevenue: Math.round((idea.capitalAsk || 750000) * 1.5),
                        riskRating: 'LOW',
                        stageProgress: idea.progress ?? 50,
                        submittedDate: idea.arrivalDate || 'Today',
                        lastUpdated: 'Just now',
                        cipaNumber: idea.cipaUin,
                        bursTin: idea.bursTin,
                        screening: idea.screening,
                        reviewers: [],
                        milestones: [],
                        tags: [idea.category || 'General'],
                        auditLog: [],
                      };
                      if (isAdjudicator) {
                        setAdjudicatingProject(syntheticProj);
                      } else {
                        setEvaluatingProject(syntheticProj);
                      }
                    }}
                  />
                ) : (
                  /* Non-Admin Left Sidebar: Innovation Intake Dossiers */
                  <InnovationIntakeSidebar
                    dossiers={currentUser?.role === 'Submitter' ? [] : intakeDossiers}
                    isOpen={isSidebarOpen}
                    onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                    onAdvanceToStage1={handleAdvanceDossierToStage1}
                    onOpenUploadModal={() => setIsNewProjectModalOpen(true)}
                  />
                )}

                {/* Center Canvas: Role-Aware */}
                {canUseCustomizableCanvas ? (
                  /* Customizable Empty/Active Canvas for Evaluators, Adjudicators & Administrators */
                  <AdminCanvasBoard
                    queues={submissionBatches}
                    personnel={personnel}
                    workflowCycle={activeWorkflowCycle}
                    applicationFields={applicationFields}
                    queueIdeas={isEvaluator ? evaluatorAssignedIdeas : isAdjudicator ? [] : queueIdeas}
                    canvasStations={canvasStations}
                    canvasPools={canvasPools}
                    assignedIdeasMap={assignedIdeasMap}
                    adjudicationIdeas={isAdjudicator ? evaluatorAssignedIdeas : adjudicationQueueIdeas}
                    density={density}
                    onDensityChange={setDensity}
                    zoom={zoom}
                    panX={panX}
                    panY={panY}
                    onPanChange={(x, y) => {
                      setPanX(x);
                      setPanY(y);
                    }}
                    onZoomChange={setZoom}
                    onOpenBatchAssignModal={(queueId, personnelId) => {
                      setBatchAssignQueueId(queueId);
                      setBatchAssignPersonnelId(personnelId);
                      setIsBatchAssignOpen(true);
                    }}
                    onOpenWorkflowArchitect={() => setIsWorkflowArchitectOpen(true)}
                    onOpenFormBuilder={() => setIsFormBuilderOpen(true)}
                    onOpenInviteUser={() => setIsInviteUserOpen(true)}
                    onOpenSettings={() => setIsSettingsModalOpen(true)}
                    onOpenAlertModal={(user, idea) => {
                      setAlertTargetUser(user || null);
                      setAlertTargetIdea(idea || null);
                      setIsAlertModalOpen(true);
                    }}
                    enquiryMessages={enquiryMessages}
                    autoDispatchEnabled={autoDispatchEnabled}
                    maxChatsPerAgent={maxChatsPerAgent}
                    onToggleAutoDispatch={() => setAutoDispatchEnabled((prev) => !prev)}
                    onAssignMessageToAgent={handleAssignMessageToAgent}
                    onAssignMessagesToStation={handleAssignMessagesToAgentStation}
                    onResolveMessage={handleResolveMessage}
                    onSimulateNewMessage={handleSimulateNewMessage}
                    canvasAnnotations={canvasAnnotations}
                    onAddAnnotation={handleAddAnnotation}
                    onUpdateAnnotation={handleUpdateAnnotation}
                    onRemoveAnnotation={handleRemoveAnnotation}
                    onResetCanvasToDefault={handleResetCanvasToDefault}
                    slaWarningDays={slaWarningDays}
                    slaCriticalDays={slaCriticalDays}
                    onAddUserToCanvas={handleAddUserToCanvas}
                    onMoveCanvasStation={handleMoveCanvasStation}
                    onBatchMoveCanvasStations={handleBatchMoveCanvasStations}
                    onRemoveCanvasStation={handleRemoveCanvasStation}
                    onAssignIdeasToStation={handleAssignIdeasToStation}
                    onResolveIdeaForStation={handleResolveIdeaForStation}
                    onToggleAutoReplenish={handleToggleAutoReplenish}
                    onAddPoolToCanvas={handleAddPoolToCanvas}
                    onAddUserToPool={handleAddUserToPool}
                    onRemovePool={handleRemovePool}
                    onIngestNewLiveIdea={handleIngestNewLiveIdea}
                    enforceStatutoryGate={enforceStatutoryGate}
                    onToggleEnforceStatutoryGate={() => setEnforceStatutoryGate((prev) => !prev)}
                    autoScreenOnIngest={autoScreenOnIngest}
                    onToggleAutoScreenOnIngest={() => setAutoScreenOnIngest((prev) => !prev)}
                    onBatchScreenQueueIdeas={handleBatchScreenQueueIdeas}
                    isBatchScreening={isBatchScreening}
                    onOpenStatutoryScreening={(idea) => {
                      setScreeningModalIdea(idea);
                      if (currentUser && currentUser.role !== 'Submitter') {
                        const actorName = `${currentUser.firstName} ${currentUser.lastName}`.trim() || 'Administrator';
                        recordIdeaAuditEvent(
                          {
                            id: idea.id,
                            code: idea.code,
                            title: idea.title,
                            enterpriseName: idea.enterpriseName,
                            submitterName: idea.submitterName,
                            capitalAsk: idea.capitalAsk,
                            sector: idea.category,
                          },
                          {
                            action: 'Opened Stage 2 Statutory & Tax Screening Console (CIPA & BURS)',
                            author: `${actorName} (${currentUser.role})`,
                            authorRole: currentUser.role,
                            tabName: 'Stage 2 Screening Console',
                            eventType: 'view',
                            notes: `${actorName} opened Statutory & Tax Screening inspection for "${idea.title}".`,
                          }
                        );
                        publishNotification({
                          innovationId: idea.code || idea.id,
                          type: 'Idea viewed',
                          message: `${actorName} (${currentUser.role}) opened Stage 2 CIPA & BURS Screening Console for "${idea.title}"`,
                          user: actorName,
                          targetRole: 'Submitter',
                          ideaTitle: idea.title,
                          viewerName: actorName,
                          viewerRole: currentUser.role,
                          tabName: 'Stage 2 Screening Console',
                          submitterName: idea.submitterName,
                        }).catch(() => { });
                      }
                    }}
                    ideaCustomPositions={ideaCustomPositions}
                    onIdeaCustomPositionsChange={setIdeaCustomPositions}
                    poolCustomPositions={poolCustomPositions}
                    onPoolCustomPositionsChange={setPoolCustomPositions}
                    messageCustomPositions={messageCustomPositions}
                    onMessageCustomPositionsChange={setMessageCustomPositions}
                    cardCustomDimensions={cardCustomDimensions}
                    onCardCustomDimensionsChange={setCardCustomDimensions}
                    queueDimensions={queueDimensions}
                    onQueueDimensionsChange={setQueueDimensions}
                    isQueueCollapsed={isQueueCollapsed}
                    onIsQueueCollapsedChange={setIsQueueCollapsed}
                    queueTab={queueTab}
                    onQueueTabChange={setQueueTab}
                    onReassignIdeaBetweenStations={handleReassignIdeaBetweenStations}
                    onOpenShareWorkspace={() => setIsShareWorkspaceOpen(true)}
                    activeWorkspaceName={activeWorkspaceName}
                    isWorkspaceOwner={workspacesList.find((w) => w.id === activeWorkspaceId)?.isOwner ?? true}
                    activeWorkspaceOwnerId={workspacesList.find((w) => w.id === activeWorkspaceId)?.ownerId}
                    canvasTheme={canvasTheme}
                    onCanvasThemeChange={setCanvasTheme}
                    showGrid={showGrid}
                    onToggleGrid={() => setShowGrid((prev) => !prev)}
                    showConnectors={showConnectors}
                    onToggleConnectors={() => setShowConnectors((prev) => !prev)}
                    onSaveWorkspaceNow={handleSaveWorkspaceNow}
                    onUndoCanvas={handleUndoCanvas}
                    onRedoCanvas={handleRedoCanvas}
                    canUndo={historyCounts.undo > 0}
                    canRedo={historyCounts.redo > 0}
                    onDeleteSelectedCanvasItems={handleDeleteSelectedCanvasItems}
                    presenceMap={presenceMap}
                    workspaceCollaborators={activeWorkspaceCursors}
                    onPublishCursorPosition={handlePublishCursorPosition}
                    onRemoveCollaborator={handleRemoveWorkspaceCollaborator}
                    onReturnToOwnWorkspace={handleReturnToOwnWorkspace}
                    onCancelCollaboration={() => handleCancelWorkspaceCollaboration()}
                    onOpenFaqFeedbackAdmin={(tab) => {
                      setAdminPanelInitialTab(tab);
                      setIsAdminPanelOpen(true);
                    }}
                    onOpenAiAssistant={() => setIsAiDrawerOpen((prev) => !prev)}
                    isAiAssistantOpen={isAiDrawerOpen}
                    onOpenAdjudicateModal={(idea) => {
                      const matched = projects.find(
                        (p) => String(p.id) === String(idea.id) || p.title === idea.title
                      );
                      if (matched) {
                        setAdjudicatingProject(matched);
                        return;
                      }
                      setAdjudicatingProject({
                        id: idea.id,
                        innovationNumber: idea.code || idea.id,
                        stageTag: idea.code,
                        title: idea.title,
                        description: idea.title,
                        sector: idea.category || 'AgriTech & Food',
                        fundingRequested: idea.capitalAsk || 750000,
                        applicant: {
                          name: idea.submitterName || 'Citizen Promoter',
                          organization: idea.enterpriseName || 'Enterprise Profile',
                        },
                      });
                    }}
                    onAdvanceIdeaStage={handleAdvanceIdeaStage}
                    onOpenDossier={(ideaId) => {
                      const proj = projects.find((p) => p.id === ideaId);
                      if (proj) {
                        const lifecycle = getLifecycleRecordForIdea({
                          id: proj.id,
                          code: proj.stageTag,
                          title: proj.title,
                        });
                        setSelectedProject({
                          ...proj,
                          auditLog: lifecycle?.auditLog?.length
                            ? lifecycle.auditLog.map((e) => ({
                              timestamp: e.timestamp,
                              action: e.action,
                              author: e.author,
                              notes: e.notes,
                            }))
                            : proj.auditLog,
                        });
                      } else {
                        const idea =
                          assignedIdeasMap[ideaId] ||
                          queueIdeas.find((i) => i.id === ideaId) ||
                          syncedAdjudicationIdeas.find((i) => String(i.id) === String(ideaId));
                        if (idea) {
                          const lifecycle = getLifecycleRecordForIdea({
                            id: idea.id,
                            code: idea.code,
                            title: idea.title,
                          });
                          const validSector: Sector = (
                            [
                              'AgriTech & Food',
                              'CleanTech & Solar',
                              'Health & BioTech',
                              'Mining & Automation',
                              'Digital FinTech',
                              'Eco-Tourism',
                              'Advanced Manufacturing',
                              'Logistics & Supply',
                            ].includes(idea.category)
                              ? idea.category
                              : 'AgriTech & Food'
                          ) as Sector;

                          const syntheticProject: ProjectCardData = {
                            id: idea.id,
                            title: idea.title,
                            stageTag: `[INT-${idea.id.slice(-3)}]`,
                            stageId: lifecycle?.currentStageId || 'screening',
                            applicant: {
                              name: idea.submitterName || 'Citizen Promoter',
                              nationalId: idea.omangId || 'BW-902184910',
                              organization: idea.enterpriseName || 'Enterprise Profile',
                              location: 'Gaborone / Regional Hub',
                            },
                            description: idea.title,
                            sector: validSector,
                            fundingRequested: idea.capitalAsk || 750000,
                            coFinancing: Math.round((idea.capitalAsk || 750000) * 0.15),
                            projectedJobs: 8,
                            projectedAnnualRevenue: Math.round((idea.capitalAsk || 750000) * 1.5),
                            riskRating: 'LOW',
                            stageProgress: idea.progress ?? 20,
                            submittedDate: idea.arrivalDate || 'Today',
                            lastUpdated: 'Just now',
                            cipaNumber: lifecycle?.cipaUin || idea.cipaUin,
                            bursTin: lifecycle?.bursTin || idea.bursTin,
                            screening: lifecycle?.screening || idea.screening,
                            reviewers: [],
                            milestones: [],
                            tags: ['Evaluation Active', 'Canvas Dossier'],
                            auditLog: lifecycle?.auditLog?.length
                              ? lifecycle.auditLog.map((e) => ({
                                timestamp: e.timestamp,
                                action: e.action,
                                author: e.author,
                                notes: e.notes,
                              }))
                              : [
                                {
                                  timestamp: 'Today',
                                  action: 'Assigned for technical diligence',
                                  author: 'CEDA Platform',
                                },
                              ],
                            complianceRows: [
                              { label: 'CIPA Company Registration Verified', value: lifecycle?.cipaUin || idea.cipaUin || 'BW0000492190', isChecked: true },
                              { label: 'National Tax Clearance PIN', value: lifecycle?.bursTin || idea.bursTin || 'BURS-2026-OK', isChecked: true },
                              { label: 'Technical Prototype Verified', value: 'Stage 3 Lab Trial', isChecked: true },
                            ],
                            compositeScore: 88,
                          };
                          setSelectedProject(syntheticProject);
                        }
                      }
                    }}
                    onOpenClarificationChat={(idea) => {
                      const proj = projects.find((p) => p.id === idea.id);
                      if (proj) {
                        setEvaluatingProject(proj);
                      } else {
                        const validSector: Sector = (
                          [
                            'AgriTech & Food',
                            'CleanTech & Solar',
                            'Health & BioTech',
                            'Mining & Automation',
                            'Digital FinTech',
                            'Eco-Tourism',
                            'Advanced Manufacturing',
                            'Logistics & Supply',
                          ].includes(idea.category)
                            ? idea.category
                            : 'AgriTech & Food'
                        ) as Sector;

                        const syntheticProject: ProjectCardData = {
                          id: idea.id,
                          title: idea.title,
                          stageTag: `[INT-${idea.id.slice(-3)}]`,
                          stageId: 'screening',
                          applicant: {
                            name: idea.submitterName || 'Citizen Promoter',
                            nationalId: 'BW-902184910',
                            organization: idea.enterpriseName || 'Enterprise Profile',
                            location: 'Gaborone / Regional Hub',
                          },
                          description: idea.title,
                          sector: validSector,
                          fundingRequested: idea.capitalAsk || 750000,
                          coFinancing: Math.round((idea.capitalAsk || 750000) * 0.15),
                          projectedJobs: 8,
                          projectedAnnualRevenue: Math.round((idea.capitalAsk || 750000) * 1.5),
                          riskRating: 'LOW',
                          stageProgress: idea.progress ?? 20,
                          submittedDate: idea.arrivalDate || 'Today',
                          lastUpdated: 'Just now',
                          reviewers: [],
                          milestones: [],
                          tags: ['Clarification Open'],
                          auditLog: [],
                        };
                        setEvaluatingProject(syntheticProject);
                      }
                    }}
                  />
                ) : (
                  /* Submitter / Reviewer Canvas: Detailed Project Cards */
                  <CanvasBoard
                    projects={submitterScopedProjects}
                    connectors={currentUser?.role === 'Submitter' ? [] : connectors}
                    density={density}
                    onDensityChange={setDensity}
                    zoom={zoom}
                    panX={panX}
                    panY={panY}
                    onPanChange={(x, y) => {
                      setPanX(x);
                      setPanY(y);
                    }}
                    onZoomChange={setZoom}
                    onSelectProject={setSelectedProject}
                    onAdvanceProject={handleAdvanceProject}
                    onMoveProjectStage={handleMoveProjectStage}
                    onOpenEvaluateModal={(p) => setEvaluatingProject(p)}
                    onOpenAdjudicateModal={(p) => setAdjudicatingProject(p)}
                    canvasTheme={canvasTheme}
                    onCanvasThemeChange={setCanvasTheme}
                    showGrid={showGrid}
                    onToggleGrid={() => setShowGrid((prev) => !prev)}
                    workflowCycle={activeWorkflowCycle}
                    faqCount={faqItems.length}
                    onOpenFaqModal={(tab) => {
                      setSubmitterFaqInitialTab(tab);
                      setIsSubmitterFaqOpen(true);
                    }}
                  />
                )}
              </>
            )}

            {currentView === 'submitter' && (
              <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
                <div className="p-3.5 border-b border-slate-200 bg-white flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Citizen Submitter View</span>
                  <button
                    onClick={() => setCurrentView('canvas')}
                    className="font-semibold text-[#006194] hover:underline"
                  >
                    Switch to Canvas Workspace →
                  </button>
                </div>
                <SubmitterPanel
                  onOpenSubmitModal={() => setIsNewProjectModalOpen(true)}
                  onRefreshData={refreshFromBackend}
                  presenceMap={presenceMap}
                  workflowCycle={activeWorkflowCycle}
                  faqCount={faqItems.length}
                  onOpenFaqModal={(tab) => {
                    setSubmitterFaqInitialTab(tab);
                    setIsSubmitterFaqOpen(true);
                  }}
                />
              </div>
            )}

            {currentView === 'board' && (
              <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
                <div className="p-3.5 border-b border-slate-200 bg-white flex items-center justify-between text-xs">
                  <button
                    onClick={() => setCurrentView('canvas')}
                    className="font-semibold text-[#006194] hover:underline"
                  >
                    ← Back to Canvas Workspace
                  </button>
                </div>
                <BoardAdjudicationView
                  projects={projects}
                  onSelectProject={setSelectedProject}
                  onApproveProject={handleAdvanceProject}
                  onDisburseTranche={handleAdvanceProject}
                />
              </div>
            )}

            {currentView === 'analytics' && (
              <div className="flex-1 overflow-y-auto bg-[#f8fafc]">
                <div className="p-3.5 border-b border-slate-200 bg-white flex items-center justify-between text-xs">
                  <button
                    onClick={() => setCurrentView('canvas')}
                    className="font-semibold text-[#006194] hover:underline"
                  >
                    ← Back to Canvas Workspace
                  </button>
                </div>
                <AnalyticsView
                  projects={projects}
                  assignedIdeas={evaluatorAssignedIdeas}
                  activeWorkspaceName={workspacesList.find((w) => w.id === activeWorkspaceId)?.name || 'My Workspace'}
                  queueIdeas={queueIdeas}
                  allAssignedIdeas={Object.values(assignedIdeasMap)}
                  adjudicationIdeas={adjudicationQueueIdeas}
                  workflowCycle={activeWorkflowCycle}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Administrator Modals                                          */}
      {/* ------------------------------------------------------------- */}

      {/* Batch Ideas Assignment Modal */}
      <BatchAssignModal
        isOpen={isBatchAssignOpen}
        onClose={() => {
          setIsBatchAssignOpen(false);
          setBatchAssignQueueId(undefined);
          setBatchAssignPersonnelId(undefined);
        }}
        queues={submissionBatches}
        personnel={personnel}
        selectedQueueId={batchAssignQueueId}
        selectedPersonnelId={batchAssignPersonnelId}
        onConfirmAssignment={handleConfirmBatchAssignment}
      />

      {/* Workflow Architect Modal */}
      <WorkflowArchitectModal
        isOpen={isWorkflowArchitectOpen}
        onClose={() => setIsWorkflowArchitectOpen(false)}
        workflowCycles={workflowCycles}
        onSaveWorkflowCycle={handleSaveWorkflowCycle}
      />

      {/* Application Form Builder Modal */}
      <FormBuilderModal
        isOpen={isFormBuilderOpen}
        onClose={() => setIsFormBuilderOpen(false)}
        fields={applicationFields}
        onSaveFields={handleSaveFields}
      />

      {/* Register / Invite Official & Collaborate Modal (Disabled for Submitter) */}
      <InviteUserModal
        isOpen={isInviteUserOpen && currentUser.role !== 'Submitter'}
        onClose={() => setIsInviteUserOpen(false)}
        onInviteUser={handleInviteUser}
        existingPersonnel={personnel}
        activeWorkspaceName={activeWorkspaceName}
        onCollaborateInvite={handleCollaborateInvite}
      />

      {/* Collaborative Workspaces & Sharing Modal (Disabled for Submitter) */}
      <WorkspaceShareModal
        isOpen={isShareWorkspaceOpen && currentUser.role !== 'Submitter'}
        onClose={() => setIsShareWorkspaceOpen(false)}
        activeWorkspaceId={activeWorkspaceId}
        workspacesList={workspacesList}
        onSwitchWorkspace={(workspaceId) => {
          if (currentUser) {
            localStorage.setItem(`ceda_active_workspace_${currentUser.id}`, workspaceId);
          }
          setActiveWorkspaceId(workspaceId);
          setIsShareWorkspaceOpen(false);
          const target = workspacesList.find((w) => w.id === workspaceId);
          showToast(`Switched to workspace: ${target?.name || workspaceId}`);
        }}
        onCreateCustomWorkspace={() => {
          setWorkspaceSetupMode('create');
          setIsWorkspaceSetupOpen(true);
        }}
        onLoadSampleData={handleResetCanvasToDefault}
        currentUserName={`${currentUser.firstName} ${currentUser.lastName}`.trim()}
        currentUserId={currentUser.id}
        currentUserEmail={currentUser.email}
        personnel={personnel}
        liveCollaborators={activeWorkspaceCursors}
        onRemoveCollaborator={handleRemoveWorkspaceCollaborator}
        onReturnToOwnWorkspace={handleReturnToOwnWorkspace}
        onCancelCollaboration={handleCancelWorkspaceCollaboration}
        onInviteSent={async (invitedEmail) => {
          const inviterName = `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.email;
          await handleSaveWorkspaceNow();
          await Promise.all([
            publishWorkspaceInviteEvent({
              workspaceId: activeWorkspaceId,
              workspaceName: activeWorkspaceName,
              invitedEmail,
              invitedByName: inviterName,
            }),
            publishNotification({
              innovationId: activeWorkspaceId,
              type: 'Workspace invite',
              targetEmail: invitedEmail,
              workspaceId: activeWorkspaceId,
              workspaceName: activeWorkspaceName,
              message: `${inviterName} invited you to collaborate live on "${activeWorkspaceName}".`,
              user: inviterName,
            }),
          ]);
        }}
      />

      {/* Evaluator / User Custom Empty Workspace Setup Modal */}
      <WorkspaceSetupModal
        isOpen={isWorkspaceSetupOpen}
        defaultName={
          workspaceSetupMode === 'initial'
            ? activeWorkspaceName
            : `${currentUser.firstName}'s Evaluation Workspace`
        }
        initialDensity={density}
        initialSlaWarningDays={slaWarningDays}
        initialSlaCriticalDays={slaCriticalDays}
        allowClose={workspaceSetupMode === 'create'}
        onClose={() => setIsWorkspaceSetupOpen(false)}
        onConfirmSetup={async (config) => {
          if (workspaceSetupMode === 'create') {
            const res = await fetch('/api/workspaces', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ownerId: currentUser.id,
                ownerEmail: currentUser.email,
                name: config.name,
                density: config.density,
                slaWarningDays: config.slaWarningDays,
                slaCriticalDays: config.slaCriticalDays,
                focusSector: config.focusSector,
              }),
            });
            if (res.ok) {
              const created = await res.json();
              setWorkspacesList((prev) => [created, ...prev]);
              localStorage.setItem(`ceda_active_workspace_${currentUser.id}`, created.id);
              setCanvasStations([]);
              setQueueIdeas([]);
              setCanvasPools([]);
              setCanvasAnnotations([]);
              setAssignedIdeasMap({});
              setEnquiryMessages([]);
              setProjects([]);
              setPersonnel([]);
              setDensity(config.density);
              setSlaWarningDays(config.slaWarningDays);
              setSlaCriticalDays(config.slaCriticalDays);
              setActiveWorkspaceId(created.id);
              setIsWorkspaceSetupOpen(false);
              showToast(`Created empty custom workspace "${config.name}"`);
            }
          } else {
            // Update initial workspace with user's customizations and keep canvas empty
            setDensity(config.density);
            setSlaWarningDays(config.slaWarningDays);
            setSlaCriticalDays(config.slaCriticalDays);
            setCanvasStations([]);
            setQueueIdeas([]);
            setCanvasPools([]);
            setCanvasAnnotations([]);
            setAssignedIdeasMap({});
            setEnquiryMessages([]);
            setProjects([]);
            setPersonnel([]);
            setWorkspacesList((prev) =>
              prev.map((w) => (w.id === activeWorkspaceId ? { ...w, name: config.name } : w))
            );
            if (activeWorkspaceId) {
              await fetch(`/api/workspaces/${encodeURIComponent(activeWorkspaceId)}/state`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: config.name,
                  updatedBy: currentUser.id,
                  updatedByEmail: currentUser.email,
                  state: {
                    isEmptySeed: true,
                    customizedSetupDone: true,
                    focusSector: config.focusSector,
                    projects: [],
                    connectors: [],
                    intakeDossiers: [],
                    personnel: [],
                    queueIdeas: [],
                    canvasStations: [],
                    assignedIdeasMap: {},
                    canvasPools: [],
                    canvasAnnotations: [],
                    enquiryMessages: [],
                    ideaCustomPositions: {},
                    poolCustomPositions: {},
                    messageCustomPositions: {},
                    density: config.density,
                    slaWarningDays: config.slaWarningDays,
                    slaCriticalDays: config.slaCriticalDays,
                    zoom: 0.9,
                    panX: 20,
                    panY: 20,
                  },
                }),
              }).catch(() => { });
            }
            setIsWorkspaceSetupOpen(false);
            showToast(`Workspace "${config.name}" is ready with an empty canvas!`);
          }
        }}
      />

      {/* Manage Roles & Access Control Modal */}
      <ManageRolesModal
        isOpen={!!managingUser}
        user={managingUser}
        onClose={() => setManagingUser(null)}
        onUpdateRole={handleUpdateUserRole}
        onSuspendUser={isAdmin ? handleSuspendUser : undefined}
        onDeleteUser={isAdmin ? handleDeleteUser : undefined}
      />

      {/* Central Administrator Settings Hub */}
      <AdminSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        autoDispatchEnabled={autoDispatchEnabled}
        onToggleAutoDispatch={() => setAutoDispatchEnabled((prev) => !prev)}
        maxChatsPerAgent={maxChatsPerAgent}
        onChangeMaxChatsPerAgent={setMaxChatsPerAgent}
        slaWarningDays={slaWarningDays}
        onChangeSlaWarningDays={setSlaWarningDays}
        slaCriticalDays={slaCriticalDays}
        onChangeSlaCriticalDays={setSlaCriticalDays}
        autoReplenishMessagesOnFinish={autoReplenishMessagesOnFinish}
        onToggleAutoReplenishMessages={() => setAutoReplenishMessagesOnFinish((prev) => !prev)}
        enforceStatutoryGate={enforceStatutoryGate}
        onToggleEnforceStatutoryGate={() => {
          setEnforceStatutoryGate((prev) => {
            const next = !prev;
            showToast(
              next
                ? '🔒 Stage 2 Statutory Gate ENFORCED: Ideas must pass CIPA & BURS screening before Evaluator assignment.'
                : '🔓 Stage 2 Statutory Gate DISABLED: Ideas can be assigned to Evaluators without prior screening.'
            );
            return next;
          });
        }}
        autoScreenOnIngest={autoScreenOnIngest}
        onToggleAutoScreenOnIngest={() => {
          setAutoScreenOnIngest((prev) => {
            const next = !prev;
            showToast(
              next
                ? '⚡ Auto-Screen on Ingest ENABLED (CIPA cipaget + BURS)'
                : 'Auto-Screen on Ingest set to MANUAL'
            );
            return next;
          });
        }}
        onResetCanvasToDefault={handleResetCanvasToDefault}
        personnel={personnel}
        alertsHistory={adminAlerts}
        onOpenWorkflowArchitect={() => {
          setIsSettingsModalOpen(false);
          setIsWorkflowArchitectOpen(true);
        }}
        onOpenFormBuilder={() => {
          setIsSettingsModalOpen(false);
          setIsFormBuilderOpen(true);
        }}
        onOpenInviteModal={() => {
          setIsSettingsModalOpen(false);
          setIsInviteUserOpen(true);
        }}
        onOpenAlertModal={(user) => {
          setAlertTargetUser(user || null);
          setIsAlertModalOpen(true);
        }}
        aiAllowAutoScreen={aiAllowAutoScreen}
        onToggleAiAllowAutoScreen={() => setAiAllowAutoScreen((prev) => !prev)}
        aiAllowAutoAssign={aiAllowAutoAssign}
        onToggleAiAllowAutoAssign={() => setAiAllowAutoAssign((prev) => !prev)}
        queueIdeasCount={queueIdeas.length}
        unverifiedQueueCount={queueIdeas.filter((i) => i.screening?.status !== 'verified').length}
        adjudicationQueueCount={adjudicationQueueIdeas.length}
        onAiVerifyAllQueue={handleAiVerifyAllQueue}
        onAiAutoAssignAllQueue={() => handleAiAutoAssignQueue('both')}
        onOpenAiAssistant={() => setIsAiDrawerOpen(true)}
      />

      {/* CEDA Workspace AI Copilot Drawer (Connected to Admin, Evaluator & Adjudicator Workspaces) */}
      {canUseCustomizableCanvas && (
        <WorkspaceAiDrawer
          isOpen={isAiDrawerOpen}
          onClose={() => setIsAiDrawerOpen(false)}
          userRole={currentUser.role}
          userName={`${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.email}
          personnel={personnel}
          queueIdeas={queueIdeas}
          adjudicationIdeas={adjudicationQueueIdeas}
          assignedIdeasMap={assignedIdeasMap}
          canvasStations={canvasStations}
          projects={projects}
          workflowCycle={activeWorkflowCycle}
          applicationFields={applicationFields}
          faqItems={faqItems}
          systemFeedback={systemFeedback}
          slaWarningDays={slaWarningDays}
          slaCriticalDays={slaCriticalDays}
          aiAllowAutoScreen={aiAllowAutoScreen}
          aiAllowAutoAssign={aiAllowAutoAssign}
          onAiVerifyQueue={handleAiVerifyAllQueue}
          onAiAssignQueue={handleAiAutoAssignQueue}
        />
      )}

      {/* Stage 2: Statutory & Tax Screening Modal (CIPA `cipaget` & BURS) */}
      <StatutoryScreeningModal
        isOpen={!!screeningModalIdea}
        idea={
          screeningModalIdea
            ? enrichQueueIdeaWithProjectData(
              queueIdeas.find((i) => i.id === screeningModalIdea.id) || screeningModalIdea
            )
            : null
        }
        onClose={() => setScreeningModalIdea(null)}
        onSaveScreening={handleSaveStatutoryScreening}
        onRequestDocsFromSubmitter={handleRequestStatutoryDocsFromSubmitter}
        onRejectAtScreening={handleRejectAtStatutoryScreening}
        onAutoScreenSingleIdea={handleAutoScreenSingleIdea}
      />

      {/* Admin Alert Dispatch Modal */}
      <AdminAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => {
          setIsAlertModalOpen(false);
          setAlertTargetUser(null);
          setAlertTargetIdea(null);
        }}
        personnel={personnel}
        targetUser={alertTargetUser}
        targetIdea={alertTargetIdea}
        onSendAlert={handleSendAlert}
      />

      {/* ------------------------------------------------------------- */}
      {/* Common Modals                                                 */}
      {/* ------------------------------------------------------------- */}

      {/* Project Dossier Modal Drawer */}
      <ProjectDossierModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
        onUpdateProject={(updated) => {
          setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          setSelectedProject(updated);
        }}
        onAdvanceStage={handleAdvanceProject}
        onRegressStage={() => { }}
        workflowCycle={activeWorkflowCycle}
      />

      {/* Upload / New Ingest Modal */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onSubmit={handleAddNewProject}
        applicationFields={applicationFields}
      />

      {/* Evaluator Scoring Modal (Evaluator Role) */}
      <EvaluatorModal
        innovation={evaluatingProject}
        isOpen={!!evaluatingProject}
        onClose={() => setEvaluatingProject(null)}
        onEvaluationComplete={async (recommendation) => {
          if (
            evaluatingProject?.id &&
            recommendation &&
            recommendation.toLowerCase().includes('adjudication')
          ) {
            await handleAdvanceIdeaStage(String(evaluatingProject.id));
          }
          refreshFromBackend();
        }}
        presenceMap={presenceMap}
      />

      {/* Adjudicator Decision Modal (Adjudicator Role) */}
      <AdjudicatorModal
        innovation={adjudicatingProject}
        isOpen={!!adjudicatingProject}
        onClose={() => setAdjudicatingProject(null)}
        onAdjudicationComplete={async (decision) => {
          if (
            adjudicatingProject?.id &&
            decision &&
            decision.toLowerCase().includes('approved')
          ) {
            await handleAdvanceIdeaStage(String(adjudicatingProject.id));
          }
          refreshFromBackend();
        }}
      />

      {/* Administrator Governance Console */}
      <AdminPanelModal
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        onRefreshData={refreshFromBackend}
        initialTab={adminPanelInitialTab}
        faqItems={faqItems}
        onSaveFaqs={(updated) => {
          setFaqItems(updated);
          publishFaqItems(updated).catch(() => {});
          showToast(`Updated FAQs (${updated.length} items live for Submitters)`);
        }}
        systemFeedback={systemFeedback}
      />

      {/* Submitter FAQ & System Workflow Feedback Modal */}
      {currentUser.role === 'Submitter' && (
        <SubmitterFaqFeedbackModal
          isOpen={isSubmitterFaqOpen}
          initialTab={submitterFaqInitialTab}
          onClose={() => setIsSubmitterFaqOpen(false)}
          faqItems={faqItems}
          workflowCycle={activeWorkflowCycle}
          myFeedback={systemFeedback.filter((fb) => {
            const emailLower = (currentUser.email || '').trim().toLowerCase();
            return (
              String(fb.submitterId) === String(currentUser.id) ||
              (emailLower && fb.submitterEmail?.toLowerCase() === emailLower)
            );
          })}
          onSubmitFeedback={async ({ category, stageContext, rating, comment }) => {
            const fullName = `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.email;
            const now = Date.now();
            const entry: SystemFeedbackItem = {
              id: `fb-${now}-${Math.random().toString(36).slice(2, 6)}`,
              submitterId: currentUser.id,
              submitterName: fullName,
              submitterEmail: currentUser.email,
              category: category as SystemFeedbackCategory,
              stageContext,
              rating,
              comment,
              createdAt: new Date().toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
              createdAtMs: now,
            };
            setSystemFeedback((prev) => [entry, ...prev]);
            await publishSystemFeedback(entry);
            await publishNotification({
              innovationId: entry.id,
              type: 'Citizen enquiry',
              message: `New system/workflow feedback (${rating}/5 ★) from ${fullName}: ${category}`,
              user: fullName,
              targetRole: 'Administrator',
              submitterName: fullName,
            }).catch(() => {});
            showToast('🙏 Feedback sent to CEDA Administration!');
          }}
        />
      )}

      {/* Firestore Live Activity Feed & Real-Time Presence Drawer */}
      <LiveActivityDrawer
        isOpen={isLiveActivityOpen}
        onClose={() => {
          setIsLiveActivityOpen(false);
          handleMarkNotificationsRead();
        }}
        ownedIdeaIdentifiers={submitterOwnedIdeaIdentifiers}
        assignedOfficialsForSubmitter={assignedOfficialsForSubmitter}
        unreadNotificationsCount={unreadNotificationsCount}
        onMarkNotificationsRead={handleMarkNotificationsRead}
        adminAlerts={adminAlerts}
        onSwitchWorkspace={(workspaceId) => {
          localStorage.setItem(`ceda_active_workspace_${currentUser.id}`, workspaceId);
          setActiveWorkspaceId(workspaceId);
          setIsLiveActivityOpen(false);
          handleMarkNotificationsRead();
          const target = workspacesList.find((w) => w.id === workspaceId);
          showToast(`Joined shared workspace: ${target?.name || workspaceId}`);
        }}
      />

      {/* Submitter Floating Citizen Enquiry & Agent Support Widget */}
      {currentUser.role === 'Submitter' && (
        <SubmitterEnquiryChatWidget
          currentUser={currentUser}
          projects={submitterScopedProjects}
          myEnquiries={enquiryMessages.filter((e) => {
            const myEmailLower = (currentUser.email || '').trim().toLowerCase();
            const myFullName = `${currentUser.firstName} ${currentUser.lastName}`.trim().toLowerCase();
            return (
              (e.submitterEmail && e.submitterEmail.trim().toLowerCase() === myEmailLower) ||
              (e.submitterName && e.submitterName.trim().toLowerCase() === myFullName)
            );
          })}
          onSubmitEnquiry={async ({ ideaCode, ideaTitle, subject, messageText, priority }) => {
            const now = Date.now();
            const fullName = `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.email;
            const newMsg: SubmitterEnquiryMessage = {
              id: `enq-${now}-${Math.random().toString(36).slice(2, 6)}`,
              submitterName: fullName,
              submitterEmail: currentUser.email,
              submitterLocation: 'Botswana Citizen Portal',
              ideaCode: ideaCode || 'GENERAL',
              ideaTitle: ideaTitle || 'General CEDA Enquiry',
              subject,
              messageText,
              arrivalTime: 'Just now',
              rawTimestamp: now,
              status: 'in_queue',
              priority,
              slaMinutesRemaining: 180,
              thread: [
                {
                  id: `msg-${now}`,
                  sender: 'submitter',
                  senderName: fullName,
                  text: messageText,
                  timestamp: 'Just now',
                },
              ],
            };
            setEnquiryMessages((prev) => [...prev, newMsg]);
            await publishCitizenEnquiry(newMsg);
            await publishNotification({
              innovationId: ideaCode || newMsg.id,
              type: 'Citizen enquiry',
              message: `New citizen enquiry in Admin Enquiry Queue from ${fullName}: "${subject}"`,
              user: fullName,
              targetRole: 'Administrator',
              ideaTitle: newMsg.ideaTitle,
              submitterName: fullName,
            }).catch(() => {});
            showToast('📩 Enquiry sent to CEDA Admin Enquiry Queue!');
            return newMsg;
          }}
          onSendFollowUp={(enquiryId, text) => {
            const fullName = `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.email;
            setEnquiryMessages((prev) =>
              prev.map((m) => {
                if (m.id !== enquiryId) return m;
                const updated: SubmitterEnquiryMessage = {
                  ...m,
                  thread: [
                    ...m.thread,
                    {
                      id: `msg-${Date.now()}`,
                      sender: 'submitter',
                      senderName: fullName,
                      text,
                      timestamp: 'Just now',
                    },
                  ],
                };
                publishCitizenEnquiry(updated).catch(() => {});
                return updated;
              })
            );
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
