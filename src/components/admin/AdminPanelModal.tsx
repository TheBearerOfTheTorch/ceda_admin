import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { FaqItem, SystemFeedbackItem } from '../../types/ceda.ts';
import {
  X, Users, ShieldCheck, Layers, GitBranch,
  Plus, Check, RefreshCw, HelpCircle, MessageSquareHeart, Trash2, Edit3, Star
} from 'lucide-react';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
  initialTab?: 'users' | 'categories' | 'workflow' | 'faqs' | 'feedback';
  faqItems?: FaqItem[];
  onSaveFaqs?: (items: FaqItem[]) => void;
  systemFeedback?: SystemFeedbackItem[];
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
  initialTab = 'users',
  faqItems = [],
  onSaveFaqs,
  systemFeedback = [],
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'categories' | 'workflow' | 'faqs' | 'feedback'>(initialTab);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // New Category Form State
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [newCategoryDesc, setNewCategoryDesc] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // FAQ Management State
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [newFaqCategory, setNewFaqCategory] = useState('Application Process');
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [editFaqQuestion, setEditFaqQuestion] = useState('');
  const [editFaqAnswer, setEditFaqAnswer] = useState('');
  const [editFaqCategory, setEditFaqCategory] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const feedbackAggregate = useMemo(() => {
    const total = systemFeedback.length;
    if (total === 0) {
      return {
        total: 0,
        avgRating: 0,
        positivePct: 0,
        topCategory: 'N/A',
        byRating: [5, 4, 3, 2, 1].map((r) => ({ rating: r, count: 0, pct: 0 })),
        byCategory: [] as { category: string; count: number; avg: number }[],
      };
    }
    const avgRating = Number(
      (systemFeedback.reduce((s, f) => s + (f.rating || 0), 0) / total).toFixed(2)
    );
    const positiveCount = systemFeedback.filter((f) => (f.rating || 0) >= 4).length;
    const positivePct = Math.round((positiveCount / total) * 100);
    const byRating = [5, 4, 3, 2, 1].map((r) => {
      const count = systemFeedback.filter((f) => Math.round(f.rating) === r).length;
      return { rating: r, count, pct: Math.round((count / total) * 100) };
    });
    const catMap = new Map<string, { count: number; sum: number }>();
    systemFeedback.forEach((f) => {
      const cat = f.category || 'General';
      const cur = catMap.get(cat) || { count: 0, sum: 0 };
      catMap.set(cat, { count: cur.count + 1, sum: cur.sum + (f.rating || 0) });
    });
    const byCategory = Array.from(catMap.entries())
      .map(([category, v]) => ({
        category,
        count: v.count,
        avg: Number((v.sum / v.count).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);

    return {
      total,
      avgRating,
      positivePct,
      topCategory: byCategory[0]?.category || 'General',
      byRating,
      byCategory,
    };
  }, [systemFeedback]);

  const handleAddFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim() || !onSaveFaqs) return;
    const adminName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'CEDA Admin';
    const created: FaqItem = {
      id: `faq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      question: newFaqQuestion.trim(),
      answer: newFaqAnswer.trim(),
      category: newFaqCategory.trim() || 'General',
      updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      updatedAtMs: Date.now(),
      updatedBy: adminName,
    };
    onSaveFaqs([created, ...faqItems]);
    setNewFaqQuestion('');
    setNewFaqAnswer('');
    setStatusMessage('FAQ item added and published to Submitters');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSaveEditFaq = (faqId: string) => {
    if (!editFaqQuestion.trim() || !editFaqAnswer.trim() || !onSaveFaqs) return;
    const adminName = `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'CEDA Admin';
    const updated = faqItems.map((item) =>
      item.id === faqId
        ? {
            ...item,
            question: editFaqQuestion.trim(),
            answer: editFaqAnswer.trim(),
            category: editFaqCategory.trim() || 'General',
            updatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            updatedAtMs: Date.now(),
            updatedBy: adminName,
          }
        : item
    );
    onSaveFaqs(updated);
    setEditingFaqId(null);
    setStatusMessage('FAQ item updated for Submitters');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleDeleteFaq = (faqId: string) => {
    if (!onSaveFaqs) return;
    onSaveFaqs(faqItems.filter((item) => item.id !== faqId));
    setStatusMessage('FAQ item deleted');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [uRes, cRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/categories'),
      ]);
      if (uRes.ok) setUsersList(await uRes.json());
      if (cRes.ok) setCategoriesList(await cRes.json());
    } catch (err) {
      console.warn('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAdminData();
    }
  }, [isOpen]);

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setStatusMessage(`Updated user role to ${newRole}`);
        fetchAdminData();
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error updating user role:', err);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryName: newCategoryName.trim(),
          description: newCategoryDesc.trim() || 'CEDA Strategic Innovation Sector',
        }),
      });
      if (res.ok) {
        setNewCategoryName('');
        setNewCategoryDesc('');
        setStatusMessage('Category successfully added to PostgreSQL');
        fetchAdminData();
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error adding category:', err);
    }
  };

  if (!isOpen || currentUser?.role !== 'Administrator') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-purple-50/70 border-b border-purple-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono-code text-[10px] font-bold text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200">
                  SYSTEM ADMINISTRATION
                </span>
                <span className="text-xs text-slate-500 font-mono-code">
                  RBAC & POSTGRESQL ENGINE
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-0.5">
                CEDA Platform Administration Console
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAdminData}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
              title="Refresh database records"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Pill Alert */}
        {statusMessage && (
          <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <Check className="w-3.5 h-3.5" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Tab Controls */}
        <div className="px-5 border-b border-slate-200 bg-slate-50/50 flex items-center gap-6 text-xs font-semibold text-slate-600">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'users' ? 'border-purple-600 text-purple-700' : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User & Role Governance ({usersList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'categories' ? 'border-purple-600 text-purple-700' : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Strategic Categories ({categoriesList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('workflow')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'workflow' ? 'border-purple-600 text-purple-700' : 'border-transparent hover:text-slate-900'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>Innovation Workflow Lifecycle</span>
          </button>
          <button
            onClick={() => setActiveTab('faqs')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'faqs' ? 'border-purple-600 text-purple-700' : 'border-transparent hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>FAQ Manager ({faqItems.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'feedback' ? 'border-purple-600 text-purple-700' : 'border-transparent hover:text-slate-900'
            }`}
          >
            <MessageSquareHeart className="w-4 h-4" />
            <span>Submitter Feedback ({systemFeedback.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Manage assigned roles, permissions, and departmental alignment in PostgreSQL.</span>
                <span className="font-mono-code font-bold">TABLE: users</span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono-code uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">RBAC Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {u.firstName} {u.lastName}
                        </td>
                        <td className="py-2.5 px-3 font-mono-code text-slate-600">
                          {u.email}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {u.department}
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="text-xs font-semibold px-2 py-1 rounded border border-slate-200 bg-white focus:outline-hidden focus:border-purple-600 font-mono-code"
                          >
                            <option value="Administrator">Administrator</option>
                            <option value="Evaluator">Evaluator</option>
                            <option value="Adjudicator">Adjudicator</option>
                            <option value="Submitter">Submitter</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-6">
              {/* Add New Category */}
              <form onSubmit={handleAddCategory} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="text-xs font-mono-code font-bold uppercase text-slate-700">
                  Register New Strategic Innovation Category
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">Category Name *</label>
                    <input
                      type="text"
                      required
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g. BioTech & Vaccines"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">Mandate Description</label>
                    <input
                      type="text"
                      value={newCategoryDesc}
                      onChange={(e) => setNewCategoryDesc(e.target.value)}
                      placeholder="e.g. Indigenous botanical extraction..."
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Category</span>
                  </button>
                </div>
              </form>

              {/* Existing Categories */}
              <div className="grid grid-cols-2 gap-3">
                {categoriesList.map((cat) => (
                  <div key={cat.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
                    <div className="font-bold text-xs text-slate-900">{cat.categoryName}</div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{cat.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'workflow' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-600">
                Configured 9-stage CEDA innovation lifecycle with automated status checkpoints:
              </div>

              <div className="space-y-2">
                {[
                  { name: '1. Submission', role: 'Submitter', desc: 'Citizen idea ingest, Omang KYC & proposal brief logging.' },
                  { name: '2. Screening', role: 'Compliance Officer', desc: 'BURS tax compliance, CIPA company registry clearance, and basic eligibility.' },
                  { name: '3. Evaluation', role: 'Evaluator', desc: 'Weighted scoring on Innovation, Feasibility, Impact, and Scalability.' },
                  { name: '4. Expert Review', role: 'Technical Committee', desc: 'Specialized engineering, legal IP due diligence, and risk stress tests.' },
                  { name: '5. Adjudication', role: 'Adjudication Board', desc: 'Formal board adjudication (Approve, Defer, Reject, Prioritize).' },
                  { name: '6. Pilot', role: 'Sandbox Director', desc: 'Controlled market pilot, proof-of-concept testing, and test cohort.' },
                  { name: '7. Implementation', role: 'Capital Disbursement', desc: 'Capital disbursement, facility rollout, and operational scaling.' },
                  { name: '8. Impact Measurement', role: 'Socio-Economic Unit', desc: 'Audited citizen employment verification and economic ROI metrics.' },
                  { name: '9. Archive', role: 'Secretariat', desc: 'Permanent statutory record and knowledge depository.' },
                ].map((st, i) => (
                  <div key={i} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-slate-900">{st.name}</strong>
                      <p className="text-[11px] text-slate-500">{st.desc}</p>
                    </div>
                    <span className="font-mono-code text-[10px] bg-slate-100 text-slate-700 px-2 py-1 rounded">
                      Role: {st.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'faqs' && (
            <div className="space-y-5">
              {/* Add FAQ Provision */}
              <form
                onSubmit={handleAddFaq}
                className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs"
              >
                <div className="font-mono-code font-bold uppercase text-slate-700">
                  Add New Submitter FAQ
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">Category *</label>
                    <input
                      type="text"
                      required
                      value={newFaqCategory}
                      onChange={(e) => setNewFaqCategory(e.target.value)}
                      placeholder="e.g. Application Process"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-600 mb-1 font-medium">Question *</label>
                    <input
                      type="text"
                      required
                      value={newFaqQuestion}
                      onChange={(e) => setNewFaqQuestion(e.target.value)}
                      placeholder="e.g. How long does CIPA & BURS statutory screening take?"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Answer *</label>
                  <textarea
                    rows={2}
                    required
                    value={newFaqAnswer}
                    onChange={(e) => setNewFaqAnswer(e.target.value)}
                    placeholder="Provide clear guidance for citizen submitters..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add FAQ</span>
                  </button>
                </div>
              </form>

              {/* Existing FAQs with Edit / Update / Delete */}
              <div className="space-y-2.5">
                {faqItems.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    No FAQs configured yet. Add one above to publish it to Submitters.
                  </div>
                ) : (
                  faqItems.map((faq) => {
                    const isEditing = editingFaqId === faq.id;
                    return (
                      <div
                        key={faq.id}
                        className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2 text-xs"
                      >
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <input
                                type="text"
                                value={editFaqCategory}
                                onChange={(e) => setEditFaqCategory(e.target.value)}
                                className="px-2.5 py-1.5 rounded border border-purple-300"
                                placeholder="Category"
                              />
                              <input
                                type="text"
                                value={editFaqQuestion}
                                onChange={(e) => setEditFaqQuestion(e.target.value)}
                                className="sm:col-span-2 px-2.5 py-1.5 rounded border border-purple-300 font-semibold"
                                placeholder="Question"
                              />
                            </div>
                            <textarea
                              rows={2}
                              value={editFaqAnswer}
                              onChange={(e) => setEditFaqAnswer(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded border border-purple-300"
                              placeholder="Answer"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingFaqId(null)}
                                className="px-2.5 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditFaq(faq.id)}
                                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                              >
                                Save Update
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <span className="inline-block text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                {faq.category}
                              </span>
                              <div className="font-bold text-slate-900">{faq.question}</div>
                              <p className="text-[11.5px] text-slate-600 leading-relaxed">{faq.answer}</p>
                              <div className="text-[10px] text-slate-400 font-mono-code">
                                Updated: {faq.updatedAt}
                                {faq.updatedBy ? ` • ${faq.updatedBy}` : ''}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingFaqId(faq.id);
                                  setEditFaqCategory(faq.category);
                                  setEditFaqQuestion(faq.question);
                                  setEditFaqAnswer(faq.answer);
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                                title="Edit FAQ"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteFaq(faq.id)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                                title="Delete FAQ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="space-y-5">
              {/* Aggregate Feedback Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl">
                  <div className="text-[10px] font-mono-code font-bold uppercase text-sky-700">
                    Total Responses
                  </div>
                  <div className="text-xl font-extrabold font-mono-code text-slate-900 mt-0.5">
                    {feedbackAggregate.total}
                  </div>
                </div>
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                  <div className="text-[10px] font-mono-code font-bold uppercase text-amber-700">
                    Average Rating
                  </div>
                  <div className="text-xl font-extrabold font-mono-code text-amber-700 mt-0.5 flex items-center gap-1">
                    <span>{feedbackAggregate.avgRating || '0.0'}</span>
                    <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                  </div>
                </div>
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <div className="text-[10px] font-mono-code font-bold uppercase text-emerald-700">
                    Satisfaction Rate
                  </div>
                  <div className="text-xl font-extrabold font-mono-code text-emerald-700 mt-0.5">
                    {feedbackAggregate.positivePct}%
                  </div>
                </div>
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
                  <div className="text-[10px] font-mono-code font-bold uppercase text-purple-700">
                    Top Topic
                  </div>
                  <div className="text-xs font-extrabold text-purple-900 mt-1 truncate">
                    {feedbackAggregate.topCategory}
                  </div>
                </div>
              </div>

              {/* Aggregate Rating & Category Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="font-mono-code text-[10px] font-bold uppercase text-slate-500">
                    Star Rating Distribution
                  </div>
                  {feedbackAggregate.byRating.map((row) => (
                    <div key={row.rating} className="flex items-center gap-2">
                      <span className="w-8 font-mono-code font-bold text-slate-700">{row.rating} ★</span>
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${row.pct}%` }}
                          className="h-full bg-amber-400 rounded-full"
                        />
                      </div>
                      <span className="w-12 text-right font-mono-code text-[10.5px] text-slate-600">
                        {row.count} ({row.pct}%)
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="font-mono-code text-[10px] font-bold uppercase text-slate-500">
                    Process & Category Aggregate
                  </div>
                  {feedbackAggregate.byCategory.length === 0 ? (
                    <div className="text-slate-400 text-[11px] italic">No category feedback yet.</div>
                  ) : (
                    feedbackAggregate.byCategory.map((cat) => (
                      <div
                        key={cat.category}
                        className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200"
                      >
                        <span className="font-semibold text-slate-800 truncate">{cat.category}</span>
                        <span className="font-mono-code text-[10.5px] text-slate-600 shrink-0">
                          {cat.count} items • {cat.avg} ★ avg
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Individual Submitter Feedback Stream */}
              <div className="space-y-2">
                <div className="font-mono-code text-[10px] font-bold uppercase text-slate-400">
                  Recent Submitter Feedback Entries ({systemFeedback.length})
                </div>
                {systemFeedback.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    No submitter system or workflow feedback has been received yet.
                  </div>
                ) : (
                  systemFeedback.map((fb) => (
                    <div
                      key={fb.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{fb.submitterName}</span>
                          <span className="px-2 py-0.5 rounded bg-sky-50 text-[#006194] border border-sky-200 text-[10px] font-bold">
                            {fb.category}
                          </span>
                          {fb.stageContext && (
                            <span className="text-[10.5px] text-slate-500">{fb.stageContext}</span>
                          )}
                        </div>
                        <span className="font-mono-code font-bold text-amber-600">
                          {'★'.repeat(fb.rating)}{'☆'.repeat(Math.max(0, 5 - fb.rating))}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{fb.comment}</p>
                      <div className="text-[10px] text-slate-400 font-mono-code">{fb.createdAt}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-900 transition-colors"
          >
            Close Admin Console
          </button>
        </div>
      </div>
    </div>
  );
};
