import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  subscribeToClarificationChat, 
  sendClarificationMessage, 
  ClarificationChatMessage, 
  publishNotification 
} from '../../lib/firebase';
import { 
  X, Send, MessageSquare, ShieldCheck, User, 
  Clock, Sparkles, CheckCheck, HelpCircle 
} from 'lucide-react';

interface ClarificationChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  innovationId: string | number;
  innovationTitle: string;
  innovationNumber?: string;
  submitterName?: string;
  evaluatorName?: string;
  evaluatorId?: string | number;
  presenceMap?: Record<string | number, 'online' | 'reviewing' | 'editing' | 'offline'>;
}

export const ClarificationChatModal: React.FC<ClarificationChatModalProps> = ({
  isOpen,
  onClose,
  innovationId,
  innovationTitle,
  innovationNumber,
  submitterName,
  evaluatorName = 'Official Evaluator',
  evaluatorId,
  presenceMap = {},
}) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<ClarificationChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time chat messages for this innovation
  useEffect(() => {
    if (!isOpen || (!innovationId && !innovationTitle)) return;
    const unsub = subscribeToClarificationChat(
      innovationId,
      (loaded) => {
        setMessages(loaded);
      },
      {
        ideaTitle: innovationTitle,
        extraKeys: innovationNumber ? [innovationNumber] : undefined,
      }
    );
    return () => unsub();
  }, [isOpen, innovationId, innovationTitle, innovationNumber]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  // Determine Evaluator's real-time presence
  const evalPresence =
    (evaluatorId ? presenceMap[evaluatorId] : undefined) ||
    presenceMap[evaluatorName] ||
    'offline';
  const isEvaluatorOnline =
    evalPresence === 'online' || evalPresence === 'reviewing' || evalPresence === 'editing';

  const isCurrentUserEvaluator =
    currentUser?.role === 'Evaluator' || currentUser?.role === 'Administrator';

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      const senderDisplayName = currentUser
        ? `${currentUser.firstName} ${currentUser.lastName}`.trim()
        : 'User';
      const senderRole = currentUser?.role || 'Citizen';

      await sendClarificationMessage(innovationId, {
        ideaTitle: innovationTitle,
        innovationNumber,
        senderId: currentUser?.id || Date.now(),
        senderName: senderDisplayName,
        senderRole,
        message: trimmed,
      });

      // Broadcast real-time notification to the counter-party
      const targetRole = isCurrentUserEvaluator ? 'Submitter' : 'Evaluator';
      await publishNotification({
        innovationId: String(innovationNumber || innovationId),
        ideaTitle: innovationTitle,
        type: isCurrentUserEvaluator ? 'Clarification message' : 'New idea submitted',
        message: isCurrentUserEvaluator
          ? `${senderDisplayName} (${senderRole}) sent a clarity message on "${innovationTitle}": "${trimmed.slice(0, 80)}${trimmed.length > 80 ? '...' : ''}"`
          : `Submitter ${senderDisplayName} replied on "${innovationTitle}": "${trimmed.slice(0, 80)}${trimmed.length > 80 ? '...' : ''}"`,
        user: senderDisplayName,
        targetRole,
      });

      setInputText('');
    } catch (err) {
      console.error('Failed to send clarification message:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[600px] max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-[#006194] flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono-code text-[11px] font-bold text-[#006194] bg-sky-100 px-2 py-0.5 rounded">
                  {innovationNumber || 'CEDA CLARIFICATION'}
                </span>
                <span className="text-xs text-slate-500 font-semibold truncate max-w-[220px]">
                  {innovationTitle}
                </span>
              </div>
              <h2 className="text-sm font-bold text-slate-900 mt-0.5">
                Evaluation Clarification Channel
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-Time Evaluator Presence Banner */}
        <div className="px-4 py-2.5 bg-sky-50/60 border-b border-sky-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#006194]" />
            <span className="font-bold text-slate-700">Assigned Evaluator:</span>
            <span className="text-slate-900 font-semibold">{evaluatorName}</span>
          </div>

          {/* Online/Offline Status Indicator */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isEvaluatorOnline
                  ? 'bg-emerald-500 ring-4 ring-emerald-100 animate-pulse'
                  : 'bg-slate-300'
              }`}
            />
            <span
              className={`text-[11px] font-bold ${
                isEvaluatorOnline ? 'text-emerald-700' : 'text-slate-500'
              }`}
            >
              {isEvaluatorOnline
                ? evalPresence === 'reviewing'
                  ? 'Reviewing Now'
                  : 'Online'
                : 'Offline'}
            </span>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fafafa]">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <HelpCircle className="w-10 h-10 mb-2 opacity-40 text-[#006194]" />
              <p className="text-xs font-bold text-slate-700">No clarification inquiries yet</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                Evaluators can ask for technical specifications, financial breakdowns, or patent details.
                Responses appear in real time for both parties.
              </p>
            </div>
          ) : (
            messages.map((m, idx) => {
              const isMine =
                String(m.senderId) === String(currentUser?.id) ||
                (currentUser && m.senderName.includes(currentUser.firstName));
              const isEvaluatorMessage =
                m.senderRole === 'Evaluator' || m.senderRole === 'Administrator';

              return (
                <div
                  key={m.id || idx}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10.5px] text-slate-500">
                    <span className="font-bold text-slate-800">{m.senderName}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9.5px] font-semibold border ${
                        isEvaluatorMessage
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-sky-50 text-[#006194] border-sky-200'
                      }`}
                    >
                      {m.senderRole}
                    </span>
                    {m.timestamp && (
                      <span className="text-slate-400 text-[10px]">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed ${
                      isMine
                        ? 'bg-[#006194] text-white rounded-tr-xs'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                    }`}
                  >
                    {m.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isCurrentUserEvaluator
                ? 'Type clarification query to citizen submitter...'
                : 'Type your clarification response to evaluator...'
            }
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#006194]/30 focus:border-[#006194] transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="px-4 py-2.5 bg-[#006194] hover:bg-[#004e75] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};

