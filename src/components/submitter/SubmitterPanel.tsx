import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  subscribeToNewSubmissions,
  subscribeToIdeaAuditEvents,
  subscribeToClarificationChat,
  getCanonicalClarificationKey,
  ClarificationChatMessage,
  IdeaAuditFeedItem,
} from '../../lib/firebase.ts';
import { ClarificationChatModal } from '../shared/ClarificationChatModal.tsx';
import { StageHistoryInspectorModal } from './StageHistoryInspectorModal.tsx';
import {
  getCanonicalLifecycleKey,
  getLifecycleRecordForIdea,
  IdeaAuditEntry,
  loadAllLifecycleRecords,
  subscribeToLifecycleRecords,
  IdeaLifecycleRecord,
} from '../../lib/stageJourneyStore.ts';
import { StageId, ProjectCardData } from '../../types/ceda.ts';
import { PIPELINE_STAGES } from '../../data/mockData.ts';
import {
  Send,
  Plus,
  Check,
  MessageSquare,
  Award,
  ShieldCheck,
  Building2,
  FileCheck2,
  XCircle,
  Eye,
  Radio,
  Clock,
  Bell,
} from 'lucide-react';

interface SubmitterPanelProps {
  onOpenSubmitModal: () => void;
  onRefreshData?: () => void;
  presenceMap?: Record<string | number, 'online' | 'reviewing' | 'editing' | 'offline'>;
}

export const LIFECYCLE_STAGES: { id: string; stageId: StageId; label: string; step: number }[] = [
  { id: 'submission', stageId: 'intake', label: '1. Idea Intake', step: 1 },
  { id: 'screening', stageId: 'screening', label: '2. Statutory & Tax Screening', step: 2 },
  { id: 'evaluation', stageId: 'evaluation', label: '3. Technical Evaluation', step: 3 },
  { id: 'expert_review', stageId: 'expert_review', label: '4. Expert Review', step: 4 },
  { id: 'adjudication', stageId: 'approval_board', label: '5. Board Adjudication', step: 5 },
  { id: 'pilot', stageId: 'pilot_phase', label: '6. Sandbox & Pilot Phase', step: 6 },
  { id: 'implementation', stageId: 'implementation', label: '7. Capital Implementation', step: 7 },
  { id: 'impact_measurement', stageId: 'realized_impact', label: '8. Realized Impact', step: 8 },
];

function mapStageIdToDbStage(stageId: StageId): string {
  switch (stageId) {
    case 'intake':
      return 'submission';
    case 'screening':
      return 'screening';
    case 'evaluation':
      return 'evaluation';
    case 'expert_review':
      return 'expert_review';
    case 'approval_board':
      return 'adjudication';
    case 'pilot_phase':
      return 'pilot';
    case 'implementation':
      return 'implementation';
    case 'realized_impact':
      return 'impact_measurement';
    default:
      return 'submission';
  }
}

export const SubmitterPanel: React.FC<SubmitterPanelProps> = ({
  onOpenSubmitModal,
  presenceMap = {},
}) => {
  const { currentUser } = useAuth();
  const [innovations, setInnovations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [lifecycleMap, setLifecycleMap] = useState<Record<string, IdeaLifecycleRecord>>(() =>
    loadAllLifecycleRecords()
  );
  const [remoteAuditEvents, setRemoteAuditEvents] = useState<IdeaAuditFeedItem[]>([]);
  const [clarificationMsgsByKey, setClarificationMsgsByKey] = useState<
    Record<string, ClarificationChatMessage[]>
  >({});
  const [chatReadMap, setChatReadMap] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('ceda_submitter_chat_read_v1');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [inspectModalState, setInspectModalState] = useState<{
    item: any;
    lifecycle: IdeaLifecycleRecord | null;
    stageId: StageId;
  } | null>(null);

  const getChatMsgTimeMs = (msg: ClarificationChatMessage): number => {
    if (typeof msg.createdAtMs === 'number') return msg.createdAtMs;
    if (typeof msg.createdAt?.toMillis === 'function') return msg.createdAt.toMillis();
    if (msg.timestamp) {
      const parsed = Date.parse(msg.timestamp);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return 0;
  };

  const markItemChatAsRead = (item: { id: string | number; title?: string }) => {
    const key = getCanonicalClarificationKey(item.id, item.title);
    const msgs = clarificationMsgsByKey[key] || [];
    const latestTs = msgs.reduce((max, m) => Math.max(max, getChatMsgTimeMs(m)), Date.now());
    setChatReadMap((prev) => {
      const next = { ...prev, [key]: Math.max(prev[key] || 0, latestTs, Date.now()) };
      try {
        localStorage.setItem('ceda_submitter_chat_read_v1', JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const fetchMyInnovations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/innovations');
      if (res.ok) {
        const data = await res.json();
        setInnovations(data);
        if (data.length > 0 && selectedItemId === null) {
          setSelectedItemId(data[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to load submitter innovations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyInnovations();

    const unsubSubmissions = subscribeToNewSubmissions((newSub) => {
      setInnovations((prev) => {
        if (
          prev.some(
            (item) =>
              String(item.id) === String(newSub.id) ||
              (item.title &&
                newSub.title &&
                item.title.trim().toLowerCase() === newSub.title.trim().toLowerCase())
          )
        ) {
          return prev;
        }
        const normalized = {
          id: newSub.id,
          innovationNumber: newSub.code || `CEDA-INV-${Date.now().toString().slice(-4)}`,
          title: newSub.title,
          description: newSub.description,
          currentStage: 'submission',
          status: 'pending',
          fundingRequested: newSub.fundingRequested || 0,
          projectedJobs: newSub.projectedJobs || 0,
          enterpriseName: newSub.enterpriseName || newSub.applicant?.organization,
          cipaNumber: newSub.cipaUin || newSub.cipaNumber,
          bursTin: newSub.bursTin,
          evaluations: [],
          adjudications: [],
        };
        return [normalized, ...prev];
      });
    });

    const unsubLifecycle = subscribeToLifecycleRecords((records) => {
      setLifecycleMap({ ...records });
    });

    const unsubAudit = subscribeToIdeaAuditEvents((events) => {
      setRemoteAuditEvents(events);
    });

    return () => {
      unsubSubmissions();
      unsubLifecycle();
      unsubAudit();
    };
  }, []);

  // Enrich innovations with live stage progression & CIPA/BURS screening from stageJourneyStore
  const enrichedInnovations = useMemo(() => {
    return innovations.map((item) => {
      const lifecycle = getLifecycleRecordForIdea({
        id: item.id,
        code: item.innovationNumber,
        title: item.title,
      });

      const dbStageIdx = LIFECYCLE_STAGES.findIndex((s) => s.id === item.currentStage);
      const lifecycleStageIdx = lifecycle
        ? LIFECYCLE_STAGES.findIndex((s) => s.stageId === lifecycle.currentStageId)
        : -1;

      const resolvedStageIdx = Math.max(dbStageIdx >= 0 ? dbStageIdx : 0, lifecycleStageIdx);
      const resolvedStageObj = LIFECYCLE_STAGES[resolvedStageIdx] || LIFECYCLE_STAGES[0];

      const resolvedStatus =
        lifecycle?.overallStatus === 'rejected'
          ? 'rejected'
          : lifecycle?.overallStatus === 'completed'
            ? 'approved'
            : resolvedStageIdx >= 2 && item.status === 'pending'
              ? 'in_review'
              : item.status;

      return {
        ...item,
        currentStage: resolvedStageObj.id,
        resolvedStageId: resolvedStageObj.stageId,
        resolvedStageIdx,
        status: resolvedStatus,
        lifecycle: lifecycle || null,
        enterpriseName:
          lifecycle?.enterpriseName ||
          lifecycle?.screening?.cipaMatch?.companyName ||
          item.enterpriseName ||
          item.category?.categoryName,
      };
    });
  }, [innovations, lifecycleMap]);

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return enrichedInnovations[0] || null;
    return (
      enrichedInnovations.find((i) => String(i.id) === String(selectedItemId)) ||
      enrichedInnovations[0] ||
      null
    );
  }, [enrichedInnovations, selectedItemId]);

  const chatSubscriptionTargets = useMemo(() => {
    const seen = new Set<string>();
    const targets: { key: string; id: string | number; title?: string; innovationNumber?: string }[] = [];
    enrichedInnovations.forEach((item) => {
      const key = getCanonicalClarificationKey(item.id, item.title);
      if (!key || seen.has(key)) return;
      seen.add(key);
      targets.push({
        key,
        id: item.id,
        title: item.title,
        innovationNumber: item.innovationNumber,
      });
    });
    return targets;
  }, [enrichedInnovations]);

  const chatSubscriptionSignature = useMemo(
    () => chatSubscriptionTargets.map((t) => `${t.key}:${t.id}:${t.innovationNumber || ''}`).join('|'),
    [chatSubscriptionTargets]
  );

  // Real-time clarification message listener across all Submitter idea cards
  useEffect(() => {
    if (chatSubscriptionTargets.length === 0) return;

    const unsubs = chatSubscriptionTargets.map((target) =>
      subscribeToClarificationChat(
        target.id,
        (msgs) => {
          setClarificationMsgsByKey((prev) => ({
            ...prev,
            [target.key]: msgs,
          }));
        },
        {
          ideaTitle: target.title,
          extraKeys: target.innovationNumber ? [target.innovationNumber] : undefined,
        }
      )
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [chatSubscriptionSignature]);

  // Keep selected card marked as read while ClarificationChatModal is open
  useEffect(() => {
    if (isChatOpen && selectedItem) {
      markItemChatAsRead(selectedItem);
    }
  }, [isChatOpen, selectedItem?.id, selectedItem?.title, clarificationMsgsByKey]);

  // Scoped Strictly to Selected Submitter Idea: Live Viewer, Tab Access & Screening Audit Log
  const selectedItemLiveAuditLogs = useMemo(() => {
    if (!selectedItem) return [];
    const canonicalKey = getCanonicalLifecycleKey({
      id: selectedItem.id,
      code: selectedItem.innovationNumber,
      title: selectedItem.title,
    });
    const normTitle = String(selectedItem.title || '').trim().toLowerCase();

    const matchingRemote = remoteAuditEvents
      .filter(
        (ev) =>
          ev.ideaKey === canonicalKey ||
          ev.ideaId === String(selectedItem.id) ||
          ev.ideaTitle.trim().toLowerCase() === normTitle
      )
      .map((ev) => ({
        id: ev.id || `rem-${ev.createdAtMs}`,
        timestamp: ev.timestamp
          ? new Date(ev.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
          : 'Just now',
        createdAtMs: ev.createdAtMs || 0,
        action: ev.action,
        author:
          ev.authorRole && !ev.author.includes(ev.authorRole)
            ? `${ev.author} (${ev.authorRole})`
            : ev.author,
        tabName: ev.tabName,
        eventType: ev.eventType,
        notes: ev.notes,
      }));

    const localEntries = ((selectedItem.lifecycle?.auditLog || []) as IdeaAuditEntry[]).map((entry) => ({
      id: entry.id,
      timestamp: entry.timestamp,
      createdAtMs: entry.createdAtMs || 0,
      action: entry.action,
      author: entry.author,
      tabName: entry.tabName,
      eventType: entry.eventType,
      notes: entry.notes,
    }));

    const merged = [...matchingRemote, ...localEntries];
    const seen = new Set<string>();
    const deduped: typeof merged = [];
    for (const item of merged) {
      const sig = `${item.action}__${item.author}__${item.tabName || ''}__${Math.floor(
        (item.createdAtMs || 0) / 3000
      )}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      deduped.push(item);
    }
    return deduped.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
  }, [selectedItem, remoteAuditEvents]);

  const formatBWP = (amount: number) => {
    return new Intl.NumberFormat('en-BW', {
      style: 'currency',
      currency: 'BWP',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const toProjectCardData = (item: any): ProjectCardData => ({
    id: String(item.innovationNumber || item.id),
    stageTag: `[SUB-${String(item.id).padStart(3, '0')}]`,
    stageId: (item.resolvedStageId || 'intake') as StageId,
    title: item.title,
    applicant: {
      name: currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'Citizen Entrepreneur',
      nationalId: item.lifecycle?.omangId || 'BW-710293481',
      organization: item.enterpriseName || 'Registered Botswana Enterprise',
      location: 'Gaborone / Regional Hub',
    },
    description: item.description || '',
    sector: (item.category?.categoryName || 'AgriTech & Food') as any,
    fundingRequested: item.fundingRequested || 0,
    coFinancing: Math.round((item.fundingRequested || 0) * 0.2),
    projectedJobs: item.projectedJobs || 10,
    projectedAnnualRevenue: Math.round((item.fundingRequested || 0) * 1.5),
    riskRating: 'LOW',
    stageProgress: 75,
    submittedDate: 'Nov 2026',
    lastUpdated: 'Just now',
    cipaNumber: item.lifecycle?.cipaUin || item.cipaNumber,
    bursTin: item.lifecycle?.bursTin || item.bursTin,
    screening: item.lifecycle?.screening,
    reviewers: [],
    milestones: [],
    tags: [],
    auditLog: (item.lifecycle?.auditLog || []).map((entry: any) => ({
      timestamp: entry.timestamp,
      action: entry.action,
      author: entry.author,
      notes: entry.notes,
    })),
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Submitter Welcome Banner */}
      <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono-code text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
              <Send className="w-3 h-3" />
              CITIZEN SUBMITTER PORTAL
            </span>
            <span className="text-xs text-slate-500 font-mono-code">
              ROLE: {currentUser?.firstName} {currentUser?.lastName}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            My Innovation Submissions & Funding Pipeline
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Submit, track, and inspect your ideas across the stages of the CEDA innovation lifecycle. Click any green completed stage circle to inspect your evaluation records.
          </p>
        </div>

        <button
          onClick={onOpenSubmitModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#006194] hover:bg-[#004b73] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Submit New Innovation</span>
        </button>
      </div>

      {/* Grid: Submissions List & Selected Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: My Submissions */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between text-xs font-mono-code text-slate-500">
            <span>ACTIVE PROPOSALS ({enrichedInnovations.length})</span>
            <span>LIVE REAL-TIME SYNC: CIPA + BURS + PIPELINE</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
              Loading submissions...
            </div>
          ) : enrichedInnovations.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-3">
              <Send className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No submissions logged yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click "Submit New Innovation" above to lodge your citizen initiative into the CEDA pipeline.
              </p>
              <button
                onClick={onOpenSubmitModal}
                className="px-4 py-2 bg-sky-50 text-[#006194] font-semibold text-xs rounded-lg hover:bg-sky-100 transition-colors"
              >
                Create First Submission
              </button>
            </div>
          ) : (
            enrichedInnovations.map((item) => {
              const currentStageIdx = item.resolvedStageIdx;
              const isSelected = selectedItem?.id === item.id;
              const screening = item.lifecycle?.screening;
              const isStage2Rejected =
                screening?.status === 'rejected' || item.status === 'rejected';
              const isStage2Verified =
                screening?.status === 'verified' || currentStageIdx >= 2;
              const itemChatKey = getCanonicalClarificationKey(item.id, item.title);
              const itemChatMsgs = clarificationMsgsByKey[itemChatKey] || [];
              const officialClarityMsgs = itemChatMsgs.filter(
                (m) => m.senderRole !== 'Submitter' && m.senderRole !== 'Citizen'
              );
              const lastReadMs = chatReadMap[itemChatKey] || 0;
              const unreadClarityCount = officialClarityMsgs.filter(
                (m) => getChatMsgTimeMs(m) > lastReadMs
              ).length;
              const latestOfficialClarityMsg =
                officialClarityMsgs.length > 0
                  ? officialClarityMsgs[officialClarityMsgs.length - 1]
                  : null;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className={`bg-white rounded-xl border p-4.5 cursor-pointer transition-all ${isSelected
                      ? 'border-[#006194] ring-2 ring-[#006194]/20 shadow-md'
                      : unreadClarityCount > 0
                        ? 'border-sky-400 ring-1 ring-sky-200 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono-code text-[11px] font-bold text-[#006194] bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                          {item.innovationNumber}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {item.category?.categoryName || 'General'}
                        </span>
                        <span
                          className={`text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded ${item.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : item.status === 'in_review'
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-slate-100 text-slate-700'
                            }`}
                        >
                          {item.status === 'in_review' ? 'In Evaluation' : item.status}
                        </span>
                        {isStage2Verified && !isStage2Rejected && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            CIPA & BURS Verified
                          </span>
                        )}
                        {isStage2Rejected && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            Rejected at Screening
                          </span>
                        )}
                        {unreadClarityCount > 0 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItemId(item.id);
                              markItemChatAsRead(item);
                              setIsChatOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#006194] text-white shadow-xs animate-pulse cursor-pointer"
                            title="New clarification message — click to view and reply"
                          >
                            <Bell className="w-3 h-3" />
                            <span>
                              {unreadClarityCount} New Clarity {unreadClarityCount === 1 ? 'Message' : 'Messages'}
                            </span>
                          </button>
                        ) : officialClarityMsgs.length > 0 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItemId(item.id);
                              markItemChatAsRead(item);
                              setIsChatOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-[#006194] border border-sky-200 hover:bg-sky-100 cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>
                              {officialClarityMsgs.length} Clarification{officialClarityMsgs.length === 1 ? '' : 's'}
                            </span>
                          </button>
                        ) : null}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {item.title}
                      </h3>
                      {item.enterpriseName && (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{item.enterpriseName}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[10px] font-mono-code text-slate-400">ASK</div>
                      <div className="text-xs font-bold font-mono-code text-slate-900">
                        {formatBWP(item.fundingRequested)}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                    {item.description}
                  </p>

                  {latestOfficialClarityMsg && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItemId(item.id);
                        markItemChatAsRead(item);
                        setIsChatOpen(true);
                      }}
                      className={`mb-3 rounded-lg border px-3 py-2 flex items-start justify-between gap-2.5 transition-all cursor-pointer ${unreadClarityCount > 0
                          ? 'bg-sky-50 border-sky-300 shadow-xs'
                          : 'bg-slate-50 border-slate-200 hover:bg-sky-50/50'
                        }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#006194]">
                          <MessageSquare className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            {latestOfficialClarityMsg.senderName} ({latestOfficialClarityMsg.senderRole})
                          </span>
                          {unreadClarityCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-[#006194] text-white text-[9px] uppercase font-mono-code">
                              NEW
                            </span>
                          )}
                          <span className="text-[9px] font-mono-code text-slate-400 ml-auto shrink-0">
                            {latestOfficialClarityMsg.timestamp
                              ? new Date(latestOfficialClarityMsg.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                              : 'Just now'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 mt-0.5 line-clamp-2 leading-snug">
                          {latestOfficialClarityMsg.message}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold text-[#006194] bg-white border border-sky-200 px-2 py-1 rounded-md hover:bg-sky-100">
                        Reply
                      </span>
                    </div>
                  )}

                  {/* Interactive Wireframe Circle Progression Bar (O ---- O ---- [Active]) */}
                  <div className="pt-2.5 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[10.5px] font-mono-code text-slate-500 mb-2">
                      <span>
                        Lifecycle Stage ({currentStageIdx + 1}/{LIFECYCLE_STAGES.length})
                      </span>
                      <strong className="text-[#006194] uppercase">
                        {LIFECYCLE_STAGES[currentStageIdx]?.label}
                      </strong>
                    </div>

                    <div className="flex items-center w-full py-1">
                      {LIFECYCLE_STAGES.map((st, i) => {
                        const isPassed = i < currentStageIdx;
                        const isActive = i === currentStageIdx;
                        const isStageRejected =
                          isActive && item.status === 'rejected';

                        return (
                          <React.Fragment key={st.id}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isPassed || isActive) {
                                  setInspectModalState({
                                    item,
                                    lifecycle: item.lifecycle,
                                    stageId: st.stageId,
                                  });
                                }
                              }}
                              title={
                                isPassed
                                  ? `${st.label} (Passed — Click to inspect CIPA/BURS & stage details)`
                                  : isActive
                                    ? `${st.label} (Current Stage — Click to inspect)`
                                    : st.label
                              }
                              className={`relative flex items-center justify-center transition-all ${isPassed
                                  ? 'w-7 h-7 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-200 cursor-pointer hover:scale-110'
                                  : isStageRejected
                                    ? 'w-7 h-7 rounded-full bg-rose-600 text-white shadow-xs ring-2 ring-rose-200 cursor-pointer'
                                    : isActive
                                      ? 'px-2.5 py-1 rounded-lg bg-[#006194] text-white text-[10px] font-mono-code font-bold shadow-xs cursor-pointer'
                                      : 'w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-400 text-[9px] font-mono-code cursor-default'
                                }`}
                            >
                              {isPassed ? (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              ) : isStageRejected ? (
                                <XCircle className="w-3.5 h-3.5" />
                              ) : isActive ? (
                                <span>Stage {st.step}</span>
                              ) : (
                                <span>{st.step}</span>
                              )}
                            </button>
                            {i < LIFECYCLE_STAGES.length - 1 && (
                              <div
                                className={`flex-1 h-0 mx-1 border-t-2 border-dashed ${i < currentStageIdx
                                    ? 'border-emerald-400'
                                    : 'border-slate-200'
                                  }`}
                              />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Detailed Tracker & Feedback Dossier */}
        <div className="lg:col-span-5 space-y-4">
          <div className="text-xs font-mono-code text-slate-500">
            STAGE TRACKING, CIPA & BURS SCREENING & EVALUATOR COMMENTS
          </div>

          {selectedItem ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-5 animate-in fade-in duration-150">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono-code text-xs font-bold text-[#006194] bg-sky-50 px-2 py-0.5 rounded">
                    {selectedItem.innovationNumber}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    {selectedItem.category?.categoryName}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedItem.title}
                </h3>
                {selectedItem.enterpriseName && (
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Registered Entity: <strong className="text-slate-700">{selectedItem.enterpriseName}</strong>
                  </p>
                )}
              </div>

              {/* Stage 2 Statutory Screening Summary Banner (CIPA & BURS) */}
              {selectedItem.lifecycle?.screening && (
                <div
                  onClick={() =>
                    setInspectModalState({
                      item: selectedItem,
                      lifecycle: selectedItem.lifecycle,
                      stageId: 'screening',
                    })
                  }
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${selectedItem.lifecycle.screening.status === 'verified'
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : selectedItem.lifecycle.screening.status === 'rejected'
                        ? 'bg-rose-50/70 border-rose-200'
                        : 'bg-amber-50/70 border-amber-200'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <FileCheck2
                        className={`w-4 h-4 ${selectedItem.lifecycle.screening.status === 'verified'
                            ? 'text-emerald-600'
                            : selectedItem.lifecycle.screening.status === 'rejected'
                              ? 'text-rose-600'
                              : 'text-amber-600'
                          }`}
                      />
                      <span>Stage 2: CIPA & BURS Statutory Screening</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#006194] flex items-center gap-1 underline">
                      <Eye className="w-3 h-3" />
                      Inspect Full Report
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] mt-2">
                    <div className="bg-white/90 rounded-lg p-2 border border-slate-200/80">
                      <span className="text-[9px] font-mono-code uppercase text-slate-400 block">
                        CIPA Registry
                      </span>
                      <strong className="text-slate-800">
                        {selectedItem.lifecycle.screening.cipaMatch?.registrationStatus ||
                          (selectedItem.lifecycle.screening.cipaRegistered
                            ? 'Registered'
                            : 'Not Found')}
                      </strong>
                      {selectedItem.lifecycle.screening.cipaMatch?.uin && (
                        <span className="block text-[10px] font-mono-code text-slate-500">
                          UIN: {selectedItem.lifecycle.screening.cipaMatch.uin}
                        </span>
                      )}
                    </div>
                    <div className="bg-white/90 rounded-lg p-2 border border-slate-200/80">
                      <span className="text-[9px] font-mono-code uppercase text-slate-400 block">
                        BURS Tax Clearance
                      </span>
                      <strong className="text-slate-800">
                        {selectedItem.lifecycle.screening.bursMatch?.taxClearanceStatus ||
                          (selectedItem.lifecycle.screening.bursTaxClearanceValid
                            ? 'Valid TCC'
                            : 'Pending')}
                      </strong>
                      {selectedItem.lifecycle.screening.bursMatch?.tin && (
                        <span className="block text-[10px] font-mono-code text-slate-500">
                          TIN: {selectedItem.lifecycle.screening.bursMatch.tin}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Real-Time Clarification Chat CTA */}
              {(() => {
                const selectedChatKey = getCanonicalClarificationKey(selectedItem.id, selectedItem.title);
                const selectedMsgs = clarificationMsgsByKey[selectedChatKey] || [];
                const officialSelectedMsgs = selectedMsgs.filter(
                  (m) => m.senderRole !== 'Submitter' && m.senderRole !== 'Citizen'
                );
                const lastReadSelected = chatReadMap[selectedChatKey] || 0;
                const unreadSelectedCount = officialSelectedMsgs.filter(
                  (m) => getChatMsgTimeMs(m) > lastReadSelected
                ).length;
                const latestSelectedOfficial =
                  officialSelectedMsgs.length > 0
                    ? officialSelectedMsgs[officialSelectedMsgs.length - 1]
                    : null;

                return (
                  <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-xs text-[#006194]">
                          <MessageSquare className="w-4 h-4" />
                          <span>Evaluator Clarification Desk</span>
                          {unreadSelectedCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-[#006194] text-white text-[9px] font-mono-code animate-pulse">
                              {unreadSelectedCount} NEW
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Engage directly with the evaluator if they need clarity on your submission.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          markItemChatAsRead(selectedItem);
                          setIsChatOpen(true);
                        }}
                        className="px-3 py-1.5 bg-[#006194] hover:bg-[#004e75] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>
                          {selectedMsgs.length > 0 ? `Open Chat (${selectedMsgs.length})` : 'Open Chat'}
                        </span>
                      </button>
                    </div>
                    {latestSelectedOfficial && (
                      <div className="bg-white/95 border border-sky-200/80 rounded-lg px-2.5 py-2 text-[11px]">
                        <div className="flex items-center justify-between text-[10px] font-bold text-[#006194]">
                          <span>
                            Latest from {latestSelectedOfficial.senderName} ({latestSelectedOfficial.senderRole})
                          </span>
                          <span className="font-mono-code text-slate-400">
                            {latestSelectedOfficial.timestamp
                              ? new Date(latestSelectedOfficial.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                              : 'Just now'}
                          </span>
                        </div>
                        <p className="text-slate-700 mt-0.5 leading-snug">
                          {latestSelectedOfficial.message}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 8-Stage Progress Checklist (Clickable Green Stage Circles) */}
              <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono-code uppercase font-bold text-slate-500">
                    8-Stage Evaluation Workflow (Click Green Circle to Inspect)
                  </span>
                </div>
                {LIFECYCLE_STAGES.map((st, idx) => {
                  const currentIdx = selectedItem.resolvedStageIdx;
                  const isDone = idx < currentIdx;
                  const isCurrent = idx === currentIdx;
                  const isRejectedHere =
                    isCurrent && selectedItem.status === 'rejected';

                  return (
                    <div
                      key={st.id}
                      onClick={() => {
                        if (isDone || isCurrent) {
                          setInspectModalState({
                            item: selectedItem,
                            lifecycle: selectedItem.lifecycle,
                            stageId: st.stageId,
                          });
                        }
                      }}
                      className={`flex items-center gap-2.5 text-xs p-2 rounded-lg transition-all ${isDone
                          ? 'bg-emerald-50/70 hover:bg-emerald-100/70 text-slate-800 cursor-pointer border border-emerald-200/70'
                          : isRejectedHere
                            ? 'bg-rose-50 text-rose-800 font-bold cursor-pointer border border-rose-200'
                            : isCurrent
                              ? 'bg-sky-100/80 text-[#006194] font-bold cursor-pointer border border-sky-200'
                              : 'text-slate-400'
                        }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono-code font-bold shrink-0 shadow-2xs ${isDone
                            ? 'bg-emerald-500 text-white ring-2 ring-emerald-200'
                            : isRejectedHere
                              ? 'bg-rose-600 text-white'
                              : isCurrent
                                ? 'bg-[#006194] text-white'
                                : 'bg-slate-200 text-slate-600'
                          }`}
                      >
                        {isDone ? '✓' : isRejectedHere ? '✕' : st.step}
                      </span>
                      <span className="flex-1">{st.label}</span>
                      {isDone && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                          Passed • View Details →
                        </span>
                      )}
                      {isRejectedHere && (
                        <span className="text-[10px] font-mono-code bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-300">
                          Rejected • View Reason
                        </span>
                      )}
                      {isCurrent && !isRejectedHere && (
                        <span className="text-[10px] font-mono-code bg-white px-2 py-0.5 rounded border border-sky-200">
                          Active Stage
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Evaluator Scores & Feedback */}
              <div>
                <h4 className="text-xs font-mono-code font-bold uppercase text-slate-500 mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#006194]" />
                  <span>Evaluator Assessment ({selectedItem.evaluations?.length || 0})</span>
                </h4>
                {selectedItem.evaluations?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedItem.evaluations.map((ev: any) => (
                      <div key={ev.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                        <div className="grid grid-cols-4 gap-1 text-center font-mono-code text-[11px]">
                          <div className="p-1 bg-white rounded border border-slate-200">
                            <span className="text-[9px] text-slate-400 block">INNOVATION</span>
                            <strong>{ev.innovationScore}/10</strong>
                          </div>
                          <div className="p-1 bg-white rounded border border-slate-200">
                            <span className="text-[9px] text-slate-400 block">FEASIBILITY</span>
                            <strong>{ev.feasibilityScore}/10</strong>
                          </div>
                          <div className="p-1 bg-white rounded border border-slate-200">
                            <span className="text-[9px] text-slate-400 block">IMPACT</span>
                            <strong>{ev.impactScore}/10</strong>
                          </div>
                          <div className="p-1 bg-white rounded border border-slate-200">
                            <span className="text-[9px] text-slate-400 block">SCALE</span>
                            <strong>{ev.scalabilityScore}/10</strong>
                          </div>
                        </div>

                        <p className="text-slate-700 italic">
                          "{ev.comments}"
                        </p>
                        <div className="text-[10px] text-[#006194] font-semibold">
                          Recommendation: {ev.recommendation}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-400">
                    {selectedItem.resolvedStageIdx >= 2
                      ? `Currently assigned to Evaluator (${selectedItem.lifecycle?.assignedEvaluatorName || 'Technical Diligence Team'
                      }) for Stage 3 evaluation.`
                      : 'Awaiting Stage 2 Statutory Screening clearance before Evaluator assignment.'}
                  </div>
                )}
              </div>

              {/* Adjudicator Decision */}
              {selectedItem.adjudications?.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono-code font-bold uppercase text-slate-500 mb-2 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Adjudication Board Decision</span>
                  </h4>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1">
                    <div className="font-bold text-emerald-900">
                      {selectedItem.adjudications[0].decision}
                    </div>
                    <p className="text-emerald-800">
                      {selectedItem.adjudications[0].remarks}
                    </p>
                  </div>
                </div>
              )}

              {/* Live Viewer Access & Screening Audit Log (Strict Scope: Selected Submitter Idea Only) */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-mono-code font-bold uppercase text-slate-500 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-[#006194]" />
                    <span>Live Idea Access & Screening Audit ({selectedItemLiveAuditLogs.length})</span>
                  </h4>
                  <span className="inline-flex items-center gap-1 text-[9.5px] font-mono-code font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Radio className="w-2.5 h-2.5 animate-pulse" />
                    REAL-TIME
                  </span>
                </div>

                {selectedItemLiveAuditLogs.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-[11px] text-slate-500">
                    No official views logged yet for <strong>{selectedItem.title}</strong>. When an Admin or Evaluator opens Details, views tabs (Project Dossier, Financial Viability, Stage Milestones), or updates Screening, it will appear here immediately.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {selectedItemLiveAuditLogs.map((log) => {
                      const isView = log.eventType === 'view' || log.eventType === 'tab_access';
                      return (
                        <div
                          key={log.id}
                          className={`p-2.5 rounded-xl border text-xs transition-all ${isView
                              ? 'bg-sky-50/60 border-sky-200/80'
                              : log.eventType === 'screening'
                                ? 'bg-emerald-50/60 border-emerald-200/80'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                              {isView ? (
                                <Eye className="w-3.5 h-3.5 text-[#006194] shrink-0" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              )}
                              <span>{log.action}</span>
                            </span>
                            <span className="text-[10px] font-mono-code text-slate-400 shrink-0">
                              {log.timestamp}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1 gap-2 flex-wrap">
                            <span className="text-[11px] text-slate-600">
                              By: <strong>{log.author}</strong>
                            </span>
                            {log.tabName && (
                              <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-white border border-sky-200 text-[#006194]">
                                Tab: {log.tabName}
                              </span>
                            )}
                          </div>
                          {log.notes && (
                            <p className="text-[10.5px] text-slate-500 mt-1 leading-snug">
                              {log.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
              Select an innovation on the left to inspect its lifecycle status and evaluation reports.
            </div>
          )}
        </div>
      </div>

      {selectedItem && (
        <ClarificationChatModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          innovationId={selectedItem.id}
          innovationTitle={selectedItem.title}
          innovationNumber={selectedItem.innovationNumber}
          submitterName={currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'Citizen Submitter'}
          evaluatorName={
            selectedItem.lifecycle?.assignedEvaluatorName ||
            selectedItem.evaluations?.[0]?.evaluator?.firstName ||
            'Assigned Evaluator'
          }
          evaluatorId={
            selectedItem.lifecycle?.assignedEvaluatorId ||
            selectedItem.evaluations?.[0]?.evaluatorId
          }
          presenceMap={presenceMap}
        />
      )}

      {/* Stage History Inspector Modal (Opens when clicking any completed stage circle) */}
      <StageHistoryInspectorModal
        isOpen={!!inspectModalState}
        onClose={() => setInspectModalState(null)}
        project={inspectModalState ? toProjectCardData(inspectModalState.item) : null}
        stage={
          inspectModalState?.stageId
            ? PIPELINE_STAGES.find((s) => s.id === inspectModalState.stageId) || null
            : null
        }
        lifecycleRecord={inspectModalState?.lifecycle || null}
      />
    </div>
  );
};
