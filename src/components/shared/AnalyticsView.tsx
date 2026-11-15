import React from 'react';
import { ProjectCardData, QueueIdeaItem } from '../../types/ceda';
import { PIPELINE_STAGES } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { 
  BarChart3, TrendingUp, Users, Banknote, ShieldAlert, 
  MapPin, CheckCircle, PieChart, Layers, ArrowUpRight,
  Clock, Award, Building, FileText, CheckCircle2, ShieldCheck, Sparkles
} from 'lucide-react';

interface AnalyticsViewProps {
  projects: ProjectCardData[];
  assignedIdeas?: QueueIdeaItem[];
  activeWorkspaceName?: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ 
  projects,
  assignedIdeas = [],
  activeWorkspaceName = 'My Workspace',
}) => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'Administrator';

  const formatBWP = (amount: number) => {
    return new Intl.NumberFormat('en-BW', {
      style: 'currency',
      currency: 'BWP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // If user is NOT an Admin (e.g. Evaluator or Adjudicator), render the Workspace-Tailored Report
  if (!isAdmin) {
    const evaluatorTotalCapital = assignedIdeas.reduce((sum, i) => sum + (i.capitalAsk || 0), 0);
    const urgentCount = assignedIdeas.filter((i) => i.urgency === 'Fast-Track' || (i.urgency as any) === 'urgent').length;
    const avgSla = assignedIdeas.length > 0 
      ? (assignedIdeas.reduce((sum, i) => sum + (i.slaRemainingDays ?? 3.5), 0) / assignedIdeas.length).toFixed(1)
      : '3.5';

    return (
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Top Banner */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono-code text-xs font-bold text-[#006194] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                WORKSPACE EVALUATION ANALYTICS
              </span>
              <span className="text-xs text-slate-500 font-mono-code">
                DILIGENCE DOSSIERS & COLLABORATION HISTORY
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Evaluator Throughput, Idea Reviews & Collaboration History
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Technical assessment ledger for <strong>{currentUser?.firstName} {currentUser?.lastName}</strong> ({currentUser?.role}) • {currentUser?.department}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 font-mono-code">ACTIVE WORKSPACE</span>
            <div className="text-sm font-bold font-mono-code text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              {activeWorkspaceName}
            </div>
          </div>
        </div>

        {/* Notice on Role-Based Telemetry Scope */}
        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Personalized Workspace Scope:</strong> This report is tailored strictly to proposals assigned to your workspace. Macro-national capital allocation metrics are reserved for Administrators.
            </span>
          </div>
          <span className="text-[10px] font-mono-code bg-white px-2 py-0.5 rounded text-amber-800 border border-amber-200">
            RBAC: {currentUser?.role}
          </span>
        </div>

        {/* Evaluator KPI Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-mono-code font-bold uppercase">Assigned Proposals</span>
              <Layers className="w-4 h-4 text-[#006194]" />
            </div>
            <div className="text-2xl font-bold font-mono-code text-slate-900">
              {assignedIdeas.length} Proposals
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>{urgentCount} flagged urgent for SLA review</span>
            </div>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-mono-code font-bold uppercase">Assigned Capital Demand</span>
              <Banknote className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-mono-code text-emerald-700">
              {formatBWP(evaluatorTotalCapital)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Across review portfolio in active queue
            </div>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-mono-code font-bold uppercase">Avg SLA Remaining</span>
              <Clock className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-2xl font-bold font-mono-code text-slate-900">
              {avgSla} Days
            </div>
            <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>100% within statutory turnarounds</span>
            </div>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-mono-code font-bold uppercase">Departmental Quorum</span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold font-mono-code text-indigo-900">
              Active Bench
            </div>
            <div className="text-xs text-slate-500 mt-1 truncate">
              {currentUser?.department || 'AgriTech Diligence'}
            </div>
          </div>
        </div>

        {/* Assigned Proposals Diligence Table */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold font-mono-code uppercase text-slate-800">
              Proposals Under Active Technical Assessment ({assignedIdeas.length})
            </h2>
            <span className="text-xs text-slate-500 font-mono-code">FIFO INTAKE ORDER</span>
          </div>

          {assignedIdeas.length === 0 ? (
            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
              <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">No Proposals Currently Assigned</p>
              <p className="text-xs text-slate-400 mt-1">
                When the Administrator assigns ideas from the central queue to your workspace, they will appear here and in your canvas queue in real-time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-mono-code">
                    <th className="py-2.5 px-3">CODE</th>
                    <th className="py-2.5 px-3">PROPOSAL TITLE</th>
                    <th className="py-2.5 px-3">PROMOTER / ENTERPRISE</th>
                    <th className="py-2.5 px-3">CAPITAL DEMAND</th>
                    <th className="py-2.5 px-3">SLA STATUS</th>
                    <th className="py-2.5 px-3">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignedIdeas.map((idea) => (
                    <tr key={idea.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-mono-code font-bold text-[#006194]">
                        {idea.code || idea.id}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {idea.title}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {idea.enterpriseName || idea.submitterName || 'Promoter'}
                      </td>
                      <td className="py-3 px-3 font-mono-code font-bold text-slate-800">
                        {formatBWP(idea.capitalAsk || 0)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono-code text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {idea.slaRemainingDays ?? 3.5}d remaining
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          In Technical Review
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Workspace Collaboration History Ledger */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-bold font-mono-code uppercase text-slate-800">
            Workspace Collaboration & Review Log
          </h2>
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <strong className="text-slate-800">Workspace Initialized: {activeWorkspaceName}</strong>
                <div className="text-slate-500 text-[11px]">Assigned to {currentUser?.firstName} {currentUser?.lastName} ({currentUser?.department})</div>
              </div>
              <span className="font-mono-code text-slate-400 text-[11px]">Active Session</span>
            </div>
            <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 flex items-center justify-between">
              <div>
                <strong className="text-indigo-950">Collaborator Invites & Real-Time Sync</strong>
                <div className="text-slate-600 text-[11px]">Collaborators invited to this workspace can view and assess assigned cards simultaneously.</div>
              </div>
              <span className="font-mono-code font-bold text-indigo-700 text-[11px]">Real-Time Active</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ADMINISTRATOR VIEW: Macro-telemetry & National Portfolio Allocation
  // =========================================================================
  const totalFundingRequested = projects.reduce((sum, p) => sum + p.fundingRequested, 0);
  const totalCoFinancing = projects.reduce((sum, p) => sum + p.coFinancing, 0);
  const totalJobs = projects.reduce((sum, p) => sum + p.projectedJobs, 0);

  // Group by sector
  const sectorCounts: { [key: string]: { count: number; funding: number } } = {};
  projects.forEach((p) => {
    if (!sectorCounts[p.sector]) {
      sectorCounts[p.sector] = { count: 0, funding: 0 };
    }
    sectorCounts[p.sector].count += 1;
    sectorCounts[p.sector].funding += p.fundingRequested;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono-code text-xs font-bold text-[#7c3aed] bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              NATIONAL MACRO-TELEMETRY
            </span>
            <span className="text-xs text-slate-500 font-mono-code">
              CITIZEN ECONOMIC INCLUSION DASHBOARD
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Portfolio Throughput & Capital Allocation Metrics
          </h1>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400 font-mono-code">REPORTING CYCLE</span>
          <div className="text-sm font-bold font-mono-code text-slate-800">FY 2026 / Q4 AUDIT</div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-mono-code font-bold uppercase">Total Capital Demand</span>
            <Banknote className="w-4 h-4 text-[#006194]" />
          </div>
          <div className="text-2xl font-bold font-mono-code text-slate-900">
            {formatBWP(totalFundingRequested)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-emerald-700 font-semibold">+18.4%</span> vs prior fiscal period
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-mono-code font-bold uppercase">Promoter Co-Financing</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono-code text-emerald-700">
            {formatBWP(totalCoFinancing)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Leverage Ratio: <strong className="text-slate-800 font-mono-code">1 : 3.4 CEDA Multiplier</strong>
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-mono-code font-bold uppercase">Citizen Employment</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono-code text-slate-900">
            {totalJobs} Direct Jobs
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Average cost per job: <strong className="text-slate-800 font-mono-code">{formatBWP(Math.round(totalFundingRequested / (totalJobs || 1)))}</strong>
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-mono-code font-bold uppercase">Active Pipeline Projects</span>
            <CheckCircle className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold font-mono-code text-slate-900">
            {projects.length} Enterprises
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Average Stage Velocity: <strong className="text-slate-800 font-mono-code">19.2 days</strong>
          </div>
        </div>
      </div>

      {/* 8-Stage Funnel Throughput Visualizer */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-xs">
        <h2 className="text-sm font-bold font-mono-code uppercase text-slate-700 mb-4 flex items-center justify-between">
          <span>8-Stage National Innovation Pipeline Velocity</span>
          <span className="text-xs font-normal text-slate-500">Intake to Realized Economic Impact</span>
        </h2>

        <div className="grid grid-cols-8 gap-2">
          {PIPELINE_STAGES.map((st) => {
            const count = projects.filter(p => p.stageId === st.id).length;
            const funding = projects.filter(p => p.stageId === st.id).reduce((s, p) => s + p.fundingRequested, 0);

            return (
              <div
                key={st.id}
                style={{ borderTopColor: st.color, borderTopWidth: '3px' }}
                className="bg-slate-50/70 border border-slate-200 rounded-lg p-3 flex flex-col justify-between h-40"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono-code text-[11px] font-bold text-slate-500">{st.tagPrefix}</span>
                    <span 
                      style={{ backgroundColor: st.bgColor, color: st.color }}
                      className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] font-mono-code"
                    >
                      {count}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 truncate" title={st.name}>
                    {st.name}
                  </div>
                </div>

                {/* Progress bar height */}
                <div className="space-y-1">
                  <div className="text-[10px] font-mono-code text-slate-500 truncate">
                    {formatBWP(funding)}
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      style={{ 
                        width: `${Math.min(100, Math.max(15, (count / (projects.length || 1)) * 100 * 2.5))}%`,
                        backgroundColor: st.color 
                      }}
                      className="h-full rounded-full"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sector Breakdown & District Spread */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sector Allocation */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold font-mono-code uppercase text-slate-700">
            Sectoral Capital Allocation Breakdown
          </h2>

          <div className="space-y-3">
            {Object.entries(sectorCounts).map(([sec, data]) => {
              const percent = Math.round((data.funding / (totalFundingRequested || 1)) * 100);
              return (
                <div key={sec} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{sec} ({data.count})</span>
                    <span className="font-mono-code font-bold text-slate-900">{formatBWP(data.funding)} ({percent}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${percent}%` }}
                      className="bg-[#006194] h-full rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Regional Impact & Risk Heatmap */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold font-mono-code uppercase text-slate-700">
            Botswana Regional Innovation Corridors
          </h2>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <strong className="text-slate-800">Chobe & Okavango Delta Corridor</strong>
                <div className="text-slate-500 text-[11px]">Eco-Tourism, Fish-Waste Hydroponics, Cold-Chain Logistics</div>
              </div>
              <span className="font-mono-code font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                100 Direct Jobs
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <strong className="text-slate-800">Greater Gaborone & SEPD Zone</strong>
                <div className="text-slate-500 text-[11px]">Electric Transit, FinTech Livestock Tokenization, Crop Drones</div>
              </div>
              <span className="font-mono-code font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                66 Direct Jobs
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <strong className="text-slate-800">Kgalagadi & Central Rangelands</strong>
                <div className="text-slate-500 text-[11px]">Solar Micro-Grids, Sorghum Protein Extraction, Orapa AI Mining</div>
              </div>
              <span className="font-mono-code font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                121 Direct Jobs
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <strong className="text-slate-800">Francistown & SPEDU Selebi-Phikwe</strong>
                <div className="text-slate-500 text-[11px]">Lithium Battery Circular Economy, Citrus Biopesticides</div>
              </div>
              <span className="font-mono-code font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                68 Direct Jobs
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
