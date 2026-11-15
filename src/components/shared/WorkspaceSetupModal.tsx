import React, { useState, useEffect } from 'react';
import { Sparkles, LayoutGrid, Sliders, CheckCircle2, X } from 'lucide-react';
import { CanvasDensity } from '../../types/ceda';

interface WorkspaceSetupModalProps {
  isOpen: boolean;
  defaultName: string;
  initialDensity?: CanvasDensity;
  initialSlaWarningDays?: number;
  initialSlaCriticalDays?: number;
  allowClose?: boolean;
  onClose: () => void;
  onConfirmSetup: (config: {
    name: string;
    density: CanvasDensity;
    slaWarningDays: number;
    slaCriticalDays: number;
    focusSector: string;
  }) => Promise<void> | void;
}

const SECTORS = [
  'All Sectors',
  'AgriTech & Food',
  'CleanTech & Solar',
  'Health & BioTech',
  'Digital FinTech',
  'Mining & Automation',
  'Public Service',
];

export const WorkspaceSetupModal: React.FC<WorkspaceSetupModalProps> = ({
  isOpen,
  defaultName,
  initialDensity = 'Normal',
  initialSlaWarningDays = 3.0,
  initialSlaCriticalDays = 1.5,
  allowClose = true,
  onClose,
  onConfirmSetup,
}) => {
  const [name, setName] = useState(defaultName);
  const [density, setDensity] = useState<CanvasDensity>(initialDensity);
  const [slaWarningDays, setSlaWarningDays] = useState(initialSlaWarningDays);
  const [slaCriticalDays, setSlaCriticalDays] = useState(initialSlaCriticalDays);
  const [focusSector, setFocusSector] = useState('All Sectors');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(defaultName);
      setDensity(initialDensity);
      setSlaWarningDays(initialSlaWarningDays);
      setSlaCriticalDays(initialSlaCriticalDays);
    }
  }, [isOpen, defaultName, initialDensity, initialSlaWarningDays, initialSlaCriticalDays]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onConfirmSetup({
        name: name.trim(),
        density,
        slaWarningDays,
        slaCriticalDays,
        focusSector,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-xs">
        <div className="px-6 py-4 bg-gradient-to-r from-[#006194] to-[#004e75] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold">Customize Your Workspace</h3>
              <p className="text-[11px] text-sky-100">
                Configure your personal canvas before opening an empty workspace
              </p>
            </div>
          </div>
          {allowClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/75 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Workspace Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Tau's Evaluation Workspace"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-[#006194] focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <LayoutGrid className="w-3.5 h-3.5 text-[#006194]" />
                <span>Canvas Density</span>
              </label>
              <select
                value={density}
                onChange={(e) => setDensity(e.target.value as CanvasDensity)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-[#006194] focus:outline-hidden"
              >
                <option value="Compact">Compact</option>
                <option value="Normal">Normal</option>
                <option value="Detailed">Detailed</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Primary Focus Sector</label>
              <select
                value={focusSector}
                onChange={(e) => setFocusSector(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-[#006194] focus:outline-hidden"
              >
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Sliders className="w-3.5 h-3.5 text-[#006194]" />
              <span>SLA Threshold Preferences</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Warning Threshold (days)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={slaWarningDays}
                  onChange={(e) => setSlaWarningDays(Number(e.target.value) || 3)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Critical Threshold (days)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={slaCriticalDays}
                  onChange={(e) => setSlaCriticalDays(Number(e.target.value) || 1.5)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 text-[11px]">
            Your canvas starts <strong>completely empty</strong>. Staff and items only appear when you add/assign them yourself or when you are invited to collaborate on another workspace.
          </div>

          <div className="pt-2 flex justify-end gap-2">
            {allowClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#006194] hover:bg-[#004e75] disabled:opacity-60 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Creating...' : 'Open Empty Canvas'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

