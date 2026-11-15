import React, { useState } from 'react';
import { 
  Users, UserCheck, ShieldCheck, Award, 
  Search, Plus, Sparkles, Filter, ChevronRight,
  PanelLeftClose, PanelLeftOpen, Mail, Building, Briefcase, CheckCircle2, ArrowRight, Headphones,
  Trash2, UserX, RefreshCw, AlertTriangle
} from 'lucide-react';
import { AdminPersonnel } from '../../types/ceda';

interface AdminPersonnelSidebarProps {
  personnel: AdminPersonnel[];
  isOpen: boolean;
  onToggle: () => void;
  onOpenInviteModal: () => void;
  onAssignBatchToUser: (user: AdminPersonnel) => void;
  onManageUserRole: (user: AdminPersonnel) => void;
  onInviteToWorkspace?: (user: AdminPersonnel) => void;
  onSuspendUser?: (user: AdminPersonnel) => void;
  onDeleteUser?: (user: AdminPersonnel) => void;
  onRefreshDirectory?: () => void;
  presenceMap?: Record<string | number, 'online' | 'reviewing' | 'editing' | 'offline'>;
}

export const AdminPersonnelSidebar: React.FC<AdminPersonnelSidebarProps> = ({
  personnel,
  isOpen,
  onToggle,
  onOpenInviteModal,
  onAssignBatchToUser,
  onManageUserRole,
  onInviteToWorkspace,
  onSuspendUser,
  onDeleteUser,
  onRefreshDirectory,
  presenceMap = {},
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Evaluator' | 'Adjudicator' | 'Administrator' | 'Agent'>('All');
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Strict RBAC: Personnel must strictly be Evaluator, Adjudicator, Administrator, or Agent
  const validPersonnel = personnel.filter(p => 
    p.role === 'Evaluator' || p.role === 'Adjudicator' || p.role === 'Administrator' || p.role === 'Agent'
  );

  const filtered = validPersonnel.filter(p => {
    const matchesRole = roleFilter === 'All' || p.role === roleFilter;
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const evaluatorCount = validPersonnel.filter(p => p.role === 'Evaluator').length;
  const adjudicatorCount = validPersonnel.filter(p => p.role === 'Adjudicator').length;
  const adminCount = validPersonnel.filter(p => p.role === 'Administrator').length;
  const agentCount = validPersonnel.filter(p => p.role === 'Agent').length;
  const totalAssignedIdeas = validPersonnel.reduce((acc, curr) => acc + curr.assignedIdeasCount, 0);

  const onlineCount = validPersonnel.filter((p) => {
    const status = presenceMap[p.id] || presenceMap[p.email] || (p.status === 'active' ? 'online' : 'offline');
    return status === 'online' || status === 'reviewing' || status === 'editing';
  }).length;

  if (!isOpen) {
    return (
      <div className="w-12 border-r border-slate-200 bg-white flex flex-col items-center py-4 justify-between z-20 shadow-xs">
        <button
          onClick={onToggle}
          title="Expand Personnel Directory"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
        >
          <PanelLeftOpen className="w-5 h-5 text-[#006194]" />
        </button>

        <div className="flex flex-col items-center gap-4">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="System Officials Active" />
          <span 
            className="text-[11px] font-bold text-slate-500 tracking-wider uppercase rotate-180" 
            style={{ writingMode: 'vertical-rl' }}
          >
            System Officials ({validPersonnel.length})
          </span>
        </div>

        <button
          onClick={onOpenInviteModal}
          title="Invite Official"
          className="p-2 text-white bg-[#006194] hover:bg-[#004e75] rounded-md transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-80 min-w-80 border-r border-slate-200 bg-white flex flex-col z-20 h-full select-none shadow-xs">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-100 text-[#006194] flex items-center justify-center font-bold">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs font-bold text-slate-900 tracking-tight">Personnel Directory</h2>
              <span className="text-[10px] font-semibold bg-sky-100 text-[#006194] px-1.5 py-0.5 rounded-full">
                {validPersonnel.length} Staff
              </span>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {onlineCount} Online
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">Evaluators, Adjudicators & Admins</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onRefreshDirectory && (
            <button
              onClick={async () => {
                setIsSyncing(true);
                await onRefreshDirectory();
                setTimeout(() => setIsSyncing(false), 600);
              }}
              title="Sync Directory from Database"
              className="p-1.5 text-slate-400 hover:text-[#006194] hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#006194]' : ''}`} />
            </button>
          )}
          <button
            onClick={onToggle}
            title="Collapse Sidebar"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-slate-100 bg-white">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search officials by name, role or dept..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-100/80 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-[#006194] focus:bg-white text-slate-900 placeholder:text-slate-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 mt-2.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
          <button
            onClick={() => setRoleFilter('All')}
            className={`px-2 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
              roleFilter === 'All'
                ? 'bg-[#006194] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({validPersonnel.length})
          </button>
          <button
            onClick={() => setRoleFilter('Evaluator')}
            className={`px-2 py-1 rounded-md font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${
              roleFilter === 'Evaluator'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-3 h-3" />
            Evaluators ({evaluatorCount})
          </button>
          <button
            onClick={() => setRoleFilter('Adjudicator')}
            className={`px-2 py-1 rounded-md font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${
              roleFilter === 'Adjudicator'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Award className="w-3 h-3" />
            Adjudicators ({adjudicatorCount})
          </button>
          <button
            onClick={() => setRoleFilter('Administrator')}
            className={`px-2 py-1 rounded-md font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${
              roleFilter === 'Administrator'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            Admins ({adminCount})
          </button>
          <button
            onClick={() => setRoleFilter('Agent')}
            className={`px-2 py-1 rounded-md font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${
              roleFilter === 'Agent'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Headphones className="w-3 h-3 text-teal-600" />
            Agents ({agentCount})
          </button>
        </div>
      </div>

      {/* Workload Capacity Overview Bar */}
      <div className="px-3.5 py-2.5 bg-sky-50/50 border-b border-sky-100 text-[11px] flex items-center justify-between">
        <div>
          <span className="text-slate-500 font-medium">Assigned Workload: </span>
          <span className="font-bold text-[#006194]">{totalAssignedIdeas} ideas</span>
          <span className="text-slate-400"> across review panels</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-700 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Quorum Active</span>
        </div>
      </div>

      {/* Tip Banner */}
      <div className="px-3.5 py-1.5 bg-amber-50/70 border-b border-amber-200 text-[10.5px] text-amber-900 flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
        <span><strong>Drag & Drop:</strong> Drag any user into the canvas or into a Pool!</span>
      </div>

      {/* Personnel List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-slate-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-xs font-semibold text-slate-600">No personnel found</p>
            <p className="text-[11px] text-slate-400 mt-1">Try refining your search query or filter</p>
          </div>
        ) : (
          filtered.map((person) => {
            const isEvaluator = person.role === 'Evaluator';
            const isAdjudicator = person.role === 'Adjudicator';
            const isAdmin = person.role === 'Administrator';

            // Workload threshold
            const maxCap = isEvaluator ? 15 : isAdjudicator ? 12 : 5;
            const loadPercent = Math.min(100, Math.round((person.assignedIdeasCount / maxCap) * 100));

            return (
              <div
                key={person.id}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify({ type: 'user', data: person }));
                  e.dataTransfer.effectAllowed = 'copyMove';
                }}
                className="p-3 bg-white border border-slate-200 hover:border-[#006194]/60 hover:ring-2 hover:ring-sky-100 rounded-lg shadow-2xs hover:shadow-xs transition-all text-xs group cursor-grab active:cursor-grabbing select-none"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] text-white shadow-xs ${
                          isEvaluator
                            ? 'bg-linear-to-br from-amber-500 to-amber-600'
                            : isAdjudicator
                            ? 'bg-linear-to-br from-emerald-600 to-teal-700'
                            : 'bg-linear-to-br from-purple-600 to-indigo-700'
                        }`}
                      >
                        {person.avatarInitials}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                          (() => {
                            const pStatus = presenceMap[person.id] || presenceMap[person.email] || (person.status === 'active' ? 'online' : 'offline');
                            return pStatus === 'online' || pStatus === 'reviewing' || pStatus === 'editing'
                              ? 'bg-emerald-500 ring-2 ring-emerald-200'
                              : 'bg-slate-300';
                          })()
                        }`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <h3 className="font-bold text-slate-900 group-hover:text-[#006194] transition-colors leading-tight">
                          {person.name}
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate max-w-[130px]">
                        {person.email}
                      </p>
                    </div>
                  </div>

                  {/* Role Badge & Real-Time Presence Status */}
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        person.role === 'Evaluator'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : person.role === 'Adjudicator'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : person.role === 'Agent'
                          ? 'bg-teal-50 text-teal-700 border-teal-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}
                    >
                      {person.role}
                    </span>
                    {(() => {
                      const pStatus = presenceMap[person.id] || presenceMap[person.email] || (person.status === 'active' ? 'online' : 'offline');
                      const isOnline = pStatus === 'online' || pStatus === 'reviewing' || pStatus === 'editing';
                      return (
                        <span className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-500">
                          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                          <span className={isOnline ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                            {isOnline ? (pStatus === 'reviewing' ? 'Reviewing' : pStatus === 'editing' ? 'Editing' : 'Online') : 'Offline'}
                          </span>
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Department */}
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mb-2">
                  <Building className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{person.department}</span>
                </div>

                {/* Workload Indicator (Relevant for Evaluators, Adjudicators, and Agents) */}
                {person.role !== 'Administrator' && (
                  <div className="mb-2.5 bg-slate-50 p-2 rounded-md border border-slate-100">
                    <div className="flex justify-between items-center text-[10px] mb-1">
                      <span className="text-slate-500 font-medium">
                        {person.role === 'Agent' ? 'Assigned Enquiries:' : 'Assigned Load:'}
                      </span>
                      <span className="font-bold text-slate-800">
                        {person.role === 'Agent' 
                          ? `${person.assignedMessagesCount || 0} chats `
                          : `${person.assignedIdeasCount} ideas `}
                        <span className="text-slate-400 font-normal">
                          / {person.role === 'Agent' ? (person.maxChatCapacity || 3) : maxCap} max
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          loadPercent > 80
                            ? 'bg-rose-500'
                            : loadPercent > 50
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${loadPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Account Suspended Alert Banner */}
                {(person.status === 'away' || person.status === 'suspended') && (
                  <div className="mb-2 px-2 py-1 bg-rose-50 border border-rose-200 rounded-md text-[10px] font-bold text-rose-800 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      <span>Account Suspended</span>
                    </span>
                  </div>
                )}

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] gap-1 flex-wrap">
                  <span className="text-[10px] text-slate-400">
                    {person.status === 'away' || person.status === 'suspended' ? 'Suspended' : `Active: ${person.lastActive}`}
                  </span>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {onInviteToWorkspace && (
                      <button
                        onClick={() => onInviteToWorkspace(person)}
                        className="text-indigo-700 hover:text-indigo-900 font-semibold px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer text-[10px]"
                        title="Invite this existing user to collaborate on your active workspace"
                      >
                        Collaborate
                      </button>
                    )}

                    <button
                      onClick={() => onManageUserRole(person)}
                      className="text-slate-600 hover:text-slate-900 font-medium px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors text-[10px]"
                      title="Edit role and department"
                    >
                      Edit
                    </button>

                    {onSuspendUser && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSuspendUser(person);
                        }}
                        className={`font-semibold px-1.5 py-0.5 rounded transition-colors cursor-pointer text-[10px] ${
                          person.status === 'away' || person.status === 'suspended'
                            ? 'text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100'
                            : 'text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100'
                        }`}
                        title={person.status === 'away' || person.status === 'suspended' ? 'Reactivate this user account' : 'Suspend user access'}
                      >
                        {person.status === 'away' || person.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                      </button>
                    )}

                    {onDeleteUser && (
                      deletingUserId === person.id ? (
                        <div className="flex items-center gap-1 bg-rose-50 border border-rose-300 p-0.5 rounded text-[10px]">
                          <span className="text-rose-800 font-bold px-0.5">Delete?</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteUser(person);
                              setDeletingUserId(null);
                            }}
                            className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold cursor-pointer transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingUserId(null);
                            }}
                            className="px-1 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded cursor-pointer transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingUserId(person.id);
                          }}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded transition-colors cursor-pointer"
                          title="Delete account permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}

                    {!isAdmin && (
                      <button
                        onClick={() => onAssignBatchToUser(person)}
                        className="text-[#006194] hover:text-[#004e75] font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-sky-50 hover:bg-sky-100 transition-colors text-[10px]"
                        title="Assign ideas batch directly to this official"
                      >
                        Assign
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer: Register / Invite Official Button */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex flex-col gap-2">
        <button
          onClick={onOpenInviteModal}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-white bg-[#006194] hover:bg-[#004e75] rounded-md transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ Register / Invite Official</span>
        </button>
        <p className="text-[10px] text-slate-400 text-center leading-tight">
          Strict RBAC: Only Evaluators, Adjudicators & Admins can access official panels.
        </p>
      </div>
    </aside>
  );
};
