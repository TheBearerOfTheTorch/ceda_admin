import React, { useState } from 'react';
import { 
  Sparkles, Search, PanelLeftClose, PanelLeftOpen, 
  Layers, Clock, Banknote, Building, ChevronRight, 
  CheckCircle2, AlertTriangle, Users, Plus, Award, ArrowUpRight
} from 'lucide-react';
import { QueueIdeaItem } from '../../types/ceda';

interface EvaluatorAssignedSidebarProps {
  assignedIdeas: QueueIdeaItem[];
  isOpen: boolean;
  onToggle: () => void;
  onOpenInviteModal: () => void;
  onReviewIdea?: (idea: QueueIdeaItem) => void;
}

export const EvaluatorAssignedSidebar: React.FC<EvaluatorAssignedSidebarProps> = ({
  assignedIdeas,
  isOpen,
  onToggle,
  onOpenInviteModal,
  onReviewIdea,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'urgent' | 'high_capital'>('all');

  const filteredIdeas = assignedIdeas.filter((idea) => {
    const matchesSearch =
      !searchQuery.trim() ||
      idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (idea.code && idea.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (idea.submitterName && idea.submitterName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (idea.enterpriseName && idea.enterpriseName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filter === 'urgent') return idea.urgency === 'Fast-Track' || (idea.urgency as any) === 'urgent';
    if (filter === 'high_capital') return (idea.capitalAsk || 0) >= 500000;
    return true;
  });

  const totalCapital = assignedIdeas.reduce((sum, i) => sum + (i.capitalAsk || 0), 0);

  if (!isOpen) {
    return (
      <div className="w-12 border-r border-slate-200 bg-white flex flex-col items-center py-4 justify-between z-20 shadow-xs">
        <button
          onClick={onToggle}
          title="Expand Assigned Ideas"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
        >
          <PanelLeftOpen className="w-5 h-5 text-[#006194]" />
        </button>

        <div className="flex flex-col items-center gap-4">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Assigned Proposals Ready" />
          <span 
            className="text-[11px] font-bold text-slate-500 tracking-wider uppercase rotate-180" 
            style={{ writingMode: 'vertical-rl' }}
          >
            Assigned Ideas ({assignedIdeas.length})
          </span>
        </div>

        <button
          onClick={onOpenInviteModal}
          title="Invite Collaborator to Workspace"
          className="p-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-xs cursor-pointer"
        >
          <Users className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-80 min-w-80 border-r border-slate-200 bg-white flex flex-col z-20 h-full select-none shadow-xs">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs font-bold text-slate-900 tracking-tight">Assigned Evaluations</h2>
              <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
                {assignedIdeas.length} Ideas
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">Proposals in Your Technical Diligence</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggle}
            title="Collapse Sidebar"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
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
            placeholder="Search proposals by code or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-100/80 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-[#006194] focus:bg-white text-slate-900 placeholder:text-slate-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 mt-2.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
              filter === 'all'
                ? 'bg-[#006194] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({assignedIdeas.length})
          </button>
          <button
            onClick={() => setFilter('urgent')}
            className={`px-2 py-1 rounded-md font-medium transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer ${
              filter === 'urgent'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3 h-3" />
            Urgent SLA
          </button>
          <button
            onClick={() => setFilter('high_capital')}
            className={`px-2 py-1 rounded-md font-medium transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer ${
              filter === 'high_capital'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Banknote className="w-3 h-3" />
            P 500k+
          </button>
        </div>
      </div>

      {/* Workload Capacity Overview Bar */}
      <div className="px-3.5 py-2 bg-sky-50/50 border-b border-sky-100 text-[11px] flex items-center justify-between">
        <div>
          <span className="text-slate-500 font-medium">Assigned Load: </span>
          <span className="font-bold text-[#006194]">{assignedIdeas.length} proposals</span>
        </div>
        <div className="text-[10.5px] font-bold text-slate-700 font-mono-code">
          {new Intl.NumberFormat('en-BW', { style: 'currency', currency: 'BWP', maximumFractionDigits: 0 }).format(totalCapital)}
        </div>
      </div>

      {/* Tip Banner (Requested text: Drag any ideas into the canvas) */}
      <div className="px-3.5 py-2 bg-amber-50/80 border-b border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span><strong>Drag & Drop:</strong> Drag any ideas into the canvas</span>
      </div>

      {/* Assigned Ideas List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredIdeas.length === 0 ? (
          <div className="p-6 text-center text-slate-400">
            <Layers className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-xs font-semibold text-slate-600">No proposals found</p>
            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
              {assignedIdeas.length === 0
                ? 'Ideas assigned to your workspace by the Administrator will appear here in real-time.'
                : 'No ideas match your search filter.'}
            </p>
          </div>
        ) : (
          filteredIdeas.map((idea) => {
            const isUrgent = idea.urgency === 'Fast-Track' || (idea.urgency as any) === 'urgent';
            return (
              <div
                key={idea.id}
                draggable={true}
                onDragStart={(e) => {
                  const payload = JSON.stringify({ type: 'queue_idea', data: idea });
                  e.dataTransfer.setData('text/plain', payload);
                  e.dataTransfer.setData('text', payload);
                  e.dataTransfer.effectAllowed = 'copy';
                  if (typeof window !== 'undefined') {
                    window.__ceda_dragged_ideas = [idea.id];
                  }
                }}
                className="p-3 bg-white border border-slate-200 hover:border-[#006194]/60 hover:ring-2 hover:ring-sky-100 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-grab active:cursor-grabbing text-xs group"
              >
                {/* Top: Code & Urgency */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono-code text-[10px] font-bold text-[#006194] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    {idea.code || idea.id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isUrgent && (
                      <span className="text-[9.5px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5 text-red-600" />
                        Urgent
                      </span>
                    )}
                    <span className="text-[9.5px] font-mono-code font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                      {idea.slaRemainingDays ?? 3.5}d SLA
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h4 className="font-bold text-slate-900 group-hover:text-[#006194] transition-colors leading-tight line-clamp-2 mb-1.5">
                  {idea.title}
                </h4>

                {/* Submitter & Organization */}
                <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-2 truncate">
                  <Building className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{idea.enterpriseName || idea.submitterName || 'Promoter Dossier'}</span>
                </div>

                {/* Capital Ask & Quick Review Button */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Capital Demand</span>
                    <span className="font-mono-code font-bold text-slate-800">
                      {new Intl.NumberFormat('en-BW', { style: 'currency', currency: 'BWP', maximumFractionDigits: 0 }).format(idea.capitalAsk || 0)}
                    </span>
                  </div>
                  {onReviewIdea && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReviewIdea(idea);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-md font-bold text-[10.5px] transition-colors cursor-pointer"
                    >
                      <span>Score</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer: Workspace Collaboration Invite Only (Evaluators cannot create accounts) */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex flex-col gap-1.5">
        <button
          onClick={onOpenInviteModal}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-xs cursor-pointer"
        >
          <Users className="w-4 h-4" />
          <span>+ Invite Collaborator to Workspace</span>
        </button>
        <p className="text-[10px] text-slate-400 text-center leading-tight">
          Collaborate: Invite colleagues to assist on your workspace.
        </p>
      </div>
    </aside>
  );
};
