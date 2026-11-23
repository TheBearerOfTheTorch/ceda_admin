import React, { useMemo, useState } from 'react';
import {
  X,
  HelpCircle,
  MessageSquarePlus,
  Search,
  ChevronDown,
  ChevronUp,
  Star,
  Send,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import {
  FaqItem,
  SystemFeedbackCategory,
  SystemFeedbackItem,
  WorkflowCycle,
} from '../../types/ceda.ts';

interface SubmitterFaqFeedbackModalProps {
  isOpen: boolean;
  initialTab?: 'faq' | 'feedback';
  onClose: () => void;
  faqItems: FaqItem[];
  myFeedback: SystemFeedbackItem[];
  workflowCycle?: WorkflowCycle;
  onSubmitFeedback: (payload: {
    category: SystemFeedbackCategory;
    stageContext: string;
    rating: number;
    comment: string;
  }) => Promise<void> | void;
}

const FEEDBACK_CATEGORIES: SystemFeedbackCategory[] = [
  'Platform Usability',
  'Workflow Clarity',
  'Review Speed',
  'Support & Communication',
  'General',
];

export const SubmitterFaqFeedbackModal: React.FC<SubmitterFaqFeedbackModalProps> = ({
  isOpen,
  initialTab = 'faq',
  onClose,
  faqItems,
  myFeedback,
  workflowCycle,
  onSubmitFeedback,
}) => {
  const [activeTab, setActiveTab] = useState<'faq' | 'feedback'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  const [fbCategory, setFbCategory] = useState<SystemFeedbackCategory>('Workflow Clarity');
  const [fbStageContext, setFbStageContext] = useState<string>('Overall System & Workflow');
  const [fbRating, setFbRating] = useState<number>(5);
  const [fbComment, setFbComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedNotice, setSubmittedNotice] = useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSubmittedNotice(false);
    }
  }, [isOpen, initialTab]);

  const faqCategories = useMemo(() => {
    const cats = Array.from(new Set(faqItems.map((f) => f.category || 'General')));
    return ['All', ...cats];
  }, [faqItems]);

  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return faqItems.filter((item) => {
      if (selectedCategory !== 'All' && (item.category || 'General') !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q)
      );
    });
  }, [faqItems, searchQuery, selectedCategory]);

  const workflowStageOptions = useMemo(() => {
    const stages = (workflowCycle?.stages || [])
      .slice()
      .sort((a, b) => a.stepNumber - b.stepNumber)
      .map((s) => `Stage ${s.stepNumber}: ${s.name}`);
    return ['Overall System & Workflow', ...stages];
  }, [workflowCycle]);

  if (!isOpen) return null;

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbComment.trim()) return;
    setSubmitting(true);
    try {
      await onSubmitFeedback({
        category: fbCategory,
        stageContext: fbStageContext,
        rating: fbRating,
        comment: fbComment.trim(),
      });
      setFbComment('');
      setFbRating(5);
      setSubmittedNotice(true);
      setTimeout(() => setSubmittedNotice(false), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#006194] text-white flex items-center justify-center shadow-xs">
              {activeTab === 'faq' ? (
                <BookOpen className="w-4.5 h-4.5" />
              ) : (
                <MessageSquarePlus className="w-4.5 h-4.5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono-code text-[10px] font-bold text-[#006194] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  CITIZEN HELP & FEEDBACK
                </span>
                <span className="text-[11px] text-slate-500">
                  Admin-Published Knowledge Base & Workflow Feedback
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">
                {activeTab === 'faq'
                  ? 'Frequently Asked Questions (FAQs)'
                  : 'Send System & Workflow Process Feedback'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-Tabs */}
        <div className="px-5 bg-white border-b border-slate-200 flex items-center gap-5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('faq')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'faq'
                ? 'border-[#006194] text-[#006194]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>FAQs ({faqItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'feedback'
                ? 'border-[#006194] text-[#006194]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>System & Workflow Feedback ({myFeedback.length})</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'faq' ? (
            <>
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search FAQs on screening, funding, adjudication, SLA..."
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-[#006194]"
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {faqCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold transition-colors cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-[#006194] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {filteredFaqs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No FAQs match your search or category right now.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredFaqs.map((faq) => {
                    const isExpanded = expandedFaqId === faq.id;
                    return (
                      <div
                        key={faq.id}
                        className="border border-slate-200 rounded-xl bg-white overflow-hidden transition-all"
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                          className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 hover:bg-slate-50/70 cursor-pointer"
                        >
                          <div className="space-y-1">
                            <span className="inline-block text-[9.5px] font-mono-code font-bold uppercase px-2 py-0.5 rounded bg-sky-50 text-[#006194] border border-sky-200">
                              {faq.category || 'General'}
                            </span>
                            <div className="text-xs font-bold text-slate-900">
                              {faq.question}
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-3.5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                            <p className="whitespace-pre-line">{faq.answer}</p>
                            <div className="text-[10px] text-slate-400 mt-2 font-mono-code">
                              Updated: {faq.updatedAt}
                              {faq.updatedBy ? ` • By ${faq.updatedBy}` : ''}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-5">
              {submittedNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Thank you! Your feedback has been sent to CEDA Administration and included in the live feedback aggregate.
                  </span>
                </div>
              )}

              <form
                onSubmit={handleFeedbackSubmit}
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5 text-xs"
              >
                <div className="font-bold text-slate-800">
                  Share Feedback on the System or Workflow Processes
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Feedback Topic / Area
                    </label>
                    <select
                      value={fbCategory}
                      onChange={(e) => setFbCategory(e.target.value as SystemFeedbackCategory)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                    >
                      {FEEDBACK_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Workflow Process / Stage
                    </label>
                    <select
                      value={fbStageContext}
                      onChange={(e) => setFbStageContext(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                    >
                      {workflowStageOptions.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Experience Rating ({fbRating} / 5)
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFbRating(star)}
                        className="p-1 rounded hover:scale-110 transition-transform cursor-pointer"
                        title={`${star} Star${star > 1 ? 's' : ''}`}
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= fbRating
                              ? 'text-amber-500 fill-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-[11px] font-mono-code text-slate-500">
                      {fbRating === 5
                        ? 'Excellent'
                        : fbRating === 4
                          ? 'Good'
                          : fbRating === 3
                            ? 'Fair'
                            : fbRating === 2
                              ? 'Needs Improvement'
                              : 'Poor'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Your Feedback & Improvement Suggestions *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={fbComment}
                    onChange={(e) => setFbComment(e.target.value)}
                    placeholder="Tell CEDA Admins how the submission portal, screening, evaluation speed, or workflow stages worked for you..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs focus:outline-hidden focus:border-[#006194]"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting || !fbComment.trim()}
                    className="px-4 py-2 bg-[#006194] hover:bg-[#004e75] disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Sending...' : 'Submit Feedback to Admin'}</span>
                  </button>
                </div>
              </form>

              {myFeedback.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10.5px] font-mono-code uppercase font-bold text-slate-400">
                    Your Submitted Feedback ({myFeedback.length})
                  </div>
                  {myFeedback.map((fb) => (
                    <div
                      key={fb.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-sky-50 text-[#006194] border border-sky-200 text-[10px] font-bold">
                            {fb.category}
                          </span>
                          {fb.stageContext && (
                            <span className="text-[10.5px] text-slate-500 font-medium">
                              {fb.stageContext}
                            </span>
                          )}
                        </div>
                        <span className="font-mono-code font-bold text-amber-600">
                          {'★'.repeat(fb.rating)}{'☆'.repeat(Math.max(0, 5 - fb.rating))}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{fb.comment}</p>
                      <div className="text-[10px] text-slate-400 font-mono-code">{fb.createdAt}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
