import { doc, setDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { firestore, publishIdeaAuditEvent } from './firebase';
import { StageId, StatutoryScreeningRecord } from '../types/ceda';
import { PIPELINE_STAGES } from '../data/mockData';
import { evaluateIdeaStatutoryScreening } from './cipaScreeningEngine';

export interface IdeaAuditEntry {
  id: string;
  timestamp: string;
  createdAtMs: number;
  action: string;
  author: string;
  authorRole?: string;
  tabName?: string;
  eventType?: 'view' | 'tab_access' | 'screening' | 'assignment' | 'stage_transition' | 'evaluation';
  notes?: string;
}

export interface StageCheckpointRecord {
  stageId: StageId;
  stageNumber: number;
  stageName: string;
  status: 'passed' | 'rejected' | 'docs_requested' | 'in_progress';
  completedAt: string;
  completedBy: string;
  completedByRole: string;
  summary: string;
  screening?: StatutoryScreeningRecord;
  intakeDetails?: {
    promoterName: string;
    omangId: string;
    enterpriseName: string;
    cipaUin?: string;
    bursTin?: string;
    sector?: string;
    capitalAsk?: number;
    submittedAt: string;
  };
  evaluationDetails?: {
    evaluatorName: string;
    assignedAt?: string;
    completedAt?: string;
    readIdeaCompleted: boolean;
    clarificationCommentsCount: number;
    docsRequestedCompleted: boolean;
    approvedForNextStep: boolean;
    score?: number;
    recommendation?: string;
    notes?: string;
  };
  adjudicationDetails?: {
    adjudicatorName: string;
    decision: 'APPROVED' | 'REJECTED' | 'DEFERRED';
    quorumVotes?: string;
    remarks?: string;
    decidedAt: string;
  };
}

export interface IdeaLifecycleRecord {
  key: string;
  ideaId: string;
  code?: string;
  title: string;
  enterpriseName?: string;
  submitterName?: string;
  omangId?: string;
  cipaUin?: string;
  bursTin?: string;
  capitalAsk?: number;
  sector?: string;
  currentStageId: StageId;
  overallStatus: 'active' | 'rejected' | 'completed';
  isAssignedToEvaluator?: boolean;
  assignedEvaluatorId?: number;
  assignedEvaluatorName?: string;
  screening?: StatutoryScreeningRecord;
  stageCheckpoints: Partial<Record<StageId, StageCheckpointRecord>>;
  auditLog?: IdeaAuditEntry[];
  updatedAt: string;
}

function appendAuditEntry(
  existing: IdeaAuditEntry[] | undefined,
  entry: Omit<IdeaAuditEntry, 'id' | 'timestamp' | 'createdAtMs'>
): { list: IdeaAuditEntry[]; added?: IdeaAuditEntry } {
  const list = existing ? [...existing] : [];
  const nowMs = Date.now();
  const isDuplicate = list.some(
    (item) =>
      item.action === entry.action &&
      item.author === entry.author &&
      (item.tabName || '') === (entry.tabName || '') &&
      nowMs - (item.createdAtMs || 0) < 1500
  );
  if (isDuplicate) {
    return { list };
  }
  const newItem: IdeaAuditEntry = {
    id: `aud-${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    createdAtMs: nowMs,
    ...entry,
  };
  return {
    list: [newItem, ...list].slice(0, 80),
    added: newItem,
  };
}

const LIFECYCLE_STORAGE_KEY = 'ceda_idea_lifecycle_v1';
const LIFECYCLE_EVENT_NAME = 'ceda-lifecycle-updated';

export const STAGE_ORDER: StageId[] = [
  'intake',
  'screening',
  'evaluation',
  'expert_review',
  'approval_board',
  'pilot_phase',
  'implementation',
  'realized_impact',
];

export function normalizeIdeaKeyTitle(title?: string): string {
  return (title || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function getCanonicalLifecycleKey(item: {
  id?: string | number;
  code?: string;
  stageTag?: string;
  title?: string;
}): string {
  const titleKey = normalizeIdeaKeyTitle(item.title);
  if (titleKey) return `title_${titleKey}`;
  if (item.id !== undefined && item.id !== null && String(item.id).trim()) {
    return `id_${String(item.id).trim()}`;
  }
  const tag = (item.code || item.stageTag || '').replace(/[\[\]\s]/g, '').toLowerCase();
  return `code_${tag || 'unknown'}`;
}

export function loadAllLifecycleRecords(): Record<string, IdeaLifecycleRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LIFECYCLE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveAllLifecycleRecordsToLocal(records: Record<string, IdeaLifecycleRecord>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LIFECYCLE_STORAGE_KEY, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent(LIFECYCLE_EVENT_NAME, { detail: records }));
  } catch {
    // ignore storage quota errors
  }
}

async function persistRecordToFirestoreAndBackend(record: IdeaLifecycleRecord) {
  if (firestore && record.key) {
    try {
      const safeDocId = record.key.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
      await setDoc(
        doc(firestore, 'idea_lifecycle_records', safeDocId),
        {
          ...record,
          syncedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch {
      // ignore offline
    }
  }

  // Also sync stage & status to PostgreSQL `/api/innovations/sync-stage` so `/api/innovations` stays updated
  if (typeof window !== 'undefined') {
    const backendStageMap: Record<StageId, string> = {
      intake: 'submission',
      screening: 'screening',
      evaluation: 'evaluation',
      expert_review: 'expert_review',
      approval_board: 'adjudication',
      pilot_phase: 'pilot',
      implementation: 'implementation',
      realized_impact: 'impact_measurement',
    };
    const dbStage = backendStageMap[record.currentStageId] || record.currentStageId;
    const dbStatus =
      record.overallStatus === 'rejected'
        ? 'rejected'
        : record.currentStageId === 'approval_board' ||
            record.currentStageId === 'pilot_phase' ||
            record.currentStageId === 'implementation' ||
            record.currentStageId === 'realized_impact'
          ? 'approved'
          : 'pending';

    fetch('/api/innovations/sync-stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: record.ideaId,
        code: record.code,
        title: record.title,
        stage: dbStage,
        status: dbStatus,
        actionNote: `Lifecycle updated to ${record.currentStageId} (${record.overallStatus})`,
      }),
    }).catch(() => {});
  }
}

export function getLifecycleRecordForIdea(item: {
  id?: string | number;
  code?: string;
  stageTag?: string;
  title?: string;
}): IdeaLifecycleRecord | null {
  if (!item) return null;
  const all = loadAllLifecycleRecords();
  const primaryKey = getCanonicalLifecycleKey(item);
  if (all[primaryKey]) return all[primaryKey];

  const idStr = item.id !== undefined ? String(item.id).trim() : '';
  const normTitle = normalizeIdeaKeyTitle(item.title);
  const cleanCode = (item.code || item.stageTag || '').replace(/[\[\]\s]/g, '').toLowerCase();

  for (const rec of Object.values(all)) {
    if (idStr && String(rec.ideaId) === idStr) return rec;
    if (normTitle && normalizeIdeaKeyTitle(rec.title) === normTitle) return rec;
    if (cleanCode && (rec.code || '').replace(/[\[\]\s]/g, '').toLowerCase() === cleanCode) {
      return rec;
    }
  }
  return null;
}

function buildIntakeCheckpoint(
  idea: {
    title: string;
    enterpriseName?: string;
    submitterName?: string;
    omangId?: string;
    cipaUin?: string;
    bursTin?: string;
    capitalAsk?: number;
    sector?: string;
  },
  nowStr: string
): StageCheckpointRecord {
  return {
    stageId: 'intake',
    stageNumber: 1,
    stageName: 'Idea Intake',
    status: 'passed',
    completedAt: nowStr,
    completedBy: idea.submitterName || 'Citizen Promoter',
    completedByRole: 'Submitter',
    summary: `Proposal "${idea.title}" ingested into CEDA Innovation Pipeline under ${idea.enterpriseName || 'Registered Citizen Entity'}.`,
    intakeDetails: {
      promoterName: idea.submitterName || 'Citizen Promoter',
      omangId: idea.omangId || 'BW-752422914',
      enterpriseName: idea.enterpriseName || 'Registered Citizen Entity',
      cipaUin: idea.cipaUin,
      bursTin: idea.bursTin,
      sector: idea.sector || 'AgriTech & Food',
      capitalAsk: idea.capitalAsk || 0,
      submittedAt: nowStr,
    },
  };
}

export function upsertIdeaLifecycleRecord(
  idea: {
    id: string | number;
    code?: string;
    stageTag?: string;
    title: string;
    enterpriseName?: string;
    submitterName?: string;
    omangId?: string;
    cipaUin?: string;
    bursTin?: string;
    capitalAsk?: number;
    sector?: string;
  },
  updater: (existing: IdeaLifecycleRecord) => IdeaLifecycleRecord
): IdeaLifecycleRecord {
  const all = loadAllLifecycleRecords();
  const key = getCanonicalLifecycleKey(idea);
  const existing = getLifecycleRecordForIdea(idea);
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const base: IdeaLifecycleRecord = existing || {
    key,
    ideaId: String(idea.id),
    code: idea.code || idea.stageTag,
    title: idea.title,
    enterpriseName: idea.enterpriseName,
    submitterName: idea.submitterName,
    omangId: idea.omangId,
    cipaUin: idea.cipaUin,
    bursTin: idea.bursTin,
    capitalAsk: idea.capitalAsk,
    sector: idea.sector,
    currentStageId: 'intake',
    overallStatus: 'active',
    stageCheckpoints: {
      intake: buildIntakeCheckpoint(idea, nowStr),
    },
    updatedAt: new Date().toISOString(),
  };

  // Merge latest non-empty metadata fields
  const mergedInput: IdeaLifecycleRecord = {
    ...base,
    key,
    ideaId: String(idea.id || base.ideaId),
    code: idea.code || idea.stageTag || base.code,
    title: idea.title || base.title,
    enterpriseName: idea.enterpriseName || base.enterpriseName,
    submitterName: idea.submitterName || base.submitterName,
    omangId: idea.omangId || base.omangId,
    cipaUin: idea.cipaUin || base.cipaUin,
    bursTin: idea.bursTin || base.bursTin,
    capitalAsk: idea.capitalAsk ?? base.capitalAsk,
    sector: idea.sector || base.sector,
    stageCheckpoints: {
      intake:
        base.stageCheckpoints?.intake ||
        buildIntakeCheckpoint(
          {
            title: idea.title || base.title,
            enterpriseName: idea.enterpriseName || base.enterpriseName,
            submitterName: idea.submitterName || base.submitterName,
            omangId: idea.omangId || base.omangId,
            cipaUin: idea.cipaUin || base.cipaUin,
            bursTin: idea.bursTin || base.bursTin,
            capitalAsk: idea.capitalAsk ?? base.capitalAsk,
            sector: idea.sector || base.sector,
          },
          nowStr
        ),
      ...base.stageCheckpoints,
    },
  };

  const next = updater(mergedInput);
  next.updatedAt = new Date().toISOString();

  all[key] = next;
  saveAllLifecycleRecordsToLocal(all);
  persistRecordToFirestoreAndBackend(next);
  return next;
}

/**
 * Records Stage 2 Statutory & Tax Screening (CIPA & BURS) result.
 * When `screening.status === 'verified'`, Stage 1 (`intake`) and Stage 2 (`screening`)
 * are marked as `passed` (green circles) and the idea advances to Stage 3 (`evaluation`).
 * When `screening.status === 'rejected'`, Stage 2 (`screening`) is marked as `rejected`.
 */
export function recordStatutoryScreeningLifecycle(
  idea: {
    id: string | number;
    code?: string;
    stageTag?: string;
    title: string;
    enterpriseName?: string;
    submitterName?: string;
    omangId?: string;
    cipaUin?: string;
    bursTin?: string;
    capitalAsk?: number;
    sector?: string;
  },
  screening: StatutoryScreeningRecord,
  actorName = 'Administrator'
): IdeaLifecycleRecord {
  const nowStr = screening.verifiedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const verifiedCompany =
    screening.cipaMatch?.companyName &&
    screening.cipaMatch.companyName !== 'No Registered Company / Entity Provided'
      ? screening.cipaMatch.companyName
      : idea.enterpriseName;

  return upsertIdeaLifecycleRecord(
    {
      ...idea,
      enterpriseName: verifiedCompany || idea.enterpriseName,
      cipaUin:
        screening.cipaMatch?.uin && screening.cipaMatch.uin !== 'NOT-PROVIDED'
          ? screening.cipaMatch.uin
          : idea.cipaUin,
      bursTin:
        screening.bursMatch?.tin && screening.bursMatch.tin !== 'NOT-PROVIDED'
          ? screening.bursMatch.tin
          : idea.bursTin,
    },
    (prev) => {
      const isPassed = screening.status === 'verified';
      const isRejected = screening.status === 'rejected' || screening.status === 'failed';
      const isDocsReq = screening.status === 'docs_requested';

      const checkpointStatus: StageCheckpointRecord['status'] = isPassed
        ? 'passed'
        : isRejected
          ? 'rejected'
          : isDocsReq
            ? 'docs_requested'
            : 'in_progress';

      const stageOrder: StageId[] = [
        'intake',
        'screening',
        'evaluation',
        'expert_review',
        'approval_board',
        'pilot_phase',
        'implementation',
        'realized_impact',
      ];
      const currentIdx = stageOrder.indexOf(prev.currentStageId);

      // When verified, advance idea from intake/screening to Stage 3 ('evaluation') if not already further ahead
      const nextStageId: StageId = isPassed
        ? currentIdx < 2
          ? 'evaluation'
          : prev.currentStageId
        : 'screening';

      const screeningAction = isPassed
        ? 'Stage 2 Screening Passed (CIPA & BURS Verified) — Promoted to Stage 3 Evaluation'
        : isRejected
          ? 'Stage 2 Screening Rejected at Gate'
          : isDocsReq
            ? 'Stage 2 Screening: Requested Statutory Documents'
            : `Stage 2 Screening Updated (${screening.status.toUpperCase()})`;

      const { list: updatedAuditLog } = appendAuditEntry(prev.auditLog, {
        action: screeningAction,
        author: screening.verifiedBy || actorName,
        authorRole: 'Administrator',
        eventType: 'screening',
        notes:
          screening.notes ||
          `CIPA: ${screening.cipaMatch?.companyName || verifiedCompany || 'Checked'} (${
            screening.cipaMatch?.uin || 'N/A'
          }) • BURS TCC: ${screening.bursMatch?.tin || 'N/A'}`,
      });

      return {
        ...prev,
        enterpriseName: verifiedCompany || prev.enterpriseName,
        cipaUin:
          screening.cipaMatch?.uin && screening.cipaMatch.uin !== 'NOT-PROVIDED'
            ? screening.cipaMatch.uin
            : prev.cipaUin,
        bursTin:
          screening.bursMatch?.tin && screening.bursMatch.tin !== 'NOT-PROVIDED'
            ? screening.bursMatch.tin
            : prev.bursTin,
        screening,
        currentStageId: nextStageId,
        overallStatus: screening.status === 'rejected' ? 'rejected' : prev.overallStatus,
        auditLog: updatedAuditLog,
        stageCheckpoints: {
          ...prev.stageCheckpoints,
          intake: {
            ...(prev.stageCheckpoints.intake || buildIntakeCheckpoint(idea, nowStr)),
            status: 'passed',
          },
          screening: {
            stageId: 'screening',
            stageNumber: 2,
            stageName: 'Screening',
            status: checkpointStatus,
            completedAt: nowStr,
            completedBy: screening.verifiedBy || actorName,
            completedByRole: 'Administrator',
            summary:
              screening.notes ||
              (isPassed
                ? `CIPA Registration (${screening.cipaMatch?.uin || 'Verified'}) & BURS Tax Clearance (${screening.bursMatch?.tin || 'Valid'}) verified.`
                : `Statutory screening status: ${screening.status.toUpperCase()}`),
            screening,
          },
        },
      };
    }
  );
}

/**
 * Records when an Admin assigns an idea to an Evaluator on the canvas.
 * Ensures the idea's Stage 2 Screening is remembered as verified and its active stage is at least `evaluation`.
 */
export function recordEvaluatorAssignmentLifecycle(
  idea: {
    id: string | number;
    code?: string;
    stageTag?: string;
    title: string;
    enterpriseName?: string;
    submitterName?: string;
    omangId?: string;
    cipaUin?: string;
    bursTin?: string;
    capitalAsk?: number;
    sector?: string;
    screening?: StatutoryScreeningRecord;
  },
  evaluatorName: string,
  evaluatorId?: number
): IdeaLifecycleRecord {
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const ensuredScreening: StatutoryScreeningRecord =
    idea.screening && idea.screening.status === 'verified'
      ? idea.screening
      : evaluateIdeaStatutoryScreening({
          id: String(idea.id),
          code: idea.code || idea.stageTag || 'INT-01',
          title: idea.title,
          category: idea.sector || 'AgriTech & Food',
          arrivalDate: 'Today',
          urgency: 'Standard',
          capitalAsk: idea.capitalAsk || 0,
          status: 'evaluating',
          progress: 20,
          slaRemainingDays: 7,
          slaTargetDays: 14,
          enterpriseName: idea.enterpriseName || 'Registered Citizen Enterprise (Pty) Ltd',
          submitterName: idea.submitterName,
          omangId: idea.omangId,
          cipaUin: idea.cipaUin,
          bursTin: idea.bursTin,
        });

  return upsertIdeaLifecycleRecord(idea, (prev) => {
    const activeScreening = prev.screening?.status === 'verified' ? prev.screening : ensuredScreening;
    const stageOrder: StageId[] = [
      'intake',
      'screening',
      'evaluation',
      'expert_review',
      'approval_board',
      'pilot_phase',
      'implementation',
      'realized_impact',
    ];
    const currentIdx = stageOrder.indexOf(prev.currentStageId);
    const nextStageId: StageId = currentIdx < 2 ? 'evaluation' : prev.currentStageId;
    const { list: updatedAuditLog } = appendAuditEntry(prev.auditLog, {
      action: `Assigned to Evaluator (${evaluatorName}) for Stage 3 Technical Evaluation`,
      author: evaluatorName,
      authorRole: 'Administrator / Evaluator',
      eventType: 'assignment',
      notes: `CIPA & BURS verified. Moved to Stage 3 Evaluation.`,
    });

    return {
      ...prev,
      isAssignedToEvaluator: true,
      assignedEvaluatorId: evaluatorId,
      assignedEvaluatorName: evaluatorName,
      screening: activeScreening,
      currentStageId: nextStageId,
      auditLog: updatedAuditLog,
      stageCheckpoints: {
        ...prev.stageCheckpoints,
        intake: {
          ...(prev.stageCheckpoints.intake || buildIntakeCheckpoint(idea, nowStr)),
          status: 'passed',
        },
        screening: prev.stageCheckpoints.screening || {
          stageId: 'screening',
          stageNumber: 2,
          stageName: 'Screening',
          status: 'passed',
          completedAt: nowStr,
          completedBy: activeScreening.verifiedBy || 'Administrator',
          completedByRole: 'Administrator',
          summary:
            activeScreening.notes ||
            `CIPA Registration (${activeScreening.cipaMatch?.uin}) & BURS Tax Clearance (${activeScreening.bursMatch?.tin}) verified.`,
          screening: activeScreening,
        },
        evaluation: prev.stageCheckpoints.evaluation || {
          stageId: 'evaluation',
          stageNumber: 3,
          stageName: 'Evaluation',
          status: 'in_progress',
          completedAt: nowStr,
          completedBy: evaluatorName,
          completedByRole: 'Evaluator',
          summary: `Assigned to ${evaluatorName} for Stage 3 Technical & Commercial Due Diligence.`,
          evaluationDetails: {
            evaluatorName,
            assignedAt: nowStr,
            readIdeaCompleted: true,
            clarificationCommentsCount: 0,
            docsRequestedCompleted: false,
            approvedForNextStep: false,
          },
        },
      },
    };
  });
}

/**
 * Records when an Evaluator approves an idea at the Approval Gate (or submits evaluation)
 * or when any stage advances to the next stage in the 8-stage pipeline.
 */
export function recordStageTransitionLifecycle(
  idea: {
    id: string | number;
    code?: string;
    stageTag?: string;
    title: string;
    enterpriseName?: string;
    submitterName?: string;
    omangId?: string;
    cipaUin?: string;
    bursTin?: string;
    capitalAsk?: number;
    sector?: string;
  },
  targetStageId: StageId,
  actorName: string,
  actorRole: string,
  options?: {
    status?: 'passed' | 'rejected';
    notes?: string;
    score?: number;
    clarificationCommentsCount?: number;
    adjudicationDecision?: 'APPROVED' | 'REJECTED' | 'DEFERRED';
  }
): IdeaLifecycleRecord {
  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const stageOrder: StageId[] = [
    'intake',
    'screening',
    'evaluation',
    'expert_review',
    'approval_board',
    'pilot_phase',
    'implementation',
    'realized_impact',
  ];

  return upsertIdeaLifecycleRecord(idea, (prev) => {
    const targetIdx = stageOrder.indexOf(targetStageId);
    const updatedCheckpoints: Partial<Record<StageId, StageCheckpointRecord>> = {
      ...prev.stageCheckpoints,
    };

    // Mark all stages prior to targetStageId as 'passed' so they render as Green Circles on the Submitter Canvas
    for (let i = 0; i < targetIdx; i++) {
      const stId = stageOrder[i];
      const stMeta = PIPELINE_STAGES.find((s) => s.id === stId);
      const existingCp = updatedCheckpoints[stId];

      if (stId === 'intake') {
        updatedCheckpoints.intake = {
          ...(existingCp || buildIntakeCheckpoint(idea, nowStr)),
          status: 'passed',
        };
      } else if (stId === 'screening') {
        const fallbackScreening =
          prev.screening ||
          evaluateIdeaStatutoryScreening({
            id: String(idea.id),
            code: idea.code || 'INT-01',
            title: idea.title,
            category: idea.sector || 'AgriTech & Food',
            arrivalDate: 'Today',
            urgency: 'Standard',
            capitalAsk: idea.capitalAsk || 0,
            status: 'evaluating',
            progress: 100,
            slaRemainingDays: 7,
            slaTargetDays: 14,
            enterpriseName: prev.enterpriseName || idea.enterpriseName || 'Registered Citizen Enterprise (Pty) Ltd',
            submitterName: prev.submitterName || idea.submitterName,
          });
        updatedCheckpoints.screening = {
          stageId: 'screening',
          stageNumber: 2,
          stageName: 'Screening',
          status: 'passed',
          completedAt: existingCp?.completedAt || nowStr,
          completedBy: existingCp?.completedBy || 'Administrator',
          completedByRole: 'Administrator',
          summary:
            existingCp?.summary ||
            `CIPA Registration (${fallbackScreening.cipaMatch?.uin}) & BURS Tax Clearance (${fallbackScreening.bursMatch?.tin}) verified.`,
          screening: existingCp?.screening || fallbackScreening,
        };
      } else if (stId === 'evaluation' || stId === 'expert_review') {
        updatedCheckpoints[stId] = {
          stageId: stId,
          stageNumber: stMeta?.number || i + 1,
          stageName: stMeta?.name || stId,
          status: 'passed',
          completedAt: nowStr,
          completedBy: prev.assignedEvaluatorName || actorName,
          completedByRole: 'Evaluator',
          summary:
            options?.notes ||
            `Completed technical & commercial due diligence, clarification review, and document verification. Approved for ${PIPELINE_STAGES[targetIdx]?.name || 'Next Stage'}.`,
          evaluationDetails: {
            evaluatorName: prev.assignedEvaluatorName || actorName,
            completedAt: nowStr,
            readIdeaCompleted: true,
            clarificationCommentsCount: options?.clarificationCommentsCount ?? 2,
            docsRequestedCompleted: true,
            approvedForNextStep: true,
            score: options?.score ?? 88,
            recommendation: 'Proceed to Board Adjudication',
            notes: options?.notes,
          },
        };
      } else {
        updatedCheckpoints[stId] = {
          stageId: stId,
          stageNumber: stMeta?.number || i + 1,
          stageName: stMeta?.name || stId,
          status: 'passed',
          completedAt: nowStr,
          completedBy: actorName,
          completedByRole: actorRole,
          summary:
            options?.notes ||
            `${stMeta?.name || stId} gate approved and signed off by ${actorName} (${actorRole}).`,
          ...(stId === 'approval_board'
            ? {
                adjudicationDetails: {
                  adjudicatorName: actorName,
                  decision: options?.adjudicationDecision || 'APPROVED',
                  quorumVotes: '4 / 5 National Board Warrants',
                  remarks:
                    options?.notes ||
                    'Approved by National Innovation Adjudication Board for Pilot Deployment.',
                  decidedAt: nowStr,
                },
              }
            : {}),
        };
      }
    }

    const targetStageMeta = PIPELINE_STAGES.find((s) => s.id === targetStageId);
    const { list: updatedAuditLog } = appendAuditEntry(prev.auditLog, {
      action:
        options?.status === 'rejected'
          ? `Stage Transition Rejected at ${targetStageMeta?.name || targetStageId}`
          : `Moved to Stage ${targetStageMeta?.number || ''} (${targetStageMeta?.name || targetStageId})`,
      author: actorName,
      authorRole: actorRole,
      eventType: 'stage_transition',
      notes: options?.notes,
    });

    return {
      ...prev,
      currentStageId: targetStageId,
      overallStatus: options?.status === 'rejected' ? 'rejected' : 'active',
      stageCheckpoints: updatedCheckpoints,
      auditLog: updatedAuditLog,
    };
  });
}

/**
 * Records a live audit & view access event (e.g., Admin/Evaluator clicking "Details"
 * or accessing specific dossier tabs: "Project Dossier", "Financial Viability", "Stage Milestones")
 * and broadcasts it both locally and via Firestore in real time.
 */
export function recordIdeaAuditEvent(
  idea: {
    id: string | number;
    code?: string;
    stageTag?: string;
    title: string;
    enterpriseName?: string;
    submitterName?: string;
    omangId?: string;
    cipaUin?: string;
    bursTin?: string;
    capitalAsk?: number;
    sector?: string;
  },
  entry: {
    action: string;
    author: string;
    authorRole?: string;
    tabName?: string;
    eventType?: 'view' | 'tab_access' | 'screening' | 'assignment' | 'stage_transition' | 'evaluation';
    notes?: string;
  }
): IdeaLifecycleRecord {
  let addedEntry: IdeaAuditEntry | undefined;

  const updated = upsertIdeaLifecycleRecord(idea, (prev) => {
    const { list, added } = appendAuditEntry(prev.auditLog, entry);
    addedEntry = added;
    return {
      ...prev,
      auditLog: list,
    };
  });

  if (addedEntry) {
    publishIdeaAuditEvent({
      ideaKey: updated.key,
      ideaId: String(idea.id),
      code: idea.code || idea.stageTag,
      ideaTitle: idea.title,
      action: entry.action,
      author: entry.author,
      authorRole: entry.authorRole || 'Official',
      tabName: entry.tabName,
      eventType: entry.eventType || 'view',
      notes: entry.notes,
      submitterName: idea.submitterName || updated.submitterName,
      timestamp: new Date().toISOString(),
      createdAtMs: addedEntry.createdAtMs,
    }).catch(() => {});
  }

  return updated;
}

export function subscribeToLifecycleRecords(
  onUpdate: (records: Record<string, IdeaLifecycleRecord>) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail && typeof detail === 'object') {
      onUpdate(detail);
    } else {
      onUpdate(loadAllLifecycleRecords());
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === LIFECYCLE_STORAGE_KEY) {
      onUpdate(loadAllLifecycleRecords());
    }
  };

  window.addEventListener(LIFECYCLE_EVENT_NAME, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  let unsubFirestore: (() => void) | undefined;
  if (firestore) {
    try {
      const q = collection(firestore, 'idea_lifecycle_records');
      unsubFirestore = onSnapshot(
        q,
        (snap) => {
          const current = loadAllLifecycleRecords();
          let changed = false;
          snap.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
              const data = change.doc.data() as IdeaLifecycleRecord;
              if (data && data.key) {
                const existing = current[data.key];
                if (!existing || (data.updatedAt && data.updatedAt > (existing.updatedAt || ''))) {
                  current[data.key] = data;
                  changed = true;
                }
              }
            }
          });
          if (changed) {
            saveAllLifecycleRecordsToLocal(current);
          }
        },
        () => {}
      );
    } catch {
      // ignore
    }
  }

  return () => {
    window.removeEventListener(LIFECYCLE_EVENT_NAME, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
    if (unsubFirestore) unsubFirestore();
  };
}
