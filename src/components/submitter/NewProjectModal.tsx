import React, { useEffect, useMemo, useState } from 'react';
import { ApplicationFormField, ProjectCardData, Sector, RiskLevel } from '../../types/ceda';
import { INITIAL_APPLICATION_FIELDS, SECTORS } from '../../data/mockData';
import { X, Sparkles, Upload } from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newProject: ProjectCardData) => void;
  applicationFields?: ApplicationFormField[];
}

type CoreFieldKey =
  | 'title'
  | 'applicantName'
  | 'nationalId'
  | 'organization'
  | 'cipaUin'
  | 'bursTin'
  | 'location'
  | 'sector'
  | 'fundingRequested'
  | 'projectedJobs'
  | 'description';

function inferCoreKey(field: ApplicationFormField): CoreFieldKey | null {
  const lbl = (field.label || '').toLowerCase();
  if (field.id === 'field-1' || lbl.includes('title') || lbl.includes('innovation project')) return 'title';
  if (field.id === 'field-2' || lbl.includes('promoter') || lbl.includes('entrepreneur') || lbl.includes('applicant')) return 'applicantName';
  if (field.id === 'field-3' || lbl.includes('omang') || lbl.includes('national id')) return 'nationalId';
  if (field.id === 'field-4' || lbl.includes('sector')) return 'sector';
  if (field.id === 'field-5' || lbl.includes('description') || lbl.includes('value proposition') || lbl.includes('problem')) return 'description';
  if (field.id === 'field-6' || lbl.includes('funding') || lbl.includes('capital requested') || lbl.includes('bwp')) return 'fundingRequested';
  if (field.id === 'field-7' || lbl.includes('job') || lbl.includes('employment')) return 'projectedJobs';
  if (lbl.includes('company') || lbl.includes('entity') || lbl.includes('organization') || lbl.includes('enterprise')) return 'organization';
  if (lbl.includes('cipa')) return 'cipaUin';
  if (lbl.includes('burs') || lbl.includes('tin') || lbl.includes('tax')) return 'bursTin';
  if (lbl.includes('location') || lbl.includes('district')) return 'location';
  return null;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  applicationFields,
}) => {
  const activeFields = useMemo(
    () => (Array.isArray(applicationFields) && applicationFields.length > 0 ? applicationFields : INITIAL_APPLICATION_FIELDS),
    [applicationFields]
  );

  const [fieldValues, setFieldValues] = useState<Record<string, string | number>>({});
  const [organization, setOrganization] = useState('');
  const [cipaUin, setCipaUin] = useState('');
  const [bursTin, setBursTin] = useState('');
  const [location, setLocation] = useState('Gaborone CBD');
  const [coFinancing, setCoFinancing] = useState(250000);
  const [riskRating, setRiskRating] = useState<RiskLevel>('LOW');
  const [defaultNationalId] = useState(() => `BW-${Math.floor(100000000 + Math.random() * 900000000)}`);

  useEffect(() => {
    if (!isOpen) return;
    setFieldValues((prev) => {
      const next: Record<string, string | number> = { ...prev };
      activeFields.forEach((field) => {
        if (next[field.id] !== undefined) return;
        const core = inferCoreKey(field);
        if (core === 'nationalId') {
          next[field.id] = defaultNationalId;
        } else if (core === 'sector') {
          next[field.id] = field.options?.[0] || 'AgriTech & Food';
        } else if (core === 'fundingRequested') {
          next[field.id] = 1200000;
        } else if (core === 'projectedJobs') {
          next[field.id] = 25;
        } else if (field.fieldType === 'select' && field.options?.length) {
          next[field.id] = field.options[0];
        } else if (field.fieldType === 'number') {
          next[field.id] = '';
        } else {
          next[field.id] = '';
        }
      });
      return next;
    });
  }, [isOpen, activeFields, defaultNationalId]);

  if (!isOpen) return null;

  const hasCoreField = (key: CoreFieldKey) => activeFields.some((f) => inferCoreKey(f) === key);

  const getCoreValue = (key: CoreFieldKey): string => {
    const match = activeFields.find((f) => inferCoreKey(f) === key);
    if (!match) return '';
    return String(fieldValues[match.id] ?? '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const resolvedTitle = (getCoreValue('title') || String(Object.values(fieldValues).find((v) => typeof v === 'string' && v.trim()) || '')).trim();
    const resolvedApplicant = (getCoreValue('applicantName') || 'Citizen Entrepreneur').trim();
    if (!resolvedTitle) return;

    const resolvedNationalId = (getCoreValue('nationalId') || defaultNationalId).trim();
    const resolvedOrg = (hasCoreField('organization') ? getCoreValue('organization') : organization).trim() || `${resolvedApplicant.split(' ')[0]} Enterprise`;
    const resolvedCipa = (hasCoreField('cipaUin') ? getCoreValue('cipaUin') : cipaUin).trim();
    const resolvedBurs = (hasCoreField('bursTin') ? getCoreValue('bursTin') : bursTin).trim();
    const resolvedLocation = (hasCoreField('location') ? getCoreValue('location') : location).trim() || 'Gaborone CBD';
    const resolvedSector = (getCoreValue('sector') || 'AgriTech & Food') as Sector;
    const resolvedFunding = Number(getCoreValue('fundingRequested')) || 500000;
    const resolvedJobs = Number(getCoreValue('projectedJobs')) || 10;
    const resolvedDescription =
      getCoreValue('description').trim() ||
      'Citizen innovation proposal submitted for CEDA evaluation and commercialization support.';

    const customFieldValues: Record<string, string | number> = {};
    activeFields.forEach((f) => {
      const val = fieldValues[f.id];
      if (val !== undefined && String(val).trim() !== '') {
        customFieldValues[f.label] = val;
      }
    });

    const uniqueSuffix = `${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 89)}`;
    const newId = `CEDA-INV-${uniqueSuffix}`;

    const project: ProjectCardData = {
      id: newId,
      stageTag: `[INT-${uniqueSuffix.slice(-4)}]`,
      stageId: 'intake',
      title: resolvedTitle,
      applicant: {
        name: resolvedApplicant,
        nationalId: resolvedNationalId,
        organization: resolvedOrg,
        location: resolvedLocation,
      },
      ...(resolvedCipa ? { cipaNumber: resolvedCipa } : {}),
      ...(resolvedBurs ? { bursTin: resolvedBurs } : {}),
      description: resolvedDescription,
      sector: resolvedSector,
      fundingRequested: resolvedFunding,
      coFinancing: Number(coFinancing) || 100000,
      equityStakePercent: 12,
      projectedJobs: resolvedJobs,
      projectedAnnualRevenue: Math.round(resolvedFunding * 1.6),
      riskRating,
      stageProgress: 15,
      submittedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      lastUpdated: 'Just now',
      customFieldValues,
      reviewers: [
        {
          id: 'rev-2',
          name: 'P. Dube',
          role: 'Regional Ingest Officer',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
        },
      ],
      milestones: [
        { id: 'm1', title: 'Citizen Omang KYC & National Identity Verification', completed: true, requiredForNextStage: true },
        { id: 'm2', title: 'Business Plan & Cashflow Projection Attached', completed: true, requiredForNextStage: true },
        { id: 'm3', title: 'CIPA Company Registration Clearance', completed: false, requiredForNextStage: true },
      ],
      tags: [String(resolvedSector).split(' ')[0] || 'Innovation', 'Citizen Startup', 'Botswana Made'],
      auditLog: [
        {
          timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          action: 'Citizen Portal Ingest Completed',
          author: 'CEDA Ingest Gateway',
        },
      ],
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
              <span className="text-xs text-slate-500">
                Form CEDA-INV-01 • {activeFields.length} Configured Fields
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              Ingest Citizen Entrepreneurship Proposal
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* Dynamically rendered Form Builder Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activeFields.map((field) => {
              const coreKey = inferCoreKey(field);
              const isFullWidth =
                field.fieldType === 'textarea' ||
                field.fieldType === 'file' ||
                coreKey === 'title' ||
                coreKey === 'description';
              const value = fieldValues[field.id] ?? '';

              const selectOptions =
                field.options && field.options.length > 0
                  ? field.options
                  : coreKey === 'sector'
                    ? SECTORS.filter((s) => s !== 'All Sectors')
                    : ['Option A', 'Option B'];

              return (
                <div key={field.id} className={isFullWidth ? 'md:col-span-2' : ''}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {field.label} {field.required ? '*' : ''}
                  </label>

                  {field.fieldType === 'textarea' ? (
                    <textarea
                      rows={3}
                      required={field.required}
                      value={String(value)}
                      onChange={(e) =>
                        setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      placeholder={field.placeholder || 'Enter details...'}
                      className="w-full px-3 py-2 text-xs rounded border border-slate-200 focus:outline-hidden focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]"
                    />
                  ) : field.fieldType === 'select' ? (
                    <select
                      required={field.required}
                      value={String(value || selectOptions[0] || '')}
                      onChange={(e) =>
                        setFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs rounded border border-slate-200 bg-white focus:outline-hidden focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]"
                    >
                      {selectOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.fieldType === 'file' ? (
                    <label className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs rounded border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                      <span className="flex items-center gap-2 text-slate-600 truncate">
                        <Upload className="w-4 h-4 text-[#0284c7] shrink-0" />
                        <span className="truncate">
                          {value ? String(value) : 'Choose PDF / financial document...'}
                        </span>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10.5px] font-semibold text-slate-700 shrink-0">
                        Browse
                      </span>
                      <input
                        type="file"
                        className="sr-only"
                        onChange={(e) => {
                          const fileName = e.target.files?.[0]?.name || '';
                          if (fileName) {
                            setFieldValues((prev) => ({ ...prev, [field.id]: fileName }));
                          }
                        }}
                      />
                    </label>
                  ) : (
                    <input
                      type={field.fieldType === 'number' ? 'number' : 'text'}
                      required={field.required}
                      min={field.fieldType === 'number' ? 0 : undefined}
                      value={value}
                      onChange={(e) =>
                        setFieldValues((prev) => ({
                          ...prev,
                          [field.id]:
                            field.fieldType === 'number'
                              ? e.target.value === ''
                                ? ''
                                : Number(e.target.value)
                              : e.target.value,
                        }))
                      }
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                      className={`w-full px-3 py-2 text-xs rounded border border-slate-200 focus:outline-hidden focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7] ${field.fieldType === 'number' || coreKey === 'nationalId' ? 'font-mono-code' : ''
                        }`}
                    />
                  )}

                  {field.helpText && (
                    <p className="text-[10.5px] text-slate-400 mt-1">{field.helpText}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Entity & Statutory Metadata (retained when not separately defined in Form Builder) */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3">
            {!hasCoreField('organization') && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Company / Entity
                </label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. Khama CleanPower Pty Ltd"
                  className="w-full px-3 py-2 text-xs rounded border border-slate-200 focus:outline-hidden focus:border-[#0284c7] focus:ring-1 focus:ring-[#0284c7]"
                />
              </div>
            )}

            {!hasCoreField('location') && (
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
            )}

            {!hasCoreField('cipaUin') && (
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
            )}

            {!hasCoreField('bursTin') && (
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
            )}

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
