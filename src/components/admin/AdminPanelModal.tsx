import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { 
  X, Users, ShieldCheck, Layers, GitBranch, 
  Plus, Check, RefreshCw, BarChart2, Radio, Activity 
} from 'lucide-react';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'categories' | 'workflow' | 'audit'>('users');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // New Category Form State
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [newCategoryDesc, setNewCategoryDesc] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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
