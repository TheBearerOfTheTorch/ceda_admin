import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  X, UserPlus, Mail, Shield, Building, 
  CheckCircle2, Sparkles, UserCheck, Award, Headphones, KeyRound, Copy, Check, Users
} from 'lucide-react';
import { AdminPersonnel } from '../../types/ceda';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteUser: (
    user: Omit<AdminPersonnel, 'id' | 'avatarInitials' | 'lastActive' | 'assignedIdeasCount'> & { password?: string }
  ) => Promise<{ inviteUrl?: string; emailInfo?: string } | void> | void;
  existingPersonnel?: AdminPersonnel[];
  activeWorkspaceName?: string;
  onCollaborateInvite?: (email: string) => Promise<{ inviteUrl?: string; message?: string } | void> | void;
}

export const InviteUserModal: React.FC<InviteUserModalProps> = ({
  isOpen,
  onClose,
  onInviteUser,
  existingPersonnel = [],
  activeWorkspaceName = 'My Workspace',
  onCollaborateInvite,
}) => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'Administrator';
  const [activeTab, setActiveTab] = useState<'create' | 'collaborate'>(() => (isAdmin ? 'create' : 'collaborate'));

  useEffect(() => {
    if (!isAdmin) {
      setActiveTab('collaborate');
    }
  }, [isAdmin]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Ceda@2026!');
  const [role, setRole] = useState<'Evaluator' | 'Adjudicator' | 'Administrator' | 'Agent'>('Evaluator');
  const [department, setDepartment] = useState('AgriTech & Food Systems Diligence');
  const [status, setStatus] = useState<'active' | 'busy' | 'away'>('active');
  const [submitting, setSubmitting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ inviteUrl?: string; emailInfo?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [collabEmail, setCollabEmail] = useState('');
  const [collabStatus, setCollabStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setSubmitting(true);
    try {
      const res = await onInviteUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        department: department.trim() || 'General Diligence Panel',
        status,
        password: password.trim() || undefined,
      });

      if (res && (res.inviteUrl || res.emailInfo)) {
        setInviteResult(res);
      } else {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!inviteResult?.inviteUrl) return;
    navigator.clipboard.writeText(inviteResult.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseAndReset = () => {
    setInviteResult(null);
    setName('');
    setEmail('');
    setPassword('Ceda@2026!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col text-xs">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-[#006194] flex items-center justify-center">
              {isAdmin ? <UserPlus className="w-4 h-4" /> : <Users className="w-4 h-4 text-indigo-600" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isAdmin ? 'Personnel Management & Invite' : 'Collaborate on Workspace'}
              </h3>
              <p className="text-xs text-slate-500">
                {isAdmin
                  ? 'Create Firebase accounts or invite collaborators'
                  : `Invite colleagues to collaborate on ${activeWorkspaceName}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseAndReset}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Tabs (Only Administrators can create accounts) */}
        {!inviteResult && onCollaborateInvite && isAdmin && (
          <div className="px-5 pt-2.5 bg-slate-50 border-b border-slate-200 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('create');
                setCollabStatus(null);
              }}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-t-lg border-b-2 transition-colors cursor-pointer ${
                activeTab === 'create'
                  ? 'border-[#006194] text-[#006194] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Account</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('collaborate')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-t-lg border-b-2 transition-colors cursor-pointer ${
                activeTab === 'collaborate'
                  ? 'border-indigo-600 text-indigo-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Collaborate on Workspace</span>
              </span>
            </button>
          </div>
        )}

        {activeTab === 'collaborate' && onCollaborateInvite ? (
          <div className="p-5 space-y-4">
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px]">
              Invite an already registered CEDA user to collaborate on{' '}
              <strong>{activeWorkspaceName}</strong>. Without an invitation, users only see their own workspace.
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!collabEmail.trim()) return;
                setSubmitting(true);
                try {
                  const res = await onCollaborateInvite(collabEmail.trim().toLowerCase());
                  setCollabStatus(res?.message || `Invited ${collabEmail.trim().toLowerCase()} to collaborate!`);
                  setCollabEmail('');
                } finally {
                  setSubmitting(false);
                }
              }}
              className="flex gap-2"
            >
              <input
                type="email"
                required
                placeholder="existing.user@ceda.co.bw"
                value={collabEmail}
                onChange={(e) => setCollabEmail(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-lg cursor-pointer"
              >
                {submitting ? 'Inviting...' : 'Invite'}
              </button>
            </form>

            {collabStatus && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold">
                {collabStatus}
              </div>
            )}

            {existingPersonnel.length > 0 && (
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">Quick-Invite Existing Personnel:</label>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {existingPersonnel.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{person.name}</div>
                        <div className="text-[10.5px] text-slate-500 truncate">
                          {person.email} • {person.role}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={async () => {
                          setSubmitting(true);
                          try {
                            const res = await onCollaborateInvite(person.email.toLowerCase());
                            setCollabStatus(res?.message || `Invited ${person.name} to collaborate!`);
                          } finally {
                            setSubmitting(false);
                          }
                        }}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-md text-[10.5px] shrink-0 cursor-pointer"
                      >
                        Invite
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={handleCloseAndReset}
                className="px-4 py-1.5 text-slate-600 hover:bg-slate-100 font-bold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : inviteResult ? (
          <div className="p-5 space-y-4">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-xs">Account Created & Email Invitation Dispatched!</div>
                <p className="text-[11px] text-emerald-800 mt-1">
                  {inviteResult.emailInfo || `An invitation has been created for ${email}.`}
                </p>
              </div>
            </div>

            {inviteResult.inviteUrl && (
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">Account Activation / Email Invite Link:</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={inviteResult.inviteUrl}
                    className="flex-1 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono-code text-[10.5px] text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-2 bg-[#006194] hover:bg-[#004e75] text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-[10.5px] text-slate-500">
                  The user can log in immediately with <strong>{email}</strong> + the temporary password, or open this link to set their own password.
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleCloseAndReset}
                className="px-5 py-2 bg-[#006194] hover:bg-[#004e75] text-white font-bold rounded-lg cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
        /* Form Body */
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Full Official Name:
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Keitumetse Gaolathe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-[#006194] focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Institutional Email:
            </label>
            <input
              type="email"
              required
              placeholder="e.g. k.gaolathe@ceda.co.bw"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-[#006194] focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">Temporary Login Password:</label>
              <button
                type="button"
                onClick={() => setPassword(`Ceda#${Math.floor(1000 + Math.random() * 8999)}`)}
                className="text-[10.5px] font-bold text-[#006194] hover:underline cursor-pointer"
              >
                Generate Random
              </button>
            </div>
            <div className="relative">
              <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono-code focus:ring-2 focus:ring-[#006194] focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Designated System Role:
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setRole('Evaluator')}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                  role === 'Evaluator'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <UserCheck className="w-4 h-4 mb-1 text-amber-600" />
                <span className="block font-bold text-[10.5px]">Evaluator</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('Adjudicator')}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                  role === 'Adjudicator'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Award className="w-4 h-4 mb-1 text-emerald-600" />
                <span className="block font-bold text-[10.5px]">Adjudicator</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('Agent')}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                  role === 'Agent'
                    ? 'border-teal-500 bg-teal-50 text-teal-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Headphones className="w-4 h-4 mb-1 text-teal-600" />
                <span className="block font-bold text-[10.5px]">Agent</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('Administrator')}
                className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                  role === 'Administrator'
                    ? 'border-purple-500 bg-purple-50 text-purple-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Shield className="w-4 h-4 mb-1 text-purple-600" />
                <span className="block font-bold text-[10.5px]">Admin</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Department / Technical Panel:
            </label>
            <input
              type="text"
              required
              placeholder="e.g. CleanTech & Renewable Energy Diligence"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-[#006194] focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Initial Active Status:
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-[#006194] focus:bg-white focus:outline-hidden"
            >
              <option value="active">Active & Available for Queue Assignments</option>
              <option value="busy">Busy / High Load</option>
              <option value="away">Away / On Leave</option>
            </select>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleCloseAndReset}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-[#006194] hover:bg-[#004e75] rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Creating & Sending...' : 'Create Account & Send Email Invite'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};
