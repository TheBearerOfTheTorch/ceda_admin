import React, { useState } from 'react';
import { 
  Headphones, MessageSquare, Send, CheckCircle2, Clock, 
  User, Check, AlertCircle, FileText, Search, Sparkles, 
  ChevronRight, CornerDownRight, ShieldCheck, Flame, Radio,
  ThumbsUp, RefreshCw, Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SubmitterEnquiryMessage, AdminPersonnel } from '../../types/ceda';

interface AgentPortalViewProps {
  messages: SubmitterEnquiryMessage[];
  personnel: AdminPersonnel[];
  onSendMessage: (messageId: string, text: string) => void;
  onResolveMessage: (messageId: string, notes?: string) => void;
  onUpdateAgentStatus: (agentId: number, status: 'available' | 'busy' | 'offline') => void;
  queueCount: number;
}

export const AgentPortalView: React.FC<AgentPortalViewProps> = ({
  messages,
  personnel,
  onSendMessage,
  onResolveMessage,
  onUpdateAgentStatus,
  queueCount,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Find agent in personnel directory
  const currentAgent = personnel.find(p => p.email === currentUser?.email) || {
    id: 110,
    name: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Thabo Kgosidintsi',
    agentAvailability: 'available',
    maxChatCapacity: 3,
  };

  const agentAvailability = currentAgent.agentAvailability || 'available';

  const matchesCurrentAgent = (m: SubmitterEnquiryMessage) => {
    const emailMatch =
      Boolean(currentUser?.email) &&
      Boolean(m.assignedAgentEmail) &&
      m.assignedAgentEmail!.trim().toLowerCase() === currentUser!.email.trim().toLowerCase();
    const idMatch =
      (currentUser?.id !== undefined && m.assignedAgentId === Number(currentUser.id)) ||
      (currentAgent?.id !== undefined && m.assignedAgentId === Number(currentAgent.id));
    const fullName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim().toLowerCase();
    const firstName = (currentUser?.firstName || '').trim().toLowerCase();
    const assignedName = (m.assignedAgentName || '').trim().toLowerCase();
    const nameMatch =
      Boolean(assignedName) &&
      ((Boolean(fullName) && assignedName === fullName) ||
        (firstName.length >= 2 && assignedName.includes(firstName)));
    return emailMatch || idMatch || nameMatch;
  };

  // Active enquiries assigned to this agent
  const myAssignedMessages = messages.filter(
    (m) => matchesCurrentAgent(m) && m.status === 'assigned'
  );

  // Resolved history handled by this agent
  const myResolvedMessages = messages.filter(
    (m) => matchesCurrentAgent(m) && m.status === 'resolved'
  );

  // Auto-select first message if none selected
  const activeSelectedId = selectedMessageId || (myAssignedMessages[0]?.id ?? null);
  const selectedMessage = messages.find((m) => m.id === activeSelectedId);

  // Canned responses for quick citizen guidance
  const cannedResponses = [
    'Dumela! Your KYC documents are currently verified. The screening turnaround target is 3 business days.',
    'You may attach your supplementary co-financing support letter under the Additional Documents field on the portal.',
    'For citizen youth status (&gt;50%), please provide the Omang ID copies of all Batswana directors.',
    'Your dossier has passed initial vetting and is scheduled for the next Expert Review stage panel.',
  ];

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeSelectedId) return;
    onSendMessage(activeSelectedId, replyText.trim());
    setReplyText('');
  };

  const handleApplyCanned = (text: string) => {
    setReplyText((prev) => (prev ? `${prev} ${text}` : text));
  };

  const handleConfirmResolve = () => {
    if (!activeSelectedId) return;
    onResolveMessage(activeSelectedId, resolutionNotes || 'Resolved citizen query satisfactorily.');
    setIsResolving(false);
    setResolutionNotes('');
    // Select next remaining message if any
    const remaining = myAssignedMessages.filter(m => m.id !== activeSelectedId);
    setSelectedMessageId(remaining[0]?.id || null);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-56px)] bg-[#f8fafc] overflow-hidden select-none">
      {/* Agent Top Header Bar */}
      <div className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-2xs z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-2xs">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Citizen Enquiries & Support Desk
              </h1>
              <span className="text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                Agent Console
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Logged in as: <strong className="text-slate-700">{currentUser?.firstName} {currentUser?.lastName}</strong> ({currentUser?.department})
            </p>
          </div>
        </div>

        {/* Stats & Availability Toggle */}
        <div className="flex items-center gap-4">
          {/* Queue Pending Counter */}
          <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Message Queue: <strong>{queueCount} Pending</strong></span>
          </div>

          {/* Active Chats vs Capacity */}
          <div className="flex items-center gap-2 px-3 py-1 bg-sky-50 border border-sky-200 rounded-xl text-xs font-bold text-[#006194] shadow-2xs">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Capacity: <strong>{myAssignedMessages.length} / {currentAgent.maxChatCapacity || 3} Active</strong></span>
          </div>

          <div className="w-[1px] h-5 bg-slate-200" />

          {/* Agent Availability Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold gap-1">
            <button
              onClick={() => onUpdateAgentStatus(currentAgent.id, 'available')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                agentAvailability === 'available'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Available</span>
            </button>

            <button
              onClick={() => onUpdateAgentStatus(currentAgent.id, 'busy')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                agentAvailability === 'busy'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-300" />
              <span>Busy</span>
            </button>

            <button
              onClick={() => onUpdateAgentStatus(currentAgent.id, 'offline')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                agentAvailability === 'offline'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Offline</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Enquiries List */}
        <div className="w-88 border-r border-slate-200 bg-white flex flex-col shrink-0">
          {/* Tab Selector */}
          <div className="p-3 border-b border-slate-200 flex items-center gap-2 bg-slate-50">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                activeTab === 'active'
                  ? 'bg-white text-teal-800 shadow-2xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Assigned Chats ({myAssignedMessages.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-teal-800 shadow-2xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Handled History ({myResolvedMessages.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search citizen name, idea or topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-teal-600"
              />
            </div>
          </div>

          {/* Messages List Track */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {activeTab === 'active' ? (
              myAssignedMessages.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">No active assigned enquiries</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {agentAvailability === 'available'
                      ? 'You are Available! Incoming citizen enquiries will auto-assign here.'
                      : 'You are currently Busy/Offline. Switch status to Available to receive messages.'}
                  </p>
                </div>
              ) : (
                myAssignedMessages.map((msg) => {
                  const isSelected = msg.id === activeSelectedId;
                  return (
                    <div
                      key={msg.id}
                      onClick={() => setSelectedMessageId(msg.id)}
                      className={`p-3.5 transition-all cursor-pointer select-none border-l-4 ${
                        isSelected
                          ? 'bg-teal-50/70 border-teal-600 shadow-xs'
                          : 'hover:bg-slate-50 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="font-bold text-slate-700">{msg.submitterName}</span>
                        <span className="font-mono-code flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {msg.arrivalTime}
                        </span>
                      </div>

                      <h4 className="font-bold text-xs text-slate-900 leading-snug line-clamp-1 mb-1">
                        {msg.subject}
                      </h4>

                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-2">
                        {msg.messageText}
                      </p>

                      <div className="flex items-center justify-between text-[10px]">
                        {msg.ideaCode && (
                          <span className="font-mono-code font-bold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                            {msg.ideaCode}
                          </span>
                        )}
                        <span className={`px-1.5 py-0.2 rounded font-bold border ${
                          msg.priority === 'Urgent' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          msg.priority === 'High' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {msg.priority}
                        </span>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              myResolvedMessages.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p className="text-xs font-bold text-slate-600">No resolved history yet</p>
                  <p className="text-[11px] text-slate-400 mt-1">Handled enquiries will be archived here.</p>
                </div>
              ) : (
                myResolvedMessages.map((msg) => (
                  <div key={msg.id} className="p-3.5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-bold text-slate-700">{msg.submitterName}</span>
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                        ✓ Resolved
                      </span>
                    </div>
                    <h5 className="font-bold text-xs text-slate-900 mb-1">{msg.subject}</h5>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{msg.resolutionNotes || msg.messageText}</p>
                    <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>{msg.arrivalTime}</span>
                      <span className="flex items-center gap-1 text-amber-500 font-bold">
                        ★★★★★ 5.0 Rating
                      </span>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>

        {/* Right Main Area: Interactive Live Chat Thread */}
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
          {selectedMessage ? (
            <>
              {/* Chat Header: Submitter Profile & Idea Tag */}
              <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-teal-500 to-teal-700 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    {selectedMessage.submitterName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900 leading-tight">
                        {selectedMessage.submitterName}
                      </h3>
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                        {selectedMessage.submitterLocation}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        selectedMessage.priority === 'Urgent' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        selectedMessage.priority === 'High' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {selectedMessage.priority} Priority
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Subject: <strong>{selectedMessage.subject}</strong>
                    </p>
                  </div>
                </div>

                {/* Resolve Action Button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsResolving(true)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Resolve Enquiry</span>
                  </button>
                </div>
              </div>

              {/* Linked Idea Reference Card */}
              {selectedMessage.ideaCode && (
                <div className="px-5 py-2.5 bg-sky-50/80 border-b border-sky-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#006194]" />
                    <span className="font-bold text-slate-700">Linked Proposal:</span>
                    <span className="font-mono-code font-bold text-[#006194] bg-white px-1.5 py-0.5 rounded border border-sky-300">
                      [{selectedMessage.ideaCode}]
                    </span>
                    <span className="font-semibold text-slate-800 truncate max-w-md">
                      {selectedMessage.ideaTitle || 'Citizen Innovation Submission'}
                    </span>
                  </div>
                  <span className="text-[10.5px] font-bold text-[#006194]">Stage 1 Intake Validated</span>
                </div>
              )}

              {/* Chat Thread Messages */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4">
                {selectedMessage.thread.map((t) => {
                  const isAgent = t.sender === 'agent' || t.sender === 'admin';
                  return (
                    <div
                      key={t.id}
                      className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                        <span className="font-bold text-slate-600">{t.senderName}</span>
                        <span>•</span>
                        <span>{t.timestamp}</span>
                      </div>
                      <div
                        className={`max-w-xl p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                          isAgent
                            ? 'bg-teal-600 text-white rounded-tr-none'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                        }`}
                      >
                        {t.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Canned Responses Helper Strip */}
              <div className="px-4 py-2 bg-white border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px] scrollbar-none">
                <span className="text-slate-400 font-bold shrink-0 flex items-center gap-1 text-[10px]">
                  <Sparkles className="w-3 h-3 text-teal-600" />
                  Fast Canned Replies:
                </span>
                {cannedResponses.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => handleApplyCanned(r)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 text-slate-600 rounded-lg whitespace-nowrap transition-colors border border-slate-200 font-medium cursor-pointer"
                  >
                    {r.slice(0, 32)}...
                  </button>
                ))}
              </div>

              {/* Reply Input Bar */}
              <form onSubmit={handleSendReply} className="p-4 bg-white border-t border-slate-200 flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Type official response to submitter..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 text-xs px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-teal-600 text-slate-900"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Reply</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <Headphones className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="font-bold text-sm text-slate-700">Select an enquiry to begin response</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
                Select from assigned chats on the left, or wait for incoming citizen questions to auto-assign from the queue.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Resolution Confirmation Modal */}
      {isResolving && selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in select-none">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Resolve Citizen Enquiry</h4>
                <p className="text-xs text-slate-500">Close ticket for {selectedMessage.submitterName}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Resolution Summary / Internal Notes
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Advised applicant on KYC requirements and co-financing attachments..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
              />
            </div>

            <p className="text-[11px] text-slate-500 bg-emerald-50 p-3 rounded-xl border border-emerald-200 leading-relaxed">
              ⚡ <strong>1-Out 1-In Auto Refill:</strong> Closing this enquiry will free up your chat capacity and automatically pull the next oldest message from the queue!
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsResolving(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResolve}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
