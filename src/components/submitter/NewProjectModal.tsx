import React, { useState } from 'react';
import { ProjectCardData, Sector, RiskLevel } from '../../types/ceda';
import { SECTORS } from '../../data/mockData';
import { X, Sparkles, Building2, User, MapPin, Banknote, Briefcase } from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newProject: ProjectCardData) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [nationalId, setNationalId] = useState(`BW-${Math.floor(100000000 + Math.random() * 900000000)}`);
  const [organization, setOrganization] = useState('');
  const [cipaUin, setCipaUin] = useState('');
  const [bursTin, setBursTin] = useState('');
  const [location, setLocation] = useState('Gaborone CBD');
  const [sector, setSector] = useState<Sector>('AgriTech & Food');
  const [fundingRequested, setFundingRequested] = useState(1200000);
  const [coFinancing, setCoFinancing] = useState(250000);
  const [projectedJobs, setProjectedJobs] = useState(25);
  const [description, setDescription] = useState('');
  const [riskRating, setRiskRating] = useState<RiskLevel>('LOW');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !applicantName.trim()) return;

    const randomIdNumber = Math.floor(100 + Math.random() * 899);
    const newId = `CEDA-2026-0${randomIdNumber}`;

    const project: ProjectCardData = {
      id: newId,
      stageTag: `[INT-0${Math.floor(1 + Math.random() * 9)}]`,
      stageId: 'intake',
      title: title.trim(),
      applicant: {
        name: applicantName.trim(),
        nationalId: nationalId.trim(),
        organization: organization.trim(),
        location: location.trim()
      },
      ...(cipaUin.trim() ? { cipaNumber: cipaUin.trim() } : {}),
      ...(bursTin.trim() ? { bursTin: bursTin.trim() } : {}),
      description: description.trim() || 'Citizen innovation proposal submitted for CEDA evaluation and commercialization support.',
      sector,
      fundingRequested: Number(fundingRequested) || 500000,
      coFinancing: Number(coFinancing) || 100000,
      equityStakePercent: 12,
      projectedJobs: Number(projectedJobs) || 10,
      projectedAnnualRevenue: Math.round(Number(fundingRequested) * 1.6),
      riskRating,
      stageProgress: 15,
      submittedDate: 'Nov 11, 2026',
      lastUpdated: 'Just now',
      reviewers: [
        {
          id: 'rev-2',
          name: 'P. Dube',
          role: 'Regional Ingest Officer',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces'
        }
      ],
      milestones: [
        { id: 'm1', title: 'Citizen Omang KYC & National Identity Verification', completed: true, requiredForNextStage: true },
        { id: 'm2', title: 'Business Plan & Cashflow Projection Attached', completed: true, requiredForNextStage: true },
        { id: 'm3', title: 'CIPA Company Registration Clearance', completed: false, requiredForNextStage: true }
      ],
      tags: [sector.split(' ')[0], 'Citizen Startup', 'Botswana Made'],
      auditLog: [
        {
          timestamp: 'Nov 11, 2026 ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: 'Citizen Portal Ingest Completed',
          author: 'CEDA Ingest Gateway'
        }
      ]
    };

    onSubmit(project);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono-code text-[11px] font-bold text-[#0284c7] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                STAGE 1 // INTAKE PORTAL
              </span>
              <span className="text-xs text-slate-500">Form CEDA-INV-01</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              Ingest Citizen Entrepreneurship Proposal
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Project Title / Innovation Initiative *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Francistown Solar EV Charging Infrastructure"
              className="w-full px-3 py-2 text-xs rounded border border-slate-200 focus:outline-hidden focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Citizen Promoter Name *
              </label>
              <input
                type="text"
                required
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                placeholder="e.g. Neo Khama"
                className="w-full px-3 py-2 text-xs rounded border border-slate-200 focus:outline-hidden focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Botswana National Omang ID *
              </label>
              <input
                type="text"
                required
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono-code rounded border border-slate-200 focus:outline-hidden focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Registered Company / Entity *
              </label>
              <input
                type="text"
                required
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g. Khama CleanPower Pty Ltd"
                className="w-full px-3 py-2 text-xs rounded border border-slate-200 focus:outline-hidden focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                District / Operational Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Maun, Chobe, Gaborone"
                className="w-full px-3 py-2 text-xs rounded border border-slate-200 focus:outline-hidden focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                CIPA Company UIN (Optional)
              </label>
              <input
                type="text"
                value={cipaUin}
                onChange={(e) => setCipaUin(e.target.value)}
                placeholder="e.g. BW00009318277"
                className="w-full px-3 py-2 text-xs font-mono-code rounded border border-slate-200 focus:outline-hidden focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                BURS Taxpayer TIN / TCC No. (Optional)
              </label>
              <input
                type="text"
                value={bursTin}
                onChange={(e) => setBursTin(e.target.value)}
                placeholder="e.g. C0931827701 or TCC-BW-2026-93182"
                className="w-full px-3 py-2 text-xs font-mono-code rounded border border-slate-200 focus:outline-hidden focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Strategic Sector Mandate
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value as Sector)}
                className="w-full px-3 py-2 text-xs rounded border border-slate-200 bg-white focus:outline-hidden focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]"
              >
                {SECTORS.filter(s => s !== 'All Sectors').map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preliminary Risk Rating
              </label>
              <select
                value={riskRating}
                onChange={(e) => setRiskRating(e.target.value as RiskLevel)}
                className="w-full px-3 py-2 text-xs rounded border border-slate-200 bg-white focus:outline-hidden focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]"
              >
                <option value="LOW">LOW Risk (Asset Backed)</option>
                <option value="MEDIUM">MEDIUM Risk (Market Dependent)</option>
                <option value="HIGH">HIGH Risk (Novel Tech / R&D)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                CEDA Requested (BWP)
              </label>
              <input
                type="number"
                min={50000}
                step={50000}
                value={fundingRequested}
                onChange={(e) => setFundingRequested(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono-code rounded border border-slate-200 focus:outline-hidden focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Promoter Equity (BWP)
              </label>
              <input
                type="number"
                min={0}
                step={25000}
                value={coFinancing}
                onChange={(e) => setCoFinancing(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono-code rounded border border-slate-200 focus:outline-hidden focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Direct Jobs Created
              </label>
              <input
                type="number"
                min={1}
                value={projectedJobs}
                onChange={(e) => setProjectedJobs(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono-code rounded border border-slate-200 focus:outline-hidden focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Project Description & Commercial Strategy
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline the operational model, targeted domestic/export customers, and value addition to the Botswana economy..."
              className="w-full px-3 py-2 text-xs rounded border border-slate-200 focus:outline-hidden focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0284c7] text-white text-xs font-bold rounded shadow-xs hover:bg-[#0270a8] transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              Ingest into Intake Pipeline
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
