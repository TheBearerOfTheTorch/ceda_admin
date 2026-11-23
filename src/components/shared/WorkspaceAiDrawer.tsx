import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Database,
  AlertTriangle,
  ShieldCheck,
  Users,
  Loader2,
  Bot,
  CheckCircle2,
} from 'lucide-react';
import {
  AdminPersonnel,
  ApplicationFormField,
  CanvasEvaluatorStation,
  FaqItem,
  ProjectCardData,
  QueueIdeaItem,
  SystemFeedbackItem,
  WorkflowCycle,
} from '../../types/ceda';
import { loadAllLifecycleRecords } from '../../lib/stageJourneyStore';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  executedActions?: string[];
}

interface WorkspaceAiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
  userName: string;
  personnel: AdminPersonnel[];
  queueIdeas: QueueIdeaItem[];
  adjudicationIdeas: QueueIdeaItem[];
  assignedIdeasMap: Record<string, QueueIdeaItem>;
  canvasStations: CanvasEvaluatorStation[];
  projects: ProjectCardData[];
  workflowCycle?: WorkflowCycle;
  applicationFields: ApplicationFormField[];
  faqItems: FaqItem[];
  systemFeedback: SystemFeedbackItem[];
  slaWarningDays: number;
  slaCriticalDays: number;
  aiAllowAutoScreen: boolean;
  aiAllowAutoAssign: boolean;
  onAiVerifyQueue: () => Promise<string>;
  onAiAssignQueue: (targetQueue?: 'ideas' | 'adjudication' | 'both', maxCount?: number) => Promise<string>;
}

export const WorkspaceAiDrawer: React.FC<WorkspaceAiDrawerProps> = ({
  isOpen,
  onClose,
  userRole,
  userName,
  personnel,
  queueIdeas,
  adjudicationIdeas,
  assignedIdeasMap,
  canvasStations,
  projects,
  workflowCycle,
  applicationFields,
  faqItems,
  systemFeedback,
  slaWarningDays,
  slaCriticalDays,
  aiAllowAutoScreen,
  aiAllowAutoAssign,
  onAiVerifyQueue,
  onAiAssignQueue,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Full live platform index spanning Admin, Evaluator & Adjudicator workspaces
  const workspaceIndex = useMemo(() => {
    const lifecycleMap = loadAllLifecycleRecords();
    const allAssigned = Object.values(assignedIdeasMap);

    const reviewerStations = canvasStations.filter(
      (s) => s.user.role === 'Evaluator' || s.user.role === 'Adjudicator'
    );

    const reviewerWorkloads = personnel
      .filter((p) => p.role === 'Evaluator' || p.role === 'Adjudicator')
      .map((person) => {
        const station = reviewerStations.find((s) => s.userId === person.id);
        const stationIdeas = (station?.assignedIdeaIds || [])
          .map((id) => assignedIdeasMap[id])
          .filter(Boolean);
        const behindIdeas = stationIdeas.filter(
          (i) =>
            typeof i.slaRemainingDays === 'number' &&
            i.slaRemainingDays <= slaWarningDays &&
            i.status !== 'adjudicated' &&
            (i.status as string) !== 'archived_complete'
        );
        const criticalIdeas = behindIdeas.filter(
          (i) => (i.slaRemainingDays ?? 99) <= slaCriticalDays
        );

        return {
          id: person.id,
          name: person.name,
          email: person.email,
          role: person.role,
          department: person.department,
          status: person.status,
          assignedCount: stationIdeas.length || person.assignedIdeasCount || 0,
          behindSlaCount: behindIdeas.length,
          criticalSlaCount: criticalIdeas.length,
          isBehind: behindIdeas.length > 0,
          behindIdeas: behindIdeas.map((i) => ({
            code: i.code,
            title: i.title,
            slaRemainingDays: i.slaRemainingDays,
            progress: i.progress,
          })),
        };
      });

    const unassignedAssignedBehind = allAssigned.filter(
      (i) =>
        typeof i.slaRemainingDays === 'number' &&
        i.slaRemainingDays <= slaWarningDays &&
        i.status !== 'adjudicated' &&
        (i.status as string) !== 'archived_complete'
    );

    const evaluatorsBehind = reviewerWorkloads.filter((r) => r.role === 'Evaluator' && r.isBehind);
    const adjudicatorsBehind = reviewerWorkloads.filter((r) => r.role === 'Adjudicator' && r.isBehind);

    const unverifiedQueueCount = queueIdeas.filter(
      (i) => i.screening?.status !== 'verified'
    ).length;

    const avgFeedbackRating =
      systemFeedback.length > 0
        ? Number(
            (
              systemFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) /
              systemFeedback.length
            ).toFixed(2)
          )
        : null;

    return {
      indexedAt: new Date().toISOString(),
      viewer: { name: userName, role: userRole },
      slaThresholds: { warningDays: slaWarningDays, criticalDays: slaCriticalDays },
      behindScheduleSummary: {
        evaluatorsBehindCount: evaluatorsBehind.length,
        adjudicatorsBehindCount: adjudicatorsBehind.length,
        totalBehindIdeasCount: unassignedAssignedBehind.length,
        evaluatorsBehindNames: evaluatorsBehind.map((e) => `${e.name} (${e.behindSlaCount} behind)`),
        adjudicatorsBehindNames: adjudicatorsBehind.map((a) => `${a.name} (${a.behindSlaCount} behind)`),
      },
      personnel: reviewerWorkloads,
      intakeQueue: {
        totalCount: queueIdeas.length,
        unverifiedScreeningCount: unverifiedQueueCount,
        verifiedReadyCount: queueIdeas.length - unverifiedQueueCount,
        items: queueIdeas.slice(0, 60).map((q) => ({
          id: q.id,
          code: q.code,
          title: q.title,
          enterprise: q.enterpriseName,
          submitter: q.submitterName,
          sector: q.category,
          capitalAskBWP: q.capitalAsk,
          screeningStatus: q.screening?.status || 'unscreened',
          slaRemainingDays: q.slaRemainingDays,
        })),
      },
      adjudicationQueue: {
        totalCount: adjudicationIdeas.length,
        items: adjudicationIdeas.slice(0, 40).map((a) => ({
          id: a.id,
          code: a.code,
          title: a.title,
          enterprise: a.enterpriseName,
          sector: a.category,
          capitalAskBWP: a.capitalAsk,
          currentStepNumber: a.currentStepNumber ?? 5,
          slaRemainingDays: a.slaRemainingDays,
        })),
      },
      assignedIdeas: {
        totalCount: allAssigned.length,
        items: allAssigned.slice(0, 60).map((a) => {
          const matchedStation = reviewerStations.find((st) => st.assignedIdeaIds.includes(a.id));
          const matchedPerson = matchedStation?.user || personnel.find((p) => p.id === a.evaluatorId);
          return {
            id: a.id,
            code: a.code,
            title: a.title,
            assignee: matchedPerson?.name || 'Assigned Official',
            assigneeRole: matchedPerson?.role,
            status: a.status,
            progress: a.progress,
            slaRemainingDays: a.slaRemainingDays,
            currentStepNumber: a.currentStepNumber,
          };
        }),
      },
      pipelineProjects: {
        totalCount: projects.length,
        items: projects.slice(0, 40).map((p) => ({
          id: p.id,
          stageTag: p.stageTag,
          title: p.title,
          stageId: p.stageId,
          sector: p.sector,
          fundingRequestedBWP: p.fundingRequested,
          stageProgress: p.stageProgress,
        })),
      },
      lifecycleRecordsCount: Object.keys(lifecycleMap).length,
      workflow: workflowCycle
        ? {
            id: workflowCycle.id,
            title: workflowCycle.title,
            description: workflowCycle.description,
            stages: [...(workflowCycle.stages || [])]
              .sort((a, b) => a.stepNumber - b.stepNumber)
              .map((s) => ({
                step: s.stepNumber,
                name: s.name,
                role: s.assignedRole,
                threshold: s.thresholdCriteria,
                slaDays: s.targetTurnaroundDays,
              })),
          }
        : null,
      applicationForm: {
        totalFields: applicationFields.length,
        fields: applicationFields.map((f) => ({
          label: f.label,
          type: f.fieldType,
          required: f.required,
          options: f.options,
          helpText: f.helpText,
        })),
      },
      faqs: faqItems.map((f) => ({
        category: f.category,
        question: f.question,
        answer: f.answer,
      })),
      submitterFeedbackSummary: {
        totalCount: systemFeedback.length,
        averageRating: avgFeedbackRating,
        recentEntries: systemFeedback.slice(0, 10).map((fb) => ({
          category: fb.category,
          stage: fb.stageContext,
          rating: fb.rating,
          comment: fb.comment,
        })),
      },
    };
  }, [
    personnel,
    queueIdeas,
    adjudicationIdeas,
    assignedIdeasMap,
    canvasStations,
    projects,
    workflowCycle,
    applicationFields,
    faqItems,
    systemFeedback,
    slaWarningDays,
    slaCriticalDays,
    userName,
    userRole,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, loading, isOpen]);

  if (!isOpen) return null;

  const isAdmin = userRole === 'Administrator';

  const sendPrompt = async (text: string) => {
    const clean = text.trim();
    if (!clean || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: clean,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: clean,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          workspaceIndex,
          userRole,
          aiAllowAutoScreen,
          aiAllowAutoAssign,
        }),
      });

      const rawText = await res.text();
      let data: any = null;
      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          data = null;
        }
      }

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(
            'AI endpoint /api/ai/assistant returned 404. Restart the backend server (`npm run dev`) so the updated Express routes are loaded.'
          );
        }
        throw new Error(
          data?.error ||
            (rawText ? rawText.slice(0, 180) : `Server returned HTTP ${res.status} with an empty response`)
        );
      }

      if (!data) {
        throw new Error('Server returned an empty or non-JSON response.');
      }

      const executedActions: string[] = [];
      if (isAdmin && Array.isArray(data.actions)) {
        for (const act of data.actions) {
          if (act.type === 'verify_all_queue_ideas') {
            if (aiAllowAutoScreen) {
              const summary = await onAiVerifyQueue();
              executedActions.push(summary);
            } else {
              executedActions.push(
                'AI Auto-Verify Screening is disabled in Admin Settings. Enable it under Settings -> AI Workspace Automation.'
              );
            }
          } else if (act.type === 'assign_queue_ideas') {
            if (aiAllowAutoAssign) {
              const summary = await onAiAssignQueue(
                act.args?.targetQueue || 'ideas',
                act.args?.maxCount
              );
              executedActions.push(summary);
            } else {
              executedActions.push(
                'AI Auto-Assign is disabled in Admin Settings. Enable it under Settings -> AI Workspace Automation.'
              );
            }
          }
        }
      }

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.answer || 'Completed workspace query.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        executedActions: executedActions.length > 0 ? executedActions : undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `Unable to reach OpenAI right now (${err?.message || 'Unknown error'}). Please verify the server is running and OPENAI_API_KEY in .env is valid.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = isAdmin
    ? [
        'How many evaluators and adjudicators are behind on their evaluations?',
        'Verify all ideas in the queue for CIPA & BURS screening',
        'Assign eligible ideas from the queue to available evaluators',
        'Summarize our active workflow stages, form fields, and FAQs',
      ]
    : [
        'Which of my assigned ideas are behind SLA or urgent?',
        'How many evaluators and adjudicators are behind overall?',
        'Explain the active workflow stages and gate thresholds',
        'What FAQs and form requirements apply to incoming ideas?',
      ];

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[min(94vw,540px)] max-h-[72vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-150">
      {/* Header */}
      <div className="px-4 py-3 bg-[#006194] text-white flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-extrabold tracking-tight flex items-center gap-1.5">
              <span>CEDA Workspace AI Copilot</span>
              <span className="text-[9.5px] font-mono-code px-1.5 py-0.2 rounded bg-white/20 uppercase">
                {userRole}
              </span>
            </div>
            <div className="text-[10.5px] text-sky-100 truncate">
              Indexed Live Across Admin, Evaluator &amp; Adjudicator Workspaces
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 cursor-pointer"
          title="Close AI Assistant"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Live Indexed Telemetry Strip */}
      <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-[10.5px] font-mono-code">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 shrink-0">
          <Database className="w-3 h-3 text-[#006194]" />
          <span>Queue: {workspaceIndex.intakeQueue.totalCount}</span>
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 shrink-0">
          <Users className="w-3 h-3 text-indigo-600" />
          <span>Assigned: {workspaceIndex.assignedIdeas.totalCount}</span>
        </span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border shrink-0 ${
            workspaceIndex.behindScheduleSummary.evaluatorsBehindCount +
              workspaceIndex.behindScheduleSummary.adjudicatorsBehindCount >
            0
              ? 'bg-rose-50 border-rose-200 text-rose-700 font-bold'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold'
          }`}
        >
          <AlertTriangle className="w-3 h-3" />
          <span>
            Behind SLA: {workspaceIndex.behindScheduleSummary.evaluatorsBehindCount} Eval /{' '}
            {workspaceIndex.behindScheduleSummary.adjudicatorsBehindCount} Adj
          </span>
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 shrink-0">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>
            WF ({workspaceIndex.workflow?.stages.length || 0}) • Forms ({workspaceIndex.applicationForm.totalFields}) • FAQs ({workspaceIndex.faqs.length})
          </span>
        </span>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-white text-xs">
        {messages.length === 0 ? (
          <div className="space-y-3 py-2">
            <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200 text-slate-700 leading-relaxed flex items-start gap-2.5">
              <Bot className="w-4 h-4 text-[#006194] shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-900">
                  Full Workspace Index Active
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Ask me about overdue evaluators/adjudicators, idea progress, workflow rules, form fields, FAQs, or ask me to screen &amp; assign queued ideas.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-[10px] font-mono-code font-bold uppercase text-slate-400">
                Suggested Queries &amp; Actions
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {quickPrompts.map((qp) => (
                  <button
                    key={qp}
                    type="button"
                    onClick={() => sendPrompt(qp)}
                    className="text-left px-3 py-2 rounded-xl bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-slate-700 hover:text-[#006194] font-medium transition-colors cursor-pointer"
                  >
                    {qp}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#006194] text-white'
                    : 'bg-slate-100 text-slate-800 border border-slate-200'
                }`}
              >
                <div className="whitespace-pre-line">{m.content}</div>
                {m.executedActions && m.executedActions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
                    {m.executedActions.map((act, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{act}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[9.5px] text-slate-400 font-mono-code mt-0.5 px-1">
                {m.timestamp}
              </span>
            </div>
          ))
        )}

        {loading && (
          <div className="flex items-center gap-2 text-slate-500 text-[11px] px-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#006194]" />
            <span>Analyzing indexed CEDA workspaces...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendPrompt(input);
        }}
        className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI about evaluators behind SLA, workflow, forms, FAQs, or queue..."
          className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs focus:outline-hidden focus:border-[#006194]"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-3.5 py-2 rounded-xl bg-[#006194] hover:bg-[#004e75] disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask</span>
        </button>
      </form>
    </div>
  );
};
