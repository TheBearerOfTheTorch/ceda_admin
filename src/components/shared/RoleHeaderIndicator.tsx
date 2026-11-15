import React, { useState } from 'react';
import { useAuth, UserRole } from '../../context/AuthContext.tsx';
import { FirebaseAuthModal } from './FirebaseAuthModal.tsx';
import {
  ShieldCheck,
  CheckCircle2,
  Award,
  Send,
  ChevronDown,
  Check,
  LogOut,
  Headphones,
  KeyRound,
  LogIn,
} from 'lucide-react';

export const RoleHeaderIndicator: React.FC = () => {
  const {
    currentUser,
    firebaseUser,
    presenceStatus,
    setPresenceStatus,
    switchRolePersona,
    logout,
    logoutAllUsers,
  } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  if (!currentUser) return null;

  const roleStyles: Record<
    UserRole,
    { bg: string; text: string; border: string; icon: React.ReactNode; desc: string }
  > = {
    Administrator: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />,
      desc: 'Full platform access, user management, and workflow configuration',
    },
    Evaluator: {
      bg: 'bg-sky-50',
      text: 'text-[#006194]',
      border: 'border-sky-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#006194]" />,
      desc: 'Technical scoring (Innovation, Feasibility, Impact), comments & recommendations',
    },
    Adjudicator: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: <Award className="w-3.5 h-3.5 text-emerald-600" />,
      desc: 'Formal approvals, deferrals, rejections, and pilot prioritization',
    },
    Submitter: {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: <Send className="w-3.5 h-3.5 text-amber-600" />,
      desc: 'Dedicated citizen portal to submit ideas and track lifecycle progress',
    },
    Agent: {
      bg: 'bg-teal-50',
      text: 'text-teal-700',
      border: 'border-teal-200',
      icon: <Headphones className="w-3.5 h-3.5 text-teal-600" />,
      desc: 'Citizen enquiries desk: responds to submitter questions & message queue',
    },
  };

  const currentStyle = roleStyles[currentUser.role] || roleStyles.Administrator;

  const presenceDotColor = {
    online: 'bg-emerald-500',
    reviewing: 'bg-sky-500',
    editing: 'bg-amber-500',
    offline: 'bg-slate-400',
  }[presenceStatus];

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${currentStyle.bg} ${currentStyle.text} ${currentStyle.border} shadow-2xs hover:shadow-xs`}
          title="Switch RBAC Persona / Auth & Presence"
        >
          <span className="flex items-center gap-1.5">
            {currentStyle.icon}
            <span>
              Role: <strong>{currentUser.role}</strong>
            </span>
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${presenceDotColor} animate-pulse`} />
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-84 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="pb-2.5 border-b border-slate-100 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <div className="font-bold text-slate-900 truncate">
                  {currentUser.firstName} {currentUser.lastName}
                </div>
                <div className="text-[11px] text-slate-500 font-mono-code truncate">
                  {currentUser.email} • {currentUser.department}
                </div>
                <div className="text-[10px] text-slate-400 font-mono-code truncate mt-0.5">
                  UID: {currentUser.firebaseUid}
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono-code font-bold uppercase shrink-0 ${currentStyle.bg} ${currentStyle.text}`}
              >
                {currentUser.role}
              </span>
            </div>

            {/* Firestore Presence Selector */}
            <div className="py-2 border-b border-slate-100">
              <div className="text-[10px] font-mono-code uppercase font-bold text-slate-400 mb-1.5">
                Online Status
              </div>
              <div className="grid grid-cols-4 gap-1">
                {(['online', 'reviewing', 'editing', 'offline'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setPresenceStatus(st)}
                    className={`py-1 px-1.5 rounded text-[10px] font-mono-code uppercase font-bold border transition-all ${presenceStatus === st
                      ? 'bg-[#006194] text-white border-[#006194]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Firebase Auth Trigger */}
            <div className="py-2 border-b border-slate-100">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsAuthModalOpen(true);
                }}
                className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                  <span>
                    {firebaseUser
                      ? 'Firebase Auth & MFA Settings'
                      : 'Sign In / Register (Firebase Auth)'}
                  </span>
                </span>
                <LogIn className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            <div className="py-2">
              <div className="text-[10px] font-mono-code uppercase font-bold text-slate-400 mb-1.5">
                Switch RBAC Role Persona
              </div>
              <div className="space-y-1">
                {(
                  ['Administrator', 'Evaluator', 'Adjudicator', 'Submitter', 'Agent'] as UserRole[]
                ).map((r) => {
                  const isSelected = currentUser.role === r;
                  const rStyle = roleStyles[r];
                  return (
                    <button
                      key={r}
                      onClick={() => {
                        switchRolePersona(r);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg flex items-start gap-2.5 transition-colors ${isSelected
                        ? `${rStyle.bg} ${rStyle.text} font-bold`
                        : 'hover:bg-slate-50 text-slate-700'
                        }`}
                    >
                      <div className="mt-0.5 shrink-0">{rStyle.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs">{r}</span>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <p className="text-[10.5px] text-slate-500 font-normal leading-snug mt-0.5">
                          {rStyle.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2 text-[11px] text-slate-500">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Systems Synced
                </span>
                <button
                  onClick={() => {
                    logout();
                    setIsOpen(false);
                  }}
                  className="text-slate-600 hover:text-rose-600 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sign Out</span>
                </button>
              </div>
              {currentUser.role === 'Administrator' && (
                <button
                  onClick={() => {
                    logoutAllUsers();
                    setIsOpen(false);
                  }}
                  className="w-full py-1.5 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Log Out Everybody (Invalidate All Sessions)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <FirebaseAuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};
