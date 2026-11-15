import React, { useState } from 'react';
import { IntakeDossier } from '../../types/ceda';
import { useAuth } from '../../context/AuthContext';
import { 
  Inbox, Search, ChevronRight, ChevronsRight, 
  Upload, PanelLeftClose, PanelLeftOpen, CheckCircle, 
  Clock, ArrowUpRight, Plus, Sparkles 
} from 'lucide-react';

interface InnovationIntakeSidebarProps {
  dossiers: IntakeDossier[];
  isOpen: boolean;
  onToggle: () => void;
  onAdvanceToStage1: (dossier: IntakeDossier) => void;
  onOpenUploadModal: () => void;
}

export const InnovationIntakeSidebar: React.FC<InnovationIntakeSidebarProps> = ({
  dossiers,
  isOpen,
  onToggle,
  onAdvanceToStage1,
  onOpenUploadModal
}) => {
  const { currentUser } = useAuth();
  const isSubmitter = currentUser?.role === 'Submitter';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'new_ingest' | 'review' | 'strategic'>('all');

  const filteredDossiers = dossiers.filter((d) => {
    const matchesFilter = activeFilter === 'all' || d.category === activeFilter;
    const matchesQuery = !searchQuery.trim() || 
      d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.organization.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesQuery;
  });

  const totalCapitalAsk = dossiers.reduce((sum, d) => sum + d.capitalAsk, 0);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed left-0 top-16 z-30 bg-white border border-slate-200 border-l-0 rounded-r-xl p-2.5 shadow-md text-slate-600 hover:text-[#006194] hover:bg-slate-50 transition-colors flex items-center gap-1.5"
        title="Open Innovation Intake (18 New)"
      >
        <Inbox className="w-4 h-4 text-[#006194]" />
        <span className="text-[11px] font-bold font-mono-code bg-sky-100 text-[#006194] px-1.5 py-0.5 rounded">
          18
        </span>
      </button>
    );
  }

  return (
    <aside 
      aria-label="Innovation Intake Sidebar"
      className="w-80 h-[calc(100vh-56px)] bg-white border-r border-[#e2e8f0] flex flex-col z-20 shrink-0 select-none shadow-[2px_0_8px_-3px_rgba(15,23,42,0.03)]"
    >
      {/* Top Header */}
      <div className="p-4 border-b border-[#e2e8f0]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#006194] border border-sky-200 flex items-center justify-center">
              <Inbox className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Innovation Intake
                </h2>
                <span className="font-mono-code text-[11px] font-bold bg-[#006194]/10 text-[#006194] px-2 py-0.5 rounded-full">
                  18 New
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Citizen dossiers & submissions
              </p>
            </div>
          </div>

          <button
            onClick={onToggle}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            title="Collapse Intake Panel"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mt-3">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dossiers by keyword or ID..."
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-hidden focus:border-[#006194] focus:ring-1 focus:ring-[#006194] placeholder:text-slate-400"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono-code text-slate-400 bg-white border border-slate-200 px-1 rounded">
            /
          </kbd>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-0.5">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-[#006194] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All (18)
          </button>
          <button
            onClick={() => setActiveFilter('new_ingest')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeFilter === 'new_ingest'
                ? 'bg-[#006194] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            New Ingest (6)
          </button>
          <button
            onClick={() => setActiveFilter('review')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeFilter === 'review'
                ? 'bg-[#006194] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Review (5)
          </button>
          <button
            onClick={() => setActiveFilter('strategic')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeFilter === 'strategic'
                ? 'bg-[#006194] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Strategic (2)
          </button>
        </div>
      </div>

      {/* Dossier Card Stack */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredDossiers.map((dossier) => (
          <div
            key={dossier.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', dossier.id);
            }}
            className="group bg-white rounded-lg border border-[#e2e8f0] p-3 shadow-[0_1px_2px_0_rgba(15,23,42,0.03)] hover:shadow-md hover:border-slate-300 transition-all cursor-grab active:cursor-grabbing"
          >
            {/* Header tags: #INNO-124 + Badge */}
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="font-mono-code text-[11px] font-bold text-[#006194] bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
                {dossier.id}
              </span>

              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${
                dossier.badge.type === 'green'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : dossier.badge.type === 'amber'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-sky-50 text-sky-800 border-sky-200'
              }`}>
                {dossier.badge.type === 'green' && <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />}
                {dossier.badge.type === 'amber' && <Clock className="w-2.5 h-2.5 text-amber-600" />}
                {dossier.badge.text}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-[13px] font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-[#006194] transition-colors">
              {dossier.title}
            </h3>

            {/* Author & Organization */}
            <p className="text-[11px] text-slate-500 mt-1 truncate">
              {dossier.author} • {dossier.organization}
            </p>

            {/* Badges and Score row */}
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="text-[10.5px] font-medium bg-slate-50 text-slate-600 border border-slate-200 px-1.5 py-0.2 rounded">
                  {dossier.sectorTag}
                </span>
                <span className="text-[10.5px] font-medium bg-slate-50 text-slate-500 border border-slate-200 px-1.5 py-0.2 rounded">
                  {dossier.priorityTag}
                </span>
              </div>

              <div className="font-mono-code text-[11px] font-bold text-emerald-600">
                Score <span className="text-slate-900">{dossier.score}</span>/100
              </div>
            </div>

            {/* Footer row: Ingested date + Drag helper */}
            <div className="flex items-center justify-between text-[10.5px] text-slate-400 mt-2 font-mono-code">
              <span>Ingested {dossier.ingestedDate}</span>
              <span className="text-[#006194] font-medium group-hover:underline">
                Drag to Stage 1 →
              </span>
            </div>

            {/* Promote Action Button (Hidden for Submitters) */}
            {!isSubmitter && (
            <button
              onClick={() => onAdvanceToStage1(dossier)}
              className="w-full mt-2 py-1.5 px-2 bg-sky-50 hover:bg-sky-100 text-[#006194] font-semibold text-[11px] rounded flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-1">
                <ChevronsRight className="w-3.5 h-3.5" />
                <span>Advance → Next Stage</span>
              </span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Capital Summary & Upload Button */}
      <div className="p-3 bg-slate-50 border-t border-[#e2e8f0] flex items-center justify-between">
        <div>
          <div className="text-[9.5px] font-mono-code uppercase font-semibold text-slate-400">
            Unscreened Capital Ask
          </div>
          <div className="text-sm font-bold font-mono-code text-slate-900">
            BWP 7,450,000
          </div>
        </div>

        <button
          onClick={onOpenUploadModal}
          className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-xs flex items-center gap-1.5 hover:bg-slate-50 transition-colors"
        >
          <Upload className="w-3.5 h-3.5 text-slate-500" />
          <span>Upload</span>
        </button>
      </div>
    </aside>
  );
};
