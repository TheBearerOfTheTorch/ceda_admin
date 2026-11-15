import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  FileCheck2,
  RefreshCw,
  Send,
  Ban,
} from 'lucide-react';
import {
  QueueIdeaItem,
  StatutoryScreeningRecord,
  CipaRegistryMatch,
  BursTaxClearanceMatch,
} from '../../types/ceda';
import { searchCipaAndBursRegistry } from '../../lib/cipaScreeningEngine';

interface StatutoryScreeningModalProps {
  isOpen: boolean;
  idea: QueueIdeaItem | null;
  onClose: () => void;
  onSaveScreening: (ideaId: string, screening: StatutoryScreeningRecord) => void;
  onRequestDocsFromSubmitter: (idea: QueueIdeaItem, message: string, screening: StatutoryScreeningRecord) => void;
  onRejectAtScreening: (idea: QueueIdeaItem, reason: string, screening: StatutoryScreeningRecord) => void;
  onAutoScreenSingleIdea: (idea: QueueIdeaItem) => Promise<StatutoryScreeningRecord | null>;
}

export const StatutoryScreeningModal: React.FC<StatutoryScreeningModalProps> = ({
  isOpen,
  idea,
  onClose,
  onSaveScreening,
  onRequestDocsFromSubmitter,
  onRejectAtScreening,
  onAutoScreenSingleIdea,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingCipa, setIsSearchingCipa] = useState(false);
  const [isAutoScreening, setIsAutoScreening] = useState(false);
  const [searchResults, setSearchResults] = useState<
    { cipaMatch: CipaRegistryMatch; bursMatch: BursTaxClearanceMatch }[]
  >([]);

  const [cipaMatch, setCipaMatch] = useState<CipaRegistryMatch | undefined>(undefined);
  const [bursMatch, setBursMatch] = useState<BursTaxClearanceMatch | undefined>(undefined);

  // 3 Gate Checklist States
  const [cipaVerified, setCipaVerified] = useState(false);
  const [bursVerified, setBursVerified] = useState(false);
  const [omangKycVerified, setOmangKycVerified] = useState(true);
  const [notes, setNotes] = useState('');
  const [docRequestText, setDocRequestText] = useState('');
  const [showDocRequestBox, setShowDocRequestBox] = useState(false);

  useEffect(() => {
    if (!isOpen || !idea) return;
    const existing = idea.screening;
    // Default to Registered Company / Entity Name first; fallback to CIPA UIN or BURS TIN (never Project Title)
    const savedCompanyName =
      existing?.cipaMatch?.companyName &&
      existing.cipaMatch.companyName !== 'No Registered Company / Entity Provided'
        ? existing.cipaMatch.companyName
        : '';
    const savedUin =
      existing?.cipaMatch?.uin && existing.cipaMatch.uin !== 'NOT-PROVIDED'
        ? existing.cipaMatch.uin
        : '';
    const initialLookup =
      (idea.enterpriseName || '').trim() ||
      savedCompanyName ||
      (idea.cipaUin || '').trim() ||
      savedUin ||
      (idea.bursTin || '').trim() ||
      '';

    setSearchQuery(initialLookup);
    setCipaMatch(existing?.cipaMatch);
    setBursMatch(existing?.bursMatch);
    setCipaVerified(existing?.cipaVerified ?? false);
    setBursVerified(existing?.bursVerified ?? false);
    setOmangKycVerified(existing?.omangKycVerified ?? true);
    setNotes(existing?.notes || '');
    setSearchResults([]);
    setShowDocRequestBox(false);
    setDocRequestText(
      `[STAGE 2 STATUTORY SCREENING]: Please provide your Registered Company / Entity Name, CIPA Registration UIN, and a valid BURS Tax Clearance Certificate (TIN/TCC) for "${idea.title}".`
    );
  }, [isOpen, idea?.id]);

  if (!isOpen || !idea) return null;

  const handleAttachCipaResult = (item: {
    cipaMatch: CipaRegistryMatch;
    bursMatch: BursTaxClearanceMatch;
  }) => {
    setCipaMatch(item.cipaMatch);
    setBursMatch(item.bursMatch);
    const isCipaActive =
      item.cipaMatch.registrationStatus === 'Registered' && item.cipaMatch.annualReturnCompliant;
    const isBursValid = item.bursMatch.taxStatus === 'Valid';
    setCipaVerified(isCipaActive);
    setBursVerified(isBursValid);
  };

  const handleSearchCipa = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setIsSearchingCipa(true);
    try {
      let matchedList: { cipaMatch: CipaRegistryMatch; bursMatch: BursTaxClearanceMatch }[] = [];
      try {
        const res = await fetch('/api/screening/cipa-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: trimmed,
            enterpriseName: idea.enterpriseName,
            promoterName: idea.submitterName,
            omangId: idea.omangId,
            bursTin: idea.bursTin,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.results) && data.results.length > 0) {
            matchedList = data.results;
          }
        }
      } catch {
        // Fallback to local engine below
      }

      if (matchedList.length === 0) {
        matchedList = searchCipaAndBursRegistry({
          query: trimmed,
          enterpriseName: idea.enterpriseName,
          promoterName: idea.submitterName,
          omangId: idea.omangId,
          bursTin: idea.bursTin,
        });
      }

      setSearchResults(matchedList);
      if (matchedList.length >= 1) {
        handleAttachCipaResult(matchedList[0]);
      }
    } finally {
      setIsSearchingCipa(false);
    }
  };

  const handleRunAutoScreen = async () => {
    setIsAutoScreening(true);
    try {
      // If the Admin typed a Company Name, UIN, or TIN in the lookup box, include it when screening
      const trimmedQuery = searchQuery.trim();
      const isUin = /^BW\d+/i.test(trimmedQuery);
      const isTin = /^(C\d+|TIN|TCC)/i.test(trimmedQuery);
      const enrichedIdea: QueueIdeaItem = {
        ...idea,
        cipaUin: isUin ? trimmedQuery.toUpperCase() : idea.cipaUin,
        bursTin: isTin ? trimmedQuery.toUpperCase() : idea.bursTin,
        enterpriseName:
          !isUin && !isTin && trimmedQuery ? trimmedQuery : idea.enterpriseName,
      };

      const record = await onAutoScreenSingleIdea(enrichedIdea);
      if (record) {
        setCipaMatch(record.cipaMatch);
        setBursMatch(record.bursMatch);
        setCipaVerified(record.cipaVerified);
        setBursVerified(record.bursVerified);
        setOmangKycVerified(record.omangKycVerified);
        setNotes(record.notes || '');
        if (
          !searchQuery.trim() &&
          record.cipaMatch?.companyName &&
          record.cipaMatch.companyName !== 'No Registered Company / Entity Provided'
        ) {
          setSearchQuery(record.cipaMatch.companyName);
        }
      }
    } finally {
      setIsAutoScreening(false);
    }
  };

  const buildCurrentRecord = (
    overrideStatus?: StatutoryScreeningRecord['status'],
    overrideNotes?: string
  ): StatutoryScreeningRecord => {
    const allChecked = cipaVerified && bursVerified && omangKycVerified;
    const anyChecked = cipaVerified || bursVerified;
    const computedStatus: StatutoryScreeningRecord['status'] =
      overrideStatus || (allChecked ? 'verified' : anyChecked ? 'partial' : 'failed');

    return {
      status: computedStatus,
      cipaVerified,
      bursVerified,
      omangKycVerified,
      cipaMatch,
      bursMatch,
      omangId: idea.omangId || cipaMatch?.directors?.[0]?.omangOrId || 'BW-752422914',
      verifiedBy: 'Administrator',
      verifiedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      notes: overrideNotes !== undefined ? overrideNotes : notes,
    };
  };

  const handlePassStage2Gate = () => {
    const passedRecord: StatutoryScreeningRecord = {
      ...buildCurrentRecord('verified'),
      cipaVerified: true,
      bursVerified: true,
      omangKycVerified: true,
      status: 'verified',
      notes: notes || 'Approved at Stage 2 Statutory & Tax Screening Gate (CIPA & BURS Verified).',
    };
    onSaveScreening(idea.id, passedRecord);
    onClose();
  };

  const handleSaveCurrentChecklist = () => {
    const record = buildCurrentRecord();
    onSaveScreening(idea.id, record);
    onClose();
  };

  const handleSendDocRequest = () => {
    const record = buildCurrentRecord('docs_requested', docRequestText);
    onRequestDocsFromSubmitter(idea, docRequestText, record);
    onClose();
  };

  const handleReject = () => {
    const reason =
      notes.trim() ||
      'Proposal rejected at Stage 2 Statutory & Tax Screening due to non-compliance with CIPA registration or BURS tax clearance requirements.';
    const record = buildCurrentRecord('rejected', reason);
    onRejectAtScreening(idea, reason, record);
    onClose();
  };

  const currentStatus =
    cipaVerified && bursVerified && omangKycVerified
      ? 'verified'
      : cipaVerified || bursVerified
        ? 'partial'
        : idea.screening?.status || 'unscreened';

  const displayedEnterpriseName =
    idea.enterpriseName ||
    (cipaMatch?.companyName && cipaMatch.companyName !== 'No Registered Company / Entity Provided'
      ? cipaMatch.companyName
      : 'Not Provided on Submission');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-400/30">
                  Stage 2 of 8 • Administrator Gate
                </span>
                <span className="text-[10px] font-mono-code font-bold text-slate-300">
                  {idea.code}
                </span>
              </div>
              <h2 className="text-base font-black tracking-tight mt-0.5">
                Statutory & Tax Screening Console (CIPA & BURS)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentStatus === 'verified' && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                CIPA + BURS Verified
              </span>
            )}
            {currentStatus === 'partial' && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Partial / Review Needed
              </span>
            )}
            {currentStatus === 'failed' && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-400/40 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                Not Registered / Failed
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Proposal Summary Banner: Clearly separates Project Title from Registered Company / Entity */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[11px] font-bold text-slate-500">
                Project Title / Innovation Initiative: <span className="text-slate-800">{idea.title}</span>
              </div>
              <h3 className="text-sm font-black text-slate-900 mt-0.5 flex items-center gap-2">
                <span>Registered Company / Entity:</span>
                <span className="text-[#006194]">{displayedEnterpriseName}</span>
              </h3>
              <div className="text-xs text-slate-600 mt-1 flex items-center gap-3 flex-wrap">
                <span>
                  Promoter: <strong>{idea.submitterName || 'Citizen Promoter'}</strong>
                </span>
                <span>•</span>
                <span>
                  Omang ID: <strong className="font-mono-code">{idea.omangId || 'BW-752422914'}</strong>
                </span>
                {idea.cipaUin && (
                  <>
                    <span>•</span>
                    <span>
                      Submitted UIN: <strong className="font-mono-code">{idea.cipaUin}</strong>
                    </span>
                  </>
                )}
                {idea.bursTin && (
                  <>
                    <span>•</span>
                    <span>
                      Submitted TIN: <strong className="font-mono-code">{idea.bursTin}</strong>
                    </span>
                  </>
                )}
                <span>•</span>
                <span>
                  Ask: <strong>P {idea.capitalAsk.toLocaleString()}</strong>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRunAutoScreen}
              disabled={isAutoScreening}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAutoScreening ? 'animate-spin' : ''}`} />
              <span>{isAutoScreening ? 'Screening CIPA & BURS...' : 'Auto-Verify (cipaget + BURS)'}</span>
            </button>
          </div>

          {/* 1. Live CIPA & BURS Registry Lookup Bar (Search by Company Name, CIPA UIN, or BURS TIN) */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#006194]" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  1. Live CIPA & BURS Registry Lookup (Company Name, UIN or TIN)
                </h4>
              </div>
              <span className="text-[10.5px] font-mono-code font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Company Name • UIN • TIN Search
              </span>
            </div>

            <form onSubmit={handleSearchCipa} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Registered Company Name (e.g. Khama CleanPower), CIPA UIN (BW00009318277), or BURS TIN..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#006194]"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingCipa}
                className="px-4 py-2 rounded-lg bg-[#006194] hover:bg-[#004e75] text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{isSearchingCipa ? 'Searching...' : 'Search CIPA / TIN'}</span>
              </button>
            </form>

            {/* Search Results List if multiple returned */}
            {searchResults.length > 1 && (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-40 overflow-y-auto">
                {searchResults.map((res, idx) => (
                  <div
                    key={res.cipaMatch.uin + idx}
                    className="p-2.5 flex items-center justify-between text-xs hover:bg-sky-50/60"
                  >
                    <div>
                      <span className="font-mono-code font-bold text-[#006194] mr-2">
                        {res.cipaMatch.uin}
                      </span>
                      <span className="font-bold text-slate-900">{res.cipaMatch.companyName}</span>
                      <span className="ml-2 font-mono-code text-[10px] text-slate-500">
                        TIN: {res.bursMatch.tin}
                      </span>
                      <span
                        className={`ml-2 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          res.cipaMatch.registrationStatus === 'Registered'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {res.cipaMatch.registrationStatus}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAttachCipaResult(res)}
                      className="px-2.5 py-1 rounded bg-[#006194] text-white text-[10.5px] font-bold cursor-pointer"
                    >
                      Attach Record
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Matched CIPA Record Card */}
            {cipaMatch ? (
              <div
                className={`p-3.5 rounded-xl border text-xs ${
                  cipaMatch.registrationStatus === 'Registered' && cipaMatch.annualReturnCompliant
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : cipaMatch.registrationStatus === 'Not Found'
                      ? 'bg-rose-50/50 border-rose-200'
                      : 'bg-amber-50/50 border-amber-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-code font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      UIN: {cipaMatch.uin}
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {cipaMatch.companyName}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10.5px] font-extrabold ${
                      cipaMatch.registrationStatus === 'Registered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    CIPA: {cipaMatch.registrationStatus}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                  <div>
                    <span className="text-slate-400 block">Incorporation Date</span>
                    <strong className="text-slate-800">{cipaMatch.incorporationDate}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Annual Returns Filing</span>
                    <strong
                      className={
                        cipaMatch.annualReturnCompliant ? 'text-emerald-700' : 'text-amber-700'
                      }
                    >
                      {cipaMatch.annualReturnCompliant ? 'Compliant (Up to date)' : 'Overdue / In Default'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Registered Office</span>
                    <strong className="text-slate-800">{cipaMatch.registeredOffice}</strong>
                  </div>
                </div>

                {cipaMatch.directors && cipaMatch.directors.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/70 flex items-center gap-2 flex-wrap">
                    <span className="text-[10.5px] font-bold text-slate-500">CIPA Directors:</span>
                    {cipaMatch.directors.map((d, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-[10.5px] font-semibold text-slate-800"
                      >
                        <span>{d.name}</span>
                        <span className="text-slate-400 font-mono-code">({d.omangOrId})</span>
                        {d.isSubmitterMatch && (
                          <span className="text-emerald-600 font-bold">✓ Submitter Match</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500">
                Enter the <strong>Registered Company / Entity Name</strong>, <strong>CIPA UIN (e.g. BW00009318277)</strong>, or <strong>BURS TIN</strong> above and click <strong>"Search CIPA / TIN"</strong>.
              </div>
            )}
          </div>

          {/* 2. BURS Tax Clearance Verification Summary */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-purple-600" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  2. BURS Tax Clearance Certificate Verification
                </h4>
              </div>
              {bursMatch && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-extrabold ${
                    bursMatch.taxStatus === 'Valid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : bursMatch.taxStatus === 'Expired'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  BURS TCC: {bursMatch.taxStatus}
                </span>
              )}
            </div>

            {bursMatch ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Taxpayer TIN</span>
                  <strong className="font-mono-code text-slate-900">{bursMatch.tin}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">TCC Certificate No.</span>
                  <strong className="font-mono-code text-slate-900">
                    {bursMatch.certificateNumber}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Issue Date</span>
                  <strong className="text-slate-800">{bursMatch.issueDate}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Expiry Date</span>
                  <strong
                    className={
                      bursMatch.taxStatus === 'Valid' ? 'text-emerald-700' : 'text-rose-700'
                    }
                  >
                    {bursMatch.expiryDate}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500">
                Search by <strong>Registered Company Name</strong>, <strong>CIPA UIN</strong>, or <strong>BURS TIN</strong> above to verify BURS Tax Clearance status.
              </div>
            )}
          </div>

          {/* 3. Interactive Checklist Gate */}
          <div className="p-4 rounded-xl border-2 border-purple-200 bg-purple-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider">
                Stage 2 Statutory Checklist Gate (Manual & Automated Sign-off)
              </h4>
              <span className="text-[11px] font-bold text-purple-700">
                {[cipaVerified, bursVerified, omangKycVerified].filter(Boolean).length} / 3 Verified
              </span>
            </div>

            <div className="space-y-2">
              {/* Check 1: CIPA */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-purple-400 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={cipaVerified}
                  onChange={(e) => setCipaVerified(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
                <div className="flex-1 text-xs">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>CIPA Company Registration Active</span>
                    <span className="font-mono-code text-[10.5px] text-slate-500">
                      {cipaMatch?.uin || idea.cipaUin || 'Pending UIN'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Confirms Registered Company / Entity ({displayedEnterpriseName}) is active on CIPA OBRS and annual returns are compliant.
                  </p>
                </div>
              </label>

              {/* Check 2: BURS */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-purple-400 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={bursVerified}
                  onChange={(e) => setBursVerified(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
                <div className="flex-1 text-xs">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>BURS Tax Clearance Valid</span>
                    <span className="font-mono-code text-[10.5px] text-slate-500">
                      {bursMatch?.tin || idea.bursTin || 'Pending TIN'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Confirms valid Botswana Unified Revenue Service (BURS) TIN and unexpired Tax Clearance Certificate.
                  </p>
                </div>
              </label>

              {/* Check 3: Omang KYC */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-purple-400 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={omangKycVerified}
                  onChange={(e) => setOmangKycVerified(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
                <div className="flex-1 text-xs">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>Citizen Omang KYC Verified</span>
                    <span className="font-mono-code text-[10.5px] text-slate-500">
                      {idea.omangId || cipaMatch?.directors?.[0]?.omangOrId || 'BW-752422914'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Confirms valid Botswana National ID (Omang) for {idea.submitterName || 'Citizen Promoter'}.
                  </p>
                </div>
              </label>
            </div>

            {/* Screening Notes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Administrator Screening Audit Note (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add statutory verification notes..."
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-purple-600"
              />
            </div>
          </div>

          {/* Optional Request Docs Drawer */}
          {showDocRequestBox && (
            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 space-y-2.5 animate-in fade-in">
              <div className="text-xs font-bold text-amber-950">
                Request Statutory Documents from Submitter ({idea.submitterName || 'Citizen Promoter'})
              </div>
              <textarea
                rows={2}
                value={docRequestText}
                onChange={(e) => setDocRequestText(e.target.value)}
                className="w-full p-2.5 text-xs bg-white border border-amber-300 rounded-lg focus:outline-hidden"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDocRequestBox(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-amber-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendDocRequest}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Statutory Doc Request</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReject}
              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Reject at Screening</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDocRequestBox((prev) => !prev)}
              className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Request Statutory Docs</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveCurrentChecklist}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Save Checklist Status
            </button>

            <button
              type="button"
              onClick={handlePassStage2Gate}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Pass Stage 2 Gate (Unlock Assignment)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
