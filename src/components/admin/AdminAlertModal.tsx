import React, { useState } from 'react';
import { 
  Bell, X, AlertTriangle, Clock, Send, 
  Sparkles, ShieldAlert, CheckCircle2, User, Zap 
} from 'lucide-react';
import { AdminPersonnel, QueueIdeaItem } from '../../types/ceda';

interface AdminAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  personnel: AdminPersonnel[];
  targetUser?: AdminPersonnel | null;
  targetIdea?: QueueIdeaItem | null;
  onSendAlert: (targetUserId: number, type: 'sla_warning' | 'inactivity' | 'priority_notice' | 'custom', title: string, message: string, relatedIdeaCode?: string) => void;
}

export const AdminAlertModal: React.FC<AdminAlertModalProps> = ({
  isOpen,
  onClose,
  personnel,
  targetUser,
  targetIdea,
  onSendAlert,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<number>(targetUser?.id || personnel[0]?.id || 0);
  const [alertType, setAlertType] = useState<'sla_warning' | 'inactivity' | 'priority_notice' | 'custom'>('sla_warning');
  const [ideaCode, setIdeaCode] = useState<string>(targetIdea?.code || '');
  const [customMessage, setCustomMessage] = useState<string>('');

  if (!isOpen) return null;

  const activeOfficial = personnel.find((p) => p.id === selectedUserId) || targetUser || personnel[0];

  const presets = {
    sla_warning: {
      title: '⚠️ Urgent: SLA Expiring Soon on Evaluation',
      message: `Attention ${activeOfficial?.name || 'Official'}: The statutory turnaround SLA for ${ideaCode || 'assigned dossier'} is nearing expiry (less than 48 hours remaining). Please prioritize technical scoring and recommendations.`,
    },
    inactivity: {
      title: '⏳ Inactivity Notice: Stage Progression Required',
      message: `${activeOfficial?.name || 'Official'}, our audit log shows no review progress on ${ideaCode || 'your assigned queue items'} over the last 48 hours. Please update milestone verifications or report blockers to the administrator.`,
    },
    priority_notice: {
      title: '🚀 Executive Fast-Track Priority Escalation',
      message: `National Economic Diversification directive: ${ideaCode || 'This initiative'} has been escalated to Fast-Track priority status. Please expedite evaluation for upcoming Adjudication Board quorum.`,
    },
    custom: {
      title: '📢 Administrative Notice from Operations',
      message: customMessage || `Notice to ${activeOfficial?.name || 'Official'} regarding assigned pipeline items.`,
    },
  };

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    const config = presets[alertType];
    const finalMessage = alertType === 'custom' ? customMessage : config.message;
    onSendAlert(selectedUserId, alertType, config.title, finalMessage, ideaCode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in select-none">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-amber-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Dispatch Alert Notification
              </h3>
              <p className="text-xs text-slate-500">
                Send SLA breach warnings or inactivity alerts directly to assigned evaluators & agents
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

        <form onSubmit={handleDispatch} className="p-6 space-y-4">
          {/* Target Official Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Recipient Official / Agent
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(parseInt(e.target.value))}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#006194] cursor-pointer"
            >
              {personnel.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.role} • {p.department})
                </option>
              ))}
            </select>
          </div>

          {/* Alert Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Alert Classification
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setAlertType('sla_warning')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  alertType === 'sla_warning'
                    ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold ring-2 ring-rose-200'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Clock className="w-3.5 h-3.5 text-rose-600" />
                  <span>SLA Expiring Soon</span>
                </div>
                <p className="text-[10px] text-slate-500 font-normal">
                  Turnaround deadline alert (&lt; 48h)
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAlertType('inactivity')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  alertType === 'inactivity'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold ring-2 ring-amber-200'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Inactivity Alert</span>
                </div>
                <p className="text-[10px] text-slate-500 font-normal">
                  No progress recorded in 48h
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAlertType('priority_notice')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  alertType === 'priority_notice'
                    ? 'border-sky-500 bg-sky-50 text-sky-900 font-bold ring-2 ring-sky-200'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Zap className="w-3.5 h-3.5 text-sky-600" />
                  <span>Fast-Track Escalation</span>
                </div>
                <p className="text-[10px] text-slate-500 font-normal">
                  Priority national cohort directive
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAlertType('custom')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  alertType === 'custom'
                    ? 'border-purple-500 bg-purple-50 text-purple-900 font-bold ring-2 ring-purple-200'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Custom Notice</span>
                </div>
                <p className="text-[10px] text-slate-500 font-normal">
                  Free-form administrative instruction
                </p>
              </button>
            </div>
          </div>

          {/* Related Idea / Dossier Reference */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Related Idea Code or Batch Tag (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. EVAL-CLT-101 or INT-118"
              value={ideaCode}
              onChange={(e) => setIdeaCode(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#006194]"
            >
            </input>
          </div>

          {/* Message Preview or Custom Input */}
          {alertType === 'custom' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Custom Alert Notice Message
              </label>
              <textarea
                rows={3}
                placeholder="Enter specific instructions or requirements for this official..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#006194]"
                required
              />
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase block mb-1">
                Message Preview
              </span>
              <p className="text-slate-800 leading-relaxed font-medium">
                {presets[alertType].message}
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch Alert Now</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
