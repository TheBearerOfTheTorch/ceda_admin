import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Headphones,
  CheckCircle2,
  ShieldCheck,
  FileSearch,
  Banknote,
  ArrowLeft,
  Sparkles,
  Clock,
} from 'lucide-react';
import { ProjectCardData, SubmitterEnquiryMessage } from '../../types/ceda';
import { getLifecycleRecordForIdea } from '../../lib/stageJourneyStore';

interface SubmitterEnquiryChatWidgetProps {
  currentUser: {
    id: number | string;
    firstName: string;
    lastName: string;
    email: string;
  };
  projects: ProjectCardData[];
  myEnquiries: SubmitterEnquiryMessage[];
  onSubmitEnquiry: (payload: {
    ideaCode?: string;
    ideaTitle?: string;
    subject: string;
    messageText: string;
    priority: 'Normal' | 'High' | 'Urgent';
  }) => Promise<SubmitterEnquiryMessage>;
  onSendFollowUp: (enquiryId: string, text: string) => void;
}

type WidgetStep =
  | 'menu'
  | 'status_lookup'
  | 'screening_help'
  | 'funding_help'
  | 'agent_form'
  | 'live_threads';

export const SubmitterEnquiryChatWidget: React.FC<SubmitterEnquiryChatWidgetProps> = ({
  currentUser,
  projects,
  myEnquiries,
  onSubmitEnquiry,
  onSendFollowUp,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<WidgetStep>('menu');
  const [selectedIdeaId, setSelectedIdeaId] = useState<string>(projects[0]?.id || '');
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState<'Normal' | 'High' | 'Urgent'>('Normal');
  const [messageText, setMessageText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fullName = `${currentUser.firstName} ${currentUser.lastName}`.trim() || currentUser.email;

  useEffect(() => {
    if (!selectedIdeaId && projects.length > 0) {
      setSelectedIdeaId(projects[0].id);
    }
  }, [projects, selectedIdeaId]);

  const activeThread = useMemo(
    () => myEnquiries.find((e) => e.id === activeThreadId) || myEnquiries[myEnquiries.length - 1] || null,
    [myEnquiries, activeThreadId]
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.thread?.length, step, isOpen]);

  const agentReplyCount = useMemo(() => {
    return myEnquiries.reduce((count, enq) => {
      const agentMsgs = (enq.thread || []).filter((m) => m.sender === 'agent').length;
      return count + agentMsgs;
    }, 0);
  }, [myEnquiries]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedIdeaId) || projects[0] || null,
    [projects, selectedIdeaId]
  );

  const selectedLifecycle = useMemo(() => {
    if (!selectedProject) return null;
    return getLifecycleRecordForIdea({
      id: selectedProject.id,
      stageTag: selectedProject.stageTag,
      title: selectedProject.title,
    });
  }, [selectedProject]);

  const openAgentFormWithContext = (presetSubject?: string, idea?: ProjectCardData | null) => {
    if (idea) setSelectedIdeaId(idea.id);
    if (presetSubject) setSubject(presetSubject);
    setStep('agent_form');
  };

  const handleSendToAdminQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !messageText.trim()) return;
    setSubmitting(true);
    try {
      const chosenProj = projects.find((p) => p.id === selectedIdeaId);
      const created = await onSubmitEnquiry({
        ideaCode: chosenProj?.stageTag || undefined,
        ideaTitle: chosenProj?.title || 'General CEDA Enquiry',
        subject: subject.trim(),
        messageText: messageText.trim(),
        priority,
      });
      setActiveThreadId(created.id);
      setSubject('');
      setMessageText('');
      setPriority('Normal');
      setStep('live_threads');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !replyText.trim()) return;
    onSendFollowUp(activeThread.id, replyText.trim());
    setReplyText('');
  };

  return (
    <>
      {/* Floating Side Launcher Button for Submitters */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 select-none">
        {isOpen && (
          <div className="w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-7rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="bg-[#0c1a2e] text-white px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                {step !== 'menu' && (
                  <button
                    type="button"
                    onClick={() => setStep('menu')}
                    className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                    title="Back to Menu"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold tracking-tight">CEDA Citizen Support Desk</h4>
                  <p className="text-[10px] text-slate-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Guided Help &amp; Live Agent Enquiry Queue
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
                title="Minimize"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-3.5 bg-slate-50/70 space-y-3 text-xs">
              {step === 'menu' && (
                <>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                    <p className="font-bold text-slate-900">
                      Dumela {currentUser.firstName || fullName}! 👋
                    </p>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      Choose an option below for instant answers, or ask to speak with a CEDA Support Agent directly via our Admin Enquiry Queue.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setStep('status_lookup')}
                      className="w-full text-left bg-white hover:bg-sky-50 border border-slate-200 hover:border-[#006194] rounded-xl p-3 transition-all flex items-start gap-3 shadow-2xs cursor-pointer"
                    >
                      <FileSearch className="w-4 h-4 text-[#006194] shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-slate-900">1. Check Proposal Stage &amp; Screening</div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5">
                          See real-time CIPA, BURS &amp; Evaluator status for your ideas
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep('screening_help')}
                      className="w-full text-left bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500 rounded-xl p-3 transition-all flex items-start gap-3 shadow-2xs cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-slate-900">2. CIPA &amp; BURS Document Requirements</div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5">
                          Learn what certificates and tax clearances are needed
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep('funding_help')}
                      className="w-full text-left bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-500 rounded-xl p-3 transition-all flex items-start gap-3 shadow-2xs cursor-pointer"
                    >
                      <Banknote className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-slate-900">3. Funding Limits, Equity &amp; Timeline</div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5">
                          Co-financing, adjudication quorum &amp; pilot disbursement FAQ
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => openAgentFormWithContext('General Citizen Enquiry')}
                      className="w-full text-left bg-[#006194] hover:bg-[#004e78] text-white rounded-xl p-3 transition-all flex items-start gap-3 shadow-sm cursor-pointer"
                    >
                      <Headphones className="w-4 h-4 text-sky-200 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-extrabold">4. Speak to a CEDA Agent</div>
                        <div className="text-[10.5px] text-sky-100 mt-0.5">
                          Send details straight to the Admin Enquiry Queue for live agent assistance
                        </div>
                      </div>
                    </button>

                    {myEnquiries.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setStep('live_threads')}
                        className="w-full text-left bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl p-2.5 transition-all flex items-center justify-between text-teal-900 font-bold cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-teal-700" />
                          My Sent Enquiries &amp; Agent Replies
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white text-[10px]">
                          {myEnquiries.length}
                        </span>
                      </button>
                    )}
                  </div>
                </>
              )}

              {step === 'status_lookup' && (
                <div className="space-y-3">
                  <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                    <label className="block font-bold text-slate-800">Select Your Submitted Idea:</label>
                    {projects.length === 0 ? (
                      <p className="text-[11px] text-slate-500">
                        You have not submitted an innovation proposal yet.
                      </p>
                    ) : (
                      <>
                        <select
                          value={selectedProject?.id || ''}
                          onChange={(e) => setSelectedIdeaId(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold"
                        >
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.stageTag} — {p.title}
                            </option>
                          ))}
                        </select>

                        {selectedProject && (
                          <div className="mt-2 p-2.5 rounded-lg bg-sky-50 border border-sky-200 space-y-1.5">
                            <div className="font-bold text-slate-900">{selectedProject.title}</div>
                            <div className="text-[11px] text-slate-700">
                              Current Stage:{' '}
                              <strong className="text-[#006194] uppercase">
                                {selectedLifecycle?.currentStageId || selectedProject.stageId}
                              </strong>
                            </div>
                            <div className="text-[11px] text-slate-700">
                              CIPA / BURS Screening:{' '}
                              <strong>
                                {selectedLifecycle?.screening?.status === 'verified'
                                  ? '🟢 Verified & Passed'
                                  : selectedLifecycle?.overallStatus === 'rejected'
                                    ? '🔴 Rejected at Gate'
                                    : '⏳ Pending Statutory Check'}
                              </strong>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openAgentFormWithContext(
                        selectedProject ? `Status Enquiry: ${selectedProject.title}` : 'Application Status Query',
                        selectedProject
                      )
                    }
                    className="w-full py-2.5 px-3 bg-[#006194] hover:bg-[#004e78] text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Headphones className="w-4 h-4" />
                    <span>Speak to an Agent about this Idea →</span>
                  </button>
                </div>
              )}

              {step === 'screening_help' && (
                <div className="space-y-3">
                  <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 leading-relaxed text-[11.5px] text-slate-700">
                    <h5 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Stage 2 Statutory &amp; Tax Verification
                    </h5>
                    <p>
                      Before Evaluator assignment, Administrators verify:
                    </p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>
                        <strong>CIPA Registration:</strong> Valid Registered Company / Entity Name or UIN (`BW...`).
                      </li>
                      <li>
                        <strong>BURS Clearance:</strong> Valid Taxpayer TIN &amp; Tax Clearance Certificate (TCC).
                      </li>
                      <li>
                        <strong>Omang KYC:</strong> Promoter National ID matching director records.
                      </li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAgentFormWithContext('CIPA / BURS Screening Assistance')}
                    className="w-full py-2.5 px-3 bg-[#006194] hover:bg-[#004e78] text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Headphones className="w-4 h-4" />
                    <span>Need Help? Send to Agent Queue →</span>
                  </button>
                </div>
              )}

              {step === 'funding_help' && (
                <div className="space-y-3">
                  <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 leading-relaxed text-[11.5px] text-slate-700">
                    <h5 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-amber-600" />
                      Funding &amp; Adjudication Overview
                    </h5>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Proposals pass 8 structured stages from Intake to Realized Impact.</li>
                      <li>After Technical Evaluation, approved ideas enter the Board Adjudication Queue.</li>
                      <li>Disbursements begin automatically in Stage 6 (Pilot Phase) once Board warrants are approved.</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAgentFormWithContext('Funding & Co-Financing Question')}
                    className="w-full py-2.5 px-3 bg-[#006194] hover:bg-[#004e78] text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Headphones className="w-4 h-4" />
                    <span>Ask a Funding Agent →</span>
                  </button>
                </div>
              )}

              {step === 'agent_form' && (
                <form onSubmit={handleSendToAdminQueue} className="space-y-2.5">
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-2.5 text-[11px] text-teal-900">
                    <strong className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      Connect to CEDA Enquiry Queue
                    </strong>
                    Share a few details below so our Admin team &amp; Support Agents can route your enquiry immediately.
                  </div>

                  {projects.length > 0 && (
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                        Related Proposal (Optional)
                      </label>
                      <select
                        value={selectedIdeaId}
                        onChange={(e) => setSelectedIdeaId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                      >
                        <option value="">General Enquiry (Not tied to a specific idea)</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.stageTag} — {p.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                      Enquiry Topic / Subject *
                    </label>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g., Clarify CIPA certificate upload"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-hidden focus:border-[#006194]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">Priority</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['Normal', 'High', 'Urgent'] as const).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setPriority(lvl)}
                          className={`py-1.5 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
                            priority === lvl
                              ? 'bg-[#006194] text-white border-[#006194]'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                      Your Message to CEDA Agent *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Describe how our team can help you..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-hidden focus:border-[#006194]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !subject.trim() || !messageText.trim()}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-extrabold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Sending to Enquiry Queue...' : 'Send to Admin Enquiry Queue'}</span>
                  </button>
                </form>
              )}

              {step === 'live_threads' && (
                <div className="space-y-3 flex flex-col h-full">
                  {myEnquiries.length > 1 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-1 shrink-0">
                      {myEnquiries.map((enq) => (
                        <button
                          key={enq.id}
                          type="button"
                          onClick={() => setActiveThreadId(enq.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap border cursor-pointer ${
                            activeThread?.id === enq.id
                              ? 'bg-[#006194] text-white border-[#006194]'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          {enq.subject.slice(0, 22)}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeThread ? (
                    <>
                      <div className="bg-white border border-slate-200 rounded-xl p-2.5 shrink-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 truncate">{activeThread.subject}</span>
                          <span
                            className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                              activeThread.status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : activeThread.status === 'assigned'
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {activeThread.status === 'resolved'
                              ? 'Resolved'
                              : activeThread.status === 'assigned'
                                ? `Agent: ${activeThread.assignedAgentName || 'Assigned'}`
                                : 'In Admin Enquiry Queue'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {activeThread.ideaTitle} • Priority: {activeThread.priority}
                        </p>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {(activeThread.thread || []).map((msg) => {
                          const isSubmitter = msg.sender === 'submitter';
                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isSubmitter ? 'items-end' : 'items-start'}`}
                            >
                              <div
                                className={`max-w-[85%] rounded-xl px-3 py-2 text-[11.5px] leading-relaxed ${
                                  isSubmitter
                                    ? 'bg-[#006194] text-white'
                                    : 'bg-white border border-slate-200 text-slate-800 shadow-2xs'
                                }`}
                              >
                                <div className={`text-[9px] font-bold mb-0.5 ${isSubmitter ? 'text-sky-100' : 'text-teal-700'}`}>
                                  {msg.senderName} • {msg.timestamp}
                                </div>
                                {msg.text}
                              </div>
                            </div>
                          );
                        })}
                        <div ref={chatEndRef} />
                      </div>

                      <form onSubmit={handleSendReply} className="flex items-center gap-1.5 pt-1 shrink-0">
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a follow-up message..."
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-hidden focus:border-[#006194]"
                        />
                        <button
                          type="submit"
                          disabled={!replyText.trim()}
                          className="p-2 rounded-xl bg-[#006194] hover:bg-[#004e78] text-white disabled:opacity-40 cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <CheckCircle2 className="w-7 h-7 mx-auto mb-1 text-slate-300" />
                      No enquiries sent yet.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => openAgentFormWithContext('')}
                    className="w-full py-1.5 rounded-lg border border-dashed border-slate-300 text-[10.5px] font-bold text-slate-600 hover:bg-white cursor-pointer"
                  >
                    + New Enquiry to Admin Queue
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#006194] hover:bg-[#004e78] text-white shadow-xl border border-sky-400/30 font-bold text-xs transition-all hover:scale-102 cursor-pointer"
        >
          <MessageCircle className="w-4 h-4 text-sky-200" />
          <span>{isOpen ? 'Close Support' : 'Enquiries & Support'}</span>
          {agentReplyCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold animate-pulse">
              {agentReplyCount}
            </span>
          )}
        </button>
      </div>
    </>
  );
};
