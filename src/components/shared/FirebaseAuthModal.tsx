import React, { useState } from 'react';
import { useAuth, UserRole } from '../../context/AuthContext.tsx';
import {
  getEnrolledMfaFactors,
  startTotpMfaEnrollment,
  finalizeTotpMfaEnrollment,
} from '../../lib/firebase.ts';
import {
  X,
  Lock,
  Mail,
  User,
  Building2,
  ShieldCheck,
  KeyRound,
  LogIn,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Smartphone,
} from 'lucide-react';

interface FirebaseAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthTab = 'login' | 'register' | 'reset' | 'mfa';

export const FirebaseAuthModal: React.FC<FirebaseAuthModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    firebaseUser,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    resetPassword,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<UserRole>('Submitter');
  const [department, setDepartment] = useState('Citizen Enterprise');
  const [totpSecretObj, setTotpSecretObj] = useState<any | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const enrolledFactors = getEnrolledMfaFactors(firebaseUser);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      await loginWithEmail(email, password);
      setSuccessMsg('Signed in with Firebase Auth & synced UID to PostgreSQL!');
      setTimeout(onClose, 900);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to sign in with email and password');
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
      setSuccessMsg('Account registered in Firebase Auth & stored in PostgreSQL users table!');
      setTimeout(onClose, 1000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      await resetPassword(email);
      setSuccessMsg(`Password reset link dispatched to ${email}`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send password reset email');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
      setSuccessMsg('Authenticated with Google & synced Firebase UID to PostgreSQL!');
      setTimeout(onClose, 900);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google sign-in could not complete');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartMfa = async () => {
    if (!firebaseUser) {
      setErrorMsg('Please sign in with a live Firebase account first to enroll MFA.');
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const secret = await startTotpMfaEnrollment(firebaseUser);
      setTotpSecretObj(secret);
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          'MFA enrollment requires email verification and TOTP MFA enabled in Firebase Identity Platform.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !totpSecretObj) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await finalizeTotpMfaEnrollment(firebaseUser, totpSecretObj, totpCode);
      setSuccessMsg('Multi-Factor Authentication (TOTP) enrolled successfully!');
      setTotpSecretObj(null);
      setTotpCode('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid verification code');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#006194] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Firebase Authentication</h3>
              <p className="text-[11px] text-slate-400 font-mono-code">
                Project: ceda-admin-da72a • PostgreSQL UID Sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 bg-slate-100 p-1 m-4 rounded-xl text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab('login');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-1.5 rounded-lg transition-all ${
              activeTab === 'login' ? 'bg-white text-[#006194] shadow-xs font-bold' : 'text-slate-600'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => {
              setActiveTab('register');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-1.5 rounded-lg transition-all ${
              activeTab === 'register'
                ? 'bg-white text-[#006194] shadow-xs font-bold'
                : 'text-slate-600'
            }`}
          >
            Register
          </button>
          <button
            onClick={() => {
              setActiveTab('reset');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-1.5 rounded-lg transition-all ${
              activeTab === 'reset'
                ? 'bg-white text-[#006194] shadow-xs font-bold'
                : 'text-slate-600'
            }`}
          >
            Reset PW
          </button>
          <button
            onClick={() => {
              setActiveTab('mfa');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`py-1.5 rounded-lg transition-all ${
              activeTab === 'mfa'
                ? 'bg-white text-[#006194] shadow-xs font-bold'
                : 'text-slate-600'
            }`}
          >
            MFA (2FA)
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

          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="official@ceda.co.bw"
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#006194]"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#006194]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-[#006194] hover:bg-[#004e78] text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{submitting ? 'Authenticating...' : 'Sign In with Email'}</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-slate-200"></div>
                <span className="shrink mx-3 text-[10px] uppercase font-mono-code text-slate-400">
                  Or Social Login
                </span>
                <div className="grow border-t border-slate-200"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={submitting}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <span>Continue with Google SSO</span>
              </button>
            </form>
          )}

          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">First Name</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Lesego"
                      className="w-full pl-7 pr-2.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#006194]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Modise"
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#006194]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="lesego@enterprise.co.bw"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#006194]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#006194]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Submitter">Submitter</option>
                    <option value="Evaluator">Evaluator</option>
                    <option value="Adjudicator">Adjudicator</option>
                    <option value="Agent">Agent</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full pl-7 pr-2.5 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-[#006194] hover:bg-[#004e78] text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{submitting ? 'Registering...' : 'Register & Sync to PostgreSQL'}</span>
              </button>
            </form>
          )}

          {activeTab === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-3">
              <p className="text-slate-600 leading-relaxed">
                Enter your registered email address to receive a Firebase Authentication password
                reset link.
              </p>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="official@ceda.co.bw"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#006194]"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-[#006194] hover:bg-[#004e78] text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{submitting ? 'Sending...' : 'Send Password Reset Email'}</span>
              </button>
            </form>
          )}

          {activeTab === 'mfa' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-[#006194]" />
                  <span>Multi-Factor Authentication (TOTP / SMS)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Active User: <strong>{currentUser?.email}</strong> (UID:{' '}
                  <code className="font-mono-code">{currentUser?.firebaseUid}</code>)
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Enrolled Factors: <strong>{enrolledFactors.length}</strong>
                </p>
              </div>

              {!totpSecretObj ? (
                <button
                  type="button"
                  onClick={handleStartMfa}
                  disabled={submitting}
                  className="w-full py-2.5 bg-[#006194] hover:bg-[#004e78] text-white font-bold rounded-lg transition-colors"
                >
                  {submitting ? 'Initializing MFA...' : 'Enroll Authenticator App (TOTP)'}
                </button>
              ) : (
                <form onSubmit={handleVerifyMfa} className="space-y-2.5">
                  <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-lg font-mono-code text-[11px] text-sky-900 break-all">
                    Secret Key: {totpSecretObj.secretKey}
                  </div>
                  <input
                    type="text"
                    required
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="Enter 6-digit authenticator code"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                  >
                    Verify & Complete MFA Enrollment
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

