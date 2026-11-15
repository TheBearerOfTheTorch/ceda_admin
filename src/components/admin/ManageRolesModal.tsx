import React, { useState } from 'react';
import { 
  X, Shield, UserCheck, Award, 
  Building, CheckCircle2, AlertTriangle, Headphones, Ban, Trash2
} from 'lucide-react';
import { AdminPersonnel, AdminRole } from '../../types/ceda';

interface ManageRolesModalProps {
  user: AdminPersonnel | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateRole: (userId: number, updated: Partial<AdminPersonnel>) => void;
  onSuspendUser?: (user: AdminPersonnel) => Promise<void> | void;
  onDeleteUser?: (user: AdminPersonnel) => Promise<void> | void;
}

export const ManageRolesModal: React.FC<ManageRolesModalProps> = ({
  user,
  isOpen,
  onClose,
  onUpdateRole,
  onSuspendUser,
  onDeleteUser,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [role, setRole] = useState<AdminRole>('Evaluator');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState<'active' | 'busy' | 'away' | 'suspended'>('active');

  // Synchronize state when selected user or modal open status changes
  React.useEffect(() => {
    if (user) {
      setRole(user.role);
      setDepartment(user.department);
      setStatus(user.status);
      setConfirmDelete(false);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateRole(user.id, {
      role,
      department,
      status,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col text-xs">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Manage Access & Role</h3>
              <p className="text-xs text-slate-500">Configure permission tier and panel assignment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User preview */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#006194] text-white font-bold flex items-center justify-center text-xs">
            {user.avatarInitials}
          </div>
          <div>
            <h4 className="font-bold text-slate-900">{user.name}</h4>
            <p className="text-[11px] text-slate-500">{user.email}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Role Authority Level:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setRole('Evaluator')}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  role === 'Evaluator'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <UserCheck className="w-4 h-4 mb-1 text-amber-600" />
                <span className="block font-bold text-[11px]">Evaluator</span>
                <span className="text-[10px] text-slate-500 block">Technical scoring</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('Adjudicator')}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  role === 'Adjudicator'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Award className="w-4 h-4 mb-1 text-emerald-600" />
                <span className="block font-bold text-[11px]">Adjudicator</span>
                <span className="text-[10px] text-slate-500 block">Board quorum</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('Administrator')}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  role === 'Administrator'
                    ? 'border-purple-500 bg-purple-50 text-purple-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Shield className="w-4 h-4 mb-1 text-purple-600" />
                <span className="block font-bold text-[11px]">Admin</span>
                <span className="text-[10px] text-slate-500 block">Full system</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('Agent')}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  role === 'Agent'
                    ? 'border-teal-500 bg-teal-50 text-teal-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Headphones className="w-4 h-4 mb-1 text-teal-600" />
                <span className="block font-bold text-[11px]">Agent</span>
                <span className="text-[10px] text-slate-500 block">Enquiries desk</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Department / Panel:
            </label>
            <input
              type="text"
              required
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-[#006194] focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Active Status:
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-[#006194] focus:bg-white focus:outline-hidden"
            >
              <option value="active">Active & Ingest Ready</option>
              <option value="busy">Busy / High Review Load</option>
              <option value="away">Away / On Leave</option>
              <option value="suspended">Suspended / Inactive</option>
            </select>
          </div>

          {/* Account Suspension & Deletion (Admin Controls) */}
          {(onSuspendUser || onDeleteUser) && (
            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 space-y-2">
              <div className="font-bold text-rose-900 flex items-center gap-1.5 text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Account Access Controls</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {onSuspendUser && (
                  <button
                    type="button"
                    onClick={async () => {
                      await onSuspendUser(user);
                      onClose();
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1.5 border cursor-pointer transition-colors ${
                      user.status === 'away' || user.status === 'suspended'
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{user.status === 'away' || user.status === 'suspended' ? 'Reactivate Account' : 'Suspend Account'}</span>
                  </button>
                )}

                {onDeleteUser && !confirmDelete && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1.5 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Account</span>
                  </button>
                )}

                {onDeleteUser && confirmDelete && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={async () => {
                        await onDeleteUser(user);
                        setConfirmDelete(false);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg font-bold text-[11px] bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                    >
                      Confirm Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1.5 rounded-lg font-semibold text-[11px] text-slate-600 hover:bg-slate-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-[#006194] hover:bg-[#004e75] rounded-lg transition-colors shadow-xs"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
