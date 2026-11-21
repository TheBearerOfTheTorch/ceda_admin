import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  SubmissionBatchQueue, AdminPersonnel,
  CanvasDensity, WorkflowCycle, ApplicationFormField,
  QueueIdeaItem, CanvasEvaluatorStation, CanvasPoolContainer, AdminCanvasTool,
  SubmitterEnquiryMessage, CanvasAnnotationItem, CanvasAnnotationType
} from '../../types/ceda';
import { ADMIN_CANVAS_TOOLS } from '../../data/mockData';
import {
  Navigation, Hand, Minus, Plus, Layers, ArrowRight,
  UserCheck, Award, ShieldCheck, Sparkles, Sliders, GitFork,
  FileText, CheckCircle2, AlertCircle, Clock, Zap, TrendingDown,
  Users, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, TrendingUp, RefreshCw, BarChart2, CheckSquare,
  PlusCircle, Trash2, Move, HelpCircle, GripVertical, Check, Volume2,
  VolumeX, Play, Pause, Flame, Share2, Edit3, MessageSquare, Image, Palette, User, Star,
  Maximize2, Minimize2, CheckCheck, Square, MousePointerClick, Settings, Headphones,
  Send, Radio, BellRing, AlertTriangle, StickyNote, Tag, Bookmark, RotateCcw, X, Pencil, Shield, Rocket,
  Keyboard, Save, Undo2, Redo2, Grid, MoreVertical, Paperclip
} from 'lucide-react';
import {
  subscribeToClarificationChat,
  sendClarificationMessage,
  publishNotification,
  ClarificationChatMessage,
  WorkspaceCursorItem
} from '../../lib/firebase';

const ADMIN_LAYOUT_STORAGE_KEY = 'ceda_admin_layout_v1';

interface PersistedAdminLayout {
  ideaCustomPositions?: Record<string, { x: number; y: number }>;
  poolCustomPositions?: Record<string, { x: number; y: number }>;
  messageCustomPositions?: Record<string, { x: number; y: number }>;
  cardCustomDimensions?: Record<string, { width: number; height: number }>;
  queueDimensions?: { width: number; height: number };
  queueTab?: 'ideas' | 'messages' | 'adjudication';
  isQueueCollapsed?: boolean;
  evaluatorCanvasIdeaIds?: string[];
}

function loadPersistedAdminLayout(): PersistedAdminLayout {
  try {
    const raw = localStorage.getItem(ADMIN_LAYOUT_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PersistedAdminLayout;
  } catch {
    return {};
  }
}

// Global window fallback for drag-and-drop across sandboxed iframes
declare global {
  interface Window {
    __ceda_dragged_ideas?: string[];
  }
}

interface AdminCanvasBoardProps {
  queues: SubmissionBatchQueue[];
  personnel: AdminPersonnel[];
  workflowCycle: WorkflowCycle;
  applicationFields: ApplicationFormField[];
  queueIdeas: QueueIdeaItem[];
  canvasStations: CanvasEvaluatorStation[];
  canvasPools: CanvasPoolContainer[];
  assignedIdeasMap: Record<string, QueueIdeaItem>;
  density: CanvasDensity;
  onDensityChange: (density: CanvasDensity) => void;
  zoom: number;
  panX: number;
  panY: number;
  onPanChange: (x: number, y: number) => void;
  onZoomChange: (zoom: number) => void;
  onOpenBatchAssignModal: (queueId?: string, personnelId?: number) => void;
  onOpenWorkflowArchitect: () => void;
  onOpenFormBuilder: () => void;
  onOpenInviteUser: () => void;
  // Admin Central Settings & Alerts
  onOpenSettings?: () => void;
  onOpenAlertModal?: (user?: AdminPersonnel, idea?: QueueIdeaItem) => void;
  enquiryMessages?: SubmitterEnquiryMessage[];
  autoDispatchEnabled?: boolean;
  maxChatsPerAgent?: number;
  onToggleAutoDispatch?: () => void;
  onAssignMessageToAgent?: (messageId: string, agentId: number) => void;
  onAssignMessagesToStation?: (stationId: string, messageIds: string[]) => void;
  onResolveMessage?: (messageId: string, notes?: string) => void;
  onSimulateNewMessage?: () => void;
  canvasAnnotations?: CanvasAnnotationItem[];
  onAddAnnotation?: (annotation: CanvasAnnotationItem) => void;
  onUpdateAnnotation?: (id: string, updates: Partial<CanvasAnnotationItem>) => void;
  onRemoveAnnotation?: (id: string) => void;
  onResetCanvasToDefault?: () => void;
  onOpenShareWorkspace?: () => void;
  activeWorkspaceName?: string;
  workspaceCollaborators?: WorkspaceCursorItem[];
  onPublishCursorPosition?: (canvasX: number, canvasY: number) => void;
  canvasTheme?: 'slate_dots' | 'blueprint' | 'warm_paper' | 'dark_studio' | 'clean_grid';
  onCanvasThemeChange?: (theme: 'slate_dots' | 'blueprint' | 'warm_paper' | 'dark_studio' | 'clean_grid') => void;
  showGrid?: boolean;
  onToggleGrid?: () => void;
  showConnectors?: boolean;
  onToggleConnectors?: () => void;
  presenceMap?: Record<string | number, 'online' | 'reviewing' | 'editing' | 'offline'>;
  onSaveWorkspaceNow?: () => void | Promise<void>;
  onUndoCanvas?: () => void;
  onRedoCanvas?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onDeleteSelectedCanvasItems?: (selectedIds: string[]) => void;
  ideaCustomPositions?: Record<string, { x: number; y: number }>;
  onIdeaCustomPositionsChange?: React.Dispatch<React.SetStateAction<Record<string, { x: number; y: number }>>>;
  poolCustomPositions?: Record<string, { x: number; y: number }>;
  onPoolCustomPositionsChange?: React.Dispatch<React.SetStateAction<Record<string, { x: number; y: number }>>>;
  messageCustomPositions?: Record<string, { x: number; y: number }>;
  onMessageCustomPositionsChange?: React.Dispatch<React.SetStateAction<Record<string, { x: number; y: number }>>>;
  cardCustomDimensions?: Record<string, { width: number; height: number }>;
  onCardCustomDimensionsChange?: React.Dispatch<React.SetStateAction<Record<string, { width: number; height: number }>>>;
  queueDimensions?: { width: number; height: number };
  onQueueDimensionsChange?: React.Dispatch<React.SetStateAction<{ width: number; height: number }>>;
  isQueueCollapsed?: boolean;
  onIsQueueCollapsedChange?: React.Dispatch<React.SetStateAction<boolean>>;
  queueTab?: 'ideas' | 'messages' | 'adjudication';
  onQueueTabChange?: React.Dispatch<React.SetStateAction<'ideas' | 'messages' | 'adjudication'>>;
  slaWarningDays?: number;
  slaCriticalDays?: number;
  // Evaluator & Card Interactive Actions
  onOpenDossier?: (ideaId: string) => void;
  onOpenClarificationChat?: (idea: QueueIdeaItem) => void;
  onAdvanceIdeaStage?: (ideaId: string) => void;
  onRemoveIdeaFromCanvas?: (ideaId: string) => void;
  adjudicationIdeas?: QueueIdeaItem[];
  // Stage 2: Statutory & Tax Screening (CIPA & BURS)
  enforceStatutoryGate?: boolean;
  onToggleEnforceStatutoryGate?: () => void;
  autoScreenOnIngest?: boolean;
  onToggleAutoScreenOnIngest?: () => void;
  onBatchScreenQueueIdeas?: () => void;
  isBatchScreening?: boolean;
  onOpenStatutoryScreening?: (idea: QueueIdeaItem) => void;
  // Interactive Wireframe Actions
  onAddUserToCanvas: (user: AdminPersonnel, x: number, y: number) => void;
  onMoveCanvasStation: (stationId: string, x: number, y: number) => void;
  onBatchMoveCanvasStations?: (moves: { id: string; x: number; y: number }[]) => void;
  onRemoveCanvasStation: (stationId: string) => void;
  onAssignIdeasToStation: (stationId: string, ideaIds: string[]) => void;
  onReassignIdeaBetweenStations?: (ideaId: string, fromStationId: string, toStationId: string) => void;
  onResolveIdeaForStation: (stationId: string, ideaId: string) => void;
  onToggleAutoReplenish: (stationId: string) => void;
  onAddPoolToCanvas: (tool: AdminCanvasTool, x: number, y: number) => void;
  onAddUserToPool: (poolId: string, userId: number) => void;
  onRemovePool: (poolId: string) => void;
  onIngestNewLiveIdea: () => void;
}

export const AdminCanvasBoard: React.FC<AdminCanvasBoardProps> = ({
  queues,
  personnel,
  workflowCycle,
  applicationFields,
  queueIdeas,
  canvasStations,
  canvasPools,
  assignedIdeasMap,
  density,
  onDensityChange,
  zoom,
  panX,
  panY,
  onPanChange,
  onZoomChange,
  onOpenBatchAssignModal,
  onOpenWorkflowArchitect,
  onOpenFormBuilder,
  onOpenInviteUser,
  onOpenSettings,
  onOpenAlertModal,
  enquiryMessages = [],
  autoDispatchEnabled = false,
  maxChatsPerAgent = 3,
  onToggleAutoDispatch,
  onAssignMessageToAgent,
  onAssignMessagesToStation,
  onResolveMessage,
  onSimulateNewMessage,
  canvasAnnotations = [],
  onAddAnnotation,
  onUpdateAnnotation,
  onRemoveAnnotation,
  onResetCanvasToDefault,
  onOpenShareWorkspace,
  activeWorkspaceName,
  workspaceCollaborators = [],
  onPublishCursorPosition,
  canvasTheme = 'slate_dots',
  onCanvasThemeChange,
  showGrid = true,
  onToggleGrid,
  showConnectors = true,
  onToggleConnectors,
  presenceMap = {},
  onSaveWorkspaceNow,
  onUndoCanvas,
  onRedoCanvas,
  canUndo = false,
  canRedo = false,
  onDeleteSelectedCanvasItems,
  ideaCustomPositions: propIdeaCustomPositions,
  onIdeaCustomPositionsChange,
  poolCustomPositions: propPoolCustomPositions,
  onPoolCustomPositionsChange,
  messageCustomPositions: propMessageCustomPositions,
  onMessageCustomPositionsChange,
  cardCustomDimensions: propCardCustomDimensions,
  onCardCustomDimensionsChange,
  queueDimensions: propQueueDimensions,
  onQueueDimensionsChange,
  isQueueCollapsed: propIsQueueCollapsed,
  onIsQueueCollapsedChange,
  queueTab: propQueueTab,
  onQueueTabChange,
  slaWarningDays = 3.0,
  slaCriticalDays = 1.5,
  onAddUserToCanvas,
  onMoveCanvasStation,
  onBatchMoveCanvasStations,
  onRemoveCanvasStation,
  onAssignIdeasToStation,
  onReassignIdeaBetweenStations,
  onResolveIdeaForStation,
  onToggleAutoReplenish,
  onAddPoolToCanvas,
  onAddUserToPool,
  onRemovePool,
  onIngestNewLiveIdea,
  onOpenDossier,
  onOpenClarificationChat,
  onAdvanceIdeaStage,
  onRemoveIdeaFromCanvas,
  adjudicationIdeas: propAdjudicationIdeas,
  enforceStatutoryGate = true,
  onToggleEnforceStatutoryGate,
  autoScreenOnIngest = false,
  onToggleAutoScreenOnIngest,
  onBatchScreenQueueIdeas,
  isBatchScreening = false,
  onOpenStatutoryScreening,
}) => {
  const [savedLayout] = useState<PersistedAdminLayout>(() => loadPersistedAdminLayout());
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'Administrator';
  const isEvaluator = currentUser?.role === 'Evaluator';
  const isAdjudicator = currentUser?.role === 'Adjudicator';
  const isReviewerWorkspace = isEvaluator || isAdjudicator;
  const isAgent = currentUser?.role === 'Agent';
  const canViewEnquiries = isAdmin || isAgent;

  const workspaceTitle = isEvaluator
    ? 'Evaluator Workspace'
    : isAdjudicator
      ? 'Adjudicator Workspace'
      : isAgent
        ? 'Agent Workspace'
        : 'Administration Workspace';

  const containerRef = useRef<HTMLDivElement>(null);
  const queueScrollRef = useRef<HTMLDivElement>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'pan' | 'annotate'>('select');
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Triple-track Queue View: Ideas Queue vs Citizen Enquiry Messages vs Adjudication Queue
  const [localQueueTab, setLocalQueueTab] = useState<'ideas' | 'messages' | 'adjudication'>(() => savedLayout.queueTab ?? 'ideas');
  const queueTab = propQueueTab ?? localQueueTab;
  const setQueueTab = onQueueTabChange ?? setLocalQueueTab;

  // Evaluator / Adjudicator Canvas Active Dropped Ideas
  const [evaluatorCanvasIdeaIds, setEvaluatorCanvasIdeaIds] = useState<string[]>(
    () => savedLayout.evaluatorCanvasIdeaIds ?? []
  );

  // Real-time Clarification Comments per Idea
  const [ideaCommentsMap, setIdeaCommentsMap] = useState<Record<string, ClarificationChatMessage[]>>({});
  const [inlineCommentInput, setInlineCommentInput] = useState<Record<string, string>>({});

  // Custom moved card positions on canvas (use parent workspace-synced state if provided)
  const [localIdeaCustomPositions, setLocalIdeaCustomPositions] = useState<Record<string, { x: number; y: number }>>(
    () => savedLayout.ideaCustomPositions ?? {}
  );
  const [localPoolCustomPositions, setLocalPoolCustomPositions] = useState<Record<string, { x: number; y: number }>>(
    () => savedLayout.poolCustomPositions ?? {}
  );
  const [localMessageCustomPositions, setLocalMessageCustomPositions] = useState<Record<string, { x: number; y: number }>>(
    () => savedLayout.messageCustomPositions ?? {}
  );

  const ideaCustomPositions = propIdeaCustomPositions ?? localIdeaCustomPositions;
  const setIdeaCustomPositions = onIdeaCustomPositionsChange ?? setLocalIdeaCustomPositions;
  const poolCustomPositions = propPoolCustomPositions ?? localPoolCustomPositions;
  const setPoolCustomPositions = onPoolCustomPositionsChange ?? setLocalPoolCustomPositions;
  const messageCustomPositions = propMessageCustomPositions ?? localMessageCustomPositions;
  const setMessageCustomPositions = onMessageCustomPositionsChange ?? setLocalMessageCustomPositions;

  const [reassignHoverStationId, setReassignHoverStationId] = useState<string | null>(null);

  // Synchronize Adjudication Ideas list
  const adjudicationIdeas = useMemo(() => {
    if (propAdjudicationIdeas !== undefined) return propAdjudicationIdeas;
    return Object.values(assignedIdeasMap).filter(
      (idea) => idea.status === 'completed' || (idea as any).stage === 'adjudication' || (idea as any).stageId === 'approval_board'
    );
  }, [propAdjudicationIdeas, assignedIdeasMap]);

  // Horizontal Queue minimization toggle (persisted across reloads)
  const [localIsQueueCollapsed, setLocalIsQueueCollapsed] = useState<boolean>(
    () => savedLayout.isQueueCollapsed ?? false
  );
  const isQueueCollapsed = propIsQueueCollapsed ?? localIsQueueCollapsed;
  const setIsQueueCollapsed = onIsQueueCollapsedChange ?? setLocalIsQueueCollapsed;
  const [saveFeedback, setSaveFeedback] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Card custom dimensions (resizable cards)
  const [localCardCustomDimensions, setLocalCardCustomDimensions] = useState<Record<string, { width: number; height: number }>>(
    () => savedLayout.cardCustomDimensions ?? {}
  );
  const cardCustomDimensions = propCardCustomDimensions ?? localCardCustomDimensions;
  const setCardCustomDimensions = onCardCustomDimensionsChange ?? setLocalCardCustomDimensions;

  // Queue custom dimensions (resizable horizontal queue)
  const [localQueueDimensions, setLocalQueueDimensions] = useState<{ width: number; height: number }>(
    () => savedLayout.queueDimensions ?? { width: 1280, height: 230 }
  );
  const queueDimensions = propQueueDimensions ?? localQueueDimensions;
  const setQueueDimensions = onQueueDimensionsChange ?? setLocalQueueDimensions;

  // Active resizing state
  const [resizingEntity, setResizingEntity] = useState<{
    id: string; // card id or 'horizontal_queue'
    direction: 'e' | 's' | 'se';
    origWidth: number;
    origHeight: number;
    startX: number;
    startY: number;
    minWidth: number;
    minHeight: number;
  } | null>(null);

  const startResize = (
    id: string,
    direction: 'e' | 's' | 'se',
    origWidth: number,
    origHeight: number,
    minWidth: number,
    minHeight: number,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingEntity({
      id,
      direction,
      origWidth,
      origHeight,
      startX: e.clientX,
      startY: e.clientY,
      minWidth,
      minHeight,
    });
  };

  const getCardSize = (id: string, defaultW: number, defaultH: number) => {
    const dim = cardCustomDimensions[id];
    return {
      width: dim?.width ?? defaultW,
      height: dim?.height ?? defaultH,
    };
  };

  // Helper to determine exact coordinates for Evaluator 4-column cards
  const getEvaluatorCardPositions = (idea: QueueIdeaItem, rowIdx: number) => {
    const custom = ideaCustomPositions[`eval__${idea.id}`];
    const firstRowY = isQueueCollapsed ? 165 : Math.max(355, 20 + queueDimensions.height + 105);
    let defaultY = firstRowY;
    for (let k = 0; k < rowIdx; k++) {
      const prevId = evaluatorCanvasIdeaIds[k];
      if (prevId) {
        const h1 = getCardSize(prevId, 340, 250).height;
        const h2 = getCardSize(`${prevId}__comments`, 360, 320).height;
        const h3 = getCardSize(`${prevId}__gate`, 340, 320).height;
        const h4 = getCardSize(`${prevId}__step2`, 300, 320).height;
        defaultY += Math.max(h1, h2, h3, h4, 320) + 95;
      } else {
        defaultY += 415;
      }
    }

    const rawY = custom ? custom.y : defaultY;
    // Auto-rescue cards previously stuck behind the queue (< 320) when queue is expanded
    const y = !isQueueCollapsed && rawY < 320 ? defaultY : rawY;
    const x = custom ? custom.x : 60;

    const basePos = { x, y };

    const ideaSize = getCardSize(idea.id, 340, 250);
    const commentsSize = getCardSize(`${idea.id}__comments`, 360, 320);
    const gateSize = getCardSize(`${idea.id}__gate`, 340, 320);

    const commentsCustom = ideaCustomPositions[`eval__${idea.id}__comments`];
    const commentsPos = commentsCustom || {
      x: basePos.x + ideaSize.width + 40,
      y: basePos.y,
    };

    const gateCustom = ideaCustomPositions[`eval__${idea.id}__gate`];
    const gatePos = gateCustom || {
      x: commentsPos.x + commentsSize.width + 40,
      y: basePos.y,
    };

    const step2Custom = ideaCustomPositions[`eval__${idea.id}__step2`];
    const step2Pos = step2Custom || {
      x: gatePos.x + gateSize.width + 40,
      y: basePos.y,
    };

    return { basePos, commentsPos, gatePos, step2Pos };
  };

  // Clean up any legacy un-namespaced evaluator idea positions so Admin station connections stay aligned
  useEffect(() => {
    if (evaluatorCanvasIdeaIds.length === 0) return;
    const hasLegacyKeys = evaluatorCanvasIdeaIds.some(
      (id) =>
        Boolean(ideaCustomPositions[id]) ||
        Boolean(ideaCustomPositions[`${id}__comments`]) ||
        Boolean(ideaCustomPositions[`${id}__gate`]) ||
        Boolean(ideaCustomPositions[`${id}__step2`])
    );
    if (hasLegacyKeys) {
      setIdeaCustomPositions((prev) => {
        const next = { ...prev };
        evaluatorCanvasIdeaIds.forEach((id) => {
          delete next[id];
          delete next[`${id}__comments`];
          delete next[`${id}__gate`];
          delete next[`${id}__step2`];
        });
        return next;
      });
    }
  }, [evaluatorCanvasIdeaIds, ideaCustomPositions]);

  // Subscribe to real-time clarification comments for ideas active on Evaluator / Adjudicator canvas
  useEffect(() => {
    if (!isReviewerWorkspace || evaluatorCanvasIdeaIds.length === 0) return;

    const unsubs = evaluatorCanvasIdeaIds.map((id) => {
      const matchedIdea =
        assignedIdeasMap[id] ||
        queueIdeas.find((i) => i.id === id) ||
        adjudicationIdeas.find((a) => a.id === id);
      return subscribeToClarificationChat(
        id,
        (msgs) => {
          setIdeaCommentsMap((prev) => ({ ...prev, [id]: msgs }));
        },
        {
          ideaTitle: matchedIdea?.title,
          extraKeys: matchedIdea?.code ? [matchedIdea.code] : undefined,
        }
      );
    });

    return () => {
      unsubs.forEach((u) => u?.());
    };
  }, [isReviewerWorkspace, evaluatorCanvasIdeaIds, assignedIdeasMap, queueIdeas, adjudicationIdeas]);

  const latestLayoutRef = useRef<PersistedAdminLayout>({});
  const hasInteractedWithLayoutRef = useRef(false);

  const persistAdminLayoutNow = (override?: Partial<PersistedAdminLayout>) => {
    try {
      const existing = loadPersistedAdminLayout();
      const current = latestLayoutRef.current;
      const nextIdeaPos = override?.ideaCustomPositions ?? current.ideaCustomPositions ?? {};
      const nextPoolPos = override?.poolCustomPositions ?? current.poolCustomPositions ?? {};
      const nextMsgPos = override?.messageCustomPositions ?? current.messageCustomPositions ?? {};

      // Guard against overwriting saved positions with unhydrated empty {} props on initial mount
      const preserveIfUnhydrated = (
        nextMap: Record<string, { x: number; y: number }>,
        existingMap?: Record<string, { x: number; y: number }>
      ) => {
        if (
          !hasInteractedWithLayoutRef.current &&
          Object.keys(nextMap).length === 0 &&
          existingMap &&
          Object.keys(existingMap).length > 0
        ) {
          return existingMap;
        }
        return nextMap;
      };

      const payload: PersistedAdminLayout = {
        ideaCustomPositions: preserveIfUnhydrated(nextIdeaPos, existing.ideaCustomPositions),
        poolCustomPositions: preserveIfUnhydrated(nextPoolPos, existing.poolCustomPositions),
        messageCustomPositions: preserveIfUnhydrated(nextMsgPos, existing.messageCustomPositions),
        cardCustomDimensions: override?.cardCustomDimensions ?? current.cardCustomDimensions ?? {},
        queueDimensions: override?.queueDimensions ?? current.queueDimensions ?? { width: 1280, height: 230 },
        queueTab: override?.queueTab ?? current.queueTab ?? 'ideas',
        isQueueCollapsed: override?.isQueueCollapsed ?? current.isQueueCollapsed ?? false,
        evaluatorCanvasIdeaIds: override?.evaluatorCanvasIdeaIds ?? current.evaluatorCanvasIdeaIds ?? [],
      };
      localStorage.setItem(ADMIN_LAYOUT_STORAGE_KEY, JSON.stringify(payload));
    } catch { }
  };

  latestLayoutRef.current = {
    ideaCustomPositions,
    poolCustomPositions,
    messageCustomPositions,
    cardCustomDimensions,
    queueDimensions,
    queueTab,
    isQueueCollapsed,
    evaluatorCanvasIdeaIds,
  };

  // Persist layout changes to localStorage immediately whenever any layout state updates
  useEffect(() => {
    if (
      Object.keys(ideaCustomPositions).length > 0 ||
      Object.keys(poolCustomPositions).length > 0 ||
      Object.keys(messageCustomPositions).length > 0
    ) {
      hasInteractedWithLayoutRef.current = true;
    }
    persistAdminLayoutNow();
  }, [
    ideaCustomPositions,
    poolCustomPositions,
    messageCustomPositions,
    cardCustomDimensions,
    queueDimensions,
    queueTab,
    isQueueCollapsed,
    evaluatorCanvasIdeaIds,
  ]);

  // Flush latest layout changes if the user reloads or closes the tab immediately after editing
  useEffect(() => {
    const flushLayout = () => {
      persistAdminLayoutNow();
    };
    window.addEventListener('beforeunload', flushLayout);
    window.addEventListener('pagehide', flushLayout);
    return () => {
      window.removeEventListener('beforeunload', flushLayout);
      window.removeEventListener('pagehide', flushLayout);
    };
  }, []);

  const handleSaveCanvasChanges = async () => {
    hasInteractedWithLayoutRef.current = true;
    persistAdminLayoutNow();
    setSaveFeedback('saving');
    try {
      if (onSaveWorkspaceNow) {
        await onSaveWorkspaceNow();
      }
      setSaveFeedback('saved');
    } catch {
      setSaveFeedback('saved');
    }
    window.setTimeout(() => {
      setSaveFeedback((prev) => (prev === 'saved' ? 'idle' : prev));
    }, 2000);
  };

  // Pen & Wire Annotation / Sticker Palette States
  const [isAnnotationPaletteOpen, setIsAnnotationPaletteOpen] = useState(false);
  const [pendingAnnotation, setPendingAnnotation] = useState<{
    type: CanvasAnnotationType;
    text: string;
    subtext?: string;
    color: string;
    stickerIcon?: CanvasAnnotationItem['stickerIcon'];
  } | null>(null);
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [editingAnnotationText, setEditingAnnotationText] = useState('');
  const [editingAnnotationSubtext, setEditingAnnotationSubtext] = useState('');
  const [customAnnotationText, setCustomAnnotationText] = useState('');
  const [customAnnotationType, setCustomAnnotationType] = useState<CanvasAnnotationType>('sticky_note');
  const [customAnnotationColor, setCustomAnnotationColor] = useState('#fef08a');

  // Multi-selection & Pointer Drag for Citizen Enquiry Messages
  const [selectedQueueMessageIds, setSelectedQueueMessageIds] = useState<string[]>([]);
  const [messagePointerDrag, setMessagePointerDrag] = useState<{
    isDragging: boolean;
    messageIds: string[];
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [isAutoMessageStreamRunning, setIsAutoMessageStreamRunning] = useState(false);

  // -------------------------------------------------------------
  // Group Selection & Marquee Drag Box
  // -------------------------------------------------------------
  const [selectedGroupCardIds, setSelectedGroupCardIds] = useState<string[]>([]);
  const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);
  const [marqueeBox, setMarqueeBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Active dragging card(s) state
  const [draggingEntity, setDraggingEntity] = useState<{
    type: 'station' | 'idea' | 'pool' | 'message' | 'annotation';
    id: string;
    origX: number;
    origY: number;
    startX: number;
    startY: number;
    groupSnapshot?: {
      stations: Record<string, { x: number; y: number }>;
      ideas: Record<string, { x: number; y: number }>;
      pools: Record<string, { x: number; y: number }>;
      messages: Record<string, { x: number; y: number }>;
    };
  } | null>(null);

  // Minified Right Tool Dock state (Matches uploaded screenshot!)
  const [isRightDockMinified, setIsRightDockMinified] = useState(true);
  const [isThemePanelOpen, setIsThemePanelOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        hasInteractedWithLayoutRef.current = true;
        persistAdminLayoutNow();
        setSaveFeedback('saved');
        window.setTimeout(() => {
          setSaveFeedback((prev) => (prev === 'saved' ? 'idle' : prev));
        }, 2000);
        return;
      }
      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
      } else if ((e.key === 'Backspace' || e.key === 'Delete') && !e.metaKey && !e.ctrlKey) {
        if (selectedGroupCardIds.length > 0 && onDeleteSelectedCanvasItems) {
          e.preventDefault();
          onDeleteSelectedCanvasItems(selectedGroupCardIds);
          setSelectedGroupCardIds([]);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [selectedGroupCardIds, onDeleteSelectedCanvasItems]);

  // FIFO Sorted Queues: Oldest / 1st-in ALWAYS on the far left
  const sortedQueueIdeas = useMemo(() => {
    return [...queueIdeas].sort((a, b) => {
      const timeA = a.rawTimestamp || (a.arrivalDate ? Date.parse(a.arrivalDate) || 0 : 0);
      const timeB = b.rawTimestamp || (b.arrivalDate ? Date.parse(b.arrivalDate) || 0 : 0);
      return timeA - timeB;
    });
  }, [queueIdeas]);

  const sortedQueuedMessages = useMemo(() => {
    return (enquiryMessages || [])
      .filter((m) => m.status === 'in_queue' || (m.status as string) === 'queued')
      .sort((a, b) => (a.rawTimestamp || 0) - (b.rawTimestamp || 0));
  }, [enquiryMessages]);

  // Multi-selection of ideas from queue
  const [selectedQueueIdeaIds, setSelectedQueueIdeaIds] = useState<string[]>([]);
  const [draggedIdeaIds, setDraggedIdeaIds] = useState<string[]>([]);
  const [activeDropStationId, setActiveDropStationId] = useState<string | null>(null);
  const [activeDropPoolId, setActiveDropPoolId] = useState<string | null>(null);

  // Ingest Pulse Animation
  const [newIdeaPulse, setNewIdeaPulse] = useState(false);
  const [isAutoIngestRunning, setIsAutoIngestRunning] = useState(false);

  // Auto-Ingest Interval Simulator
  useEffect(() => {
    let timer: any;
    if (isAutoIngestRunning) {
      timer = setInterval(() => {
        onIngestNewLiveIdea();
        triggerPulse();
      }, 12000);
    }
    return () => clearInterval(timer);
  }, [isAutoIngestRunning]);

  // Auto-Message Stream Interval Simulator
  useEffect(() => {
    let timer: any;
    if (isAutoMessageStreamRunning && onSimulateNewMessage) {
      timer = setInterval(() => {
        onSimulateNewMessage();
        triggerPulse();
      }, 9000);
    }
    return () => clearInterval(timer);
  }, [isAutoMessageStreamRunning, onSimulateNewMessage]);

  const triggerPulse = () => {
    setNewIdeaPulse(true);
    setTimeout(() => setNewIdeaPulse(false), 2400);
  };

  // Pointer-based Queue Idea Dragging Engine (100% reliable inside sandboxed iframes)
  const [queuePointerDrag, setQueuePointerDrag] = useState<{
    isDragging: boolean;
    ideaIds: string[];
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [hoveredStationId, setHoveredStationId] = useState<string | null>(null);
  const [pendingRemoveStation, setPendingRemoveStation] = useState<{
    station: CanvasEvaluatorStation;
    assignedCount: number;
  } | null>(null);

  // Helper to determine exact position of idea card
  const getIdeaCardCoordinates = (
    station: CanvasEvaluatorStation,
    ideaId: string,
    idx: number
  ) => {
    if (ideaCustomPositions[ideaId]) {
      return ideaCustomPositions[ideaId];
    }
    return {
      x: station.x + 320,
      y: station.y + idx * 120,
    };
  };

  const allStationAssignedIdeaIds = useMemo(
    () => new Set(canvasStations.flatMap((s) => s.assignedIdeaIds || [])),
    [canvasStations]
  );

  const standaloneCanvasIdeas = useMemo(() => {
    if (isReviewerWorkspace) return [];
    return Object.keys(ideaCustomPositions)
      .filter((id) => !id.includes('__') && !allStationAssignedIdeaIds.has(id))
      .map((id) => {
        return (
          queueIdeas.find((i) => i.id === id) ||
          assignedIdeasMap[id] ||
          adjudicationIdeas.find((a) => a.id === id) ||
          null
        );
      })
      .filter(Boolean) as QueueIdeaItem[];
  }, [isReviewerWorkspace, ideaCustomPositions, allStationAssignedIdeaIds, queueIdeas, assignedIdeasMap, adjudicationIdeas]);

  const evaluatorCanvasIdeas = useMemo(() => {
    const promotedAdjIds = isAdjudicator
      ? new Set<string>()
      : new Set(adjudicationIdeas.map((a) => String(a.id)));
    return evaluatorCanvasIdeaIds
      .filter((id) => !promotedAdjIds.has(String(id)))
      .map(
        (id) =>
          queueIdeas.find((i) => i.id === id) ||
          assignedIdeasMap[id] ||
          adjudicationIdeas.find((a) => a.id === id)
      )
      .filter((item): item is QueueIdeaItem => {
        if (!item) return false;
        if (isAdjudicator) {
          return (item.status as string) !== 'adjudicated' && (item as any).stageId !== 'pilot_phase';
        }
        return item.status !== 'completed' && (item.status as string) !== 'adjudicated';
      });
  }, [isAdjudicator, evaluatorCanvasIdeaIds, queueIdeas, assignedIdeasMap, adjudicationIdeas]);

  const handleSendInlineComment = async (ideaId: string) => {
    const text = inlineCommentInput[ideaId];
    if (!text || !text.trim()) return;

    const matchedIdea =
      assignedIdeasMap[ideaId] ||
      queueIdeas.find((i) => i.id === ideaId) ||
      adjudicationIdeas.find((a) => a.id === ideaId);
    const senderName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'Evaluator';
    const senderRole = currentUser?.role || 'Evaluator';
    const trimmed = text.trim();

    await sendClarificationMessage(ideaId, {
      ideaTitle: matchedIdea?.title,
      innovationNumber: matchedIdea?.code,
      senderId: currentUser?.id || 1,
      senderName,
      senderRole,
      message: trimmed,
    });

    publishNotification({
      innovationId: matchedIdea?.code || ideaId,
      ideaTitle: matchedIdea?.title,
      type: 'Clarification message',
      message: `${senderName} (${senderRole}) sent a clarity message${matchedIdea?.title ? ` on "${matchedIdea.title}"` : ''}: "${trimmed.slice(0, 80)}${trimmed.length > 80 ? '...' : ''}"`,
      user: senderName,
      targetRole: 'Submitter',
    }).catch(() => { });

    setInlineCommentInput((prev) => ({ ...prev, [ideaId]: '' }));
  };

  const handleRequestDocsPrompt = async (ideaId: string, docLabel: string) => {
    const matchedIdea = assignedIdeasMap[ideaId] || queueIdeas.find((i) => i.id === ideaId);
    const senderName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'Evaluator';
    const senderRole = currentUser?.role || 'Evaluator';
    const msgText = `[OFFICIAL DOCUMENT REQUEST]: Please upload valid ${docLabel} for evaluation statutory compliance.`;

    await sendClarificationMessage(ideaId, {
      ideaTitle: matchedIdea?.title,
      innovationNumber: matchedIdea?.code,
      senderId: currentUser?.id || 1,
      senderName,
      senderRole,
      message: msgText,
    });

    publishNotification({
      innovationId: matchedIdea?.code || ideaId,
      ideaTitle: matchedIdea?.title,
      type: 'Clarification message',
      message: `${senderName} requested ${docLabel}${matchedIdea?.title ? ` for "${matchedIdea.title}"` : ''}.`,
      user: senderName,
      targetRole: 'Submitter',
    }).catch(() => { });
  };

  // Helper to determine exact position of connected message card
  const getMessageCardCoordinates = (
    station: CanvasEvaluatorStation,
    messageId: string,
    idx: number
  ) => {
    if (messageCustomPositions[messageId]) {
      return messageCustomPositions[messageId];
    }
    return {
      x: station.x + 320,
      y: station.y + idx * 128,
    };
  };

  const toggleSelectQueueMessage = (id: string) => {
    setSelectedQueueMessageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleQueueMessageMouseDown = (messageId: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) return;

    const idsToDrag = selectedQueueMessageIds.includes(messageId)
      ? selectedQueueMessageIds
      : [messageId];

    setMessagePointerDrag({
      isDragging: false,
      messageIds: idsToDrag,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    });
  };

  // -------------------------------------------------------------
  // Window Global Mouse Listeners for Silky Dragging & Queue Drops
  // -------------------------------------------------------------
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      // 1. Queue Pointer Dragging Engine
      if (queuePointerDrag) {
        const dist = Math.hypot(e.clientX - queuePointerDrag.startX, e.clientY - queuePointerDrag.startY);
        const isDragging = queuePointerDrag.isDragging || dist > 4;

        setQueuePointerDrag((prev) =>
          prev
            ? {
              ...prev,
              isDragging,
              currentX: e.clientX,
              currentY: e.clientY,
            }
            : null
        );

        if (isDragging && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const canvasX = (e.clientX - rect.left - panX) / zoom;
          const canvasY = (e.clientY - rect.top - panY) / zoom;

          let matchedStationId: string | null = null;
          for (const station of canvasStations) {
            if (
              canvasX >= station.x - 40 &&
              canvasX <= station.x + 300 &&
              canvasY >= station.y - 40 &&
              canvasY <= station.y + 280
            ) {
              matchedStationId = station.id;
              break;
            }
          }
          setHoveredStationId(matchedStationId);
          setActiveDropStationId(matchedStationId);
        }
      }

      // 2. Queue Message Pointer Dragging Engine
      if (messagePointerDrag) {
        const dist = Math.hypot(e.clientX - messagePointerDrag.startX, e.clientY - messagePointerDrag.startY);
        const isDragging = messagePointerDrag.isDragging || dist > 4;

        setMessagePointerDrag((prev) =>
          prev
            ? {
              ...prev,
              isDragging,
              currentX: e.clientX,
              currentY: e.clientY,
            }
            : null
        );

        if (isDragging && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const canvasX = (e.clientX - rect.left - panX) / zoom;
          const canvasY = (e.clientY - rect.top - panY) / zoom;

          let matchedStationId: string | null = null;
          for (const station of canvasStations) {
            if (station.user.role !== 'Agent' && station.stationType !== 'agent') continue;
            if (
              canvasX >= station.x - 40 &&
              canvasX <= station.x + 300 &&
              canvasY >= station.y - 40 &&
              canvasY <= station.y + 280
            ) {
              matchedStationId = station.id;
              break;
            }
          }
          setHoveredStationId(matchedStationId);
          setActiveDropStationId(matchedStationId);
        }
      }
      // 2. Resizing Cards or Queue Engine
      if (resizingEntity) {
        const deltaX = (e.clientX - resizingEntity.startX) / zoom;
        const deltaY = (e.clientY - resizingEntity.startY) / zoom;

        let newWidth = resizingEntity.origWidth;
        let newHeight = resizingEntity.origHeight;

        if (resizingEntity.direction === 'e' || resizingEntity.direction === 'se') {
          newWidth = Math.max(resizingEntity.minWidth, Math.round(resizingEntity.origWidth + deltaX));
        }
        if (resizingEntity.direction === 's' || resizingEntity.direction === 'se') {
          newHeight = Math.max(resizingEntity.minHeight, Math.round(resizingEntity.origHeight + deltaY));
        }

        if (resizingEntity.id === 'horizontal_queue') {
          setQueueDimensions({ width: newWidth, height: newHeight });
        } else {
          setCardCustomDimensions((prev) => ({
            ...prev,
            [resizingEntity.id]: { width: newWidth, height: newHeight },
          }));
        }
        return;
      }
    };

    const handleGlobalMouseUp = () => {
      // 0. Finish Card / Queue Resizing
      if (resizingEntity) {
        setResizingEntity(null);
        persistAdminLayoutNow();
      }

      // 1. Finish Queue Pointer Drag
      if (queuePointerDrag) {
        if (queuePointerDrag.isDragging && hoveredStationId) {
          onAssignIdeasToStation(hoveredStationId, queuePointerDrag.ideaIds);
          setSelectedQueueIdeaIds([]);
          setHoveredStationId(null);
          setActiveDropStationId(null);
        } else if (queuePointerDrag.isDragging && isReviewerWorkspace && containerRef.current) {
          setEvaluatorCanvasIdeaIds((prev) => Array.from(new Set([...prev, ...queuePointerDrag.ideaIds])));
          setIdeaCustomPositions((prev) => {
            const next = { ...prev };
            queuePointerDrag.ideaIds.forEach((id) => {
              delete next[`eval__${id}`];
              delete next[`eval__${id}__comments`];
              delete next[`eval__${id}__gate`];
              delete next[`eval__${id}__step2`];
            });
            return next;
          });
          setSelectedQueueIdeaIds([]);
          setHoveredStationId(null);
          setActiveDropStationId(null);
        } else if (!queuePointerDrag.isDragging && queuePointerDrag.ideaIds.length === 1) {
          toggleSelectIdea(queuePointerDrag.ideaIds[0]);
        }
        setQueuePointerDrag(null);
        setHoveredStationId(null);
        setActiveDropStationId(null);
      }

      // 2. Finish Queue Message Pointer Drag
      if (messagePointerDrag) {
        if (messagePointerDrag.isDragging && hoveredStationId) {
          onAssignMessagesToStation?.(hoveredStationId, messagePointerDrag.messageIds);
          setSelectedQueueMessageIds([]);
        } else if (!messagePointerDrag.isDragging && messagePointerDrag.messageIds.length === 1) {
          toggleSelectQueueMessage(messagePointerDrag.messageIds[0]);
        }
        setMessagePointerDrag(null);
        setHoveredStationId(null);
        setActiveDropStationId(null);
      }

      // 3. Finish Card Dragging (also commits reassignment if pointer released outside canvas bounds)
      if (draggingEntity) {
        handleMouseUp();
        persistAdminLayoutNow();
      }

      // 4. Finish Marquee Selection
      if (isMarqueeSelecting) {
        setIsMarqueeSelecting(false);
        setMarqueeBox(null);
      }

      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [queuePointerDrag, messagePointerDrag, hoveredStationId, draggingEntity, resizingEntity, isMarqueeSelecting, panX, panY, zoom, canvasStations, onAssignIdeasToStation, onAssignMessagesToStation]);

  // -------------------------------------------------------------
  // Mouse Handlers for Pan, Marquee Selection, and Group Dragging
  // -------------------------------------------------------------
  const handleMouseDown = (e: React.MouseEvent) => {
    if (draggingEntity || queuePointerDrag) return;

    // Pan with middle button or space/pan tool
    if (activeTool === 'pan' || e.button === 1) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - panX, y: e.clientY - panY });
      return;
    }

    // Place pending annotation/sticker on canvas when in annotate mode
    const target = e.target as HTMLElement;
    const isCanvasBg =
      target === containerRef.current ||
      target.getAttribute('data-canvas-bg') === 'true' ||
      target.classList.contains('canvas-background');

    if (e.button === 0 && activeTool === 'annotate' && pendingAnnotation && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const canvasX = Math.round((e.clientX - rect.left - panX) / zoom);
      const canvasY = Math.round((e.clientY - rect.top - panY) / zoom);
      onAddAnnotation?.({
        id: `ann-${Date.now()}`,
        type: pendingAnnotation.type,
        x: canvasX,
        y: canvasY,
        text: pendingAnnotation.text,
        subtext: pendingAnnotation.subtext,
        color: pendingAnnotation.color,
        stickerIcon: pendingAnnotation.stickerIcon,
        author: 'Administrator',
        createdAt: 'Just now',
      });
      setPendingAnnotation(null);
      setActiveTool('select');
      return;
    }

    // Left click on empty canvas with select tool starts Marquee Selection
    if (e.button === 0 && isCanvasBg && activeTool === 'select' && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const canvasX = (e.clientX - rect.left - panX) / zoom;
      const canvasY = (e.clientY - rect.top - panY) / zoom;

      setIsMarqueeSelecting(true);
      setMarqueeBox({ x1: canvasX, y1: canvasY, x2: canvasX, y2: canvasY });
      if (!e.shiftKey) {
        setSelectedGroupCardIds([]);
      }
    }
  };

  const lastCursorEmitAtRef = useRef<number>(0);

  // Publish initial/viewport center cursor position when pan/zoom settles so collaborators can spot active viewers immediately
  useEffect(() => {
    if (!onPublishCursorPosition || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = Math.round((rect.width * 0.45 - panX) / zoom);
    const centerY = Math.round((rect.height * 0.35 - panY) / zoom);
    onPublishCursorPosition(centerX, centerY);
  }, [panX, panY, zoom, !!onPublishCursorPosition]);

  const handleMouseMove = (e: React.MouseEvent) => {
    // 0. Broadcast live collaborator canvas pointer coordinates (throttled ~85ms)
    if (onPublishCursorPosition && containerRef.current) {
      const now = Date.now();
      if (now - lastCursorEmitAtRef.current >= 85) {
        lastCursorEmitAtRef.current = now;
        const rect = containerRef.current.getBoundingClientRect();
        const cx = Math.round((e.clientX - rect.left - panX) / zoom);
        const cy = Math.round((e.clientY - rect.top - panY) / zoom);
        onPublishCursorPosition(cx, cy);
      }
    }

    // 1. Group / Card Dragging
    if (draggingEntity) {
      e.preventDefault();
      e.preventDefault();
      e.stopPropagation();
      const deltaX = (e.clientX - draggingEntity.startX) / zoom;
      const deltaY = (e.clientY - draggingEntity.startY) / zoom;

      // If moving as a group
      if (draggingEntity.groupSnapshot && selectedGroupCardIds.length > 1) {
        const snapshot = draggingEntity.groupSnapshot;

        // Move all stations in group
        const stationMoves: { id: string; x: number; y: number }[] = [];
        Object.entries(snapshot.stations).forEach(([id, orig]) => {
          stationMoves.push({
            id,
            x: Math.round(orig.x + deltaX),
            y: Math.round(orig.y + deltaY),
          });
        });
        if (stationMoves.length > 0) {
          if (onBatchMoveCanvasStations) {
            onBatchMoveCanvasStations(stationMoves);
          } else {
            stationMoves.forEach((m) => onMoveCanvasStation(m.id, m.x, m.y));
          }
        }

        // Move all ideas in group
        setIdeaCustomPositions((prev) => {
          const next = { ...prev };
          Object.entries(snapshot.ideas).forEach(([id, orig]) => {
            next[id] = {
              x: Math.round(orig.x + deltaX),
              y: Math.round(orig.y + deltaY),
            };
          });
          return next;
        });

        // Move all pools in group
        setPoolCustomPositions((prev) => {
          const next = { ...prev };
          Object.entries(snapshot.pools).forEach(([id, orig]) => {
            next[id] = {
              x: Math.round(orig.x + deltaX),
              y: Math.round(orig.y + deltaY),
            };
          });
          return next;
        });

        // Move all messages in group
        setMessageCustomPositions((prev) => {
          const next = { ...prev };
          Object.entries(snapshot.messages).forEach(([id, orig]) => {
            next[id] = {
              x: Math.round(orig.x + deltaX),
              y: Math.round(orig.y + deltaY),
            };
          });
          return next;
        });
      } else {
        // Move single entity away anywhere
        const newX = Math.round(draggingEntity.origX + deltaX);
        const newY = Math.round(draggingEntity.origY + deltaY);

        if (draggingEntity.type === 'station') {
          onMoveCanvasStation(draggingEntity.id, newX, newY);
          setReassignHoverStationId(null);
        } else if (draggingEntity.type === 'idea') {
          setIdeaCustomPositions((prev) => {
            const next = { ...prev };
            next[draggingEntity.id] = { x: newX, y: newY };
            // If dragging the main idea, shift sub-cards with snapshot if present
            if (draggingEntity.groupSnapshot?.ideas) {
              Object.entries(draggingEntity.groupSnapshot.ideas).forEach(([subKey, orig]) => {
                next[subKey] = {
                  x: Math.round(orig.x + deltaX),
                  y: Math.round(orig.y + deltaY),
                };
              });
            }
            return next;
          });
          // Detect if dragged idea card overlaps another Evaluator/Adjudicator station for reassignment
          const cardCenterX = newX + 144;
          const cardCenterY = newY + 60;
          const targetStation = canvasStations.find((s) => {
            const isAgent = s.user.role === 'Agent' || s.stationType === 'agent';
            if (isAgent) return false;
            if (s.assignedIdeaIds.includes(draggingEntity.id)) return false;
            return (
              cardCenterX >= s.x - 16 &&
              cardCenterX <= s.x + 272 &&
              cardCenterY >= s.y - 16 &&
              cardCenterY <= s.y + 240
            );
          });
          setReassignHoverStationId(targetStation ? targetStation.id : null);
        } else if (draggingEntity.type === 'pool') {
          setPoolCustomPositions((prev) => ({
            ...prev,
            [draggingEntity.id]: { x: newX, y: newY },
          }));
          setReassignHoverStationId(null);
        } else if (draggingEntity.type === 'message') {
          setMessageCustomPositions((prev) => ({
            ...prev,
            [draggingEntity.id]: { x: newX, y: newY },
          }));
          setReassignHoverStationId(null);
        } else if (draggingEntity.type === 'annotation') {
          onUpdateAnnotation?.(draggingEntity.id, { x: newX, y: newY });
          setReassignHoverStationId(null);
        }
      }
      return;
    }

    // 2. Marquee Selection Drag
    if (isMarqueeSelecting && marqueeBox && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const currentCanvasX = (e.clientX - rect.left - panX) / zoom;
      const currentCanvasY = (e.clientY - rect.top - panY) / zoom;

      const updatedBox = { ...marqueeBox, x2: currentCanvasX, y2: currentCanvasY };
      setMarqueeBox(updatedBox);

      // Check which cards intersect with marquee
      const minX = Math.min(updatedBox.x1, updatedBox.x2);
      const maxX = Math.max(updatedBox.x1, updatedBox.x2);
      const minY = Math.min(updatedBox.y1, updatedBox.y2);
      const maxY = Math.max(updatedBox.y1, updatedBox.y2);

      const hitCardIds: string[] = [];

      // Check Evaluator Stations (w: 240, h: 220)
      canvasStations.forEach((station) => {
        if (
          station.x + 240 >= minX &&
          station.x <= maxX &&
          station.y + 220 >= minY &&
          station.y <= maxY
        ) {
          hitCardIds.push(station.id);
        }

        // Check each idea connected to station (w: 288, h: 120)
        station.assignedIdeaIds.forEach((ideaId, idx) => {
          const ideaPos = getIdeaCardCoordinates(station, ideaId, idx);
          if (
            ideaPos.x + 288 >= minX &&
            ideaPos.x <= maxX &&
            ideaPos.y + 120 >= minY &&
            ideaPos.y <= maxY
          ) {
            hitCardIds.push(ideaId);
          }
        });
      });

      // Check Pools (w: 288, h: 240)
      canvasPools.forEach((pool) => {
        const poolX = poolCustomPositions[pool.id]?.x ?? pool.x;
        const poolY = poolCustomPositions[pool.id]?.y ?? pool.y;
        if (
          poolX + 288 >= minX &&
          poolX <= maxX &&
          poolY + 240 >= minY &&
          poolY <= maxY
        ) {
          hitCardIds.push(pool.id);
        }
      });

      setSelectedGroupCardIds(hitCardIds);
      return;
    }

    // 3. Canvas Pan
    if (isPanning) {
      onPanChange(e.clientX - startPan.x, e.clientY - startPan.y);
    }
  };

  const dragFinalizedRef = useRef(false);

  const handleMouseUp = () => {
    if (draggingEntity && dragFinalizedRef.current) {
      return;
    }
    if (draggingEntity) {
      dragFinalizedRef.current = true;
    }
    if (draggingEntity?.type === 'idea' && reassignHoverStationId) {
      const sourceStation = canvasStations.find((s) =>
        s.assignedIdeaIds.includes(draggingEntity.id)
      );
      if (sourceStation && sourceStation.id !== reassignHoverStationId) {
        onReassignIdeaBetweenStations?.(
          draggingEntity.id,
          sourceStation.id,
          reassignHoverStationId
        );
        setIdeaCustomPositions((prev) => {
          const next = { ...prev };
          delete next[draggingEntity.id];
          return next;
        });
      } else if (!sourceStation) {
        // Unassigned standalone canvas idea dragged onto an official station card -> assign it cleanly
        onAssignIdeasToStation(reassignHoverStationId, [draggingEntity.id]);
        setIdeaCustomPositions((prev) => {
          const next = { ...prev };
          delete next[draggingEntity.id];
          return next;
        });
      }
    }
    if (draggingEntity) {
      hasInteractedWithLayoutRef.current = true;
      persistAdminLayoutNow();
    }
    setReassignHoverStationId(null);
    setIsPanning(false);
    setDraggingEntity(null);
    setIsMarqueeSelecting(false);
    setMarqueeBox(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Prevent accidental canvas panning while dragging staff or cards on trackpads/Magic Mouse
    if (draggingEntity || queuePointerDrag || messagePointerDrag || isMarqueeSelecting) {
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.4), 2.2);
      onZoomChange(newZoom);
    } else {
      onPanChange(panX - e.deltaX, panY - e.deltaY);
    }
  };

  // -------------------------------------------------------------
  // Card Drag Initiation (Supports Single Card or Entire Selected Group)
  // -------------------------------------------------------------
  const startDragCard = (
    type: 'station' | 'idea' | 'pool' | 'message' | 'annotation',
    id: string,
    currentX: number,
    currentY: number,
    e: React.MouseEvent
  ) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('select') ||
      target.closest('label')
    ) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // If holding shift, toggle selection instead of dragging
    if (e.shiftKey) {
      toggleGroupSelect(id, e);
      return;
    }

    // Check if this card is part of an active group selection
    const isInGroup = selectedGroupCardIds.includes(id);
    const activeGroup = isInGroup ? selectedGroupCardIds : [id];

    if (!isInGroup) {
      setSelectedGroupCardIds([id]);
    }

    let groupSnapshot = undefined;
    if (activeGroup.length > 1) {
      // Snapshot current positions of all items in the group
      const stationsSnap: Record<string, { x: number; y: number }> = {};
      const ideasSnap: Record<string, { x: number; y: number }> = {};
      const poolsSnap: Record<string, { x: number; y: number }> = {};
      const messagesSnap: Record<string, { x: number; y: number }> = {};

      canvasStations.forEach((s) => {
        if (activeGroup.includes(s.id)) {
          stationsSnap[s.id] = { x: s.x, y: s.y };
        }
        s.assignedIdeaIds.forEach((ideaId, idx) => {
          if (activeGroup.includes(ideaId)) {
            ideasSnap[ideaId] = getIdeaCardCoordinates(s, ideaId, idx);
          }
        });
        (s.assignedMessageIds || []).forEach((msgId, idx) => {
          if (activeGroup.includes(msgId)) {
            messagesSnap[msgId] = getMessageCardCoordinates(s, msgId, idx);
          }
        });
      });

      canvasPools.forEach((p) => {
        if (activeGroup.includes(p.id)) {
          poolsSnap[p.id] = {
            x: poolCustomPositions[p.id]?.x ?? p.x,
            y: poolCustomPositions[p.id]?.y ?? p.y,
          };
        }
      });

      groupSnapshot = {
        stations: stationsSnap,
        ideas: ideasSnap,
        pools: poolsSnap,
        messages: messagesSnap,
      };
    } else if (type === 'idea' && (!id.includes('__') || (id.startsWith('eval__') && !id.endsWith('__comments') && !id.endsWith('__gate') && !id.endsWith('__step2')))) {
      const subIdeasSnap: Record<string, { x: number; y: number }> = {};
      ['__comments', '__gate', '__step2'].forEach((suffix) => {
        const subKey = `${id}${suffix}`;
        if (ideaCustomPositions[subKey]) {
          subIdeasSnap[subKey] = { ...ideaCustomPositions[subKey] };
        }
      });
      if (Object.keys(subIdeasSnap).length > 0) {
        groupSnapshot = {
          stations: {},
          ideas: subIdeasSnap,
          pools: {},
          messages: {},
        };
      }
    }

    dragFinalizedRef.current = false;
    setDraggingEntity({
      type,
      id,
      origX: currentX,
      origY: currentY,
      startX: e.clientX,
      startY: e.clientY,
      groupSnapshot,
    });
  };

  const toggleGroupSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedGroupCardIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Start pointer dragging of ideas from queue
  const handleQueueIdeaMouseDown = (ideaId: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) return;

    const idsToDrag = selectedQueueIdeaIds.includes(ideaId)
      ? selectedQueueIdeaIds
      : [ideaId];

    setQueuePointerDrag({
      isDragging: false,
      ideaIds: idsToDrag,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    });
  };


  // -------------------------------------------------------------
  // Drag and Drop from Queue / Sidebar
  // -------------------------------------------------------------
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    const dropX = Math.round((e.clientX - rect.left - panX) / zoom);
    const dropY = Math.round((e.clientY - rect.top - panY) / zoom);

    try {
      let rawData = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text') || e.dataTransfer.getData('application/json');
      let parsed: any = null;
      if (rawData) {
        try {
          parsed = JSON.parse(rawData);
        } catch { }
      }

      if (parsed?.type === 'user') {
        onAddUserToCanvas(parsed.data, Math.max(40, dropX - 100), Math.max(40, dropY - 40));
        return;
      } else if (parsed?.type === 'tool') {
        onAddPoolToCanvas(parsed.data, Math.max(40, dropX - 150), Math.max(40, dropY - 50));
        return;
      }

      // Handle dropping ideas from Queue or Sidebar onto canvas
      let ideaIds: string[] = [];
      if (parsed?.type === 'queue_idea' && parsed.data?.id) {
        ideaIds = [parsed.data.id];
      } else if (parsed?.type === 'ideas' && Array.isArray(parsed.ideaIds)) {
        ideaIds = parsed.ideaIds;
      } else if (parsed?.ideaIds && Array.isArray(parsed.ideaIds)) {
        ideaIds = parsed.ideaIds;
      }

      if (ideaIds.length === 0 && window.__ceda_dragged_ideas && window.__ceda_dragged_ideas.length > 0) {
        ideaIds = [...window.__ceda_dragged_ideas];
      }
      if (ideaIds.length === 0 && draggedIdeaIds.length > 0) {
        ideaIds = [...draggedIdeaIds];
      }
      if (ideaIds.length === 0 && selectedQueueIdeaIds.length > 0) {
        ideaIds = [...selectedQueueIdeaIds];
      }

      if (ideaIds.length > 0) {
        if (isReviewerWorkspace) {
          setEvaluatorCanvasIdeaIds((prev) => Array.from(new Set([...prev, ...ideaIds])));
          setIdeaCustomPositions((prev) => {
            const next = { ...prev };
            ideaIds.forEach((id) => {
              delete next[`eval__${id}`];
              delete next[`eval__${id}__comments`];
              delete next[`eval__${id}__gate`];
              delete next[`eval__${id}__step2`];
            });
            return next;
          });
          setSelectedQueueIdeaIds([]);
          setDraggedIdeaIds([]);
          window.__ceda_dragged_ideas = [];
          return;
        }

        // 1. Position the idea(s) on canvas right at the drop location
        setIdeaCustomPositions((prev) => {
          const next = { ...prev };
          ideaIds.forEach((id, idx) => {
            next[id] = {
              x: Math.max(40, dropX + idx * 24),
              y: Math.max(40, dropY + idx * 30),
            };
          });
          return next;
        });

        // 2. Associate with evaluator station or first active station
        const targetStation = canvasStations.find(
          (s) => s.userId === currentUser?.id || s.stationType === 'evaluator'
        ) || canvasStations[0];

        if (targetStation) {
          onAssignIdeasToStation(targetStation.id, ideaIds);
        } else if (currentUser) {
          // If no station exists on canvas, create the evaluator station
          const evalPersonnel: AdminPersonnel = {
            id: currentUser.id,
            name: `${currentUser.firstName} ${currentUser.lastName}`.trim(),
            email: currentUser.email,
            role: (currentUser.role as any) || 'Evaluator',
            department: currentUser.department || 'Diligence',
            avatarInitials: `${currentUser.firstName[0] || ''}${currentUser.lastName[0] || ''}`.toUpperCase(),
            assignedIdeasCount: ideaIds.length,
            status: 'active',
            lastActive: 'Just now',
          };
          onAddUserToCanvas(evalPersonnel, Math.max(40, dropX - 350), Math.max(40, dropY));
        }

        setSelectedQueueIdeaIds([]);
        setDraggedIdeaIds([]);
        window.__ceda_dragged_ideas = [];
      }
    } catch (err) { }
  };

  // Robust drop handler onto Evaluator station
  const handleDropOnStation = (stationId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDropStationId(null);

    // Retrieve ideas either from dataTransfer or from state / window fallback
    let ideaIds: string[] = [];

    try {
      const text = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text') || e.dataTransfer.getData('application/json');
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed.ideaIds && Array.isArray(parsed.ideaIds) && parsed.ideaIds.length > 0) {
          ideaIds = parsed.ideaIds;
        } else if (parsed.type === 'queue_idea' && parsed.data?.id) {
          ideaIds = [parsed.data.id];
        }
      }
    } catch (err) { }

    // Fallbacks if dataTransfer was blocked by browser iframe
    if (ideaIds.length === 0 && draggedIdeaIds.length > 0) {
      ideaIds = [...draggedIdeaIds];
    }
    if (ideaIds.length === 0 && window.__ceda_dragged_ideas && window.__ceda_dragged_ideas.length > 0) {
      ideaIds = [...window.__ceda_dragged_ideas];
    }
    if (ideaIds.length === 0 && selectedQueueIdeaIds.length > 0) {
      ideaIds = [...selectedQueueIdeaIds];
    }

    if (ideaIds.length > 0) {
      onAssignIdeasToStation(stationId, ideaIds);
      setSelectedQueueIdeaIds([]);
      setDraggedIdeaIds([]);
      window.__ceda_dragged_ideas = [];
    }
  };

  // Direct Click to Assign helper
  const handleDirectAssignToStation = (stationId: string, specificIdeaId?: string) => {
    const activePool = queueTab === 'adjudication' && adjudicationIdeas.length > 0 ? adjudicationIdeas : queueIdeas;
    const idsToAssign = specificIdeaId
      ? [specificIdeaId]
      : selectedQueueIdeaIds.length > 0
        ? selectedQueueIdeaIds
        : activePool.length > 0
          ? [activePool[0].id]
          : [];

    if (idsToAssign.length > 0) {
      onAssignIdeasToStation(stationId, idsToAssign);
      setSelectedQueueIdeaIds([]);
    }
  };

  const toggleSelectIdea = (id: string) => {
    setSelectedQueueIdeaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectBatchQueueIdeas = (amount: number) => {
    if (selectedQueueIdeaIds.length === amount) {
      setSelectedQueueIdeaIds([]);
    } else {
      // Always prioritize oldest items on the far left of the FIFO queue
      setSelectedQueueIdeaIds(sortedQueueIdeas.slice(0, amount).map((i) => i.id));
    }
  };

  const selectBatchQueueMessages = (amount: number) => {
    if (selectedQueueMessageIds.length === amount) {
      setSelectedQueueMessageIds([]);
    } else {
      // Always prioritize oldest messages on the far left of the FIFO queue
      setSelectedQueueMessageIds(sortedQueuedMessages.slice(0, amount).map((m) => m.id));
    }
  };

  const scrollQueue = (direction: 'left' | 'right') => {
    if (queueScrollRef.current) {
      const offset = direction === 'left' ? -380 : 380;
      queueScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex-1 relative h-[calc(100vh-56px)] overflow-hidden flex flex-col bg-[#f8fafc]">
      {/* Admin Canvas Sub-Header Bar */}
      <div className="h-11 bg-white border-b border-[#e2e8f0] px-5 flex items-center justify-between text-xs select-none shrink-0 z-20 shadow-2xs">
        {/* Left: Active Queue & Ingest Orchestration */}
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-extrabold text-slate-800 text-xs tracking-tight">
            {workspaceTitle}
          </span>
          <span className="text-slate-300">•</span>

          {newIdeaPulse && (
            <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full animate-bounce flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-600" />
              +1 Ingest Stream Arrived!
            </span>
          )}

          {workspaceCollaborators.length > 0 && (
            <button
              type="button"
              onClick={onOpenShareWorkspace}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 text-[10.5px] font-bold cursor-pointer transition-colors"
              title="Live users collaborating on this canvas right now"
            >
              <span className="flex -space-x-1.5">
                {workspaceCollaborators.slice(0, 4).map((collab) => (
                  <span
                    key={String(collab.userId)}
                    style={{ backgroundColor: collab.color || '#006194' }}
                    className="w-4 h-4 rounded-full text-white text-[8px] font-extrabold flex items-center justify-center ring-1 ring-white"
                  >
                    {collab.userName.slice(0, 1).toUpperCase()}
                  </span>
                ))}
              </span>
              <span>
                Live ({workspaceCollaborators.length}):{' '}
                {workspaceCollaborators.map((c) => c.userName.split(' ')[0]).join(', ')}
              </span>
            </button>
          )}
        </div>

        {/* Center / Right Control Strip */}
        <div className="flex items-center gap-2">
          {/* Admin Simulation and Orchestration Controls */}
          {isAdmin && (
            <>

              {/* Auto-Ingest Siator Toggle */}
              <button
                onClick={() => setIsAutoIngestRunning(!isAutoIngestRunning)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold text-[11px] transition-colors border ${isAutoIngestRunning
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                  }`}
                title="Toggle simulated real-time stream of incoming citizen ideas every 12 seconds"
              >
                {isAutoIngestRunning ? <Pause className="w-3 h-3 text-emerald-600" /> : <Play className="w-3 h-3 text-slate-500" />}
                <span>Stream: {isAutoIngestRunning ? 'ON' : 'OFF'}</span>
              </button>

              {/* Workflow Architect */}
              <button
                onClick={onOpenWorkflowArchitect}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors border border-slate-200"
              >
                <GitFork className="w-3.5 h-3.5 text-[#006194]" />
                <span>Workflow ({workflowCycle.stages.length})</span>
              </button>

              {/* Form Builder */}
              <button
                onClick={onOpenFormBuilder}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors border border-slate-200"
              >
                <FileText className="w-3.5 h-3.5 text-purple-600" />
                <span>Forms ({applicationFields.length})</span>
              </button>

              {/* Batch Assign Shortcut */}
              <button
                onClick={() => onOpenBatchAssignModal()}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#006194] hover:bg-[#004e75] text-white font-bold text-[11px] transition-colors shadow-xs"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Assign Ideas</span>
              </button>
            </>
          )}

          {/* Undo / Redo / Save & Keyboard Shortcuts */}
          {onUndoCanvas && (
            <button
              onClick={onUndoCanvas}
              disabled={!canUndo}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-[11px] transition-colors border border-slate-200 cursor-pointer"
              title="Undo last canvas action (⌘Z / Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onRedoCanvas && (
            <button
              onClick={onRedoCanvas}
              disabled={!canRedo}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-[11px] transition-colors border border-slate-200 cursor-pointer"
              title="Redo canvas action (⌘⇧Z / Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveCanvasChanges}
            disabled={saveFeedback === 'saving'}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold text-[11px] transition-colors border cursor-pointer ${saveFeedback === 'saved'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
            title="Save workspace & canvas layout changes (⌘S / Ctrl+S)"
          >
            {saveFeedback === 'saved' ? (
              <Check className="w-3.5 h-3.5 text-white" />
            ) : (
              <Save className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>
              {saveFeedback === 'saving'
                ? 'Saving...'
                : saveFeedback === 'saved'
                  ? 'Saved'
                  : 'Save'}
            </span>
          </button>
          <button
            onClick={() => setIsShortcutsModalOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors border border-slate-200 cursor-pointer"
            title="Keyboard Shortcuts (Mac, Windows & Linux)"
          >
            <Keyboard className="w-3.5 h-3.5 text-[#006194]" />
          </button>

          {/* Share & Collaborative Workspaces */}
          {onOpenShareWorkspace && (
            <button
              onClick={onOpenShareWorkspace}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-[11px] transition-colors border border-indigo-200 cursor-pointer"
              title="Switch workspaces or invite collaborators to this workspace"
            >
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span className="max-w-[140px] truncate">{activeWorkspaceName || 'Share Workspace'}</span>
            </button>
          )}

          {/* Admin Settings & Automation Hub (Admin Only) */}
          {isAdmin && (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] transition-colors shadow-xs cursor-pointer"
              title="Centralized Admin Settings Hub"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span>Settings</span>
            </button>
          )}

          <div className="w-[1px] h-4 bg-slate-200 mx-1" />

          {/* DENSITY */}
          <div className="flex items-center gap-1">
            <span className="font-mono-code text-[10px] uppercase font-bold text-slate-400 mr-1">
              DENSITY:
            </span>
            {(['Compact', 'Normal', 'Expanded'] as CanvasDensity[]).map((d) => (
              <button
                key={d}
                onClick={() => onDensityChange(d)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${density === d
                  ? 'bg-[#006194] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex overflow-hidden relative">
        <div
          ref={containerRef}
          data-canvas-bg="true"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onDragOver={handleCanvasDragOver}
          onDrop={handleCanvasDrop}
          className={`flex-1 relative overflow-hidden overscroll-none touch-none select-none cursor-${draggingEntity ? 'grabbing' : activeTool === 'pan' ? (isPanning ? 'grabbing' : 'grab') : 'default'
            }`}
          style={(() => {
            const themeStyles: Record<string, { bg: string; img: string; size: string }> = {
              slate_dots: {
                bg: '#f8fafc',
                img: 'radial-gradient(circle, #cbd5e1 1.2px, transparent 1.2px)',
                size: '24px 24px',
              },
              blueprint: {
                bg: '#eff6ff',
                img: 'linear-gradient(to right, #bfdbfe 1px, transparent 1px), linear-gradient(to bottom, #bfdbfe 1px, transparent 1px)',
                size: '28px 28px',
              },
              warm_paper: {
                bg: '#fffbeb',
                img: 'radial-gradient(circle, #fcd34d 1.1px, transparent 1.1px)',
                size: '24px 24px',
              },
              dark_studio: {
                bg: '#0f172a',
                img: 'radial-gradient(circle, #334155 1.2px, transparent 1.2px)',
                size: '24px 24px',
              },
              clean_grid: {
                bg: '#ffffff',
                img: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)',
                size: '24px 24px',
              },
            };
            const t = themeStyles[canvasTheme] || themeStyles.slate_dots;
            return {
              backgroundColor: t.bg,
              backgroundImage: showGrid ? t.img : 'none',
              backgroundSize: t.size,
            };
          })()}
        >
          {/* Zoom / Pan Transform Container */}
          <div
            data-canvas-bg="true"
            style={{
              transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
              transformOrigin: '0 0',
              transition: isPanning || draggingEntity ? 'none' : 'transform 0.05s ease-out',
            }}
            className="absolute top-0 left-0 w-[4200px] h-[3000px] pointer-events-auto"
          >
            {/* ============================================================== */}
            {/* SVG TREE CONNECTORS LAYER                                       */}
            {/* Connects Station -> Each Connected Idea or Enquiry Card         */}
            {/* ============================================================== */}
            {showConnectors && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
                <defs>
                  <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#006194" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#d97706" stopOpacity="0.95" />
                  </linearGradient>
                  <linearGradient id="agentCurveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0f766e" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.95" />
                  </linearGradient>
                  <linearGradient id="purpleApprovalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#059669" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.95" />
                  </linearGradient>
                </defs>

                {/* Evaluator / Adjudicator Diligence Wireframe Connectors: Idea -> Comments -> Approval Gate -> Next Stage */}
                {isReviewerWorkspace && evaluatorCanvasIdeas.map((idea, rowIdx) => {
                  const { basePos, commentsPos, gatePos, step2Pos } = getEvaluatorCardPositions(idea, rowIdx);

                  // Connectors connect center-right of previous card to center-left of next card
                  const ideaSize = getCardSize(idea.id, 340, 250);
                  const commentsSize = getCardSize(`${idea.id}__comments`, 360, 320);
                  const gateSize = getCardSize(`${idea.id}__gate`, 340, 320);
                  const step2Size = getCardSize(`${idea.id}__step2`, 300, 320);

                  const start1X = basePos.x + ideaSize.width;
                  const start1Y = basePos.y + Math.min(120, ideaSize.height / 2);
                  const end1X = commentsPos.x;
                  const end1Y = commentsPos.y + Math.min(140, commentsSize.height / 2);

                  const start2X = commentsPos.x + commentsSize.width;
                  const start2Y = commentsPos.y + Math.min(140, commentsSize.height / 2);
                  const end2X = gatePos.x;
                  const end2Y = gatePos.y + Math.min(140, gateSize.height / 2);

                  const start3X = gatePos.x + gateSize.width;
                  const start3Y = gatePos.y + Math.min(140, gateSize.height / 2);
                  const end3X = step2Pos.x;
                  const end3Y = step2Pos.y + Math.min(140, step2Size.height / 2);

                  const dx1 = Math.max(25, Math.abs(end1X - start1X) * 0.45);
                  const p1 = `M ${start1X} ${start1Y} C ${start1X + dx1} ${start1Y}, ${end1X - dx1} ${end1Y}, ${end1X} ${end1Y}`;

                  const dx2 = Math.max(25, Math.abs(end2X - start2X) * 0.45);
                  const p2 = `M ${start2X} ${start2Y} C ${start2X + dx2} ${start2Y}, ${end2X - dx2} ${end2Y}, ${end2X} ${end2Y}`;

                  const dx3 = Math.max(25, Math.abs(end3X - start3X) * 0.45);
                  const p3 = `M ${start3X} ${start3Y} C ${start3X + dx3} ${start3Y}, ${end3X - dx3} ${end3Y}, ${end3X} ${end3Y}`;

                  const isApproved = isAdjudicator
                    ? ((idea.status as string) === 'adjudicated' || (idea as any).stageId === 'pilot_phase')
                    : (idea.status === 'completed' || adjudicationIdeas.some((i) => i.id === idea.id));

                  return (
                    <g key={`eval-wire-${idea.id}`}>
                      {/* Wire 1: Idea Card -> Comments */}
                      <path d={p1} fill="none" stroke="url(#curveGradient)" strokeWidth="2.5" />
                      <circle cx={start1X} cy={start1Y} r="4.5" fill="#006194" />
                      <circle cx={end1X} cy={end1Y} r="4.5" fill="#d97706" />

                      {/* Wire 2: Comments -> Approval Gate */}
                      <path d={p2} fill="none" stroke="url(#curveGradient)" strokeWidth="2.5" />
                      <circle cx={start2X} cy={start2Y} r="4.5" fill="#d97706" />
                      <circle cx={end2X} cy={end2Y} r="4.5" fill="#059669" />

                      {/* Wire 3: Approval Gate -> Step 2 */}
                      <path
                        d={p3}
                        fill="none"
                        stroke={isApproved ? 'url(#purpleApprovalGradient)' : '#cbd5e1'}
                        strokeWidth="2.5"
                        strokeDasharray={isApproved ? 'none' : '4 3'}
                      />
                      <circle cx={start3X} cy={start3Y} r="4.5" fill={isApproved ? '#059669' : '#94a3b8'} />
                      <circle cx={end3X} cy={end3Y} r="4.5" fill={isApproved ? '#7c3aed' : '#94a3b8'} />
                    </g>
                  );
                })}

                {/* Administrator / Agent Station Connectors */}
                {!isReviewerWorkspace && canvasStations.map((station) => {
                  const userCardWidth = 256;
                  const userCardHeight = 175;
                  const userAnchorX = station.x + userCardWidth;
                  const userAnchorY = station.y + userCardHeight / 2;

                  const isAgentStation = station.user.role === 'Agent' || station.stationType === 'agent';

                  if (isAgentStation) {
                    const assignedMsgs = (station.assignedMessageIds || [])
                      .map((id) => enquiryMessages.find((m) => m.id === id && m.status === 'assigned'))
                      .filter(Boolean) as SubmitterEnquiryMessage[];

                    if (assignedMsgs.length === 0) return null;

                    return (
                      <g key={`connectors-agent-${station.id}`}>
                        {assignedMsgs.map((msg, idx) => {
                          const msgPos = getMessageCardCoordinates(station, msg.id, idx);
                          const msgAnchorX = msgPos.x;
                          const msgAnchorY = msgPos.y + 45;

                          const dx = msgAnchorX - userAnchorX;
                          const controlOffset = Math.max(35, Math.min(180, Math.abs(dx) * 0.45));
                          const cp1X = dx >= 0 ? userAnchorX + controlOffset : userAnchorX - controlOffset;
                          const cp2X = dx >= 0 ? msgAnchorX - controlOffset : msgAnchorX + controlOffset;
                          const pathD = `M ${userAnchorX} ${userAnchorY} C ${cp1X} ${userAnchorY}, ${cp2X} ${msgAnchorY}, ${msgAnchorX} ${msgAnchorY}`;

                          return (
                            <g key={`path-${station.id}-${msg.id}`}>
                              <path
                                d={pathD}
                                fill="none"
                                stroke="url(#agentCurveGradient)"
                                strokeWidth="2.5"
                                strokeDasharray="4 3"
                                className="transition-all duration-150"
                              />
                              <circle cx={userAnchorX} cy={userAnchorY} r="4.5" fill="#0f766e" />
                              <circle cx={msgAnchorX} cy={msgAnchorY} r="4.5" fill="#14b8a6" />
                            </g>
                          );
                        })}
                      </g>
                    );
                  }

                  const assignedList = station.assignedIdeaIds
                    .map((id) => assignedIdeasMap[id])
                    .filter(Boolean);

                  if (assignedList.length === 0) return null;

                  return (
                    <g key={`connectors-${station.id}`}>
                      {assignedList.map((idea, idx) => {
                        const ideaPos = getIdeaCardCoordinates(station, idea.id, idx);
                        const ideaAnchorX = ideaPos.x;
                        const ideaAnchorY = ideaPos.y + 45;

                        const dx = ideaAnchorX - userAnchorX;
                        const controlOffset = Math.max(35, Math.min(180, Math.abs(dx) * 0.45));
                        const cp1X = dx >= 0 ? userAnchorX + controlOffset : userAnchorX - controlOffset;
                        const cp2X = dx >= 0 ? ideaAnchorX - controlOffset : ideaAnchorX + controlOffset;
                        const pathD = `M ${userAnchorX} ${userAnchorY} C ${cp1X} ${userAnchorY}, ${cp2X} ${ideaAnchorY}, ${ideaAnchorX} ${ideaAnchorY}`;

                        return (
                          <g key={`path-${station.id}-${idea.id}`}>
                            <path
                              d={pathD}
                              fill="none"
                              stroke="url(#curveGradient)"
                              strokeWidth="2.5"
                              strokeDasharray={idea.progress === 100 ? 'none' : '4 3'}
                              className="transition-all duration-150"
                            />
                            <circle cx={userAnchorX} cy={userAnchorY} r="4.5" fill="#006194" />
                            <circle cx={ideaAnchorX} cy={ideaAnchorY} r="4.5" fill="#d97706" />
                          </g>
                        );
                      })}
                    </g>
                  );
                })}
              </svg>
            )}

            {/* ============================================================== */}
            {/* 1. HORIZONTAL QUEUE CAROUSEL                                   */}
            {/* FIFO Layout: Oldest on Left, Newest on Right (Dual Track)      */}
            {/* ============================================================== */}
            {(() => {
              const queuedMessages = sortedQueuedMessages;

              const availableAgents = personnel.filter(
                (p) => p.role === 'Agent' && p.status === 'active' && p.agentAvailability !== 'offline' && p.agentAvailability !== 'busy'
              );

              return (
                <div
                  style={{
                    left: 24,
                    top: 20,
                    width: queueDimensions.width,
                    maxWidth: 'calc(100vw - 120px)',
                    height: isQueueCollapsed ? 'auto' : queueDimensions.height,
                  }}
                  className="absolute bg-white/95 backdrop-blur-md border-2 border-slate-300 rounded-2xl shadow-xl z-20 flex flex-col overflow-hidden transition-all duration-75 group"
                >
                  {/* Horizontal Queue Top Bar */}
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#006194] animate-pulse" />
                        <h3 className="font-black text-slate-900 text-sm tracking-tight">Intake Queues</h3>
                      </div>

                      {/* Dual-Track Tabs: Ideas vs Citizen Enquiry Messages (Enquiries restricted to Admin & Agent) */}
                      <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300 text-xs">
                        <button
                          onClick={() => setQueueTab('ideas')}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all ${queueTab === 'ideas'
                            ? 'bg-white text-[#006194] shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                          <span>💡 Ideas Queue</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono-code ${queueTab === 'ideas' ? 'bg-sky-100 text-[#006194]' : 'bg-slate-300 text-slate-700'
                            }`}>
                            {sortedQueueIdeas.length}
                          </span>
                        </button>

                        {canViewEnquiries && (
                          <button
                            onClick={() => setQueueTab('messages')}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all ${queueTab === 'messages'
                              ? 'bg-white text-teal-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                              }`}
                          >
                            <Headphones className="w-3 h-3 text-teal-600" />
                            <span>Citizen Enquiries</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono-code ${queueTab === 'messages' ? 'bg-teal-100 text-teal-800' : 'bg-slate-300 text-slate-700'
                              }`}>
                              {queuedMessages.length}
                            </span>
                          </button>
                        )}

                        {/* 3. Adjudication Queue Tab (Available to both Admin & Evaluators) */}
                        <button
                          onClick={() => setQueueTab('adjudication')}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all ${queueTab === 'adjudication'
                            ? 'bg-white text-purple-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                          <Award className="w-3 h-3 text-purple-600" />
                          <span>Adjudication Queue</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono-code ${queueTab === 'adjudication' ? 'bg-purple-100 text-purple-800' : 'bg-slate-300 text-slate-700'
                            }`}>
                            {adjudicationIdeas.length}
                          </span>
                        </button>
                      </div>

                      {/* FIFO Directional Guide Banner */}
                      <span className="hidden xl:inline-flex items-center gap-1 text-[10.5px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        <span className="text-[#006194]">← Oldest (1st Served)</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-amber-700">Newest Ingest →</span>
                      </span>

                      {/* Direct Click-to-Assign Shortcut if ideas are selected (Admin Only) */}
                      {isAdmin && queueTab === 'ideas' && selectedQueueIdeaIds.length > 0 && canvasStations.length > 0 && (
                        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-900 animate-in fade-in">
                          <span>Assign {selectedQueueIdeaIds.length} to:</span>
                          {canvasStations.slice(0, 3).map((st) => (
                            <button
                              key={st.id}
                              onClick={() => handleDirectAssignToStation(st.id)}
                              className="px-2 py-0.5 bg-[#006194] hover:bg-[#004e75] text-white text-[10.5px] rounded transition-colors shadow-2xs active:scale-95"
                            >
                              {st.user.name.split(' ')[0]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Carousel Controls & Selection Presets / Auto-Dispatch */}
                    <div className="flex items-center gap-2">
                      {queueTab === 'ideas' ? (
                        <>
                          {isAdmin && onBatchScreenQueueIdeas && (
                            <button
                              type="button"
                              onClick={onBatchScreenQueueIdeas}
                              disabled={isBatchScreening || sortedQueueIdeas.length === 0}
                              className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white shadow-xs transition-all cursor-pointer"
                              title="Automatically verify all queued ideas against CIPA Company Registry (cipaget) & BURS Tax Clearance"
                            >
                              <ShieldCheck className={`w-3.5 h-3.5 ${isBatchScreening ? 'animate-spin' : ''}`} />
                              <span>
                                {isBatchScreening ? 'Screening...' : 'Screen Queue (CIPA & BURS)'}
                              </span>
                            </button>
                          )}
                          {isAdmin && onToggleAutoScreenOnIngest && (
                            <button
                              type="button"
                              onClick={onToggleAutoScreenOnIngest}
                              className={`flex items-center gap-1 text-[10.5px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${autoScreenOnIngest
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              title="Automatically run CIPA & BURS screening whenever a new idea enters the queue"
                            >
                              <Zap className={`w-3 h-3 ${autoScreenOnIngest ? 'text-emerald-600' : 'text-slate-400'}`} />
                              <span>Auto-Screen: {autoScreenOnIngest ? 'ON' : 'OFF'}</span>
                            </button>
                          )}
                          <button
                            onClick={() => selectBatchQueueIdeas(3)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${selectedQueueIdeaIds.length === 3
                              ? 'bg-[#006194] text-white shadow-xs'
                              : 'bg-slate-200/80 hover:bg-slate-200 text-slate-700'
                              }`}
                            title="Select 3 ideas (Matching wireframe sketch: drag & drop 3 items)"
                          >
                            Select 3
                          </button>
                          <button
                            onClick={() => selectBatchQueueIdeas(5)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${selectedQueueIdeaIds.length === 5
                              ? 'bg-[#006194] text-white shadow-xs'
                              : 'bg-slate-200/80 hover:bg-slate-200 text-slate-700'
                              }`}
                          >
                            Select 5
                          </button>
                          <button
                            onClick={() => selectBatchQueueIdeas(10)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${selectedQueueIdeaIds.length === 10
                              ? 'bg-[#006194] text-white shadow-xs'
                              : 'bg-slate-200/80 hover:bg-slate-200 text-slate-700'
                              }`}
                          >
                            Select 10
                          </button>
                          {selectedQueueIdeaIds.length > 0 && (
                            <button
                              onClick={() => setSelectedQueueIdeaIds([])}
                              className="text-[11px] font-bold px-2 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                            >
                              Clear
                            </button>
                          )}
                        </>
                      ) : (
                        /* Message Queue Controls: Simulation & Auto-Dispatch Engine Indicator */
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => selectBatchQueueMessages(3)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${selectedQueueMessageIds.length === 3
                              ? 'bg-teal-600 text-white shadow-xs'
                              : 'bg-slate-200/80 hover:bg-slate-200 text-slate-700'
                              }`}
                            title="Select 3 oldest messages from the front (far left) of the queue"
                          >
                            Select 3
                          </button>
                          {onSimulateNewMessage && (
                            <button
                              onClick={() => {
                                onSimulateNewMessage();
                                triggerPulse();
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-all cursor-pointer"
                              title="Simulate a new citizen enquiry entering the Admin Queue"
                            >
                              <PlusCircle className="w-3.5 h-3.5 text-teal-600" />
                              <span>+1 Message</span>
                            </button>
                          )}
                          <button
                            onClick={() => setIsAutoMessageStreamRunning(!isAutoMessageStreamRunning)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${isAutoMessageStreamRunning
                              ? 'bg-teal-600 text-white border-teal-700'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                              }`}
                            title="Simulate incoming citizen messages every 9 seconds"
                          >
                            {isAutoMessageStreamRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                            <span>Sim Stream</span>
                          </button>
                          <button
                            onClick={onToggleAutoDispatch}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${autoDispatchEnabled
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                              }`}
                            title="Toggle automatic assignment vs Admin Queue manual assignment (configured in Settings)"
                          >
                            <Zap className={`w-3.5 h-3.5 ${autoDispatchEnabled ? 'text-emerald-600 animate-pulse' : 'text-amber-600'}`} />
                            <span>{autoDispatchEnabled ? 'Auto-Dispatch: ON' : 'Admin Queue: Manual'}</span>
                          </button>
                          <span className="text-[10.5px] text-slate-500 font-medium">
                            {availableAgents.length} Agents • Max {maxChatsPerAgent}/agent
                          </span>
                        </div>
                      )}

                      <div className="w-[1px] h-4 bg-slate-200 mx-1" />

                      {/* Left & Right Scroll Buttons */}
                      <button
                        onClick={() => scrollQueue('left')}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs cursor-pointer"
                        title="Scroll left towards oldest items"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => scrollQueue('right')}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs cursor-pointer"
                        title="Scroll right towards newest items"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>

                      {/* Minimize / Expand Queue Carousel Track */}
                      <button
                        type="button"
                        onClick={() => setIsQueueCollapsed((prev) => !prev)}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                        title={isQueueCollapsed ? "Expand Queue Carousel" : "Minimize Queue Carousel"}
                      >
                        {isQueueCollapsed ? <ChevronDown className="w-4 h-4 text-[#006194]" /> : <ChevronUp className="w-4 h-4 text-slate-600" />}
                        <span className="hidden sm:inline">{isQueueCollapsed ? "Expand Queue" : "Minimize"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Horizontal Scrollable Carousel Track */}
                  {!isQueueCollapsed && (
                    <div
                      ref={queueScrollRef}
                      className="p-3.5 flex flex-row gap-3 overflow-x-auto scrollbar-thin scroll-smooth select-none items-stretch"
                      style={{ scrollbarWidth: 'thin' }}
                    >
                      {/* Track 1: IDEAS QUEUE */}
                      {queueTab === 'ideas' && (
                        sortedQueueIdeas.length === 0 ? (
                          <div className="w-full py-6 text-center text-slate-400">
                            <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
                            <p className="text-xs font-bold text-slate-700">All incoming ideas assigned!</p>
                          </div>
                        ) : (
                          sortedQueueIdeas.map((idea, index) => {
                            const isSelected = selectedQueueIdeaIds.includes(idea.id);

                            return (
                              <div
                                key={idea.id}
                                draggable={true}
                                onMouseDown={(e) => handleQueueIdeaMouseDown(idea.id, e)}
                                onDragStart={(e) => {
                                  const idsToDrag = selectedQueueIdeaIds.includes(idea.id)
                                    ? selectedQueueIdeaIds
                                    : [idea.id];
                                  setDraggedIdeaIds(idsToDrag);
                                  window.__ceda_dragged_ideas = idsToDrag;

                                  const payload = JSON.stringify({ type: 'ideas', ideaIds: idsToDrag });
                                  e.dataTransfer.setData('text/plain', payload);
                                  e.dataTransfer.setData('text', payload);
                                  e.dataTransfer.setData('application/json', payload);
                                  e.dataTransfer.effectAllowed = 'copyMove';
                                }}
                                onDragEnd={() => {
                                  setDraggedIdeaIds([]);
                                }}
                                onClick={() => toggleSelectIdea(idea.id)}
                                className={`w-64 min-w-[256px] p-3 rounded-xl border flex flex-col justify-between transition-all cursor-grab active:cursor-grabbing select-none text-xs shrink-0 ${isSelected
                                  ? 'bg-sky-50/95 border-[#006194] ring-2 ring-[#006194]/40 shadow-md scale-102'
                                  : 'bg-white border-slate-200 hover:border-[#006194]/50 shadow-2xs hover:shadow-xs'
                                  }`}
                              >
                                {/* Top: Arrival Rank, Time Date Arrived & Code */}
                                <div>
                                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono-code font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded">
                                        {idea.code}
                                      </span>
                                      <span className="text-[9px] font-bold text-slate-400">
                                        #{index + 1} FIFO
                                      </span>
                                    </div>
                                    <span className="flex items-center gap-1 font-semibold text-slate-500">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      {idea.arrivalDate}
                                    </span>
                                  </div>

                                  {/* Idea Title */}
                                  <h4 className="font-bold text-slate-900 leading-snug line-clamp-2 mt-1">
                                    {idea.title}
                                  </h4>
                                  {(idea.enterpriseName ||
                                    (idea.screening?.cipaMatch?.companyName &&
                                      idea.screening.cipaMatch.companyName !== 'No Registered Company / Entity Provided')) && (
                                      <div className="text-[10px] font-semibold text-slate-600 truncate mt-0.5">
                                        🏢 {idea.enterpriseName || idea.screening?.cipaMatch?.companyName}
                                      </div>
                                    )}

                                  {/* Stage 2 Statutory Screening Status Badge & Manual Inspector Trigger (Admin Only) */}
                                  {isAdmin && (
                                    <div className="mt-1.5 flex items-center justify-between gap-1.5">
                                      {idea.screening?.status === 'verified' ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 truncate">
                                          <span>🟢 CIPA + BURS Verified</span>
                                        </span>
                                      ) : idea.screening?.status === 'partial' ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 truncate">
                                          <span>🟡 Partial / Review Needed</span>
                                        </span>
                                      ) : idea.screening?.status === 'failed' ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 truncate">
                                          <span>🔴 Not Registered / Failed</span>
                                        </span>
                                      ) : idea.screening?.status === 'docs_requested' ? (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-orange-50 text-orange-800 border border-orange-200 truncate">
                                          <span>📩 Statutory Docs Req.</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-slate-100 text-slate-500 border border-slate-200 truncate">
                                          <span>Unscreened (Stage 2)</span>
                                        </span>
                                      )}

                                      {onOpenStatutoryScreening && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onOpenStatutoryScreening(idea);
                                          }}
                                          className="px-1.5 py-0.5 rounded bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white border border-purple-200 font-bold text-[9.5px] transition-colors shrink-0 cursor-pointer"
                                          title="Open Stage 2 Statutory & Tax Screening Console (CIPA & BURS)"
                                        >
                                          Verify CIPA / BURS
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Footer: Category & Direct Assign Dropdown Shortcut */}
                                <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between text-[10px]">
                                  <span className="text-slate-500 font-medium truncate max-w-[110px]">
                                    {idea.category}
                                  </span>

                                  <div className="flex items-center gap-1">
                                    <span
                                      className={`font-extrabold px-1.5 py-0.2 rounded border ${idea.urgency === 'Fast-Track'
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : idea.urgency === 'Priority'
                                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                                          : 'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}
                                    >
                                      {idea.urgency}
                                    </span>

                                    {isAdmin && canvasStations.length > 0 && (
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleDirectAssignToStation(canvasStations[0].id, idea.id);
                                        }}
                                        title={
                                          enforceStatutoryGate && idea.screening?.status !== 'verified'
                                            ? 'Blocked: Must pass Stage 2 CIPA & BURS Statutory Screening first (or toggle in Settings)'
                                            : `Assign directly to ${canvasStations[0].user.name}`
                                        }
                                        className={`px-2 py-0.5 rounded font-bold text-[10px] transition-colors shadow-2xs cursor-pointer ${enforceStatutoryGate && idea.screening?.status !== 'verified'
                                          ? 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-rose-50 hover:text-rose-700'
                                          : 'bg-sky-100 hover:bg-[#006194] text-[#006194] hover:text-white'
                                          }`}
                                      >
                                        {enforceStatutoryGate && idea.screening?.status !== 'verified'
                                          ? '🔒 Assign'
                                          : '→ Assign'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )
                      )}

                      {/* Track 2: CITIZEN ENQUIRY MESSAGES QUEUE (FIFO: Oldest Left, Newest Right) */}
                      {queueTab === 'messages' && (
                        queuedMessages.length === 0 ? (
                          <div className="w-full py-6 text-center text-slate-400">
                            <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-teal-500" />
                            <p className="text-xs font-bold text-slate-700">Admin Message Queue is clear!</p>
                            <p className="text-[10.5px] text-slate-400 mt-0.5">
                              {autoDispatchEnabled
                                ? 'Auto-dispatch is ON — new enquiries route automatically to available agents'
                                : 'Click "+1 Message" or "Simulate Enquiry (+1)" to test incoming citizen enquiries'}
                            </p>
                          </div>
                        ) : (
                          queuedMessages.map((msg, index) => {
                            const isMsgSelected = selectedQueueMessageIds.includes(msg.id);
                            return (
                              <div
                                key={msg.id}
                                onMouseDown={(e) => handleQueueMessageMouseDown(msg.id, e)}
                                onClick={() => toggleSelectQueueMessage(msg.id)}
                                className={`w-72 min-w-[288px] p-3 rounded-xl border flex flex-col justify-between transition-all shrink-0 text-xs cursor-grab active:cursor-grabbing select-none ${isMsgSelected
                                  ? 'bg-teal-50/90 border-teal-600 ring-2 ring-teal-500/40 shadow-md'
                                  : 'border-teal-200 bg-white hover:border-teal-400 shadow-2xs hover:shadow-xs'
                                  }`}
                              >
                                <div>
                                  {/* Header: Submitter info and FIFO Rank */}
                                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                                    <span className="font-extrabold text-teal-900 bg-teal-50 border border-teal-200 px-1.5 py-0.2 rounded">
                                      #{index + 1} in Admin Queue
                                    </span>
                                    <span className="flex items-center gap-1 font-semibold text-slate-500">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      {msg.arrivalTime}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                                      {msg.submitterName.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div className="truncate">
                                      <h4 className="font-bold text-slate-900 text-xs truncate">
                                        {msg.submitterName}
                                      </h4>
                                      <span className="text-[9.5px] text-slate-400 truncate block">
                                        {msg.submitterLocation}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Subject & Snippet */}
                                  <h5 className="font-bold text-slate-800 text-[11px] mt-1 line-clamp-1">
                                    {msg.subject}
                                  </h5>
                                  <p className="text-[10.5px] text-slate-600 line-clamp-2 mt-0.5 leading-snug">
                                    {msg.messageText}
                                  </p>

                                  {msg.ideaCode && (
                                    <span className="inline-block mt-1 font-mono-code text-[9.5px] font-bold text-sky-800 bg-sky-50 border border-sky-200 px-1.5 py-0.2 rounded">
                                      Ref: {msg.ideaCode}
                                    </span>
                                  )}
                                </div>

                                {/* Footer: Quick Assign to Available Agents (or Drag to Agent Station) */}
                                <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between text-[10px]">
                                  <span className={`font-extrabold px-1.5 py-0.2 rounded border ${msg.priority === 'Urgent' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}>
                                    {msg.priority}
                                  </span>

                                  <div className="flex items-center gap-1">
                                    {availableAgents.length === 0 ? (
                                      <span className="text-[9.5px] text-amber-700 font-bold">No Agents Free</span>
                                    ) : (
                                      availableAgents.slice(0, 2).map((agent) => (
                                        <button
                                          key={agent.id}
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onAssignMessageToAgent?.(msg.id, agent.id);
                                          }}
                                          title={`Assign enquiry to ${agent.name}`}
                                          className="px-2 py-0.5 bg-teal-50 hover:bg-teal-600 text-teal-800 hover:text-white rounded font-bold text-[10px] border border-teal-200 transition-colors shadow-2xs cursor-pointer"
                                        >
                                          → {agent.name.split(' ')[0]}
                                        </button>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )
                      )}

                      {/* Track 3: ADJUDICATION QUEUE (Accessible to Admin, Evaluators & Adjudicators) */}
                      {queueTab === 'adjudication' && (
                        adjudicationIdeas.length === 0 ? (
                          <div className="w-full py-6 text-center text-slate-400">
                            <Award className="w-6 h-6 mx-auto mb-1 text-purple-400" />
                            <p className="text-xs font-bold text-slate-700">Adjudication Queue is clear</p>
                            <p className="text-[10.5px] text-slate-400 mt-0.5">
                              Proposals approved through technical evaluation will stream here for board review.
                            </p>
                          </div>
                        ) : (
                          adjudicationIdeas.map((idea) => {
                            const isSelected = selectedQueueIdeaIds.includes(idea.id);
                            const targetAdjStation =
                              canvasStations.find((s) => s.user.role === 'Adjudicator') || canvasStations[0];
                            return (
                              <div
                                key={`adj-card-${idea.id}`}
                                draggable={true}
                                onMouseDown={(e) => handleQueueIdeaMouseDown(idea.id, e)}
                                onDragStart={(e) => {
                                  const idsToDrag = selectedQueueIdeaIds.includes(idea.id)
                                    ? selectedQueueIdeaIds
                                    : [idea.id];
                                  setDraggedIdeaIds(idsToDrag);
                                  window.__ceda_dragged_ideas = idsToDrag;

                                  const payload = JSON.stringify({ type: 'ideas', ideaIds: idsToDrag });
                                  e.dataTransfer.setData('text/plain', payload);
                                  e.dataTransfer.setData('text', payload);
                                  e.dataTransfer.setData('application/json', payload);
                                  e.dataTransfer.effectAllowed = 'copyMove';
                                }}
                                onDragEnd={() => {
                                  setDraggedIdeaIds([]);
                                }}
                                onClick={() => toggleSelectIdea(idea.id)}
                                className={`w-72 min-w-[288px] p-3 rounded-xl border flex flex-col justify-between shrink-0 transition-all cursor-grab active:cursor-grabbing select-none text-xs ${isSelected
                                  ? 'bg-purple-100/80 border-purple-600 ring-2 ring-purple-500/40 shadow-md scale-102'
                                  : 'border-purple-200 bg-purple-50/40 hover:border-purple-400 shadow-2xs hover:shadow-xs'
                                  }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between text-[10px] mb-1">
                                    <span className="font-mono-code font-bold text-purple-900 bg-purple-100 px-1.5 py-0.2 rounded border border-purple-200">
                                      {idea.code || idea.id}
                                    </span>
                                    <span className="text-purple-700 font-extrabold bg-purple-100/90 border border-purple-200 px-2 py-0.5 rounded-full flex items-center gap-1 text-[9.5px]">
                                      <CheckCircle2 className="w-3 h-3 text-purple-600" />
                                      Ready for Board
                                    </span>
                                  </div>
                                  <h4 className="font-bold text-slate-900 leading-snug line-clamp-2 mt-1">
                                    {idea.title}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                    {idea.enterpriseName || idea.submitterName || 'Promoter Profile'}
                                  </p>
                                </div>
                                <div className="pt-2 border-t border-purple-100 mt-2 flex items-center justify-between gap-1.5 text-[10.5px]">
                                  <div>
                                    <span className="text-slate-400 text-[9.5px] block">Capital Demand</span>
                                    <span className="font-mono-code font-bold text-slate-800">
                                      {new Intl.NumberFormat('en-BW', { style: 'currency', currency: 'BWP', maximumFractionDigits: 0 }).format(idea.capitalAsk || 0)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onOpenDossier?.(idea.id);
                                      }}
                                      className="px-2 py-1 bg-white hover:bg-purple-50 text-purple-800 border border-purple-200 rounded-md font-bold text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                                    >
                                      <FileText className="w-3 h-3" />
                                      <span>Dossier</span>
                                    </button>
                                    {isAdmin && targetAdjStation && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleDirectAssignToStation(targetAdjStation.id, idea.id);
                                        }}
                                        title={`Assign directly to ${targetAdjStation.user.name} (${targetAdjStation.user.role})`}
                                        className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-bold text-[10px] transition-colors shadow-2xs cursor-pointer"
                                      >
                                        → Assign
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )
                      )}
                    </div>
                  )}

                  {/* Horizontal Queue Resizing Handles */}
                  {!isQueueCollapsed && (
                    <>
                      <div
                        onMouseDown={(e) => startResize('horizontal_queue', 'e', queueDimensions.width, queueDimensions.height, 500, 160, e)}
                        className="absolute top-0 right-0 w-2.5 h-full cursor-e-resize hover:bg-[#006194]/30 z-30 transition-colors"
                        title="Drag border to resize queue width"
                      />
                      <div
                        onMouseDown={(e) => startResize('horizontal_queue', 's', queueDimensions.width, queueDimensions.height, 500, 160, e)}
                        className="absolute bottom-0 left-0 w-full h-2.5 cursor-s-resize hover:bg-[#006194]/30 z-30 transition-colors"
                        title="Drag border to resize queue height"
                      />
                      <div
                        onMouseDown={(e) => startResize('horizontal_queue', 'se', queueDimensions.width, queueDimensions.height, 500, 160, e)}
                        className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize hover:bg-[#006194]/40 z-30 flex items-end justify-end p-1 text-slate-400 hover:text-[#006194] transition-colors"
                        title="Drag corner to resize queue width and height"
                      >
                        <svg className="w-3 h-3 opacity-60" viewBox="0 0 6 6" fill="currentColor">
                          <path d="M6 6H4V4H6V6ZM6 2H4V0H6V2ZM2 6H0V4H2V6Z" />
                        </svg>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* ============================================================== */}
            {/* EVALUATOR / ADJUDICATOR DILIGENCE WIREFRAME WORKSPACE          */}
            {/* 1. Idea Intake Header -> 4 Columns of Evaluation / Board Flow  */}
            {/* ============================================================== */}
            {isReviewerWorkspace && (
              evaluatorCanvasIdeas.length === 0 ? (
                /* Empty Droppable Target on Canvas */
                <div
                  style={{ left: 80, top: 80 }}
                  className="absolute w-[560px] p-8 border-2 border-dashed border-amber-300 rounded-3xl bg-amber-50/50 text-center select-none shadow-xs z-20"
                >
                  <div className="w-12 h-12 mx-auto mb-3 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-800 shadow-2xs">
                    <Sparkles className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {isAdjudicator ? 'Your Board Adjudication Canvas is Ready' : 'Your Technical Diligence Canvas is Ready'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                    Drag any proposal from the <strong>{isAdjudicator ? 'Assigned Adjudications' : 'Assigned Evaluations'}</strong> sidebar on the left or the <strong>Ideas Queue</strong> above and drop it here onto the canvas.
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-amber-200 text-amber-900 font-bold text-[11px] shadow-2xs">
                    <span>● 1. Idea Intake</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                    <span>Comments & Clarity</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                    <span>Approval Gate</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isAdjudicator ? 'Pilot Phase' : 'Adjudication Queue'}</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Top Header Pill: 1. Idea Intake with Active Count & Options Menu (Draggable) */}
                  {(() => {
                    const rawHeader = ideaCustomPositions['__intake_header__'];
                    const headerPos = (rawHeader && (!isQueueCollapsed && rawHeader.y < 240 ? { x: rawHeader.x, y: 255 } : rawHeader)) || {
                      x: 60,
                      y: isQueueCollapsed ? 80 : 255,
                    };
                    return (
                      <div
                        style={{ left: headerPos.x, top: headerPos.y }}
                        onMouseDown={(e) => startDragCard('idea', '__intake_header__', headerPos.x, headerPos.y, e)}
                        className="absolute z-25 flex items-center gap-3 bg-white border-2 border-slate-200 hover:border-[#006194] shadow-md hover:shadow-lg px-4 py-2 rounded-full select-none cursor-move group transition-all"
                        title="Click and drag to move '1. Idea Intake' heading anywhere on canvas"
                      >
                        <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#006194] transition-colors" />
                        <span className="w-2.5 h-2.5 rounded-full bg-[#006194] animate-pulse" />
                        <span className="font-bold text-xs text-slate-900 tracking-tight">1. Idea Intake</span>
                        <span className="bg-sky-100 text-[#006194] font-mono-code font-bold text-[11px] px-2.5 py-0.5 rounded-full">
                          {evaluatorCanvasIdeas.length} Active
                        </span>
                        <button
                          type="button"
                          title="Intake Options"
                          className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })()}

                  {/* Each Dropped Idea and its 4-Column Flow */}
                  {evaluatorCanvasIdeas.map((idea, rowIdx) => {
                    const { basePos, commentsPos, gatePos, step2Pos } = getEvaluatorCardPositions(idea, rowIdx);
                    const ideaSize = getCardSize(idea.id, 340, 250);
                    const commentsSize = getCardSize(`${idea.id}__comments`, 360, 320);
                    const gateSize = getCardSize(`${idea.id}__gate`, 340, 320);
                    const step2Size = getCardSize(`${idea.id}__step2`, 300, 320);

                    const comments = ideaCommentsMap[idea.id] || [];
                    const isApproved = isAdjudicator
                      ? ((idea.status as string) === 'adjudicated' || (idea as any).stageId === 'pilot_phase')
                      : (idea.status === 'completed' || adjudicationIdeas.some((i) => i.id === idea.id));
                    const currentComment = inlineCommentInput[idea.id] || '';
                    const hasDetachedSubCards = Boolean(
                      ideaCustomPositions[`eval__${idea.id}`] ||
                      ideaCustomPositions[`eval__${idea.id}__comments`] ||
                      ideaCustomPositions[`eval__${idea.id}__gate`] ||
                      ideaCustomPositions[`eval__${idea.id}__step2`]
                    );

                    return (
                      <div key={`eval-row-${idea.id}`} className="contents">
                        {/* 4 Column Header Titles for this Proposal */}
                        <div style={{ left: basePos.x, top: basePos.y - 38 }} className="absolute z-20 flex items-center gap-2 select-none">
                          <span
                            onMouseDown={(e) => startDragCard('idea', `eval__${idea.id}`, basePos.x, basePos.y, e)}
                            className="px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-800 font-bold text-[11px] shadow-2xs flex items-center gap-1.5 cursor-move hover:bg-slate-200 transition-colors"
                            title="Drag entire 4-stage pipeline"
                          >
                            <GripVertical className="w-3 h-3 text-slate-400" />
                            <span>Step 1 of evaluation</span>
                          </span>
                          {hasDetachedSubCards && (
                            <button
                              type="button"
                              onClick={() => {
                                setIdeaCustomPositions((prev) => {
                                  const next = { ...prev };
                                  delete next[`eval__${idea.id}`];
                                  delete next[`eval__${idea.id}__comments`];
                                  delete next[`eval__${idea.id}__gate`];
                                  delete next[`eval__${idea.id}__step2`];
                                  return next;
                                });
                              }}
                              title="Snap all 4 stages back into standard row alignment"
                              className="p-1 text-slate-400 hover:text-slate-700 bg-white border border-slate-200 rounded-full shadow-2xs transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <div style={{ left: commentsPos.x, top: commentsPos.y - 38 }} className="absolute z-20 flex items-center gap-2 select-none">
                          <span
                            onMouseDown={(e) => startDragCard('idea', `eval__${idea.id}__comments`, commentsPos.x, commentsPos.y, e)}
                            className="px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 font-bold text-[11px] shadow-2xs flex items-center gap-1.5 cursor-move hover:bg-amber-100 transition-colors"
                            title="Drag comments column"
                          >
                            <GripVertical className="w-3 h-3 text-amber-500" />
                            <span>date: 13-26 nov / Comments</span>
                          </span>
                        </div>

                        <div style={{ left: gatePos.x, top: gatePos.y - 38 }} className="absolute z-20 flex items-center gap-2 select-none">
                          <span
                            onMouseDown={(e) => startDragCard('idea', `eval__${idea.id}__gate`, gatePos.x, gatePos.y, e)}
                            className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-[11px] shadow-2xs flex items-center gap-1.5 cursor-move hover:bg-emerald-100 transition-colors"
                            title="Drag approval gate column"
                          >
                            <GripVertical className="w-3 h-3 text-emerald-500" />
                            <span>Approval gate</span>
                          </span>
                        </div>

                        <div style={{ left: step2Pos.x, top: step2Pos.y - 38 }} className="absolute z-20 flex items-center gap-2 select-none">
                          <span
                            onMouseDown={(e) => startDragCard('idea', `eval__${idea.id}__step2`, step2Pos.x, step2Pos.y, e)}
                            className="px-3 py-1 rounded-full bg-purple-50 border border-purple-300 text-purple-900 font-bold text-[11px] shadow-2xs flex items-center gap-1.5 cursor-move hover:bg-purple-100 transition-colors"
                            title="Drag adjudication board column"
                          >
                            <GripVertical className="w-3 h-3 text-purple-500" />
                            <span>Step 2 (moved to adjud...)</span>
                          </span>
                        </div>

                        {/* ---------------------------------------------------- */}
                        {/* COLUMN 1: IDEA CARD UNDER STEP 1 OF EVALUATION       */}
                        {/* ---------------------------------------------------- */}
                        <div
                          style={{ left: basePos.x, top: basePos.y, width: ideaSize.width, minHeight: ideaSize.height }}
                          onMouseDown={(e) => startDragCard('idea', `eval__${idea.id}`, basePos.x, basePos.y, e)}
                          className="absolute bg-white border-2 border-amber-300 hover:border-amber-500 rounded-2xl shadow-md p-3.5 z-20 text-xs select-none transition-shadow cursor-move group flex flex-col justify-between"
                        >
                          <div>
                            {/* Top: Code, SLA, Urgency */}
                            <div className="flex items-center justify-between mb-1.5 cursor-move">
                              <div className="flex items-center gap-1.5">
                                <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-600 transition-colors" />
                                <span className="font-mono-code font-bold text-xs text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  {idea.code || idea.id}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  ⏱ {idea.slaRemainingDays ?? 3.5}d left
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEvaluatorCanvasIdeaIds((prev) => prev.filter((id) => id !== idea.id))}
                                  title="Remove from canvas"
                                  className="text-slate-300 hover:text-red-500 p-0.5 rounded transition-colors cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Title */}
                            <h4 className="font-bold text-slate-900 leading-snug line-clamp-2 mb-1">
                              {idea.title}
                            </h4>

                            {/* Promoter & Enterprise */}
                            <p className="text-[11px] text-slate-500 truncate mb-2">
                              {idea.enterpriseName || idea.submitterName || 'Promoter Profile'}
                            </p>

                            {/* Capital Ask & SLA Progress */}
                            <div className="flex items-center justify-between text-[11px] mb-2">
                              <span className="text-slate-400">Capital Demand</span>
                              <span className="font-mono-code font-bold text-slate-800">
                                {new Intl.NumberFormat('en-BW', { style: 'currency', currency: 'BWP', maximumFractionDigits: 0 }).format(idea.capitalAsk || 0)}
                              </span>
                            </div>

                            <div className="space-y-1 mb-3">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="text-slate-500 font-medium">Evaluation SLA Progress:</span>
                                <span className="font-extrabold text-slate-800">{idea.progress ?? 20}%</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-amber-500 transition-all duration-500"
                                  style={{ width: `${idea.progress ?? 20}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Card Interactive Actions */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => onOpenDossier?.(idea.id)}
                              className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-[#006194] border border-sky-200 rounded-md font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                              title="Read through submitted idea proposal in detail"
                            >
                              <FileText className="w-3 h-3 text-[#006194]" />
                              <span>Read Details</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onOpenClarificationChat?.(idea)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-md font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                              title="Engage submitter in live clarification modal"
                            >
                              <MessageSquare className="w-3 h-3 text-amber-700" />
                              <span>Live Chat</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRequestDocsPrompt(idea.id, 'CIPA certificate and tax compliance certificate')}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-md font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                              title="Request supporting documentation"
                            >
                              <Paperclip className="w-3 h-3 text-slate-500" />
                              <span>Req Docs</span>
                            </button>
                          </div>

                          {/* Column 1 Resizing handles */}
                          <div
                            onMouseDown={(e) => startResize(idea.id, 'e', ideaSize.width, ideaSize.height, 280, 200, e)}
                            className="absolute top-0 right-0 w-2.5 h-full cursor-e-resize hover:bg-amber-400/30 z-30 transition-colors"
                            title="Drag border to resize width"
                          />
                          <div
                            onMouseDown={(e) => startResize(idea.id, 's', ideaSize.width, ideaSize.height, 280, 200, e)}
                            className="absolute bottom-0 left-0 w-full h-2.5 cursor-s-resize hover:bg-amber-400/30 z-30 transition-colors"
                            title="Drag border to resize height"
                          />
                          <div
                            onMouseDown={(e) => startResize(idea.id, 'se', ideaSize.width, ideaSize.height, 280, 200, e)}
                            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-amber-500/40 z-30 flex items-end justify-end p-0.5 text-slate-300 hover:text-slate-700 transition-colors"
                            title="Drag corner to resize card"
                          >
                            <svg className="w-2.5 h-2.5 opacity-60" viewBox="0 0 6 6" fill="currentColor">
                              <path d="M6 6H4V4H6V6ZM6 2H4V0H6V2ZM2 6H0V4H2V6Z" />
                            </svg>
                          </div>
                        </div>

                        {/* ---------------------------------------------------- */}
                        {/* COLUMN 2: COMMENTS & CLARIFICATIONS STREAM           */}
                        {/* ---------------------------------------------------- */}
                        <div
                          style={{ left: commentsPos.x, top: commentsPos.y, width: commentsSize.width, height: commentsSize.height }}
                          onMouseDown={(e) => startDragCard('idea', `eval__${idea.id}__comments`, commentsPos.x, commentsPos.y, e)}
                          className="absolute bg-white border-2 border-amber-200 hover:border-amber-400 rounded-2xl shadow-md p-3.5 z-20 text-xs select-none flex flex-col justify-between transition-shadow cursor-move group"
                        >
                          <div>
                            <div className="flex items-center justify-between pb-2 border-b border-amber-100 mb-2 cursor-move">
                              <span className="font-bold text-slate-900 text-[11px] flex items-center gap-1.5">
                                <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-600 transition-colors" />
                                <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                                <span>Submitter Clarification Stream</span>
                              </span>
                              <span className="text-[9.5px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Real-time
                              </span>
                            </div>

                            {/* Messages Container */}
                            <div
                              style={{ maxHeight: Math.max(120, commentsSize.height - 145) }}
                              className="space-y-2 overflow-y-auto pr-1 scrollbar-thin"
                            >
                              {comments.length === 0 ? (
                                <div className="py-4 text-center text-slate-400">
                                  <MessageSquare className="w-6 h-6 mx-auto mb-1 opacity-30 text-slate-400" />
                                  <p className="text-[11px] text-slate-500 font-semibold">No comments shared yet</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    Type below to seek clarity or request documentation from the promoter.
                                  </p>
                                </div>
                              ) : (
                                comments.map((c, cIdx) => {
                                  const isOfficial = c.senderRole === 'Evaluator' || c.senderRole === 'Administrator';
                                  return (
                                    <div
                                      key={c.id || `c-${cIdx}`}
                                      className={`p-2 rounded-xl text-[11px] leading-snug border ${isOfficial
                                        ? 'bg-amber-50/70 border-amber-200 text-amber-950 ml-2'
                                        : 'bg-teal-50/70 border-teal-200 text-teal-950 mr-2'
                                        }`}
                                    >
                                      <div className="flex items-center justify-between text-[9px] mb-0.5">
                                        <span className={`font-bold uppercase ${isOfficial ? 'text-amber-800' : 'text-teal-800'}`}>
                                          {isOfficial ? '👤 Evaluator (You)' : '💡 Citizen Submitter'}
                                        </span>
                                        <span className="text-slate-400 font-mono-code">{c.timestamp ? new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}</span>
                                      </div>
                                      <p className="text-slate-800 font-medium">{c.message}</p>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* Quick Composer */}
                          <div className="pt-2 border-t border-slate-100 mt-2">
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleSendInlineComment(idea.id);
                              }}
                              className="flex items-center gap-1.5"
                            >
                              <input
                                type="text"
                                placeholder="Seek clarity from submitter..."
                                value={currentComment}
                                onChange={(e) => setInlineCommentInput((prev) => ({ ...prev, [idea.id]: e.target.value }))}
                                className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-amber-500 text-slate-900 placeholder:text-slate-400"
                              />
                              <button
                                type="submit"
                                disabled={!currentComment.trim()}
                                className="p-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            </form>
                            <div className="flex items-center gap-1 mt-1.5 overflow-x-auto pb-0.5">
                              <button
                                type="button"
                                onClick={() => handleRequestDocsPrompt(idea.id, 'CIPA Certificate')}
                                className="text-[9.5px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded cursor-pointer shrink-0"
                              >
                                + Req CIPA
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRequestDocsPrompt(idea.id, 'Cashflow Projections')}
                                className="text-[9.5px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded cursor-pointer shrink-0"
                              >
                                + Req Cashflows
                              </button>
                            </div>
                          </div>

                          {/* Column 2 Resizing handles */}
                          <div
                            onMouseDown={(e) => startResize(`${idea.id}__comments`, 'e', commentsSize.width, commentsSize.height, 280, 240, e)}
                            className="absolute top-0 right-0 w-2.5 h-full cursor-e-resize hover:bg-amber-400/30 z-30 transition-colors"
                            title="Drag border to resize width"
                          />
                          <div
                            onMouseDown={(e) => startResize(`${idea.id}__comments`, 's', commentsSize.width, commentsSize.height, 280, 240, e)}
                            className="absolute bottom-0 left-0 w-full h-2.5 cursor-s-resize hover:bg-amber-400/30 z-30 transition-colors"
                            title="Drag border to resize height"
                          />
                          <div
                            onMouseDown={(e) => startResize(`${idea.id}__comments`, 'se', commentsSize.width, commentsSize.height, 280, 240, e)}
                            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-amber-500/40 z-30 flex items-end justify-end p-0.5 text-slate-300 hover:text-slate-700 transition-colors"
                            title="Drag corner to resize card"
                          >
                            <svg className="w-2.5 h-2.5 opacity-60" viewBox="0 0 6 6" fill="currentColor">
                              <path d="M6 6H4V4H6V6ZM6 2H4V0H6V2ZM2 6H0V4H2V6Z" />
                            </svg>
                          </div>
                        </div>

                        {/* ---------------------------------------------------- */}
                        {/* COLUMN 3: APPROVAL GATE CARD                         */}
                        {/* ---------------------------------------------------- */}
                        <div
                          style={{ left: gatePos.x, top: gatePos.y, width: gateSize.width, height: gateSize.height }}
                          onMouseDown={(e) => startDragCard('idea', `eval__${idea.id}__gate`, gatePos.x, gatePos.y, e)}
                          className={`absolute rounded-2xl shadow-md p-4 z-20 text-xs select-none border-2 flex flex-col justify-between transition-shadow cursor-move group ${isApproved
                            ? 'bg-emerald-50/50 border-emerald-400 hover:border-emerald-500'
                            : 'bg-white border-emerald-300 hover:border-emerald-500'
                            }`}
                        >
                          <div>
                            {/* Header */}
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2.5 cursor-move">
                              <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                                <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                <span>Approval Gate</span>
                              </span>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${isApproved
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}
                              >
                                {isApproved ? 'Approved for Next Stage' : 'Pending Required Items'}
                              </span>
                            </div>

                            {/* 4 Evaluation Stages Checklist */}
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                              Evaluation Gate Criteria:
                            </p>
                            <div className="space-y-2 text-[11px]">
                              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-950">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="font-semibold">1. Read through submitted idea</span>
                              </div>
                              <div className={`flex items-center gap-2 p-1.5 rounded-lg border ${comments.length > 0
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                                }`}>
                                <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${comments.length > 0 ? 'text-emerald-600' : 'text-slate-300'}`} />
                                <span className="font-semibold">2. Seek clarity via comment chats ({comments.length})</span>
                              </div>
                              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-950">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="font-semibold">3. Request supporting documentation</span>
                              </div>
                              <div className={`flex items-center gap-2 p-1.5 rounded-lg border ${isApproved
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                                }`}>
                                <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${isApproved ? 'text-emerald-600' : 'text-slate-300'}`} />
                                <span className="font-semibold">4. Approve for next step</span>
                              </div>
                            </div>
                          </div>

                          {/* Approval Actions */}
                          <div className="pt-2 border-t border-slate-100 mt-2">
                            {isApproved ? (
                              <div className="w-full py-2 px-3 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl font-extrabold text-xs text-center flex items-center justify-center gap-1.5 shadow-2xs">
                                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                                <span>{isAdjudicator ? 'Sanctioned for Pilot Phase' : 'Approved for Adjudication'}</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onAdvanceIdeaStage?.(idea.id)}
                                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
                              >
                                <Rocket className="w-4 h-4" />
                                <span>{isAdjudicator ? 'Approve Board Decision →' : 'Approve for Next Step →'}</span>
                              </button>
                            )}
                          </div>

                          {/* Column 3 Resizing handles */}
                          <div
                            onMouseDown={(e) => startResize(`${idea.id}__gate`, 'e', gateSize.width, gateSize.height, 280, 240, e)}
                            className="absolute top-0 right-0 w-2.5 h-full cursor-e-resize hover:bg-emerald-400/30 z-30 transition-colors"
                            title="Drag border to resize width"
                          />
                          <div
                            onMouseDown={(e) => startResize(`${idea.id}__gate`, 's', gateSize.width, gateSize.height, 280, 240, e)}
                            className="absolute bottom-0 left-0 w-full h-2.5 cursor-s-resize hover:bg-emerald-400/30 z-30 transition-colors"
                            title="Drag border to resize height"
                          />
                          <div
                            onMouseDown={(e) => startResize(`${idea.id}__gate`, 'se', gateSize.width, gateSize.height, 280, 240, e)}
                            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-emerald-500/40 z-30 flex items-end justify-end p-0.5 text-slate-300 hover:text-slate-700 transition-colors"
                            title="Drag corner to resize card"
                          >
                            <svg className="w-2.5 h-2.5 opacity-60" viewBox="0 0 6 6" fill="currentColor">
                              <path d="M6 6H4V4H6V6ZM6 2H4V0H6V2ZM2 6H0V4H2V6Z" />
                            </svg>
                          </div>
                        </div>

                        {/* ---------------------------------------------------- */}
                        {/* COLUMN 4: STEP 2 NEXT STAGE                          */}
                        {/* ---------------------------------------------------- */}
                        <div
                          style={{ left: step2Pos.x, top: step2Pos.y, width: step2Size.width, height: step2Size.height }}
                          onMouseDown={(e) => startDragCard('idea', `eval__${idea.id}__step2`, step2Pos.x, step2Pos.y, e)}
                          className={`absolute rounded-2xl shadow-md p-4 z-20 text-xs select-none border-2 flex flex-col justify-between transition-shadow cursor-move group ${isApproved
                            ? 'bg-purple-50/50 border-purple-400 hover:border-purple-500'
                            : 'bg-slate-50/50 border-slate-300 hover:border-slate-400 opacity-80'
                            }`}
                        >
                          <div>
                            {/* Header */}
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2.5 cursor-move">
                              <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                                <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-600 transition-colors" />
                                <Award className="w-4 h-4 text-purple-600" />
                                <span>{isAdjudicator ? 'Step 2: Pilot Phase Gate' : 'Step 2: Adjudication Board'}</span>
                              </span>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${isApproved
                                  ? 'bg-purple-100 text-purple-900 border-purple-300'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                              >
                                {isApproved ? (isAdjudicator ? 'In Pilot Phase' : 'In Adjudication Queue') : 'Locked'}
                              </span>
                            </div>

                            {/* Content */}
                            {isApproved ? (
                              <div className="space-y-3">
                                <div className="p-2.5 rounded-xl bg-purple-100/70 border border-purple-200 text-purple-950 text-[11px] leading-relaxed">
                                  <strong>🎉 {isAdjudicator ? 'Board Approved!' : 'Successfully Promoted!'}</strong> This proposal has cleared {isAdjudicator ? 'Stage 5 Board Adjudication and entered Stage 6 Pilot Phase.' : <>and is officially in the <strong>Adjudication Queue</strong> ready for National Board statutory quorum voting and capital sanctioning.</>}
                                </div>
                                <div className="text-[11px] text-slate-600 space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Board Pipeline:</span>
                                    <span className="font-bold text-slate-800">Vision 2036 Pillar II</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Quorum Target:</span>
                                    <span className="font-bold text-purple-800">4 / 5 Warrants</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="py-6 text-center text-slate-400">
                                <Award className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                                <p className="text-xs font-semibold text-slate-600">Awaiting Approval Gate</p>
                                <p className="text-[10.5px] text-slate-400 mt-1 leading-snug">
                                  {isAdjudicator
                                    ? 'Complete board adjudication review and approve at the gate to advance into Stage 6 Pilot Phase.'
                                    : 'Complete Step 1 evaluation and approve the proposal at the Approval Gate to stream into the Adjudication Queue.'}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Action Button */}
                          <div className="pt-2 border-t border-slate-200 mt-2">
                            {isApproved ? (
                              <button
                                type="button"
                                onClick={() => setQueueTab('adjudication')}
                                className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                              >
                                <span>{isAdjudicator ? 'Pilot Phase Sanctioned ✓' : 'View in Adjudication Queue →'}</span>
                              </button>
                            ) : (
                              <div className="w-full py-2 px-3 bg-slate-100 text-slate-400 rounded-xl font-medium text-xs text-center border border-slate-200">
                                Gate Locked
                              </div>
                            )}
                          </div>

                          {/* Column 4 Resizing handles */}
                          <div
                            onMouseDown={(e) => startResize(`${idea.id}__step2`, 'e', step2Size.width, step2Size.height, 260, 240, e)}
                            className="absolute top-0 right-0 w-2.5 h-full cursor-e-resize hover:bg-purple-400/30 z-30 transition-colors"
                            title="Drag border to resize width"
                          />
                          <div
                            onMouseDown={(e) => startResize(`${idea.id}__step2`, 's', step2Size.width, step2Size.height, 260, 240, e)}
                            className="absolute bottom-0 left-0 w-full h-2.5 cursor-s-resize hover:bg-purple-400/30 z-30 transition-colors"
                            title="Drag border to resize height"
                          />
                          <div
                            onMouseDown={(e) => startResize(`${idea.id}__step2`, 'se', step2Size.width, step2Size.height, 260, 240, e)}
                            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-purple-500/40 z-30 flex items-end justify-end p-0.5 text-slate-300 hover:text-slate-700 transition-colors"
                            title="Drag corner to resize card"
                          >
                            <svg className="w-2.5 h-2.5 opacity-60" viewBox="0 0 6 6" fill="currentColor">
                              <path d="M6 6H4V4H6V6ZM6 2H4V0H6V2ZM2 6H0V4H2V6Z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )
            )}

            {/* ============================================================== */}
            {/* 2. FREELY DRAGGABLE EVALUATOR STATIONS & CONNECTED IDEAS (Admin) */}
            {/* Group Selection Supported: Drag any item to move group together */}
            {/* Automatic SLA Health Color Coding: Clean / Orange / Red         */}
            {/* ============================================================== */}
            {!isReviewerWorkspace && canvasStations.map((station) => {
              const isAgentStation = station.user.role === 'Agent' || station.stationType === 'agent';
              const assignedIdeas = station.assignedIdeaIds
                .map((id) => assignedIdeasMap[id])
                .filter(Boolean);
              const assignedMsgs = (station.assignedMessageIds || [])
                .map((id) => enquiryMessages.find((m) => m.id === id && m.status === 'assigned'))
                .filter(Boolean) as SubmitterEnquiryMessage[];

              const isReassignTarget = reassignHoverStationId === station.id;
              const isDropTarget =
                activeDropStationId === station.id || hoveredStationId === station.id || isReassignTarget;
              const isGroupSelected = selectedGroupCardIds.includes(station.id);

              // -----------------------------------------------------------
              // Automatic SLA Health Status:
              // Clean (indicate nothing) if healthy, orange if warning, red if critical
              // -----------------------------------------------------------
              const minSla = isAgentStation
                ? (assignedMsgs.length > 0 ? Math.min(...assignedMsgs.map((m) => (m.slaMinutesRemaining || 240) / 1440)) : 99)
                : (assignedIdeas.length > 0 ? Math.min(...assignedIdeas.map((i) => i.slaRemainingDays ?? 99)) : 99);
              const isCritical = !isAgentStation && minSla <= slaCriticalDays;
              const isWarning = !isAgentStation && !isCritical && minSla <= slaWarningDays;

              const agentAvailability =
                personnel.find((p) => p.id === station.userId)?.agentAvailability ||
                station.user.agentAvailability ||
                'available';

              return (
                <div key={station.id} className="contents">
                  {/* Evaluator / Agent Station Card */}
                  <div
                    style={{ left: station.x, top: station.y }}
                    onMouseDown={(e) => startDragCard('station', station.id, station.x, station.y, e)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'copy';
                      setActiveDropStationId(station.id);
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setActiveDropStationId(station.id);
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget === e.target) {
                        setActiveDropStationId(null);
                      }
                    }}
                    onDrop={(e) => handleDropOnStation(station.id, e)}
                    className={`absolute z-20 w-64 rounded-2xl shadow-md p-4 transition-shadow cursor-move select-none ${isDropTarget
                      ? 'border-emerald-500 ring-4 ring-emerald-300 bg-emerald-50/95 scale-105 shadow-2xl z-30'
                      : isGroupSelected
                        ? 'border-[#006194] ring-3 ring-sky-400/50 shadow-lg bg-white'
                        : isCritical
                          ? 'border-2 border-rose-500 ring-4 ring-rose-400/70 bg-rose-50/40 shadow-xl'
                          : isWarning
                            ? 'border-2 border-amber-400 ring-2 ring-amber-300 bg-amber-50/30 shadow-md'
                            : isAgentStation
                              ? 'bg-white border-2 border-teal-400/80 hover:border-teal-600 hover:shadow-lg'
                              : 'bg-white border-2 border-slate-300 hover:border-[#006194]/70 hover:shadow-lg'
                      }`}
                  >
                    {/* Active Drag Hover Overlay */}
                    {isDropTarget && (
                      <div className="absolute inset-0 bg-emerald-500/10 border-2 border-dashed border-emerald-500 rounded-2xl flex flex-col items-center justify-center p-3 text-center pointer-events-none z-30 animate-in fade-in">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 mb-1 animate-bounce" />
                        <span className="text-xs font-black text-emerald-950">
                          {isReassignTarget ? 'Release to Reassign Idea' : 'Release to Assign'}
                        </span>
                        <span className="text-[10.5px] font-bold text-emerald-800">
                          to {station.user.name}
                        </span>
                      </div>
                    )}

                    {/* Automatic SLA Warning / Critical Alert Banner */}
                    {isCritical && (
                      <div className="mb-2.5 p-1.5 rounded-lg bg-rose-100 border border-rose-300 text-rose-900 text-[10.5px] font-extrabold flex items-center justify-between animate-pulse">
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Critical: {minSla.toFixed(1)}d left</span>
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onOpenAlertModal?.(station.user, assignedIdeas.find(i => i.slaRemainingDays === minSla));
                          }}
                          className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9.5px] shadow-2xs cursor-pointer"
                        >
                          🚨 Alert
                        </button>
                      </div>
                    )}

                    {isWarning && (
                      <div className="mb-2.5 p-1.5 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 text-[10.5px] font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>SLA Alert: {minSla.toFixed(1)}d left</span>
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onOpenAlertModal?.(station.user, assignedIdeas.find(i => i.slaRemainingDays === minSla));
                          }}
                          className="px-1.5 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold text-[9.5px] shadow-2xs cursor-pointer"
                        >
                          📢 Alert
                        </button>
                      </div>
                    )}

                    {/* Header: Move Grab Handle, Avatar, Name, Role */}
                    <div className="flex items-center justify-between mb-2 select-none p-0.5 rounded transition-colors">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => toggleGroupSelect(station.id, e)}
                          title="Toggle Group Selection (or Shift-Click card)"
                          className="text-slate-400 hover:text-[#006194] cursor-pointer"
                        >
                          {isGroupSelected ? (
                            <CheckCheck className="w-4 h-4 text-[#006194]" />
                          ) : (
                            <GripVertical className="w-3.5 h-3.5 text-slate-300 hover:text-slate-600" />
                          )}
                        </button>

                        <div
                          className={`w-8 h-8 rounded-full text-white font-black text-xs flex items-center justify-center shadow-xs ${isAgentStation
                            ? 'bg-linear-to-br from-teal-500 to-teal-700'
                            : 'bg-linear-to-br from-amber-500 to-amber-600'
                            }`}
                        >
                          {station.user.avatarInitials}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-xs leading-tight">
                            {station.user.name}
                          </h4>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full inline-block border ${isAgentStation
                                ? 'text-teal-800 bg-teal-50 border-teal-200'
                                : 'text-amber-800 bg-amber-50 border-amber-200'
                                }`}
                            >
                              {station.user.role}
                            </span>
                            {(() => {
                              const sStatus =
                                presenceMap[station.userId] ||
                                presenceMap[station.user?.id] ||
                                presenceMap[station.user?.email] ||
                                (station.user?.status === 'active' ? 'online' : 'offline');
                              const isOnline = sStatus === 'online' || sStatus === 'reviewing' || sStatus === 'editing';
                              return (
                                <span className="flex items-center gap-1 text-[9px] font-semibold text-slate-500">
                                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                  <span className={isOnline ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                                    {isOnline ? (sStatus === 'reviewing' ? 'Reviewing' : sStatus === 'editing' ? 'Editing' : 'Online') : 'Offline'}
                                  </span>
                                </span>
                              );
                            })()}
                            {isAgentStation && (
                              <span
                                className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-full ${agentAvailability === 'available'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : agentAvailability === 'busy'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-200 text-slate-600'
                                  }`}
                              >
                                {agentAvailability}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onOpenAlertModal?.(station.user);
                          }}
                          className="text-slate-400 hover:text-amber-600 p-1 rounded hover:bg-slate-100 cursor-pointer"
                          title="Send alert notification to official"
                        >
                          <BellRing className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (assignedIdeas.length > 0) {
                              setPendingRemoveStation({
                                station,
                                assignedCount: assignedIdeas.length,
                              });
                            } else {
                              onRemoveCanvasStation(station.id);
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100 cursor-pointer"
                          title="Remove station"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[10.5px] text-slate-500 truncate mb-3">
                      {station.user.department}
                    </p>

                    {/* Count Badge */}
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 mb-2.5 flex items-center justify-between">
                      <span className="text-[10.5px] font-semibold text-slate-600">
                        {isAgentStation
                          ? 'Active Enquiries:'
                          : station.user.role === 'Adjudicator'
                            ? 'Currently Adjudicating:'
                            : 'Currently Evaluating:'}
                      </span>
                      <span className={`text-sm font-black ${isAgentStation ? 'text-teal-700' : 'text-[#006194]'}`}>
                        {isAgentStation
                          ? `${assignedMsgs.length} / ${maxChatsPerAgent} Chats`
                          : `${assignedIdeas.length} Ideas`}
                      </span>
                    </div>

                    {/* Auto-Replenish Switch ("1-Out 1-In Auto Refill") */}
                    <div className="pt-2 border-t border-slate-100">
                      <label
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          <RefreshCw className={`w-3.5 h-3.5 ${station.autoReplenishOnFinish ? 'text-emerald-600 animate-spin' : 'text-slate-400'}`} style={{ animationDuration: '6s' }} />
                          <span className="text-[10.5px] font-bold text-slate-700">
                            1-Out 1-In Auto Refill
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={station.autoReplenishOnFinish}
                          onChange={() => onToggleAutoReplenish(station.id)}
                          className="rounded border-slate-300 text-[#006194] focus:ring-[#006194] cursor-pointer"
                        />
                      </label>
                      <p className="text-[9.5px] text-slate-400 mt-0.5">
                        {station.autoReplenishOnFinish
                          ? isAgentStation
                            ? 'Active: Resolving 1 chat pulls next from Admin Queue'
                            : 'Active: Resolving 1 idea pulls next from queue'
                          : 'Manual: Queue assignments handled manually'}
                      </p>
                    </div>

                    {/* Active Drop Prompt / One-Click Assign Button */}
                    {isAgentStation ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (selectedQueueMessageIds.length > 0) {
                            onAssignMessagesToStation?.(station.id, selectedQueueMessageIds);
                            setSelectedQueueMessageIds([]);
                          }
                        }}
                        className={`w-full mt-2.5 p-2 rounded-xl text-center text-[10.5px] font-bold transition-all border ${selectedQueueMessageIds.length > 0
                          ? 'bg-teal-600 hover:bg-teal-700 text-white border-teal-700 shadow-md cursor-pointer animate-pulse'
                          : isDropTarget
                            ? 'bg-teal-100 text-teal-900 border-teal-400 font-extrabold'
                            : 'bg-teal-50 text-teal-800 border-teal-200'
                          }`}
                      >
                        {selectedQueueMessageIds.length > 0
                          ? `📩 Assign ${selectedQueueMessageIds.length} Selected Enquiry${selectedQueueMessageIds.length > 1 ? 's' : ''}`
                          : 'Drag citizen enquiries here to assign'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (selectedQueueIdeaIds.length > 0) {
                            handleDirectAssignToStation(station.id);
                          }
                        }}
                        className={`w-full mt-2.5 p-2 rounded-xl text-center text-[10.5px] font-bold transition-all border ${selectedQueueIdeaIds.length > 0
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-md cursor-pointer animate-pulse'
                          : isDropTarget
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-400 font-extrabold'
                            : 'bg-sky-50 text-sky-800 border-sky-200'
                          }`}
                      >
                        {selectedQueueIdeaIds.length > 0
                          ? (isAdmin
                            ? `📥 Click to Assign ${selectedQueueIdeaIds.length} Selected Idea${selectedQueueIdeaIds.length > 1 ? 's' : ''}`
                            : `📥 Place ${selectedQueueIdeaIds.length} Selected Idea${selectedQueueIdeaIds.length > 1 ? 's' : ''} on Canvas`)
                          : (isAdmin ? 'Drop queue ideas here to assign' : 'Drop ideas here or onto canvas')}
                      </button>
                    )}
                  </div>

                  {/* Connected Citizen Enquiry Cards for Agent Stations */}
                  {isAgentStation &&
                    assignedMsgs.map((msg, idx) => {
                      const msgPos = getMessageCardCoordinates(station, msg.id, idx);
                      const isMsgGroupSelected = selectedGroupCardIds.includes(msg.id);

                      return (
                        <div
                          key={msg.id}
                          style={{ left: msgPos.x, top: msgPos.y }}
                          onMouseDown={(e) => startDragCard('message', msg.id, msgPos.x, msgPos.y, e)}
                          className={`absolute w-72 bg-white border-2 rounded-xl shadow-md p-3 z-20 text-xs transition-shadow cursor-move select-none ${isMsgGroupSelected
                            ? 'border-teal-600 ring-3 ring-teal-400/50 shadow-lg'
                            : 'border-teal-300/90 hover:border-teal-500 hover:shadow-lg'
                            }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono-code font-bold text-[10px] text-teal-900 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                                {msg.ideaCode || 'ENQUIRY'}
                              </span>
                              <span
                                className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border ${msg.priority === 'Urgent'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : msg.priority === 'High'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                              >
                                {msg.priority}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-teal-600" />
                              {msg.slaMinutesRemaining}m SLA
                            </span>
                          </div>

                          <h5 className="font-bold text-slate-900 leading-snug line-clamp-1">
                            {msg.subject}
                          </h5>
                          <p className="text-[10.5px] text-slate-500 mt-0.5 truncate">
                            From: <span className="font-semibold text-slate-700">{msg.submitterName}</span> • {msg.submitterLocation}
                          </p>

                          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100">
                            <span className="text-[9.5px] text-teal-700 font-semibold">
                              In Agent Queue ({msg.thread.length} msgs)
                            </span>
                            {onResolveMessage && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onResolveMessage(msg.id);
                                }}
                                className="px-2 py-0.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-[10px] rounded transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                <span>Resolve</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {/* Connected Idea Cards (Freely Draggable Anywhere away!) */}
                  {assignedIdeas.map((idea, idx) => {
                    const ideaPos = getIdeaCardCoordinates(station, idea.id, idx);
                    const isIdeaGroupSelected = selectedGroupCardIds.includes(idea.id);

                    return (
                      <div
                        key={idea.id}
                        style={{ left: ideaPos.x, top: ideaPos.y }}
                        onMouseDown={(e) => startDragCard('idea', idea.id, ideaPos.x, ideaPos.y, e)}
                        className={`absolute w-72 bg-white border-2 rounded-xl shadow-md p-3 z-20 text-xs transition-shadow cursor-move select-none ${isIdeaGroupSelected
                          ? 'border-[#006194] ring-3 ring-sky-400/50 shadow-lg'
                          : 'border-amber-300/90 hover:border-amber-500 hover:shadow-lg'
                          }`}
                      >
                        {/* Drag Handle & Idea Code */}
                        <div className="flex items-center justify-between mb-1 select-none p-0.5 rounded transition-colors">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => toggleGroupSelect(idea.id, e)}
                              title="Toggle Group Selection (or Shift-Click card)"
                              className="text-slate-400 hover:text-[#006194] cursor-pointer"
                            >
                              {isIdeaGroupSelected ? (
                                <CheckCheck className="w-3.5 h-3.5 text-[#006194]" />
                              ) : (
                                <GripVertical className="w-3.5 h-3.5 text-slate-300 hover:text-slate-600" />
                              )}
                            </button>
                            <span className="font-mono-code font-bold text-xs text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              {idea.code}
                            </span>
                          </div>

                          {/* SLA Countdown Timer */}
                          <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>⏱ {idea.slaRemainingDays}d left</span>
                          </span>
                        </div>

                        {/* Title */}
                        <h5 className="font-bold text-slate-900 leading-snug line-clamp-1 mb-1.5">
                          {idea.title}
                        </h5>

                        {/* Progress Against SLA Bar */}
                        <div className="space-y-1 mb-2">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-500 font-medium">Progress against SLA:</span>
                            <span className="font-extrabold text-slate-800">{idea.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${idea.progress > 70
                                ? 'bg-emerald-500'
                                : idea.progress > 30
                                  ? 'bg-amber-500'
                                  : 'bg-sky-500'
                                }`}
                              style={{ width: `${idea.progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Card Actions: Tailored for Evaluator / Adjudicator vs Administrator */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                          {isReviewerWorkspace || !isAdmin ? (
                            <>
                              {/* 1. Read Details / Dossier */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onOpenDossier?.(idea.id);
                                }}
                                className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-[#006194] border border-sky-200 rounded-md font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                                title="Read project proposal, promoter background & attached documents in detail"
                              >
                                <FileText className="w-3 h-3 text-[#006194]" />
                                <span>Details</span>
                              </button>

                              {/* 2. Engage Submitter in Real-time Clarification Comments */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onOpenClarificationChat?.(idea);
                                }}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-md font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                                title="Send comments and questions to the submitter in live clarification chat"
                              >
                                <MessageSquare className="w-3 h-3 text-amber-700" />
                                <span>Comment</span>
                              </button>

                              {/* 3. Push to Next Level */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onAdvanceIdeaStage?.(idea.id);
                                }}
                                className="px-2 py-1 bg-[#006194] hover:bg-[#004e75] text-white rounded-md font-extrabold text-[10px] transition-colors flex items-center gap-1 shadow-2xs cursor-pointer ml-auto"
                                title="Push proposal to next level (Adjudication Board / Expert Review)"
                              >
                                <span>Push Next</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onOpenDossier?.(idea.id);
                                }}
                                className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                                title="Inspect project dossier"
                              >
                                <FileText className="w-3 h-3 text-slate-600" />
                                <span>Details</span>
                              </button>

                              {onReassignIdeaBetweenStations &&
                                canvasStations.some(
                                  (s) => s.id !== station.id && s.user.role !== 'Agent' && s.stationType !== 'agent'
                                ) ? (
                                <select
                                  value=""
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    const targetStationId = e.target.value;
                                    if (!targetStationId) return;
                                    onReassignIdeaBetweenStations(idea.id, station.id, targetStationId);
                                    setIdeaCustomPositions((prev) => {
                                      const next = { ...prev };
                                      delete next[idea.id];
                                      return next;
                                    });
                                  }}
                                  className="text-[9.5px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 max-w-[105px] cursor-pointer hover:border-sky-400"
                                  title="Reassign this idea to another station"
                                >
                                  <option value="">Reassign →</option>
                                  {canvasStations
                                    .filter(
                                      (s) => s.id !== station.id && s.user.role !== 'Agent' && s.stationType !== 'agent'
                                    )
                                    .map((target) => (
                                      <option key={target.id} value={target.id}>
                                        {target.user.name}
                                      </option>
                                    ))}
                                </select>
                              ) : null}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onResolveIdeaForStation(station.id, idea.id);
                                }}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded transition-colors flex items-center gap-1 shadow-2xs cursor-pointer ml-auto"
                              >
                                <Check className="w-3 h-3" />
                                <span>Resolve</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* ============================================================== */}
            {/* 2.5 STANDALONE CANVAS IDEA CARDS (Dropped directly on canvas)   */}
            {/* ============================================================== */}
            {standaloneCanvasIdeas.map((idea) => {
              const pos = ideaCustomPositions[idea.id] || { x: 300, y: 300 };
              const isIdeaGroupSelected = selectedGroupCardIds.includes(idea.id);

              return (
                <div
                  key={`standalone-idea-${idea.id}`}
                  style={{ left: pos.x, top: pos.y }}
                  onMouseDown={(e) => startDragCard('idea', idea.id, pos.x, pos.y, e)}
                  className={`absolute w-72 bg-white border-2 rounded-xl shadow-md p-3 z-20 text-xs transition-shadow cursor-move select-none ${isIdeaGroupSelected
                    ? 'border-[#006194] ring-3 ring-sky-400/50 shadow-lg'
                    : 'border-amber-400 hover:border-amber-500 hover:shadow-lg'
                    }`}
                >
                  {/* Drag Handle & Idea Code */}
                  <div className="flex items-center justify-between mb-1 select-none p-0.5 rounded transition-colors">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => toggleGroupSelect(idea.id, e)}
                        title="Toggle Group Selection"
                        className="text-slate-400 hover:text-[#006194] cursor-pointer"
                      >
                        {isIdeaGroupSelected ? (
                          <CheckCheck className="w-3.5 h-3.5 text-[#006194]" />
                        ) : (
                          <GripVertical className="w-3.5 h-3.5 text-slate-300 hover:text-slate-600" />
                        )}
                      </button>
                      <span className="font-mono-code font-bold text-xs text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                        {idea.code}
                      </span>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                        Unassigned • Drag to User
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>⏱ {idea.slaRemainingDays ?? 3.5}d left</span>
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h5 className="font-bold text-slate-900 leading-snug line-clamp-1 mb-1.5">
                    {idea.title}
                  </h5>

                  {/* Progress Against SLA Bar */}
                  <div className="space-y-1 mb-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-500 font-medium">Progress against SLA:</span>
                      <span className="font-extrabold text-slate-800">{idea.progress ?? 20}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${(idea.progress ?? 20) > 70
                          ? 'bg-emerald-500'
                          : (idea.progress ?? 20) > 30
                            ? 'bg-amber-500'
                            : 'bg-sky-500'
                          }`}
                        style={{ width: `${idea.progress ?? 20}%` }}
                      />
                    </div>
                  </div>

                  {/* Card Actions: Details, Clarification Chat & Push Next */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 flex-wrap">
                    {/* 1. Read Details / Dossier */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenDossier?.(idea.id);
                      }}
                      className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-[#006194] border border-sky-200 rounded-md font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                      title="Read project proposal, promoter background & attached documents in detail"
                    >
                      <FileText className="w-3 h-3 text-[#006194]" />
                      <span>Details</span>
                    </button>

                    {/* 2. Engage Submitter in Real-time Clarification Comments */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onOpenClarificationChat?.(idea);
                      }}
                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-md font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                      title="Send comments and questions to the submitter in live clarification chat"
                    >
                      <MessageSquare className="w-3 h-3 text-amber-700" />
                      <span>Comment</span>
                    </button>

                    {/* 3. Push to Next Level */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAdvanceIdeaStage?.(idea.id);
                      }}
                      className="px-2 py-1 bg-[#006194] hover:bg-[#004e75] text-white rounded-md font-extrabold text-[10px] transition-colors flex items-center gap-1 shadow-2xs cursor-pointer ml-auto"
                      title="Push proposal to next level (Adjudication Board / Expert Review)"
                    >
                      <span>Push Next</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* ============================================================== */}
            {/* 3. POOL CONTAINERS (Freely Draggable Anywhere!)                 */}
            {/* ============================================================== */}
            {canvasPools.map((pool) => {
              const poolX = poolCustomPositions[pool.id]?.x ?? pool.x;
              const poolY = poolCustomPositions[pool.id]?.y ?? pool.y;

              const poolUsers = pool.userIds
                .map((id) => personnel.find((p) => p.id === id))
                .filter(Boolean) as AdminPersonnel[];

              const isPoolDropTarget = activeDropPoolId === pool.id;
              const isPoolGroupSelected = selectedGroupCardIds.includes(pool.id);

              return (
                <div
                  key={pool.id}
                  style={{ left: poolX, top: poolY }}
                  onMouseDown={(e) => startDragCard('pool', pool.id, poolX, poolY, e)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setActiveDropPoolId(pool.id);
                  }}
                  onDragLeave={() => setActiveDropPoolId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setActiveDropPoolId(null);
                    try {
                      let raw = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('application/json');
                      if (!raw) return;
                      const parsed = JSON.parse(raw);
                      if (parsed.type === 'user' && parsed.data) {
                        onAddUserToPool(pool.id, parsed.data.id);
                      }
                    } catch (err) { }
                  }}
                  className={`absolute w-72 bg-white border-2 rounded-2xl shadow-lg p-4 z-20 flex flex-col transition-all cursor-move select-none ${isPoolDropTarget
                    ? 'border-amber-500 ring-4 ring-amber-100 bg-amber-50/50'
                    : isPoolGroupSelected
                      ? 'border-[#006194] ring-3 ring-sky-400/50 shadow-lg'
                      : 'border-slate-300 hover:border-slate-400'
                    }`}
                >
                  {/* Pool Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3 select-none">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => toggleGroupSelect(pool.id, e)}
                        title="Toggle Group Selection (or Shift-Click card)"
                        className="text-slate-400 hover:text-[#006194] cursor-pointer"
                      >
                        {isPoolGroupSelected ? (
                          <CheckCheck className="w-3.5 h-3.5 text-[#006194]" />
                        ) : (
                          <GripVertical className="w-3.5 h-3.5 text-slate-300" />
                        )}
                      </button>
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <h4 className="font-extrabold text-slate-900 text-xs tracking-tight">
                        {pool.title}
                      </h4>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemovePool(pool.id);
                      }}
                      className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                      title="Remove pool"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Users in Pool List */}
                  <div className="space-y-2 mb-3">
                    {poolUsers.length === 0 ? (
                      <div className="p-4 text-center border-2 border-dashed border-slate-200 rounded-xl text-[10.5px] text-slate-400">
                        Drag & drop evaluators into this pool
                      </div>
                    ) : (
                      poolUsers.map((u, i) => (
                        <div
                          key={u.id}
                          className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center">
                              {u.avatarInitials}
                            </span>
                            <div>
                              <span className="font-bold text-slate-800 text-[11px] block">{u.name}</span>
                              <span className="text-[9.5px] text-slate-400 block truncate max-w-[140px]">{u.department}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-1.5 py-0.2 rounded">
                            user {i + 1}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2 bg-amber-50 border border-dashed border-amber-300 rounded-lg text-center text-[10px] font-bold text-amber-900">
                    Drop officials here to add to pool
                  </div>
                </div>
              );
            })}

            {/* ============================================================== */}
            {/* 4. CANVAS ANNOTATIONS, ZONE BANNERS, STICKY NOTES & STICKERS   */}
            {/* ============================================================== */}
            {canvasAnnotations.map((ann) => {
              const isEditingThis = editingAnnotationId === ann.id;
              const isAnnSelected = selectedGroupCardIds.includes(ann.id);
              const stickerIconEl =
                ann.stickerIcon === 'priority' ? <Flame className="w-3.5 h-3.5 text-rose-600 shrink-0" /> :
                  ann.stickerIcon === 'warning' ? <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" /> :
                    ann.stickerIcon === 'idea' ? <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" /> :
                      ann.stickerIcon === 'fast_track' ? <Zap className="w-3.5 h-3.5 text-purple-600 shrink-0" /> :
                        ann.stickerIcon === 'shield' ? <Shield className="w-3.5 h-3.5 text-sky-700 shrink-0" /> :
                          ann.stickerIcon === 'rocket' ? <Rocket className="w-3.5 h-3.5 text-emerald-700 shrink-0" /> :
                            ann.stickerIcon === 'headphones' ? <Headphones className="w-3.5 h-3.5 text-teal-700 shrink-0" /> :
                              ann.stickerIcon === 'check' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> :
                                ann.stickerIcon === 'star' ? <Star className="w-3.5 h-3.5 text-amber-500 shrink-0" /> :
                                  <Tag className="w-3.5 h-3.5 text-slate-600 shrink-0" />;

              return (
                <div
                  key={ann.id}
                  style={{ left: ann.x, top: ann.y, backgroundColor: ann.color || '#fef08a' }}
                  onMouseDown={(e) => startDragCard('annotation', ann.id, ann.x, ann.y, e)}
                  className={`absolute z-15 cursor-move select-none transition-shadow group ${isAnnSelected ? 'ring-3 ring-[#006194] shadow-lg' : ''
                    } ${ann.type === 'zone_banner'
                      ? 'px-4 py-2 rounded-xl border-2 border-slate-400/50 shadow-sm min-w-[260px]'
                      : ann.type === 'sticker'
                        ? 'px-3 py-1.5 rounded-full border-2 border-white shadow-md flex items-center gap-1.5'
                        : ann.type === 'wire_label'
                          ? 'px-2.5 py-1 rounded-lg border border-slate-400/60 shadow-xs'
                          : 'w-56 p-3 rounded-xl border border-amber-400/50 shadow-md'
                    }`}
                >
                  {isEditingThis ? (
                    <div className="space-y-1.5 min-w-[180px]" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingAnnotationText}
                        onChange={(e) => setEditingAnnotationText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            onUpdateAnnotation?.(ann.id, {
                              text: editingAnnotationText.trim() || ann.text,
                              subtext: editingAnnotationSubtext.trim() || undefined,
                            });
                            setEditingAnnotationId(null);
                          } else if (e.key === 'Escape') {
                            setEditingAnnotationId(null);
                          }
                        }}
                        className="w-full px-2 py-1 text-xs font-bold bg-white/90 border border-slate-300 rounded focus:outline-hidden"
                        placeholder="Label or note title..."
                        autoFocus
                      />
                      {ann.type !== 'sticker' && (
                        <input
                          type="text"
                          value={editingAnnotationSubtext}
                          onChange={(e) => setEditingAnnotationSubtext(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              onUpdateAnnotation?.(ann.id, {
                                text: editingAnnotationText.trim() || ann.text,
                                subtext: editingAnnotationSubtext.trim() || undefined,
                              });
                              setEditingAnnotationId(null);
                            } else if (e.key === 'Escape') {
                              setEditingAnnotationId(null);
                            }
                          }}
                          className="w-full px-2 py-1 text-[10.5px] bg-white/80 border border-slate-300 rounded focus:outline-hidden"
                          placeholder="Optional subtitle..."
                        />
                      )}
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingAnnotationId(null)}
                          className="px-2 py-0.5 text-[10px] font-bold bg-white/80 text-slate-700 rounded border border-slate-300 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            onUpdateAnnotation?.(ann.id, {
                              text: editingAnnotationText.trim() || ann.text,
                              subtext: editingAnnotationSubtext.trim() || undefined,
                            });
                            setEditingAnnotationId(null);
                          }}
                          className="px-2 py-0.5 text-[10px] font-bold bg-[#006194] text-white rounded cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-1.5 min-w-0">
                        {stickerIconEl}
                        <div className="min-w-0">
                          <div
                            className={`font-extrabold text-slate-900 leading-tight ${ann.type === 'zone_banner'
                              ? 'text-[11px] uppercase tracking-wider'
                              : ann.type === 'sticker'
                                ? 'text-[11px] whitespace-nowrap'
                                : 'text-xs'
                              }`}
                          >
                            {ann.text}
                          </div>
                          {ann.subtext && (
                            <p className="text-[10px] text-slate-700/90 mt-0.5 leading-snug">
                              {ann.subtext}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingAnnotationId(ann.id);
                            setEditingAnnotationText(ann.text);
                            setEditingAnnotationSubtext(ann.subtext || '');
                          }}
                          title="Edit label text"
                          className="p-0.5 rounded hover:bg-black/10 text-slate-700 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onRemoveAnnotation?.(ann.id);
                          }}
                          title="Delete annotation"
                          className="p-0.5 rounded hover:bg-rose-500/20 text-rose-700 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* ============================================================== */}
            {/* MARQUEE SELECTION RECTANGLE (Cursor Box Selection!)             */}
            {/* ============================================================== */}
            {isMarqueeSelecting && marqueeBox && (
              <div
                style={{
                  left: Math.min(marqueeBox.x1, marqueeBox.x2),
                  top: Math.min(marqueeBox.y1, marqueeBox.y2),
                  width: Math.abs(marqueeBox.x2 - marqueeBox.x1),
                  height: Math.abs(marqueeBox.y2 - marqueeBox.y1),
                }}
                className="absolute border-2 border-dashed border-[#006194] bg-sky-500/15 rounded-lg pointer-events-none z-30 transition-all duration-75"
              />
            )}

            {/* ============================================================== */}
            {/* LIVE COLLABORATOR FLOATING NAME TAG CURSORS ON CANVAS           */}
            {/* ============================================================== */}
            {workspaceCollaborators
              .filter((c) => String(c.userId) !== String(currentUser?.id))
              .map((collab) => (
                <div
                  key={`cursor_${collab.userId}`}
                  style={{
                    transform: `translate(${collab.canvasX}px, ${collab.canvasY}px)`,
                  }}
                  className="absolute left-0 top-0 z-50 pointer-events-none transition-transform duration-100 ease-out"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="drop-shadow-md -ml-0.5 -mt-0.5"
                  >
                    <path
                      d="M4 3L20 11L12 13.5L9.5 21L4 3Z"
                      fill={collab.color || '#006194'}
                      stroke="#ffffff"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div
                    style={{ backgroundColor: collab.color || '#006194' }}
                    className="ml-3.5 -mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-[10.5px] font-extrabold shadow-lg border border-white/90 whitespace-nowrap"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    <span>{collab.userName}</span>
                    <span className="text-[9px] font-mono-code opacity-85">· {collab.role}</span>
                  </div>
                </div>
              ))}
          </div>

          {/* ============================================================== */}
          {/* FLOATING DRAG GHOST FOR QUEUE IDEAS                            */}
          {/* ============================================================== */}
          {queuePointerDrag?.isDragging && (
            <div
              style={{
                left: queuePointerDrag.currentX + 16,
                top: queuePointerDrag.currentY + 16,
              }}
              className="fixed z-50 pointer-events-none bg-[#006194] text-white px-4 py-2.5 rounded-2xl shadow-2xl border-2 border-white/80 flex items-center gap-3 animate-in fade-in select-none"
            >
              <div className="w-6 h-6 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center font-black text-xs shadow-xs">
                {queuePointerDrag.ideaIds.length}
              </div>
              <div>
                <span className="block font-black text-xs text-amber-300">
                  Assigning {queuePointerDrag.ideaIds.length} Idea{queuePointerDrag.ideaIds.length > 1 ? 's' : ''}
                </span>
                <span className="block text-[11px] text-white/95 max-w-[220px] truncate font-medium">
                  {queueIdeas.find((i) => i.id === queuePointerDrag.ideaIds[0])?.title ||
                    adjudicationIdeas.find((i) => i.id === queuePointerDrag.ideaIds[0])?.title ||
                    'Selected idea'}
                </span>
                <span className="block text-[9.5px] text-sky-200 font-semibold mt-0.5">
                  {hoveredStationId ? '🎯 Over Official Station! Release mouse to assign' : 'Hover over Evaluator or Adjudicator station'}
                </span>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* FLOATING DRAG GHOST FOR QUEUE MESSAGES                         */}
          {/* ============================================================== */}
          {messagePointerDrag?.isDragging && (
            <div
              style={{
                left: messagePointerDrag.currentX + 16,
                top: messagePointerDrag.currentY + 16,
              }}
              className="fixed z-50 pointer-events-none bg-teal-700 text-white px-4 py-2.5 rounded-2xl shadow-2xl border-2 border-white/80 flex items-center gap-3 animate-in fade-in select-none"
            >
              <div className="w-6 h-6 rounded-full bg-amber-300 text-slate-900 flex items-center justify-center font-black text-xs shadow-xs">
                {messagePointerDrag.messageIds.length}
              </div>
              <div>
                <span className="block font-black text-xs text-teal-100">
                  Assigning {messagePointerDrag.messageIds.length} Citizen Enquir{messagePointerDrag.messageIds.length > 1 ? 'ies' : 'y'}
                </span>
                <span className="block text-[11px] text-white/95 max-w-[220px] truncate font-medium">
                  {enquiryMessages.find((m) => m.id === messagePointerDrag.messageIds[0])?.subject || 'Selected enquiry'}
                </span>
                <span className="block text-[9.5px] text-teal-200 font-semibold mt-0.5">
                  {hoveredStationId ? '🎯 Over Agent Station! Release to assign' : 'Hover over an Agent station on canvas'}
                </span>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* PLACEMENT BANNER WHEN PEN & WIRE ANNOTATION IS ARMED           */}
          {/* ============================================================== */}
          {activeTool === 'annotate' && pendingAnnotation && (
            <div className="fixed top-28 left-1/2 -translate-x-1/2 z-40 bg-[#0f172a] text-white px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold border border-amber-400/50 animate-in fade-in">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>
                Click anywhere on the canvas to place <strong className="text-amber-300">"{pendingAnnotation.text}"</strong>
              </span>
              <button
                onClick={() => {
                  setPendingAnnotation(null);
                  setActiveTool('select');
                }}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[11px] border border-slate-600 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          {/* ============================================================== */}
          {/* PEN & WIRE ANNOTATION / LABELS & STICKERS PALETTE POPOVER      */}
          {/* ============================================================== */}
          {isAnnotationPaletteOpen && (
            <div className="fixed right-20 top-1/2 -translate-y-1/2 z-40 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 text-xs select-none animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#006194] text-white flex items-center justify-center">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-xs">Labels, Notes & Stickers</h4>
                    <p className="text-[10px] text-slate-500">Organize & annotate canvas items</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAnnotationPaletteOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Custom Label / Sticky Note Creator */}
              <div className="space-y-2 mb-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600">
                  {(['zone_banner', 'sticky_note', 'wire_label'] as CanvasAnnotationType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setCustomAnnotationType(t)}
                      className={`flex-1 py-1 px-1.5 rounded-md border transition-colors cursor-pointer ${customAnnotationType === t
                        ? 'bg-[#006194] text-white border-[#006194]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      {t === 'zone_banner' ? 'Zone Label' : t === 'sticky_note' ? 'Sticky Note' : 'Tag'}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={customAnnotationText}
                  onChange={(e) => setCustomAnnotationText(e.target.value)}
                  placeholder="Type label or note text..."
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#006194]"
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {['#fef08a', '#ccfbf1', '#dbeafe', '#fed7aa', '#fce7f3', '#e9d5ff'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setCustomAnnotationColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-5 h-5 rounded-full border-2 cursor-pointer ${customAnnotationColor === c ? 'border-slate-900 scale-110' : 'border-white shadow-2xs'
                          }`}
                        title="Pick color"
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const label = customAnnotationText.trim() || (
                        customAnnotationType === 'zone_banner'
                          ? 'NEW CANVAS ZONE'
                          : customAnnotationType === 'wire_label'
                            ? 'Workflow Tag'
                            : 'Admin Note'
                      );
                      setPendingAnnotation({
                        type: customAnnotationType,
                        text: label,
                        color: customAnnotationColor,
                        stickerIcon: customAnnotationType === 'zone_banner' ? 'pin' : 'idea',
                      });
                      setActiveTool('annotate');
                      setIsAnnotationPaletteOpen(false);
                      setCustomAnnotationText('');
                    }}
                    className="px-2.5 py-1 bg-[#006194] hover:bg-[#004e75] text-white font-bold rounded-lg text-[11px] cursor-pointer"
                  >
                    Place on Canvas →
                  </button>
                </div>
              </div>

              {/* Quick Stickers */}
              <div>
                <span className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">
                  Quick Canvas Stickers (Click to Place)
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { text: 'Priority Batch', color: '#fee2e2', icon: 'priority' as const, emoji: '🔥' },
                    { text: 'Fast-Track Lane', color: '#f3e8ff', icon: 'fast_track' as const, emoji: '⚡' },
                    { text: 'SLA Watch', color: '#fed7aa', icon: 'warning' as const, emoji: '⚠️' },
                    { text: 'High Impact', color: '#fef08a', icon: 'idea' as const, emoji: '💡' },
                    { text: 'KYC Verified', color: '#dbeafe', icon: 'shield' as const, emoji: '🛡️' },
                    { text: 'Agent Support', color: '#ccfbf1', icon: 'headphones' as const, emoji: '🎧' },
                    { text: 'Pilot Ready', color: '#dcfce7', icon: 'rocket' as const, emoji: '🚀' },
                    { text: 'Board Pick', color: '#fef9c3', icon: 'star' as const, emoji: '⭐' },
                  ].map((st) => (
                    <button
                      key={st.text}
                      onClick={() => {
                        setPendingAnnotation({
                          type: 'sticker',
                          text: st.text,
                          color: st.color,
                          stickerIcon: st.icon,
                        });
                        setActiveTool('annotate');
                        setIsAnnotationPaletteOpen(false);
                      }}
                      style={{ backgroundColor: st.color }}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200/80 hover:border-slate-400 text-left font-bold text-[11px] text-slate-800 flex items-center gap-1.5 transition-transform hover:scale-102 cursor-pointer"
                    >
                      <span>{st.emoji}</span>
                      <span className="truncate">{st.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* GROUP SELECTION FLOATING CONTROLLER PILL                       */}
          {/* ============================================================== */}
          {selectedGroupCardIds.length > 0 && (
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-[#0f172a] text-white px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-150 border border-slate-700">
              <span className="flex items-center gap-1.5 text-sky-400 font-bold">
                <CheckCheck className="w-4 h-4" />
                {selectedGroupCardIds.length} Cards Grouped
              </span>
              <span className="text-slate-400 text-[11px]">• Drag any grouped card to move all together</span>
              <button
                onClick={() => setSelectedGroupCardIds([])}
                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] transition-colors border border-slate-600"
              >
                Clear Group
              </button>
            </div>
          )}

          {/* ============================================================== */}
          {/* BOTTOM CONTROLS PILL (Matching Sketch: [▲][⯈][- 55% +][Fit])     */}
          {/* ============================================================== */}
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center bg-white border border-[#e2e8f0] rounded-2xl shadow-xl p-1 gap-1 select-none">
            <button
              onClick={() => setActiveTool('select')}
              className={`p-2 rounded-xl transition-colors ${activeTool === 'select'
                ? 'bg-[#006194] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
              title="Pointer selection tool (Click or drag marquee box to group cards)"
            >
              <Navigation className="w-4 h-4 -rotate-45" />
            </button>

            <button
              onClick={() => setActiveTool('pan')}
              className={`p-2 rounded-xl transition-colors ${activeTool === 'pan'
                ? 'bg-[#006194] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
              title="Canvas Pan Hand tool"
            >
              <Hand className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-4 bg-slate-200 mx-1" />

            <button
              onClick={() => onZoomChange(Math.max(0.4, zoom - 0.15))}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              title="Zoom Out"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <span className="px-2 font-mono-code font-bold text-xs text-slate-700 min-w-[50px] text-center">
              {Math.round(zoom * 100)}%
            </span>

            <button
              onClick={() => onZoomChange(Math.min(2.2, zoom + 0.15))}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              title="Zoom In"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-4 bg-slate-200 mx-1" />

            <button
              onClick={() => {
                onZoomChange(0.85);
                onPanChange(20, 20);
              }}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-[#006194] hover:bg-slate-100 rounded-lg transition-colors"
            >
              Fit
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 4. MINIFIED RIGHT TOOL DOCK (EXACT MATCH TO UPLOADED IMAGE)    */}
        {/* Floating Vertical Pill Dock with Pointer, Hand, Share, Pen,    */}
        {/* Comments, Image, Palette, User, Star icons                     */}
        {/* ============================================================== */}
        {(isRightDockMinified || !isAdmin) ? (
          <aside
            aria-label="Canvas Tool Dock"
            className="fixed right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center bg-white border border-[#e2e8f0] rounded-[32px] shadow-[0_12px_24px_-6px_rgba(15,23,42,0.12),0_4px_8px_-4px_rgba(15,23,42,0.06)] p-1.5 gap-2 select-none w-14"
          >
            {/* 1. Pointer arrow (Dark navy active pill as in screenshot) */}
            <button
              onClick={() => setActiveTool('select')}
              title="Selection Tool (Click or Drag box to group cards)"
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${activeTool === 'select'
                ? 'bg-[#0f172a] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              <Navigation className="w-5 h-5 -rotate-45 fill-current" />
            </button>

            {/* 2. Hand pan tool */}
            <button
              onClick={() => setActiveTool('pan')}
              title="Pan Tool"
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${activeTool === 'pan'
                ? 'bg-[#0f172a] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              <Hand className="w-5 h-5" />
            </button>

            {/* 3. Share / Dependency / Spawner tool (Draggable to spawn pool!) */}
            <button
              draggable={true}
              onDragStart={(e) => {
                const tool = ADMIN_CANVAS_TOOLS[0];
                const payload = JSON.stringify({ type: 'tool', data: tool });
                e.dataTransfer.setData('text/plain', payload);
                e.dataTransfer.setData('text', payload);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => onAddPoolToCanvas(ADMIN_CANVAS_TOOLS[0], 500, 480)}
              title="Evaluator Pool Spawner (Drag or click to place on canvas)"
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-grab active:cursor-grabbing"
            >
              <Share2 className="w-5 h-5" />
            </button>

            {/* 4. Pencil / Edit Annotation (Labels, Sticky Notes & Stickers) */}
            <button
              onClick={() => {
                setIsAnnotationPaletteOpen((prev) => !prev);
              }}
              title="Pencil & Wire Annotation (Add Labels, Sticky Notes & Stickers)"
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${isAnnotationPaletteOpen || activeTool === 'annotate'
                ? 'bg-[#006194] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              <Edit3 className="w-5 h-5" />
            </button>

            {/* 5. Chat message bubble with blue notification dot */}
            <button
              title="Reviewer Messages & Notes"
              className="relative w-10 h-10 rounded-2xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-[#006194] border-2 border-white" />
            </button>

            {/* 6. Image / Diagram */}
            <button
              title="Add Diagram & Attachments"
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <Image className="w-5 h-5" />
            </button>

            {/* 7. Palette / Theme & Canvas Layout */}
            <button
              onClick={() => {
                setIsThemePanelOpen((prev) => !prev);
                setIsAnnotationPaletteOpen(false);
              }}
              title="Theme & Canvas Layout"
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors cursor-pointer ${isThemePanelOpen
                ? 'bg-[#006194] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              <Palette className="w-5 h-5" />
            </button>

            {/* 8. User / Personnel / Official spawner (or Workspace Collaborate for Evaluator/Adjudicator) */}
            <button
              onClick={isAdmin ? onOpenInviteUser : (onOpenShareWorkspace || onOpenInviteUser)}
              title={isAdmin ? "Personnel Management & Invite" : "Collaborate & Switch Shared Workspaces"}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <User className="w-5 h-5" />
            </button>

            {/* 9. Settings (Admin Central Settings & SLA Triggers - Admin Only) */}
            {isAdmin && (
              <button
                onClick={onOpenSettings}
                title="Admin Central Settings & SLA Triggers"
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-600 hover:text-[#006194] hover:bg-sky-50 transition-colors group cursor-pointer"
              >
                <Settings className="w-5 h-5 text-slate-600 group-hover:text-[#006194] transition-transform duration-300 group-hover:rotate-45" />
              </button>
            )}

            {/* Expand / Detailed Drawer Toggle (Admin Only) */}
            {isAdmin && (
              <button
                onClick={() => setIsRightDockMinified(false)}
                title="Expand Detailed Tools Menu"
                className="w-8 h-8 mt-1 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </aside>
        ) : (
          /* Detailed Expanded Tools Drawer (Admin Only, collapsible back to pill dock) */
          <aside className="w-64 min-w-64 border-l border-slate-200 bg-white flex flex-col z-20 h-full select-none shadow-xs">
            <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-xs">Tools Selection</h3>
                <p className="text-[10.5px] text-slate-500">Drag into canvas to orchestrate</p>
              </div>
              <button
                onClick={() => setIsRightDockMinified(true)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                title="Minify to sleek floating pill dock"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 space-y-2.5 flex-1 overflow-y-auto">
              {ADMIN_CANVAS_TOOLS.map((tool) => (
                <div
                  key={tool.id}
                  draggable={true}
                  onDragStart={(e) => {
                    const payload = JSON.stringify({ type: 'tool', data: tool });
                    e.dataTransfer.setData('text/plain', payload);
                    e.dataTransfer.setData('text', payload);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => {
                    if (tool.type === 'workflow') {
                      onOpenWorkflowArchitect();
                    } else if (tool.type === 'form_settings') {
                      onOpenFormBuilder();
                    } else {
                      onAddPoolToCanvas(tool, 500, 480);
                    }
                  }}
                  className="p-3 bg-white border border-slate-200 hover:border-[#006194]/60 hover:ring-2 hover:ring-sky-100 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-grab active:cursor-grabbing text-xs group"
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-2xs"
                      style={{ backgroundColor: tool.color }}
                    >
                      {tool.type === 'evaluator_pool' && <Users className="w-4 h-4" />}
                      {tool.type === 'review_committee' && <ShieldCheck className="w-4 h-4" />}
                      {tool.type === 'adjudication_board' && <Award className="w-4 h-4" />}
                      {tool.type === 'workflow' && <GitFork className="w-4 h-4" />}
                      {tool.type === 'form_settings' && <FileText className="w-4 h-4" />}
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 group-hover:text-[#006194] transition-colors leading-tight">
                        {tool.name}
                      </h4>
                      <span className="text-[9.5px] text-slate-400 font-mono-code uppercase">
                        Drag to Canvas ⇗
                      </span>
                    </div>
                  </div>

                  <p className="text-[10.5px] text-slate-500 leading-snug">
                    {tool.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 text-[10.5px] text-slate-500">
              <button
                onClick={() => setIsRightDockMinified(true)}
                className="w-full py-1.5 px-2 bg-slate-200/70 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-center transition-colors"
              >
                Minify to Vertical Pill Dock
              </button>
            </div>
          </aside>
        )}

        {/* Theme & Canvas Layout Customization Panel */}
        {isThemePanelOpen && (
          <div className="absolute right-20 top-24 z-40 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 text-xs animate-in fade-in slide-in-from-right-2 duration-150">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-extrabold text-slate-900">
                <Palette className="w-4 h-4 text-[#006194]" />
                <span>Theme & Canvas Layout</span>
              </div>
              <button
                onClick={() => setIsThemePanelOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Canvas Background Theme</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { id: 'slate_dots', label: 'Slate Dot Matrix', swatch: '#f8fafc', border: '#cbd5e1' },
                    { id: 'blueprint', label: 'Architectural Blueprint', swatch: '#eff6ff', border: '#93c5fd' },
                    { id: 'warm_paper', label: 'Warm Studio Paper', swatch: '#fffbeb', border: '#fcd34d' },
                    { id: 'clean_grid', label: 'Clean Engineering Grid', swatch: '#ffffff', border: '#e2e8f0' },
                    { id: 'dark_studio', label: 'Midnight Dark Studio', swatch: '#0f172a', border: '#334155' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onCanvasThemeChange?.(item.id as any)}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-lg border text-left transition-all cursor-pointer ${canvasTheme === item.id
                        ? 'border-[#006194] bg-sky-50/70 text-[#006194] font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: item.swatch, borderColor: item.border }}
                        />
                        <span>{item.label}</span>
                      </span>
                      {canvasTheme === item.id && <Check className="w-3.5 h-3.5 text-[#006194]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block font-bold text-slate-700">Layout Options</label>
                {onToggleGrid && (
                  <button
                    type="button"
                    onClick={onToggleGrid}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <Grid className="w-3.5 h-3.5 text-slate-500" />
                      <span>Show Grid / Dots</span>
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${showGrid ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                      {showGrid ? 'ON' : 'OFF'}
                    </span>
                  </button>
                )}
                {onToggleConnectors && (
                  <button
                    type="button"
                    onClick={onToggleConnectors}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <Share2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Connector Wires</span>
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${showConnectors ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                      {showConnectors ? 'ON' : 'OFF'}
                    </span>
                  </button>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block font-bold text-slate-700 mb-1.5">Card Density</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['Compact', 'Normal', 'Detailed'] as CanvasDensity[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => onDensityChange(d)}
                      className={`py-1.5 rounded-md font-bold text-[10.5px] border cursor-pointer ${density === d
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
          </div>
        )}

        {/* Remove Assigned User Station Warning Modal */}
        {pendingRemoveStation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4">
            <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden text-xs">
              <div className="px-5 py-4 bg-amber-50 border-b border-amber-200 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900">
                    Warning: User Has {pendingRemoveStation.assignedCount} Assigned Idea
                    {pendingRemoveStation.assignedCount > 1 ? 's' : ''}
                  </h3>
                  <p className="text-xs text-amber-900/80 mt-0.5">
                    {pendingRemoveStation.station.user.name} ({pendingRemoveStation.station.user.role})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingRemoveStation(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3 text-slate-600 leading-relaxed">
                <p>
                  This evaluator card currently has{' '}
                  <strong className="text-slate-900">
                    {pendingRemoveStation.assignedCount} assigned idea
                    {pendingRemoveStation.assignedCount > 1 ? 's' : ''}
                  </strong>
                  .
                </p>
                <p>
                  If you proceed with removing{' '}
                  <strong className="text-slate-900">{pendingRemoveStation.station.user.name}</strong>,
                  all {pendingRemoveStation.assignedCount} idea
                  {pendingRemoveStation.assignedCount > 1 ? 's' : ''} will{' '}
                  <strong className="text-emerald-700">
                    remain safely on the canvas as unassigned ideas
                  </strong>
                  . You can then add another user card to the canvas and drag those ideas onto them
                  to reassign.
                </p>
              </div>

              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingRemoveStation(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRemoveCanvasStation(pendingRemoveStation.station.id);
                    setPendingRemoveStation(null);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  Remove User &amp; Keep Ideas Unassigned
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Native Keyboard Shortcuts Reference Modal (macOS, Windows & Linux) */}
        {isShortcutsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden text-xs">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 font-extrabold text-slate-900 text-sm">
                  <Keyboard className="w-4 h-4 text-[#006194]" />
                  <span>Keyboard Shortcuts</span>
                </div>
                <button
                  onClick={() => setIsShortcutsModalOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-2.5">
                {[
                  { action: 'Save Workspace Items', mac: '⌘ + S', win: 'Ctrl + S' },
                  { action: 'Undo Last Canvas Change', mac: '⌘ + Z', win: 'Ctrl + Z' },
                  { action: 'Redo Canvas Change', mac: '⌘ + Shift + Z', win: 'Ctrl + Y / Ctrl + Shift + Z' },
                  { action: 'Delete Selected Items', mac: 'Backspace / Delete', win: 'Backspace / Delete' },
                  { action: 'Zoom In / Out', mac: '⌘ + Scroll', win: 'Ctrl + Scroll' },
                  { action: 'Multi-Select Cards', mac: 'Shift + Click', win: 'Shift + Click' },
                  { action: 'Show Shortcuts Help', mac: '?', win: '?' },
                ].map((s) => (
                  <div key={s.action} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0">
                    <span className="font-semibold text-slate-800">{s.action}</span>
                    <div className="flex items-center gap-1.5">
                      <kbd className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono-code text-[10px] text-slate-700">
                        {s.mac}
                      </kbd>
                      <span className="text-slate-400 text-[10px]">/</span>
                      <kbd className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono-code text-[10px] text-slate-700">
                        {s.win}
                      </kbd>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
