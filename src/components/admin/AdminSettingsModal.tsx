import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Settings, X, Shield, Clock, MessageSquare, 
  Users, Bell, Check, Save, Sliders, AlertTriangle, 
  RefreshCw, CheckCircle2, ChevronRight, Zap, Headphones,
  ToggleLeft, ToggleRight, Sparkles
} from 'lucide-react';
import { AdminPersonnel, WorkflowCycle, ApplicationFormField, AdminAlertNotification } from '../../types/ceda';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoDispatchEnabled: boolean;
  onToggleAutoDispatch: () => void;
  maxChatsPerAgent: number;
  onChangeMaxChatsPerAgent: (max: number) => void;
  slaWarningDays: number;
  onChangeSlaWarningDays: (days: number) => void;
  slaCriticalDays: number;
  onChangeSlaCriticalDays: (days: number) => void;
  autoReplenishMessagesOnFinish?: boolean;
  onToggleAutoReplenishMessages?: () => void;
  enforceStatutoryGate?: boolean;
  onToggleEnforceStatutoryGate?: () => void;
  autoScreenOnIngest?: boolean;
  onToggleAutoScreenOnIngest?: () => void;
  onResetCanvasToDefault?: () => void;
  personnel: AdminPersonnel[];
  alertsHistory: AdminAlertNotification[];
  onOpenWorkflowArchitect: () => void;
  onOpenFormBuilder: () => void;
  onOpenInviteModal: () => void;
  onOpenAlertModal: (user?: AdminPersonnel) => void;
}

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
  isOpen,
  onClose,
  autoDispatchEnabled,
  onToggleAutoDispatch,
  maxChatsPerAgent,
  onChangeMaxChatsPerAgent,
  slaWarningDays,
  onChangeSlaWarningDays,
  slaCriticalDays,
  onChangeSlaCriticalDays,
  autoReplenishMessagesOnFinish = true,
  onToggleAutoReplenishMessages,
  enforceStatutoryGate = true,
  onToggleEnforceStatutoryGate,
  autoScreenOnIngest = false,
  onToggleAutoScreenOnIngest,
  onResetCanvasToDefault,
  personnel,
  alertsHistory,
  onOpenWorkflowArchitect,
  onOpenFormBuilder,
  onOpenInviteModal,
  onOpenAlertModal,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'sla' | 'messages' | 'personnel' | 'alerts'>('general');
  const [platformName, setPlatformName] = useState('CEDA Innovation Intake & Pipeline Platform');
  const [cohortName, setCohortName] = useState('Vision 2036 Pillar II Cohort (2026/2027)');
  const [inactivityThresholdHours, setInactivityThresholdHours] = useState(48);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen || currentUser?.role !== 'Administrator') return null;

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const evaluators = personnel.filter(p => p.role === 'Evaluator');
  const adjudicators = personnel.filter(p => p.role === 'Adjudicator');
  const agents = personnel.filter(p => p.role === 'Agent');
  const admins = personnel.filter(p => p.role === 'Administrator');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in select-none">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#006194] text-white flex items-center justify-center shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Central Administration & System Control Hub
                </h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-sky-100 text-[#006194]">
                  Admin Settings
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Configure SLA thresholds, message auto-assignment, personnel access, and alert triggers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-2 overflow-x-auto text-xs font-bold scrollbar-none">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'general'
                ? 'border-[#006194] text-[#006194]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>General Platform</span>
          </button>
          <button
            onClick={() => setActiveTab('sla')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'sla'
                ? 'border-[#006194] text-[#006194]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>SLA Health & Triggers</span>
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'messages'
                ? 'border-[#006194] text-[#006194]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Headphones className="w-4 h-4 text-teal-600" />
            <span>Message Queue & Agents</span>
          </button>
          <button
            onClick={() => setActiveTab('personnel')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'personnel'
                ? 'border-[#006194] text-[#006194]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Personnel & Roles ({personnel.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'alerts'
                ? 'border-[#006194] text-[#006194]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Bell className="w-4 h-4 text-amber-600" />
            <span>Alerts & Notifications ({alertsHistory.length})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: General Platform */}
          {activeTab === 'general' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Platform Title
                  </label>
                  <input
                    type="text"
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#006194]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Active Cohort Specification
                  </label>
                  <input
                    type="text"
                    value={cohortName}
                    onChange={(e) => setCohortName(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#006194]"
                  />
                </div>
              </div>

              {/* Fast Module Shortcuts */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 mb-3">
                  Integrated Canvas Workspace Modules
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div
                    onClick={() => {
                      onClose();
                      onOpenWorkflowArchitect();
                    }}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-[#006194] hover:bg-sky-50/50 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <h5 className="font-bold text-xs text-slate-900 group-hover:text-[#006194]">
                        8-Stage Evaluation Workflow
                      </h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Configure stage thresholds, turnaround targets, and role gates
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#006194]" />
                  </div>

                  <div
                    onClick={() => {
                      onClose();
                      onOpenFormBuilder();
                    }}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-purple-600 hover:bg-purple-50/50 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <h5 className="font-bold text-xs text-slate-900 group-hover:text-purple-700">
                        Citizen Application Form Builder
                      </h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Customize applicant form fields, CIPA validation, and docs checklist
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Stage 2: Statutory & Tax Screening Gate (CIPA & BURS) Controls */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-600" />
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Stage 2: Statutory & Tax Screening Gate (CIPA & BURS)
                  </h4>
                </div>

                {/* Toggle 1: Block Evaluator Assignment until CIPA & BURS Passed */}
                <div className="p-4 rounded-xl border-2 border-purple-200 bg-purple-50/40 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-bold text-xs text-slate-900">
                        Enforce Stage 2 Statutory Gate Before Evaluator Assignment
                      </h5>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          enforceStatutoryGate
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {enforceStatutoryGate ? 'BLOCK UNVERIFIED' : 'ALLOW ANYTIME'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">
                      When enabled, the Administrator is blocked from dragging or assigning an idea from the queue to an Evaluator until it passes CIPA Company Registration & BURS Tax Clearance verification.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleEnforceStatutoryGate}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-all shrink-0 cursor-pointer ${
                      enforceStatutoryGate
                        ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    }`}
                  >
                    {enforceStatutoryGate ? (
                      <>
                        <ToggleRight className="w-4 h-4" />
                        <span>Gate Enforced</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4" />
                        <span>Gate Disabled</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Toggle 2: Auto-Screen on Ingest */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-bold text-xs text-slate-900">
                        Auto-Screen Ideas on Ingest (cipaget CIPA + BURS Engine)
                      </h5>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          autoScreenOnIngest
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {autoScreenOnIngest ? 'AUTO ON' : 'MANUAL'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Automatically run CIPA company registry & BURS tax clearance verification whenever new ideas enter the Intake Queue.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleAutoScreenOnIngest}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition-all shrink-0 cursor-pointer ${
                      autoScreenOnIngest
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                    }`}
                  >
                    {autoScreenOnIngest ? (
                      <>
                        <ToggleRight className="w-4 h-4" />
                        <span>Auto-Screen: ON</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4" />
                        <span>Auto-Screen: OFF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Canvas Memory & State Persistence */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-bold text-xs text-slate-900">
                      Persistent Canvas Workspace Memory (Auto-Save Active)
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    All station positions, idea & message assignments, pools, labels, stickers, and pan/zoom states are automatically remembered across browser reloads and prompts.
                  </p>
                </div>
                {onResetCanvasToDefault && (
                  <button
                    onClick={() => {
                      onResetCanvasToDefault();
                      onClose();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs transition-colors shrink-0 shadow-2xs cursor-pointer"
                  >
                    Reset Canvas to Default
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SLA Health & Warning Triggers */}
          {activeTab === 'sla' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-900 block mb-1">
                  Automatic Color Coding Rules on User & Station Cards
                </span>
                Cards dynamically compute the minimum SLA remaining among all assigned items.
                When healthy, cards display clean neutral borders. As deadlines approach, cards automatically illuminate in orange for warning and pulsing red for critical breaches.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Warning (Orange) Threshold */}
                <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <h4 className="font-bold text-xs text-amber-900">
                      Warning / Issues Threshold (Orange)
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-600 mb-3">
                    Trigger warning color when remaining SLA drops to or below this duration.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.5"
                      value={slaWarningDays}
                      onChange={(e) => onChangeSlaWarningDays(parseFloat(e.target.value))}
                      className="flex-1 accent-amber-600 cursor-pointer"
                    />
                    <span className="font-mono-code font-bold text-xs text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300 min-w-[70px] text-center">
                      ≤ {slaWarningDays} Days
                    </span>
                  </div>
                </div>

                {/* Critical (Red) Threshold */}
                <div className="p-4 rounded-xl border-2 border-rose-300 bg-rose-50/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                    <h4 className="font-bold text-xs text-rose-900">
                      Critical Breach Threshold (Red)
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-600 mb-3">
                    Trigger urgent red alert and breach warning when remaining SLA is at or below:
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.5"
                      value={slaCriticalDays}
                      onChange={(e) => onChangeSlaCriticalDays(parseFloat(e.target.value))}
                      className="flex-1 accent-rose-600 cursor-pointer"
                    />
                    <span className="font-mono-code font-bold text-xs text-rose-900 bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-300 min-w-[70px] text-center">
                      ≤ {slaCriticalDays} Days
                    </span>
                  </div>
                </div>
              </div>

              {/* Inactivity Threshold */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">
                      Evaluator Inactivity Alert Trigger
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Highlight officials who have not recorded stage audit progress within:
                    </p>
                  </div>
                  <span className="font-mono-code font-bold text-xs text-[#006194] bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
                    {inactivityThresholdHours} Hours
                  </span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="96"
                  step="12"
                  value={inactivityThresholdHours}
                  onChange={(e) => setInactivityThresholdHours(parseInt(e.target.value))}
                  className="w-full accent-[#006194] cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Message Queue & Auto-Assignment */}
          {activeTab === 'messages' && (
            <div className="space-y-5">
              {/* Auto-Dispatch Toggle */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-teal-600" />
                    <h4 className="font-bold text-xs text-slate-900">
                      Admin Queue Staging vs. Auto-Dispatch Routing
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-lg">
                    When <strong>PAUSED (Manual Mode)</strong>, incoming citizen enquiries stay in the Admin Queue first so the Administrator can inspect and assign them to available agents. When <strong>ACTIVE</strong>, queued messages are automatically dispatched FIFO to available agents below capacity.
                  </p>
                </div>
                <button
                  onClick={onToggleAutoDispatch}
                  className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-2xs shrink-0 ${
                    autoDispatchEnabled
                      ? 'bg-teal-600 hover:bg-teal-700 text-white'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${autoDispatchEnabled ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
                  <span>Auto-Dispatch: {autoDispatchEnabled ? 'ACTIVE (ON)' : 'MANUAL QUEUE (OFF)'}</span>
                </button>
              </div>

              {/* Max Capacity per Agent */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h5 className="font-bold text-xs text-slate-900">
                      Agent Chat Concurrency Capacity
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Maximum active simultaneous enquiries assigned to each agent before queuing kicks in.
                    </p>
                  </div>
                  <span className="font-mono-code font-bold text-xs text-teal-900 bg-teal-50 border border-teal-200 px-3 py-1 rounded-lg">
                    {maxChatsPerAgent} Chats / Agent
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="1"
                  value={maxChatsPerAgent}
                  onChange={(e) => onChangeMaxChatsPerAgent(parseInt(e.target.value))}
                  className="w-full accent-teal-600 cursor-pointer"
                />
              </div>

              {/* Auto-Refill on Resolve */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-xs text-slate-900">
                    1-Out 1-In Auto-Refill from Admin Message Queue
                  </h5>
                  <p className="text-[11px] text-slate-500">
                    As soon as an agent resolves an enquiry, immediately pull the next oldest message from the Admin Queue (up to the agent's max chat capacity).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoReplenishMessagesOnFinish}
                  onChange={() => onToggleAutoReplenishMessages?.()}
                  className="w-4 h-4 rounded text-[#006194] focus:ring-[#006194] cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 4: Personnel & Roles */}
          {activeTab === 'personnel' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">
                    System Personnel Directory & Roles
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Evaluators, Adjudicators, Administrators, and Enquiry Agents
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onOpenInviteModal();
                  }}
                  className="px-3 py-1.5 bg-[#006194] hover:bg-[#004e75] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  + Add New Official / Agent
                </button>
              </div>

              {/* Role Counters */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-xl">
                  <span className="block text-lg font-black text-[#006194]">{evaluators.length}</span>
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Evaluators</span>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="block text-lg font-black text-emerald-700">{adjudicators.length}</span>
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Adjudicators</span>
                </div>
                <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-xl">
                  <span className="block text-lg font-black text-teal-700">{agents.length}</span>
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Enquiry Agents</span>
                </div>
                <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl">
                  <span className="block text-lg font-black text-purple-700">{admins.length}</span>
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Administrators</span>
                </div>
              </div>

              {/* Personnel Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                    <tr>
                      <th className="py-2 px-3">Official</th>
                      <th className="py-2 px-3">Role</th>
                      <th className="py-2 px-3">Department</th>
                      <th className="py-2 px-3">Assigned Load</th>
                      <th className="py-2 px-3 text-right">Quick Alert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {personnel.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-bold text-slate-800">
                          {p.name}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.role === 'Evaluator' ? 'bg-sky-50 text-[#006194] border border-sky-200' :
                            p.role === 'Adjudicator' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            p.role === 'Agent' ? 'bg-teal-50 text-teal-700 border border-teal-200' :
                            'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                            {p.role}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-[11px] truncate max-w-[150px]">
                          {p.department}
                        </td>
                        <td className="py-2 px-3 font-mono-code font-bold text-slate-700">
                          {p.role === 'Agent' ? `${p.assignedMessagesCount || 0} chats` : `${p.assignedIdeasCount} ideas`}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => {
                              onClose();
                              onOpenAlertModal(p);
                            }}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded font-bold text-[10px] transition-colors cursor-pointer"
                          >
                            Send Alert
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: Alerts & Notifications Log */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">
                    Dispatched Alert Notifications History
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Audit log of SLA expiry warnings, inactivity notices, and priority alerts
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onOpenAlertModal();
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  📢 Broadcast New Alert
                </button>
              </div>

              {alertsHistory.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">All systems operating normally</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">No SLA breach alerts or inactivity notices dispatched yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                  {alertsHistory.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs hover:shadow-xs transition-all flex items-start gap-3"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        alert.type === 'sla_warning' ? 'bg-rose-100 text-rose-700' :
                        alert.type === 'inactivity' ? 'bg-amber-100 text-amber-700' :
                        'bg-sky-100 text-[#006194]'
                      }`}>
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-xs text-slate-900">
                            {alert.title}
                          </h5>
                          <span className="text-[10px] font-mono-code text-slate-400">
                            {alert.timestamp}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                          <span className="font-bold text-slate-500">
                            Target: {alert.targetUserName} ({alert.targetUserRole})
                          </span>
                          {alert.relatedIdeaCode && (
                            <span className="font-mono-code text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 font-bold">
                              {alert.relatedIdeaCode}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {savedSuccess && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Settings saved successfully!
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#006194] hover:bg-[#004e75] text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Apply Configuration</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
