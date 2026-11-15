import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  X, LayoutGrid, FileCheck, Sliders, Award, 
  Rocket, BarChart2, TrendingUp, GitFork, 
  Check, Sparkles 
} from 'lucide-react';
import { WORKSPACE_MODULES } from '../../data/mockData';
import { WorkspaceModule } from '../../types/ceda';

interface CedaModulesMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeModuleId: string;
  onSelectModule: (moduleId: string) => void;
}

export const CedaModulesMenu: React.FC<CedaModulesMenuProps> = ({
  isOpen,
  onClose,
  activeModuleId,
  onSelectModule
}) => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'Administrator';
  if (!isOpen) return null;

  const coreModules = WORKSPACE_MODULES.filter(m => m.category === 'core');
  const enterpriseModules = WORKSPACE_MODULES.filter(m => {
    if (m.id === 'workflow_rules' && !isAdmin) return false;
    return m.category === 'enterprise';
  });

  const getModuleIcon = (iconName: string, isActive: boolean) => {
    const className = `w-4 h-4 ${isActive ? 'text-[#006194]' : 'text-slate-500'}`;
    switch (iconName) {
      case 'layout': return <LayoutGrid className={className} />;
      case 'file-check': return <FileCheck className={className} />;
      case 'sliders': return <Sliders className={className} />;
      case 'award': return <Award className={className} />;
      case 'rocket': return <Rocket className={className} />;
      case 'bar-chart': return <BarChart2 className={className} />;
      case 'trending-up': return <TrendingUp className={className} />;
      case 'git-fork': return <GitFork className={className} />;
      default: return <LayoutGrid className={className} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Click outside backdrop */}
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-slate-900/10 pointer-events-auto" 
      />

      {/* Floating Drawer / Popover anchored under the 9-dot launcher */}
      <div className="absolute left-3 top-14 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200/90 pointer-events-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#006194] text-white flex items-center justify-center shadow-xs">
              {/* Organic connected node emblem */}
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <circle cx="6" cy="6" r="2.5" />
                <circle cx="18" cy="6" r="2.5" />
                <circle cx="12" cy="18" r="2.5" />
                <path d="M6 6 L12 18 L18 6" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-tight">
                CEDA Modules
              </h3>
              <p className="text-[11px] text-slate-500 leading-tight">
                Innovation Architecture
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content sections */}
        <div className="p-3 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Core Canvas Workspaces */}
          <div>
            <div className="px-2.5 mb-1.5 text-[10px] font-mono-code uppercase font-bold text-slate-400 tracking-wider">
              Core Canvas Workspaces
            </div>
            <div className="space-y-1">
              {coreModules.map((module) => {
                const isActive = activeModuleId === module.id;
                return (
                  <button
                    key={module.id}
                    onClick={() => {
                      onSelectModule(module.id);
                      onClose();
                    }}
                    className={`w-full text-left p-2 rounded-xl flex items-start gap-3 transition-colors ${
                      isActive 
                        ? 'bg-sky-50 text-[#006194]' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {getModuleIcon(module.icon, isActive)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold leading-snug">
                        {module.name}
                      </div>
                      <div className="text-[11px] text-slate-500 leading-snug truncate">
                        {module.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Enterprise Tools */}
          <div>
            <div className="px-2.5 mb-1.5 text-[10px] font-mono-code uppercase font-bold text-slate-400 tracking-wider">
              Enterprise Tools
            </div>
            <div className="space-y-1">
              {enterpriseModules.map((module) => {
                const isActive = activeModuleId === module.id;
                return (
                  <button
                    key={module.id}
                    onClick={() => {
                      onSelectModule(module.id);
                      onClose();
                    }}
                    className={`w-full text-left p-2 rounded-xl flex items-start gap-3 transition-colors ${
                      isActive 
                        ? 'bg-sky-50 text-[#006194]' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {getModuleIcon(module.icon, isActive)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold leading-snug">
                        {module.name}
                      </div>
                      <div className="text-[11px] text-slate-500 leading-snug truncate">
                        {module.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono-code text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-700">CEDA Canvas v4.3</span>
          </div>
          <span className="text-slate-400">6 Reviewers Live</span>
        </div>
      </div>
    </div>
  );
};
