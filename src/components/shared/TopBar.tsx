import React, { useState } from 'react';
import {
  Grid, TrendingUp, ChevronDown, BarChart2, Settings,
  Sparkles, CheckCircle2, Bell, ShieldCheck, Send, LogOut, ArrowLeft, Trash2, Users
} from 'lucide-react';
import { ActiveCollaborator } from '../../types/ceda';
import { WorkspaceCursorItem } from '../../lib/firebase';
import { RoleHeaderIndicator } from './RoleHeaderIndicator.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

interface TopBarProps {
  onToggleModulesMenu: () => void;
  isModulesMenuOpen: boolean;
  zoom: number;
  onSetZoom: (zoom: number) => void;
  collaborators: ActiveCollaborator[];
  onOpenAnalytics: () => void;
  onOpenLiveActivity: () => void;
  onOpenAdminPanel: () => void;
  onOpenSubmitterPanel: () => void;
  unreadNotificationsCount?: number;
  workspaceCollaborators?: WorkspaceCursorItem[];
  isWorkspaceOwner?: boolean;
  activeWorkspaceOwnerId?: number;
  activeWorkspaceName?: string;
  onOpenShareWorkspace?: () => void;
  onRemoveCollaborator?: (collab: { userId?: string | number | null; email?: string; userName?: string }) => Promise<void> | void;
  onReturnToOwnWorkspace?: () => void;
  onCancelCollaboration?: () => Promise<void> | void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onToggleModulesMenu,
  isModulesMenuOpen,
  zoom,
  onSetZoom,
  collaborators,
  onOpenAnalytics,
  onOpenLiveActivity,
  onOpenAdminPanel,
  onOpenSubmitterPanel,
  unreadNotificationsCount = 0,
  workspaceCollaborators = [],
  isWorkspaceOwner = true,
  activeWorkspaceOwnerId,
  activeWorkspaceName,
  onOpenShareWorkspace,
  onRemoveCollaborator,
  onReturnToOwnWorkspace,
  onCancelCollaboration,
}) => {
  const { currentUser } = useAuth();
  const [showAnalyticsDropdown, setShowAnalyticsDropdown] = useState(false);
  const [showCollabPopover, setShowCollabPopover] = useState(false);

  const activeInvitedPeers = workspaceCollaborators.filter(
    (c) => activeWorkspaceOwnerId === undefined || String(c.userId) !== String(activeWorkspaceOwnerId)
  );
  const selfAsInvited =
    !isWorkspaceOwner && currentUser
      ? [
          {
            workspaceId: '',
            userId: currentUser.id,
            userName: `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.email,
            role: currentUser.role,
            email: currentUser.email,
            color: '#006194',
            canvasX: 0,
            canvasY: 0,
            isFocused: true,
            updatedAtMs: Date.now(),
            isSelf: true,
          },
        ]
      : [];
  const activeInvitedPeople =
    currentUser?.role === 'Submitter'
      ? []
      : [
          ...selfAsInvited,
          ...activeInvitedPeers.map((c) => ({ ...c, isSelf: false })),
        ];

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'C';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  return (
    <header className="h-14 bg-white border-b border-[#e2e8f0] px-4 flex items-center justify-between z-40 select-none shadow-[0_1px_2px_0_rgba(15,23,42,0.03)]">
      {/* Left: 9-Dot Launcher, CEDA Logo, CANVAS OS, Innovation Canvas · Vision 2036 Pillar II */}
      <div className="flex items-center gap-3">
        {/* 9-Dot Grid App Launcher Button */}
        <button
          onClick={onToggleModulesMenu}
          title="Open CEDA Canvas Workspace Modules"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isModulesMenuOpen
            ? 'bg-[#006194] text-white'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16">
            <circle cx="2.5" cy="2.5" r="1.5" />
            <circle cx="8" cy="2.5" r="1.5" />
            <circle cx="13.5" cy="2.5" r="1.5" />
            <circle cx="2.5" cy="8" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="13.5" cy="8" r="1.5" />
            <circle cx="2.5" cy="13.5" r="1.5" />
            <circle cx="8" cy="13.5" r="1.5" />
            <circle cx="13.5" cy="13.5" r="1.5" />
          </svg>
        </button>

        {/* CEDA Logo + CANVAS OS Badge */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#006194] text-white flex items-center justify-center shadow-xs">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <circle cx="6" cy="6" r="2.5" />
              <circle cx="18" cy="6" r="2.5" />
              <circle cx="12" cy="18" r="2.5" />
              <path d="M6 6 L12 18 L18 6" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
          <span className="font-extrabold text-sm tracking-tight text-[#0f172a]">
            CEDA WORKSPACE
          </span>
        </div>
      </div>

      {/* Center: Pipeline Analytics BWP 14.8M + Zoom Pills (50%, 100%, 200%) */}
      <div className="flex items-center gap-4">
        {/* Pipeline / Workspace Analytics Dropdown Pill */}
        <div className="relative">
          <button
            onClick={() => setShowAnalyticsDropdown(!showAnalyticsDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#006194]" />
            <span>{currentUser?.role === 'Administrator' ? 'Analytics Dashboard' : 'Workspace Diligence'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showAnalyticsDropdown && (
            <div className="absolute left-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 text-xs">
              <div className="p-2 border-b border-slate-100">
                <div className="text-[10px] font-mono-code uppercase text-slate-400 font-bold">
                  {currentUser?.role === 'Administrator' ? 'Portfolio Velocity' : 'Workspace Diligence'}
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {currentUser?.role === 'Administrator' ? 'BWP 14,800,000 Allocated' : 'Active Evaluation Ledger'}
                </div>
                <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                  {currentUser?.role === 'Administrator' ? '38 Citizen Initiatives Synchronized' : 'Technical Scoring & Dossier Quorum'}
                </div>
              </div>
              <button
                onClick={() => {
                  onOpenAnalytics();
                  setShowAnalyticsDropdown(false);
                }}
                className="w-full text-left p-2 hover:bg-sky-50 text-[#006194] font-semibold rounded-lg text-xs flex items-center justify-between mt-1 cursor-pointer"
              >
                <span>{currentUser?.role === 'Administrator' ? 'Open Full Analytics Deck' : 'Open Workspace Reports'}</span>
                <TrendingUp className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Zoom Pills: 50% | 100% | 200% */}
        <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-mono-code font-bold">
          <button
            onClick={() => onSetZoom(0.5)}
            className={`px-2.5 py-1 rounded transition-colors ${Math.abs(zoom - 0.5) < 0.1
              ? 'bg-white text-[#006194] shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            50%
          </button>
          <button
            onClick={() => onSetZoom(1.0)}
            className={`px-2.5 py-1 rounded transition-colors ${Math.abs(zoom - 1.0) < 0.1
              ? 'bg-white text-[#006194] shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            100%
          </button>
          <button
            onClick={() => onSetZoom(2.0)}
            className={`px-2.5 py-1 rounded transition-colors ${Math.abs(zoom - 2.0) < 0.1
              ? 'bg-white text-[#006194] shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
              }`}
          >
            200%
          </button>
        </div>
      </div>

      {/* Right: Live Collaborator Profile Circles, Admin Console, Bell, Reports, Role Indicator */}
      <div className="flex items-center gap-2.5">
        {activeInvitedPeople.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCollabPopover((prev) => !prev)}
              className="flex items-center -space-x-2.5 p-0.5 rounded-full hover:ring-2 hover:ring-sky-200 transition-all cursor-pointer focus:outline-hidden"
              title={activeInvitedPeople
                .map((p) => `${p.userName} (${p.role})`)
                .join(', ')}
            >
              {activeInvitedPeople.slice(0, 4).map((person, idx) => (
                <div
                  key={`topbar-collab-${person.userId}`}
                  style={{ zIndex: 10 - idx }}
                  className="relative shrink-0"
                  title={`${person.userName} • ${person.role}`}
                >
                  <div
                    style={{ backgroundColor: person.color || '#006194' }}
                    className="w-8 h-8 rounded-full text-white text-[11px] font-black flex items-center justify-center ring-2 ring-white shadow-xs"
                  >
                    {getInitials(person.userName)}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                </div>
              ))}
              {activeInvitedPeople.length > 4 && (
                <div
                  style={{ zIndex: 5 }}
                  className="w-8 h-8 rounded-full bg-slate-700 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white shadow-xs"
                >
                  +{activeInvitedPeople.length - 4}
                </div>
              )}
            </button>

            {showCollabPopover && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 p-2.5 z-50 text-xs">
                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-100">
                  <span className="text-[10.5px] font-extrabold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{isWorkspaceOwner ? 'Live Collaborators' : activeWorkspaceName || 'Shared Workspace'}</span>
                  </span>
                  {onOpenShareWorkspace && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCollabPopover(false);
                        onOpenShareWorkspace();
                      }}
                      className="text-[10px] font-bold text-[#006194] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Users className="w-3 h-3" />
                      <span>Manage</span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {activeInvitedPeople.map((person) => (
                    <div
                      key={`pop-collab-${person.userId}`}
                      className="flex items-center justify-between gap-2 px-1.5 py-1 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          style={{ backgroundColor: person.color || '#006194' }}
                          className="w-6 h-6 rounded-full text-white text-[9.5px] font-black flex items-center justify-center shrink-0"
                        >
                          {getInitials(person.userName)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-slate-900 truncate">
                            {person.userName} {person.isSelf ? '(You)' : ''}
                          </div>
                          <div className="text-[9.5px] text-slate-500 truncate">{person.role}</div>
                        </div>
                      </div>
                      {isWorkspaceOwner && !person.isSelf && onRemoveCollaborator && (
                        <button
                          type="button"
                          onClick={async () => {
                            await onRemoveCollaborator({
                              userId: person.userId,
                              email: person.email,
                              userName: person.userName,
                            });
                          }}
                          className="px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[9.5px] flex items-center gap-0.5 cursor-pointer shrink-0"
                          title={`Remove ${person.userName} from collaboration`}
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {!isWorkspaceOwner && (onReturnToOwnWorkspace || onCancelCollaboration) && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5">
                    {onReturnToOwnWorkspace && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowCollabPopover(false);
                          onReturnToOwnWorkspace();
                        }}
                        className="flex-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ArrowLeft className="w-3 h-3" />
                        <span>My Workspace</span>
                      </button>
                    )}
                    {onCancelCollaboration && (
                      <button
                        type="button"
                        onClick={async () => {
                          setShowCollabPopover(false);
                          await onCancelCollaboration();
                        }}
                        className="flex-1 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>Cancel Collab</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Submitter Quick Panel Trigger if Submitter */}
        {currentUser?.role === 'Submitter' && (
          <button
            onClick={onOpenSubmitterPanel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold transition-colors shadow-2xs"
          >
            <Send className="w-3 h-3 text-amber-700" />
            <span>Back to Submissions Panel</span>
          </button>
        )}

        {/* Admin Quick Settings if Administrator */}
        {currentUser?.role === 'Administrator' && (
          <button
            onClick={onOpenAdminPanel}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg text-xs font-bold transition-colors shadow-2xs"
            title="Administrator Governance Console"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
            <span>Admin Console</span>
          </button>
        )}

        {/* Real-time Notifications Bell with Flashing Unread Count */}
        <button
          onClick={onOpenLiveActivity}
          className={`relative p-2 rounded-lg transition-colors cursor-pointer ${unreadNotificationsCount > 0
            ? 'text-[#006194] bg-sky-50 hover:bg-sky-100 ring-1 ring-sky-200'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          title={
            unreadNotificationsCount > 0
              ? `${unreadNotificationsCount} unread notification(s) — click to view`
              : 'Live Activity & Real-Time Presence'
          }
        >
          <Bell className={`w-4 h-4 ${unreadNotificationsCount > 0 ? 'animate-pulse' : ''}`} />
          {unreadNotificationsCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold font-mono-code leading-none ring-2 ring-white animate-pulse">
                {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
              </span>
            </span>
          ) : (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
          )}
        </button>

        {/* Reports Button */}
        <button
          onClick={onOpenAnalytics}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
        >
          <BarChart2 className="w-3.5 h-3.5 text-slate-500" />
          <span>Reports</span>
        </button>

        {/* RBAC Role Indicator & Switcher */}
        <RoleHeaderIndicator />
      </div>
    </header>
  );
};
