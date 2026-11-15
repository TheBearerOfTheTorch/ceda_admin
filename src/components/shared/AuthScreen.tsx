import React, { useState, useEffect } from 'react';
import { useAuth, UserRole } from '../../context/AuthContext.tsx';
import {
  ShieldCheck,
  Mail,
  Lock,
  LogIn,
  UserPlus,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  User,
  Building2,
} from 'lucide-react';

interface InvitationDetails {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department: string;
  workspaceId?: string | null;
  status: string;
}

export const AuthScreen: React.FC = () => {
  const {
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    acceptInvitation,
    resetPassword,
    switchRolePersona,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'invite' | 'reset'>('login');
  const [inviteToken, setInviteToken] = useState<string>('');
  const [inviteInfo, setInviteInfo] = useState<InvitationDetails | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole>('Evaluator');
  const [department, setDepartment] = useState('Technical & Commercial Due Diligence');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Detect ?invite=<token> in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (token) {
      setInviteToken(token);
      setMode('invite');
      fetch(`/api/invitations/${token}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setInviteInfo(data);
            setEmail(data.email || '');
          } else {
            setErrorMsg('Invitation link is invalid or has expired.');
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid email or password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      await registerWithEmail(email, password, firstName, lastName, role, department);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const result = await acceptInvitation(inviteToken.trim(), password);
      if (result.workspaceId) {
        localStorage.setItem('ceda_active_workspace_override', result.workspaceId);
      }
      // Clean URL query param
      window.history.replaceState({}, '', window.location.pathname);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to activate account from invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      await resetPassword(email);
      setSuccessMsg(`Password reset email sent to ${email}`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not send reset email');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-linear-to-br from-slate-900 via-[#003b5c] to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#006194] flex items-center justify-center shrink-0 shadow-md">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight">CEDA Innovation Canvas OS</h1>
            <p className="text-[11px] text-slate-400">
              Sign in to access your persistent collaborative workspace
            </p>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-4 bg-slate-100 p-1 m-5 mb-3 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'login' ? 'bg-white text-[#006194] shadow-xs' : 'text-slate-600'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'register' ? 'bg-white text-[#006194] shadow-xs' : 'text-slate-600'
            }`}
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => { setMode('invite'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'invite' ? 'bg-white text-[#006194] shadow-xs' : 'text-slate-600'
            }`}
          >
            Invite
          </button>
          <button
            type="button"
            onClick={() => { setMode('reset'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'reset' ? 'bg-white text-[#006194] shadow-xs' : 'text-slate-600'
            }`}
          >
            Reset
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@ceda.co.bw"
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#006194]"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#006194]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-[#006194] hover:bg-[#004e75] text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
              </button>

              <button
                type="button"
                onClick={() => loginWithGoogle().catch((err) => setErrorMsg(err?.message || 'Google login failed'))}
                className="w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Continue with Google</span>
              </button>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">First Name</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      className="w-full pl-8 pr-2 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#006194]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#006194]"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@ceda.co.bw"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#006194]"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#006194]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Evaluator">Evaluator</option>
                    <option value="Adjudicator">Adjudicator</option>
                    <option value="Agent">Agent</option>
                    <option value="Submitter">Submitter</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full pl-7 pr-2 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-[#006194] hover:bg-[#004e75] text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{submitting ? 'Creating Account...' : 'Create Account (Empty Workspace)'}</span>
              </button>
            </form>
          )}

          {mode === 'invite' && (
            <form onSubmit={handleAcceptInvite} className="space-y-3">
              {inviteInfo && (
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 space-y-1">
                  <div className="font-bold">
                    Welcome, {inviteInfo.firstName} {inviteInfo.lastName}!
                  </div>
                  <div className="text-[11px]">
                    Email: <strong>{inviteInfo.email}</strong> • Role: <strong>{inviteInfo.role}</strong>
                  </div>
                </div>
              )}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Invitation Token / Code</label>
                <input
                  type="text"
                  required
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  placeholder="Paste invitation token from email..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono-code focus:outline-hidden focus:border-[#006194]"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Set Your Account Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a password (min 6 chars)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#006194]"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{submitting ? 'Activating Account...' : 'Activate Account & Sign In'}</span>
              </button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleReset} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Account Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="official@ceda.co.bw"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#006194]"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg cursor-pointer"
              >
                Send Password Reset Email
              </button>
            </form>
          )}

          {/* Quick Demo Personas */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400 mb-2">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Quick Demo Persona Sign-In</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['Administrator', 'Evaluator', 'Adjudicator', 'Agent', 'Submitter'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => switchRolePersona(r)}
                  className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-sky-50 hover:text-[#006194] border border-slate-200 font-bold text-[10.5px] text-slate-700 transition-colors cursor-pointer"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

