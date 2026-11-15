import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Share2,
  Mail,
  CheckCircle2,
  Copy,
  Check,
  FolderKanban,
  Sparkles,
} from 'lucide-react';
import { AdminPersonnel } from '../../types/ceda';
import { WorkspaceCursorItem } from '../../lib/firebase';

export interface WorkspaceSummary {
  id: string;
  name: string;
  ownerId: number;
  isOwner: boolean;
  updatedAt?: string;
}

interface WorkspaceMember {
  id: number;
  workspaceId: string;
  userId?: number | null;
  email: string;
  role: string;
  status: string;
}

interface WorkspaceShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWorkspaceId: string;
  workspacesList: WorkspaceSummary[];
  onSwitchWorkspace: (workspaceId: string) => void;
  onCreateCustomWorkspace?: () => void;
  onLoadSampleData?: () => void;
  currentUserName: string;
  personnel: AdminPersonnel[];
  liveCollaborators?: WorkspaceCursorItem[];
  onInviteSent?: (email: string) => void;
}

export const WorkspaceShareModal: React.FC<WorkspaceShareModalProps> = ({
  isOpen,
  onClose,
  activeWorkspaceId,
  workspacesList,
  onSwitchWorkspace,
  onCreateCustomWorkspace,
  onLoadSampleData,
  currentUserName,
  personnel,
  liveCollaborators = [],
  onInviteSent,
}) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !activeWorkspaceId) return;
    fetch(`/api/workspaces/${activeWorkspaceId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.members) setMembers(data.members);
      })
      .catch(() => {});
  }, [isOpen, activeWorkspaceId]);

  if (!isOpen) return null;

  const activeWs = workspacesList.find((w) => w.id === activeWorkspaceId);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeWorkspaceId) return;
    setSubmitting(true);
    setStatusMessage(null);
    setInviteUrl(null);
    try {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          invitedByName: currentUserName,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const invitedLower = inviteEmail.trim().toLowerCase();
        if (data.members) setMembers(data.members);
        if (data.inviteUrl) setInviteUrl(data.inviteUrl);
        onInviteSent?.(invitedLower);
        setStatusMessage(
          data.emailStatus?.info || `Collaborator ${inviteEmail.trim()} invited to this workspace!`
        );
        setInviteEmail('');
      } else {
        const errData = await res.json().catch(() => ({}));
        setStatusMessage(errData.error || 'Failed to invite collaborator.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col text-xs max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-[#006194] flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Workspace Collaboration & Switcher
              </h3>
              <p className="text-[11px] text-slate-500">
                Active: <strong>{activeWs?.name || 'Personal Workspace'}</strong> • Synced to PostgreSQL & Firestore
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Switch Workspaces */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-[#006194]" />
                <span>Your Workspaces & Shared Collaborations ({workspacesList.length})</span>
              </label>
              {onCreateCustomWorkspace && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCreateCustomWorkspace();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#006194] hover:bg-[#004e75] text-white font-bold text-[10.5px] flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>New Custom Workspace</span>
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {workspacesList.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => {
                    onSwitchWorkspace(ws.id);
                    onClose();
                  }}
                  className={`w-full px-3 py-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    ws.id === activeWorkspaceId
                      ? 'bg-sky-50 border-[#006194] text-[#006194] font-bold shadow-2xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold">{ws.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono-code">
                      {ws.isOwner ? 'Owner' : 'Shared Collaborator'} • {ws.id}
                    </div>
                  </div>
                  {ws.id === activeWorkspaceId && (
                    <span className="text-[10px] font-extrabold bg-[#006194] text-white px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Invite Collaborator Form */}
          <form onSubmit={handleInvite} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#006194]" />
              <span>Invite Collaborator to "{activeWs?.name || 'This Workspace'}"</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="email"
                  required
                  list="ceda-registered-emails"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter teammate's email (e.g. evaluator@ceda.co.bw)"
                  className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-[#006194]"
                />
                <datalist id="ceda-registered-emails">
                  {personnel.map((p) => (
                    <option key={p.id} value={p.email}>
                      {p.name} ({p.role})
                    </option>
                  ))}
                </datalist>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-[#006194] hover:bg-[#004e75] text-white font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Inviting...' : 'Invite'}
              </button>
            </div>

            {statusMessage && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-[11px]">{statusMessage}</span>
              </div>
            )}

            {inviteUrl && (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-mono-code text-[10px]"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-2.5 py-1.5 bg-slate-800 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}
          </form>

          {/* Current Collaborators */}
          <div>
            <div className="font-bold text-slate-700 mb-1.5">Workspace Members ({members.length})</div>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-40 overflow-y-auto">
              {members.length === 0 ? (
                <div className="p-3 text-slate-400 text-center">Only you have access so far.</div>
              ) : (
                members.map((m) => {
                  const isLiveNow = liveCollaborators.some(
                    (c) =>
                      (c.email && c.email.toLowerCase() === m.email.toLowerCase()) ||
                      (m.userId && String(c.userId) === String(m.userId))
                  );
                  return (
                    <div key={m.id} className="px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isLiveNow ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                          }`}
                        />
                        <span className="font-medium text-slate-800">{m.email}</span>
                        {isLiveNow && (
                          <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                            On Canvas Now
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                          {m.role}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            m.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {onLoadSampleData && (
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Starting with an empty canvas? Load sample CEDA demo items anytime:
              </span>
              <button
                type="button"
                onClick={() => {
                  onLoadSampleData();
                  onClose();
                }}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Load Sample Data</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

