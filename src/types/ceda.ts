export type StageId =
  | 'intake'
  | 'screening'
  | 'evaluation'
  | 'expert_review'
  | 'approval_board'
  | 'pilot_phase'
  | 'implementation'
  | 'realized_impact';

export interface StageConfig {
  id: StageId;
  name: string;
  number: number;
  tagPrefix: string;
  color: string;
  bgColor: string;
  borderColor: string;
  activeCount: number;
  description: string;
}

export type Sector =
  | 'AgriTech & Food'
  | 'CleanTech & Solar'
  | 'Health & BioTech'
  | 'Mining & Automation'
  | 'Digital FinTech'
  | 'Eco-Tourism'
  | 'Advanced Manufacturing'
  | 'Logistics & Supply';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Reviewer {
  id: string;
  name: string;
  role: string;
  avatar: string;
  vote?: 'APPROVE' | 'REVISE' | 'REJECT';
  comment?: string;
  date?: string;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  requiredForNextStage?: boolean;
}

export interface RadarMetrics {
  impact: number;
  feasibility: number;
  viability: number;
  natAlign: number;
  innovation?: number;
}

export interface ProjectCardData {
  id: string;
  stageTag: string;
  stageId: StageId;
  title: string;
  applicant: {
    name: string;
    nationalId: string;
    organization: string;
    location: string;
  };
  description: string;
  sector: Sector;
  fundingRequested: number;
  coFinancing: number;
  equityStakePercent?: number;
  projectedJobs: number;
  projectedAnnualRevenue: number;
  riskRating: RiskLevel;
  stageProgress: number;
  submittedDate: string;
  lastUpdated: string;
  reviewers: Reviewer[];
  milestones: Milestone[];
  tags: string[];
  cipaNumber?: string;
  bursTin?: string;
  screening?: StatutoryScreeningRecord;
  kycStatus?: 'Passed KYC' | 'Pending Audit' | 'Docs Verified';
  compositeScore?: number;
  radarMetrics?: RadarMetrics;
  leadEvaluator?: string;
  quorumMet?: boolean;
  complianceRows?: { label: string; value: string; isChecked: boolean }[];
  intakeProgressText?: string;
  auditLog: {
    timestamp: string;
    action: string;
    author: string;
    notes?: string;
  }[];
}

export interface IntakeDossier {
  id: string;
  title: string;
  author: string;
  organization: string;
  badge: {
    text: string;
    type: 'green' | 'amber' | 'blue';
  };
  sectorTag: string;
  priorityTag: string;
  score: number;
  ingestedDate: string;
  description: string;
  capitalAsk: number;
  category: 'all' | 'new_ingest' | 'review' | 'strategic';
}

export interface DependencyConnector {
  id: string;
  fromProjectId: string;
  toProjectId: string;
  label?: string;
  type: 'synergy' | 'supply_chain' | 'pilot_donor' | 'co_investment';
}

export interface CanvasStickyNote {
  id: string;
  text: string;
  author: string;
  color: 'yellow' | 'blue' | 'purple' | 'green';
  x: number;
  y: number;
  createdAt: string;
  stageId?: StageId;
}

export interface ActiveCollaborator {
  id: string;
  name: string;
  role: string;
  color: string;
  initials: string;
  currentStage?: StageId;
  status: 'active' | 'reviewing' | 'idle';
}

export type CanvasDensity = 'Compact' | 'Normal' | 'Expanded';

export interface WorkspaceModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'core' | 'enterprise';
  isActive?: boolean;
}

// -------------------------------------------------------------
// Administrator Specialized Types
// -------------------------------------------------------------

export type AdminRole = 'Evaluator' | 'Adjudicator' | 'Administrator' | 'Agent';

export interface AdminPersonnel {
  id: number;
  name: string;
  email: string;
  role: AdminRole;
  department: string;
  assignedIdeasCount: number;
  assignedMessagesCount?: number;
  maxChatCapacity?: number;
  agentAvailability?: 'available' | 'busy' | 'offline';
  status: 'active' | 'busy' | 'away' | 'suspended';
  avatarInitials: string;
  lastActive: string;
  activeAlertsCount?: number;
  lastAlertSent?: {
    type: 'sla_warning' | 'inactivity' | 'priority_notice' | 'custom';
    message: string;
    timestamp: string;
  } | string;
}

export interface SubmitterEnquiryMessage {
  id: string;
  submitterName: string;
  submitterEmail: string;
  submitterLocation: string;
  ideaCode?: string;
  ideaTitle?: string;
  subject: string;
  messageText: string;
  arrivalTime: string;
  rawTimestamp: number; // For FIFO sorting: oldest (low number) on left, newest on right
  status: 'in_queue' | 'queued' | 'assigned' | 'resolved';
  assignedAgentId?: number;
  assignedAgentName?: string;
  priority: 'Normal' | 'Urgent' | 'High';
  slaMinutesRemaining: number;
  thread: {
    id: string;
    sender: 'submitter' | 'agent' | 'admin';
    senderName: string;
    text: string;
    timestamp: string;
  }[];
  resolutionNotes?: string;
  resolvedAt?: string;
}

export interface AdminAlertNotification {
  id: string;
  targetUserId: number;
  targetUserName: string;
  targetUserRole?: string;
  targetRole?: string;
  type: 'sla_warning' | 'inactivity' | 'priority_notice' | 'custom';
  alertType?: 'sla_warning' | 'inactivity' | 'priority_notice' | 'custom';
  title: string;
  message: string;
  relatedIdeaCode?: string;
  timestamp?: string;
  createdAt?: string;
  read: boolean;
}

export interface IncomingQueueCategory {
  categoryId: number;
  categoryName: string;
  count: number;
  totalFundingAsk: number;
  color: string;
}

export interface SubmissionBatchQueue {
  id: string;
  batchCode: string;
  category: string;
  unassignedCount: number;
  averageCapitalAsk: number;
  arrivalDate: string;
  urgency: 'Standard' | 'Priority' | 'Fast-Track';
  summary?: string;
}

export interface ApplicationFormField {
  id: string;
  label: string;
  fieldType: 'text' | 'textarea' | 'number' | 'select' | 'file';
  placeholder?: string;
  required: boolean;
  options?: string[];
  helpText?: string;
}

export interface WorkflowStageDefinition {
  id: string;
  name: string;
  stepNumber: number;
  assignedRole: 'Evaluator' | 'Adjudicator' | 'Administrator';
  thresholdCriteria: string;
  targetTurnaroundDays: number;
  color: string;
}

export interface WorkflowCycle {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  stages: WorkflowStageDefinition[];
}

export type StatutoryScreeningStatus =
  | 'unscreened'
  | 'verified'       // 🟢 CIPA + BURS Verified
  | 'partial'        // 🟡 Partial / Review Needed
  | 'failed'         // 🔴 Not Registered / Failed
  | 'docs_requested' // 🟠 Statutory Docs Requested from Submitter
  | 'rejected';      // ⛔ Rejected at Stage 2 Screening Gate

export interface CipaRegistryMatch {
  uin: string;
  companyName: string;
  registrationStatus: 'Registered' | 'In Default' | 'Removed' | 'Not Found';
  incorporationDate: string;
  companyType: string;
  registeredOffice: string;
  annualReturnCompliant: boolean;
  directors: {
    name: string;
    omangOrId: string;
    role: string;
    isSubmitterMatch?: boolean;
  }[];
  source: 'cipa_obrs_live' | 'cipaget_engine';
  checkedAt: string;
}

export interface BursTaxClearanceMatch {
  tin: string;
  certificateNumber: string;
  taxStatus: 'Valid' | 'Expired' | 'Arrears Flagged' | 'Missing';
  issueDate: string;
  expiryDate: string;
  entityNameMatched: boolean;
  checkedAt: string;
}

export interface StatutoryScreeningRecord {
  status: StatutoryScreeningStatus;
  cipaVerified: boolean;
  bursVerified: boolean;
  omangKycVerified: boolean;
  cipaMatch?: CipaRegistryMatch;
  bursMatch?: BursTaxClearanceMatch;
  omangId?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
}

export interface QueueIdeaItem {
  id: string;
  code: string;
  title: string;
  category: string;
  arrivalDate: string;
  rawTimestamp?: number; // FIFO timestamp
  urgency: 'Standard' | 'Priority' | 'Fast-Track';
  capitalAsk: number;
  evaluatorId?: number;
  status: 'in_queue' | 'evaluating' | 'completed';
  progress: number; // 0 to 100%
  slaRemainingDays: number;
  slaTargetDays: number;
  submitterName?: string;
  enterpriseName?: string;
  cipaUin?: string;
  bursTin?: string;
  omangId?: string;
  screening?: StatutoryScreeningRecord;
}

export type SlaHealthStatus = 'healthy' | 'warning' | 'critical';

export type CanvasAnnotationType = 'sticker' | 'sticky_note' | 'wire_label' | 'zone_banner';

export interface CanvasAnnotationItem {
  id: string;
  type: CanvasAnnotationType;
  x: number;
  y: number;
  text: string;
  subtext?: string;
  color?: string;
  stickerIcon?: 'priority' | 'warning' | 'idea' | 'fast_track' | 'shield' | 'rocket' | 'headphones' | 'check' | 'star' | 'pin';
  width?: number;
  height?: number;
  author?: string;
  createdAt?: string;
}

export interface CanvasEvaluatorStation {
  id: string;
  userId: number;
  user: AdminPersonnel;
  x: number;
  y: number;
  stationType?: 'evaluator' | 'agent';
  assignedIdeaIds: string[];
  assignedMessageIds?: string[];
  autoReplenishOnFinish: boolean; // "one out one in from the queue"
  targetCapacity: number;
}

export interface CanvasPoolContainer {
  id: string;
  title: string;
  type: 'evaluator_pool' | 'review_committee' | 'adjudication_board' | 'workflow' | 'form_settings';
  x: number;
  y: number;
  userIds: number[];
  color: string;
}

export interface AdminCanvasTool {
  id: string;
  name: string;
  type: 'evaluator_pool' | 'review_committee' | 'adjudication_board' | 'workflow' | 'form_settings';
  icon: string;
  description: string;
  color: string;
}
