import React, { useState } from 'react';
import { 
  X, GitFork, Plus, Trash2, ArrowUp, ArrowDown, 
  CheckCircle, Sliders, Shield, Award, UserCheck, 
  Sparkles, Save, Clock, HelpCircle, Layers
} from 'lucide-react';
import { WorkflowCycle, WorkflowStageDefinition } from '../../types/ceda';

interface WorkflowArchitectModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowCycles: WorkflowCycle[];
  onSaveWorkflowCycle: (updatedCycles: WorkflowCycle[], activeCycleId: string) => void;
}

export const WorkflowArchitectModal: React.FC<WorkflowArchitectModalProps> = ({
  isOpen,
  onClose,
  workflowCycles,
  onSaveWorkflowCycle,
}) => {
  if (!isOpen) return null;

  const [cycles, setCycles] = useState<WorkflowCycle[]>(workflowCycles);
  const activeCycle = cycles.find((c) => c.isActive) || cycles[0];
  const [selectedCycleId, setSelectedCycleId] = useState<string>(activeCycle.id);

  const currentCycle = cycles.find((c) => c.id === selectedCycleId) || cycles[0];
  const [stages, setStages] = useState<WorkflowStageDefinition[]>(currentCycle.stages);

  // New stage form state
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageRole, setNewStageRole] = useState<'Evaluator' | 'Adjudicator' | 'Administrator'>('Evaluator');
  const [newStageThreshold, setNewStageThreshold] = useState('Minimum passing score >= 75/100');
  const [newStageSLA, setNewStageSLA] = useState(7);
  const [newStageColor, setNewStageColor] = useState('#0284c7');

  // New Cycle form state
  const [isCreatingNewCycle, setIsCreatingNewCycle] = useState(false);
  const [newCycleTitle, setNewCycleTitle] = useState('');
  const [newCycleDesc, setNewCycleDesc] = useState('');

  const handleSelectCycle = (cycleId: string) => {
    setSelectedCycleId(cycleId);
    const found = cycles.find((c) => c.id === cycleId);
    if (found) {
      setStages([...found.stages]);
    }
  };

  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const updated = [...stages];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Renumber steps
    const renumbered = updated.map((stg, idx) => ({
      ...stg,
      stepNumber: idx + 1,
    }));
    setStages(renumbered);
  };

  const handleDeleteStage = (stageId: string) => {
    if (stages.length <= 2) {
      alert('A workflow cycle must maintain at least 2 pipeline stages.');
      return;
    }
    const filtered = stages.filter((s) => s.id !== stageId);
    const renumbered = filtered.map((stg, idx) => ({
      ...stg,
      stepNumber: idx + 1,
    }));
    setStages(renumbered);
  };

  const handleAddStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) return;

    const newStage: WorkflowStageDefinition = {
      id: `stage-${Date.now()}`,
      name: newStageName.trim(),
      stepNumber: stages.length + 1,
      assignedRole: newStageRole,
      thresholdCriteria: newStageThreshold,
      targetTurnaroundDays: newStageSLA,
      color: newStageColor,
    };

    setStages([...stages, newStage]);
    setNewStageName('');
    setIsAddingStage(false);
  };

  const handleCreateNewCycleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCycleTitle.trim()) return;

    const newCycle: WorkflowCycle = {
      id: `cycle-${Date.now()}`,
      title: newCycleTitle.trim(),
      description: newCycleDesc.trim() || 'Custom CEDA Evaluation Pipeline',
      isActive: false,
      stages: [
        { id: 'stg-1', name: 'Citizen Intake & KYC', stepNumber: 1, assignedRole: 'Administrator', thresholdCriteria: 'Valid Omang & CIPA Check', targetTurnaroundDays: 2, color: '#0284c7' },
        { id: 'stg-2', name: 'Technical & Feasibility Diligence', stepNumber: 2, assignedRole: 'Evaluator', thresholdCriteria: 'Feasibility Score >= 75%', targetTurnaroundDays: 7, color: '#ea580c' },
        { id: 'stg-3', name: 'Adjudication Board Chamber', stepNumber: 3, assignedRole: 'Adjudicator', thresholdCriteria: 'Board Quorum Consent', targetTurnaroundDays: 5, color: '#16a34a' },
      ],
    };

    setCycles([...cycles, newCycle]);
    setSelectedCycleId(newCycle.id);
    setStages(newCycle.stages);
    setIsCreatingNewCycle(false);
    setNewCycleTitle('');
    setNewCycleDesc('');
  };

  const handleSaveAndActivate = () => {
    const updatedCycles = cycles.map((c) => {
      if (c.id === selectedCycleId) {
        return {
          ...c,
          isActive: true,
          stages: stages,
        };
      }
      return {
        ...c,
        isActive: false,
      };
    });

    onSaveWorkflowCycle(updatedCycles, selectedCycleId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-[#006194] flex items-center justify-center">
              <GitFork className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Innovation Workflow Architect</h3>
              <p className="text-xs text-slate-500">Configure evaluation stages, role assignments, thresholds & turnaround SLAs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cycle Selection Strip */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="font-bold text-slate-600 shrink-0">Workflow Cycle:</span>
            {cycles.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelectCycle(c.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                  selectedCycleId === c.id
                    ? 'bg-[#006194] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{c.title}</span>
                {c.isActive && (
                  <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-full uppercase tracking-wider font-extrabold">
                    ACTIVE
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsCreatingNewCycle(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors shrink-0 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-[#006194]" />
            <span>+ New Cycle</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* New Cycle Creator Banner */}
          {isCreatingNewCycle && (
            <form onSubmit={handleCreateNewCycleSubmit} className="p-4 bg-sky-50 border border-sky-200 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-sky-900 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#006194]" />
                  Create New Workflow Cycle
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreatingNewCycle(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Cycle Title:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Green Hydrogen Specialized Diligence"
                    value={newCycleTitle}
                    onChange={(e) => setNewCycleTitle(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Description:</label>
                  <input
                    type="text"
                    placeholder="Brief description of application eligibility & mandate"
                    value={newCycleDesc}
                    onChange={(e) => setNewCycleDesc(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-slate-900"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreatingNewCycle(false)}
                  className="px-3 py-1 text-slate-600 hover:bg-slate-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-[#006194] text-white font-bold rounded-md hover:bg-[#004e75]"
                >
                  Save & Configure Stages
                </button>
              </div>
            </form>
          )}

          {/* Active Cycle Details Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">{currentCycle.title}</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                  {stages.length} Configured Stages
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{currentCycle.description}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block">Total Target Diligence SLA:</span>
              <span className="font-extrabold text-slate-800 text-sm">
                {stages.reduce((acc, s) => acc + s.targetTurnaroundDays, 0)} Business Days
              </span>
            </div>
          </div>

          {/* Stages List Header */}
          <div className="flex items-center justify-between">
            <div>
              <h5 className="font-bold text-slate-800 text-xs">Pipeline Stage Sequence & Role Allocation</h5>
              <p className="text-[11px] text-slate-500">Each stage must be strictly assigned to an Evaluator, Adjudicator, or Administrator</p>
            </div>
            <button
              onClick={() => setIsAddingStage(true)}
              className="px-3 py-1.5 bg-[#006194] hover:bg-[#004e75] text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Stage</span>
            </button>
          </div>

          {/* Add Stage Inline Drawer */}
          {isAddingStage && (
            <form onSubmit={handleAddStage} className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-amber-900 text-xs">Define New Workflow Stage</span>
                <button
                  type="button"
                  onClick={() => setIsAddingStage(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Stage Name:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Field Prototype Stress-Test"
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Assigned Role:</label>
                  <select
                    value={newStageRole}
                    onChange={(e) => setNewStageRole(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md font-medium"
                  >
                    <option value="Evaluator">Evaluator (Technical & Viability Assessment)</option>
                    <option value="Adjudicator">Adjudicator (Board Quorum & Approval)</option>
                    <option value="Administrator">Administrator (Intake & Compliance Triage)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Target SLA (Days):</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={newStageSLA}
                    onChange={(e) => setNewStageSLA(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Advancement Threshold Criteria:</label>
                <input
                  type="text"
                  placeholder="e.g. Technical Feasibility Score >= 80% & IP clearance"
                  value={newStageThreshold}
                  onChange={(e) => setNewStageThreshold(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingStage(false)}
                  className="px-3 py-1 text-slate-600 hover:bg-slate-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-md"
                >
                  Add to Sequence
                </button>
              </div>
            </form>
          )}

          {/* Stages List */}
          <div className="space-y-2">
            {stages.map((stage, idx) => {
              const isEvaluator = stage.assignedRole === 'Evaluator';
              const isAdjudicator = stage.assignedRole === 'Adjudicator';
              const isAdmin = stage.assignedRole === 'Administrator';

              return (
                <div
                  key={stage.id}
                  className="p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-lg flex items-center justify-between gap-3 group transition-all"
                >
                  {/* Step number badge & Name */}
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[11px]">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{stage.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isEvaluator
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : isAdjudicator
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          {stage.assignedRole}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 block">
                        Gate Threshold: <strong className="text-slate-700 font-semibold">{stage.thresholdCriteria}</strong>
                      </span>
                    </div>
                  </div>

                  {/* SLA & Controls */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{stage.targetTurnaroundDays}d SLA</span>
                    </div>

                    {/* Reorder & Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveStage(idx, 'up')}
                        disabled={idx === 0}
                        title="Move Up"
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded hover:bg-slate-100"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveStage(idx, 'down')}
                        disabled={idx === stages.length - 1}
                        title="Move Down"
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded hover:bg-slate-100"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteStage(stage.id)}
                        title="Remove Stage"
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-slate-500 text-[11px]">
            <span>Activated workflows apply across all incoming submission queues and reviewer boards.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndActivate}
              className="px-5 py-2 font-bold text-white bg-[#006194] hover:bg-[#004e75] rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Apply & Activate Workflow</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
