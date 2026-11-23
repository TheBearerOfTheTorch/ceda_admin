import React, { useState, useEffect, useMemo } from 'react';
import {
  subscribeToActivityFeed,
  subscribeToPresence,
  subscribeToNotifications,
  subscribeToIdeaAuditEvents,
  subscribeToAllIdeaAssignments,
  ActivityFeedItem,
  UserPresenceItem,
  RealtimeNotificationItem,
  IdeaAuditFeedItem,
} from '../../lib/firebase.ts';
import {
  loadAllLifecycleRecords,
  subscribeToLifecycleRecords,
  IdeaLifecycleRecord,
} from '../../lib/stageJourneyStore.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { AdminAlertNotification } from '../../types/ceda.ts';
import { X, Radio, Bell, Eye, CheckCheck, Users, AlertTriangle } from 'lucide-react';

interface LiveActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  ownedIdeaIdentifiers?: {
    ids: string[];
    titles: string[];
  };
  assignedOfficialsForSubmitter?: {
    ids: string[];
    emails: string[];
    names: string[];
  };
  unreadNotificationsCount?: number;
  onMarkNotificationsRead?: () => void;
  onSwitchWorkspace?: (workspaceId: string) => void;
  adminAlerts?: AdminAlertNotification[];
}

export const LiveActivityDrawer: React.FC<LiveActivityDrawerProps> = ({
  isOpen,
  onClose,
  ownedIdeaIdentifiers,
  assignedOfficialsForSubmitter,
  unreadNotificationsCount = 0,
  onMarkNotificationsRead,
  onSwitchWorkspace,
  adminAlerts = [],
}) => {
  const { currentUser, presenceStatus } = useAuth();
  const isSubmitter = currentUser?.role === 'Submitter';

  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [notifications, setNotifications] = useState<RealtimeNotificationItem[]>([]);
  const [auditEvents, setAuditEvents] = useState<IdeaAuditFeedItem[]>([]);
  const [allAssignments, setAllAssignments] = useState<any[]>([]);
  const [lifecycleRecords, setLifecycleRecords] = useState<Record<string, IdeaLifecycleRecord>>(() =>
    loadAllLifecycleRecords()
  );

  const [presenceUsers, setPresenceUsers] = useState<UserPresenceItem[]>([]);

  useEffect(() => {
    const unsubFeed = subscribeToActivityFeed((items) => {
      if (items) {
        setActivities(items);
      }
    });

    const unsubNotifs = subscribeToNotifications((items) => {
      if (items) {
        setNotifications(items);
      }
    });

    const unsubAudit = subscribeToIdeaAuditEvents((items) => {
      if (items) {
        setAuditEvents(items);
      }
    });

    const unsubPresence = subscribeToPresence((users) => {
      setPresenceUsers(users || []);
    });

    const unsubAssignments = subscribeToAllIdeaAssignments((items) => {
      setAllAssignments(items || []);
    });

    const unsubLifecycle = subscribeToLifecycleRecords((records) => {
      setLifecycleRecords({ ...records });
    });

    return () => {
      unsubFeed();
      unsubNotifs();
      unsubAudit();
      unsubPresence();
      unsubAssignments();
      unsubLifecycle();
    };
  }, []);

  const ownedIdSet = useMemo(
    () => new Set((ownedIdeaIdentifiers?.ids || []).map((id) => String(id).trim().toLowerCase())),
    [ownedIdeaIdentifiers]
  );
  const ownedTitleSet = useMemo(
    () => new Set((ownedIdeaIdentifiers?.titles || []).map((t) => String(t).trim().toLowerCase())),
    [ownedIdeaIdentifiers]
  );

  const matchesOwnedIdea = (innovationId?: string | number, ideaTitle?: string) => {
    if (!isSubmitter) return true;
    if (ownedIdSet.size === 0 && ownedTitleSet.size === 0) return false;
    const idNorm = innovationId !== undefined && innovationId !== null ? String(innovationId).trim().toLowerCase() : '';
    const titleNorm = ideaTitle ? String(ideaTitle).trim().toLowerCase() : '';
    if (titleNorm && ownedTitleSet.has(titleNorm)) return true;
    if (idNorm && ownedIdSet.has(idNorm)) return true;
    return false;
  };

  // Trace all Evaluators & Adjudicators assigned to the Submitter's owned ideas
  const tracedOfficialMatchers = useMemo(() => {
    const ids = new Set<string>(
      (assignedOfficialsForSubmitter?.ids || []).map((v) => String(v).trim().toLowerCase()).filter(Boolean)
    );
    const emails = new Set<string>(
      (assignedOfficialsForSubmitter?.emails || []).map((v) => v.trim().toLowerCase()).filter(Boolean)
    );
    const names = new Set<string>(
      (assignedOfficialsForSubmitter?.names || []).map((v) => v.trim().toLowerCase()).filter(Boolean)
    );

    if (isSubmitter) {
      allAssignments.forEach((a) => {
        if (!matchesOwnedIdea(a.innovationId || a.idea?.code || a.idea?.id, a.ideaTitle || a.idea?.title)) {
          return;
        }
        if (a.evaluatorId) ids.add(String(a.evaluatorId).trim().toLowerCase());
        if (a.evaluatorEmail) emails.add(String(a.evaluatorEmail).trim().toLowerCase());
        if (a.evaluatorName) names.add(String(a.evaluatorName).trim().toLowerCase());
      });

      Object.values(lifecycleRecords).forEach((rec) => {
        if (!matchesOwnedIdea(rec.code || rec.ideaId, rec.title)) return;
        if (rec.assignedEvaluatorId) ids.add(String(rec.assignedEvaluatorId).trim().toLowerCase());
        if (rec.assignedEvaluatorName) names.add(String(rec.assignedEvaluatorName).trim().toLowerCase());
        Object.values(rec.stageCheckpoints || {}).forEach((cp) => {
          const roleLower = String(cp?.completedByRole || '').toLowerCase();
          if (cp?.completedBy && (roleLower === 'evaluator' || roleLower === 'adjudicator')) {
            names.add(String(cp.completedBy).trim().toLowerCase());
          }
          if (cp?.evaluationDetails?.evaluatorName) {
            names.add(String(cp.evaluationDetails.evaluatorName).trim().toLowerCase());
          }
        });
        (rec.auditLog || []).forEach((log) => {
          const roleLower = String(log.authorRole || '').toLowerCase();
          if (log.author && (roleLower === 'evaluator' || roleLower === 'adjudicator')) {
            names.add(String(log.author).trim().toLowerCase());
          }
        });
      });
    }

    return { ids, emails, names };
  }, [isSubmitter, assignedOfficialsForSubmitter, allAssignments, lifecycleRecords, ownedIdSet, ownedTitleSet]);

  const visiblePresenceUsers = useMemo(() => {
    if (!isSubmitter) return presenceUsers;
    return presenceUsers.filter((u) => {
      const roleLower = String(u.role || '').trim().toLowerCase();
      if (roleLower !== 'evaluator' && roleLower !== 'adjudicator') return false;
      const uidLower = String(u.userId || '').trim().toLowerCase();
      const emailLower = String(u.email || '').trim().toLowerCase();
      const nameLower = String(u.userName || '').trim().toLowerCase();
      return (
        (uidLower && tracedOfficialMatchers.ids.has(uidLower)) ||
        (emailLower && tracedOfficialMatchers.emails.has(emailLower)) ||
        (nameLower && tracedOfficialMatchers.names.has(nameLower))
      );
    });
  }, [presenceUsers, isSubmitter, tracedOfficialMatchers]);

  const visibleNotifications = useMemo(() => {
    const userEmailLower = (currentUser?.email || '').trim().toLowerCase();
    const userRole = currentUser?.role;
    return notifications.filter((n) => {
      if (isSubmitter) {
        return matchesOwnedIdea(n.innovationId, n.ideaTitle);
      }
      if (n.targetEmail && userEmailLower) {
        return n.targetEmail.trim().toLowerCase() === userEmailLower;
      }
      if (n.targetRole && userRole && n.targetRole !== userRole) return false;
      return true;
    });
  }, [notifications, isSubmitter, currentUser?.email, currentUser?.role, ownedIdSet, ownedTitleSet]);

  const visibleActivities = useMemo(() => {
    if (!isSubmitter) return activities;
    return activities.filter((a) => matchesOwnedIdea(a.innovationId, a.ideaTitle));
  }, [activities, isSubmitter, ownedIdSet, ownedTitleSet]);

  const visibleAuditEvents = useMemo(() => {
    if (!isSubmitter) return auditEvents;
    return auditEvents.filter((ev) => matchesOwnedIdea(ev.ideaId || ev.code, ev.ideaTitle));
  }, [auditEvents, isSubmitter, ownedIdSet, ownedTitleSet]);

  const visibleAdminAlerts = useMemo(() => {
    const uidLower = String(currentUser?.id ?? '').trim().toLowerCase();
    const emailLower = (currentUser?.email || '').trim().toLowerCase();
    const roleLower = (currentUser?.role || '').trim().toLowerCase();
    return adminAlerts.filter((a) => {
      if (roleLower === 'administrator') return true;
      if (isSubmitter) return false;
      const targetIdLower = String(a.targetUserId || '').trim().toLowerCase();
      const targetEmailLower = String(a.targetUserEmail || '').trim().toLowerCase();
      const targetRoleLower = String(a.targetUserRole || '').trim().toLowerCase();
      if (targetIdLower && targetIdLower === uidLower) return true;
      if (targetEmailLower && targetEmailLower === emailLower) return true;
      if (!targetIdLower && !targetEmailLower && targetRoleLower && targetRoleLower === roleLower) return true;
      return false;
    });
  }, [adminAlerts, currentUser?.id, currentUser?.email, currentUser?.role, isSubmitter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-92 bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 select-none">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${presenceStatus === 'offline' ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'}`} />
          <h3 className="text-xs font-mono-code font-bold uppercase text-slate-800 tracking-wider">
            Firestore Live Activity & Presence
          </h3>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Automatic Focus-Tracked Presence Indicator */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-mono-code uppercase font-bold text-slate-500">
              My Presence Status (Auto-Tracked)
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              {presenceStatus === 'offline'
                ? 'Window unfocused — shown as Offline'
                : 'Workspace focused — shown as Online'}
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono-code uppercase font-bold border ${presenceStatus === 'offline'
              ? 'bg-slate-200 text-slate-700 border-slate-300'
              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${presenceStatus === 'offline' ? 'bg-slate-500' : 'bg-emerald-500 animate-pulse'
                }`}
            />
            {presenceStatus === 'offline' ? 'Offline' : 'Online'}
          </span>
        </div>

        {/* User Presence Section */}
        <div>
          <div className="text-[10px] font-mono-code uppercase font-bold text-slate-400 mb-2 flex items-center justify-between">
            <span>
              {isSubmitter
                ? `Assigned Evaluators & Adjudicators (${visiblePresenceUsers.length})`
                : `Connected Users (${visiblePresenceUsers.length})`}
            </span>
            <span className="text-emerald-600">Sync: Auto Focus</span>
          </div>

          {visiblePresenceUsers.length === 0 ? (
            <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-[11px] text-slate-500">
              {isSubmitter
                ? 'Only Evaluators & Adjudicators assigned to your submitted ideas are shown here.'
                : 'No active workspace users detected right now.'}
            </div>
          ) : (
            <div className="space-y-2">
              {visiblePresenceUsers.map((u) => {
                const statusColor =
                  {
                    online: 'bg-emerald-500',
                    reviewing: 'bg-sky-500',
                    editing: 'bg-amber-500',
                    offline: 'bg-slate-300',
                  }[u.status] || 'bg-emerald-500';

                return (
                  <div
                    key={u.email || `${u.userId}_${u.userName}`}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="w-7 h-7 rounded-full bg-[#006194] text-white text-[10px] font-bold flex items-center justify-center">
                          {u.userName.slice(0, 2).toUpperCase()}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${statusColor}`}
                        />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 leading-tight">{u.userName}</div>
                        <div className="text-[10px] text-slate-500 leading-tight">{u.role}</div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded ${u.status === 'reviewing'
                        ? 'bg-sky-100 text-[#006194]'
                        : u.status === 'editing'
                          ? 'bg-amber-100 text-amber-800'
                          : u.status === 'online'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                    >
                      {u.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SLA & Priority Alerts (Evaluators, Adjudicators & Admins) */}
        {!isSubmitter && visibleAdminAlerts.length > 0 && (
          <div>
            <div className="text-[10px] font-mono-code uppercase font-bold text-amber-600 mb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>SLA & Priority Alerts ({visibleAdminAlerts.length})</span>
              </span>
            </div>
            <div className="space-y-2">
              {visibleAdminAlerts.slice(0, 8).map((alert) => {
                const isSla = alert.type === 'sla_warning' || alert.title.toLowerCase().includes('critical');
                const badgeLabel = alert.title.toLowerCase().includes('critical')
                  ? 'critical'
                  : alert.type === 'sla_warning'
                    ? 'sla warning'
                    : alert.type.replace(/_/g, ' ');
                return (
                  <div
                    key={alert.id}
                    className={`p-2.5 rounded-xl border text-xs ${isSla
                      ? 'bg-rose-50/90 border-rose-200'
                      : 'bg-amber-50/90 border-amber-200'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`font-bold ${isSla ? 'text-rose-800' : 'text-amber-800'}`}>
                        {alert.title}
                      </span>
                      <span className={`text-[9.5px] font-mono-code font-bold uppercase px-1.5 py-0.5 rounded ${isSla ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                        {badgeLabel}
                      </span>
                    </div>
                    <p className="text-slate-700 text-[11px] mt-1">{alert.message}</p>
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                      <span>Target: {alert.targetUserName}</span>
                      {alert.relatedIdeaCode && (
                        <span className="font-mono-code">{alert.relatedIdeaCode}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Real-Time Notifications */}
        <div>
          <div className="text-[10px] font-mono-code uppercase font-bold text-slate-400 mb-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span>{isSubmitter ? 'Your Idea Alerts & Views' : 'Real-Time Notifications'}</span>
              {unreadNotificationsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-bold">
                  {unreadNotificationsCount} NEW
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {onMarkNotificationsRead && visibleNotifications.length > 0 && (
                <button
                  type="button"
                  onClick={onMarkNotificationsRead}
                  className="text-[10px] text-[#006194] hover:underline font-semibold flex items-center gap-0.5 cursor-pointer normal-case"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>Mark read</span>
                </button>
              )}
              <Bell className="w-3 h-3 text-[#006194]" />
            </div>
          </div>
          {visibleNotifications.length === 0 ? (
            <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-[11px] text-slate-500">
              {isSubmitter
                ? 'No real-time alerts on your ideas yet. Viewer activity and screening updates appear here.'
                : 'No real-time notifications recorded yet.'}
            </div>
          ) : (
            <div className="space-y-2">
              {visibleNotifications.slice(0, 10).map((notif, idx) => (
                <div
                  key={notif.id || idx}
                  className="p-2.5 bg-sky-50/60 border border-sky-100 rounded-xl text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#006194]">{notif.type}</span>
                    <span className="text-[10px] font-mono-code text-slate-400">
                      #{notif.innovationId}
                    </span>
                  </div>
                  <p className="text-slate-700 text-[11px] mt-0.5">{notif.message}</p>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between gap-2">
                    <span>
                      By {notif.user} {notif.tabName ? `• Tab: ${notif.tabName}` : ''}
                    </span>
                    {!isSubmitter && notif.workspaceId && onSwitchWorkspace && (
                      <button
                        type="button"
                        onClick={() => {
                          onSwitchWorkspace(notif.workspaceId!);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold cursor-pointer"
                      >
                        <Users className="w-2.5 h-2.5" />
                        <span>Join Workspace</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Viewer & Dossier Tab Access Log */}
        <div>
          <div className="text-[10px] font-mono-code uppercase font-bold text-slate-400 mb-2 flex items-center justify-between">
            <span>
              {isSubmitter ? 'Who Viewed Your Ideas (Live)' : 'Live Dossier & Tab Audit Log'}
            </span>
            <Eye className="w-3 h-3 text-[#006194]" />
          </div>
          {visibleAuditEvents.length === 0 ? (
            <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-[11px] text-slate-500">
              {isSubmitter
                ? 'Only views and tab accesses on your submitted ideas are shown here.'
                : 'No dossier views or tab accesses logged yet.'}
            </div>
          ) : (
            <div className="space-y-2 border-l-2 border-sky-200 ml-2 pl-3">
              {visibleAuditEvents.slice(0, 12).map((ev, index) => (
                <div key={ev.id || index} className="relative pb-2.5 text-xs">
                  <div className="absolute -left-[19px] top-1 w-2 h-2 rounded-full bg-[#006194] border-2 border-white" />
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-code text-[10.5px] font-bold text-slate-800 truncate">
                      {ev.ideaTitle}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono-code shrink-0">
                      {typeof ev.timestamp === 'string'
                        ? ev.timestamp.slice(0, 19).replace('T', ' ')
                        : 'Just now'}
                    </span>
                  </div>
                  <div className="text-slate-700 font-medium text-[11px] mt-0.5">
                    {ev.action}
                  </div>
                  <div className="text-[10.5px] text-slate-400 mt-0.5 flex items-center justify-between gap-1 flex-wrap">
                    <span>
                      By: <strong className="text-slate-600">{ev.author}</strong> ({ev.authorRole})
                    </span>
                    {ev.tabName && (
                      <span className="px-1.5 py-0.2 rounded bg-sky-50 text-[#006194] border border-sky-200 font-mono-code text-[9.5px]">
                        {ev.tabName}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Activity Feed */}
        <div>
          <div className="text-[10px] font-mono-code uppercase font-bold text-slate-400 mb-2 flex items-center justify-between">
            <span>{isSubmitter ? 'Your Idea Pipeline Feed' : 'Live Activity Feed'}</span>
            <Radio className="w-3 h-3 text-[#006194] animate-pulse" />
          </div>

          {visibleActivities.length === 0 ? (
            <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-[11px] text-slate-500">
              No recent pipeline events for {isSubmitter ? 'your ideas' : 'this workspace'}.
            </div>
          ) : (
            <div className="space-y-2 border-l-2 border-slate-100 ml-2 pl-3">
              {visibleActivities.map((act, index) => {
                return (
                  <div key={act.id || index} className="relative pb-3 text-xs">
                    <div className="absolute -left-[19px] top-1 w-2 h-2 rounded-full bg-[#006194] border-2 border-white" />
                    <div className="flex items-center justify-between">
                      <span className="font-mono-code text-[11px] font-bold text-slate-800">
                        #{act.innovationId}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono-code">
                        {typeof act.timestamp === 'string'
                          ? act.timestamp.slice(0, 19).replace('T', ' ')
                          : 'Just now'}
                      </span>
                    </div>

                    <div className="text-slate-700 font-medium mt-0.5">
                      {act.action === 'evaluation_completed' && '✅ Evaluation scored & completed'}
                      {act.action === 'adjudication_decision_issued' &&
                        '⚖️ Adjudication decision issued'}
                      {act.action === 'new_idea_submitted' && '💡 New idea submitted'}
                      {act.action === 'idea_assigned' && '📋 Idea assigned to evaluator'}
                      {act.action === 'pilot_approved' && '🚀 Pilot approved'}
                      {act.action === 'card_moved' && '🔄 Innovation card transitioned stage'}
                      {act.action === 'idea_viewed' && '👁️ Official opened idea details'}
                      {act.action === 'tab_accessed' && `📂 Official viewed tab (${act.tabName || 'Dossier'})`}
                      {act.action === 'screening_updated' && '🛡️ Stage 2 Statutory Screening updated'}
                      {![
                        'evaluation_completed',
                        'adjudication_decision_issued',
                        'new_idea_submitted',
                        'idea_assigned',
                        'pilot_approved',
                        'card_moved',
                        'idea_viewed',
                        'tab_accessed',
                        'screening_updated',
                      ].includes(act.action) && act.action}
                    </div>

                    <div className="text-[10.5px] text-slate-400 mt-0.5">
                      By: <strong className="text-slate-600">{act.user}</strong>{' '}
                      {act.role && `(${act.role})`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
