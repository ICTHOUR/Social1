import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Shield,
  Edit3,
  Ban,
  Trash2,
  CheckCircle2,
  XCircle,
  Coins,
  Key,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Clock,
  UserCheck,
  Award,
  Eye,
} from 'lucide-react';
import { User } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const AdminCmsUserControl: React.FC = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination states
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);

  // Modals state
  const [editUser, setEditUser] = useState<User | null>(null);
  const [suspendUser, setSuspendUser] = useState<User | null>(null);
  const [suspendDays, setSuspendDays] = useState<number>(7);
  const [suspendReason, setSuspendReason] = useState('');
  const [adjustCoinsUser, setAdjustCoinsUser] = useState<User | null>(null);
  const [coinAmount, setCoinAmount] = useState<number>(100);
  const [coinNote, setCoinNote] = useState('');
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [previewDashboardUser, setPreviewDashboardUser] = useState<User | null>(null);

  // Granular Restrictions State
  const [restrictModalUser, setRestrictModalUser] = useState<User | null>(null);
  const [activeRestrictionsList, setActiveRestrictionsList] = useState<any[]>([]);
  const [restrictionType, setRestrictionType] = useState<string>('posting_restriction');
  const [restrictionReason, setRestrictionReason] = useState('');
  const [restrictionHours, setRestrictionHours] = useState<number>(24);
  const [isPermanentRestriction, setIsPermanentRestriction] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    fullName: '',
    username: '',
    email: '',
    role: 'user',
    badge: '',
    coinsBalance: 0,
    isVerified: false,
  });

  const fetchUsers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (roleFilter) queryParams.set('role', roleFilter);
      if (statusFilter) queryParams.set('status', statusFilter);
      queryParams.set('page', page.toString());
      queryParams.set('limit', limit.toString());

      const res = await fetch(`/api/admin/users?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        if (data.pagination) {
          setTotal(data.pagination.total || 0);
        }
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    } finally {
      setLoading(false);
    }
  };

  // Reset page to 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  // Refetch when filters or page index updates
  useEffect(() => {
    fetchUsers();
  }, [token, page, search, roleFilter, statusFilter]);

  // Fetch active restrictions for a user
  const fetchUserRestrictions = async (userId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/restrictions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveRestrictionsList(data.restrictions || []);
      }
    } catch (e) {
      console.error('Failed to fetch user restrictions:', e);
    }
  };

  const handleOpenRestrictionsModal = (user: User) => {
    setRestrictModalUser(user);
    setRestrictionReason('');
    setRestrictionType('posting_restriction');
    setRestrictionHours(24);
    setIsPermanentRestriction(false);
    fetchUserRestrictions(user.id);
  };

  const handleApplyRestriction = async () => {
    if (!restrictModalUser || !token || !restrictionReason.trim()) return;
    try {
      const res = await fetch(`/api/admin/users/${restrictModalUser.id}/restrict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          restrictionType,
          reason: restrictionReason,
          durationHours: isPermanentRestriction ? 0 : restrictionHours,
          isPermanent: isPermanentRestriction,
        }),
      });
      if (res.ok) {
        setRestrictionReason('');
        fetchUserRestrictions(restrictModalUser.id);
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveRestriction = async (restrictionId: string) => {
    if (!restrictModalUser || !token) return;
    try {
      const res = await fetch(`/api/admin/users/${restrictModalUser.id}/remove-restriction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ restrictionId }),
      });
      if (res.ok) {
        fetchUserRestrictions(restrictModalUser.id);
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleForceLogout = async (userId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/force-logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBanUser = async (userId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: 'Banned via Admin Dashboard' }),
      });
      if (res.ok) fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  const confirmAndBanUser = (targetUser: User) => {
    window.dispatchEvent(
      new CustomEvent('admin-request-confirmation', {
        detail: {
          title: 'ইউজার ব্যান নিশ্চিতকরণ (Confirm Ban)',
          message: `আপনি কি নিশ্চিত যে আপনি @${targetUser.username} অ্যাকাউন্টটি ব্যান করতে চান? এটি সাথে সাথে কার্যকর হবে।`,
          confirmLabel: 'হ্যাঁ, ব্যান করুন',
          cancelLabel: 'বাতিল',
          isDangerous: true,
          onConfirm: () => handleBanUser(targetUser.id),
        },
      })
    );
  };

  const handleRestoreUser = async (userId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  // Open Edit User Modal
  const handleOpenEdit = (user: User) => {
    setEditUser(user);
    setEditForm({
      fullName: user.fullName || '',
      username: user.username || '',
      email: user.email || '',
      role: user.role || 'user',
      badge: user.badge || '',
      coinsBalance: user.coinsBalance || 0,
      isVerified: Boolean(user.isVerified),
    });
  };

  // Submit User Edit
  const handleSaveUserEdit = async () => {
    if (!editUser || !token) return;
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditUser(null);
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const confirmAndSaveUserEdit = () => {
    window.dispatchEvent(
      new CustomEvent('admin-request-confirmation', {
        detail: {
          title: 'ইউজার আপডেট নিশ্চিতকরণ (Save User Profile)',
          message: `আপনি কি নিশ্চিত যে @${editUser?.username} ইউজারের তথ্য এবং ব্যালেন্স পরিবর্তনগুলো সংরক্ষণ করতে চান?`,
          confirmLabel: 'হ্যাঁ, সংরক্ষণ করুন (Save)',
          cancelLabel: 'বাতিল',
          isDangerous: false,
          onConfirm: () => handleSaveUserEdit(),
        },
      })
    );
  };

  // Submit User Suspension
  const handleSuspendUser = async () => {
    if (!suspendUser || !token) return;
    try {
      const res = await fetch(`/api/admin/users/${suspendUser.id}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          days: suspendDays,
          reason: suspendReason || `Suspended by Admin for ${suspendDays} days`,
        }),
      });
      if (res.ok) {
        setSuspendUser(null);
        setSuspendReason('');
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const confirmAndSuspendUser = () => {
    window.dispatchEvent(
      new CustomEvent('admin-request-confirmation', {
        detail: {
          title: 'ইউজার সাসপেনশন নিশ্চিতকরণ (Confirm Suspension)',
          message: `আপনি কি নিশ্চিত যে @${suspendUser?.username} অ্যাকাউন্টটি ${suspendDays} দিনের জন্য সাময়িক স্থগিত করতে চান?`,
          confirmLabel: 'হ্যাঁ, সাসপেন্ড করুন',
          cancelLabel: 'বাতিল',
          isDangerous: true,
          onConfirm: () => handleSuspendUser(),
        },
      })
    );
  };

  // Unsunsspend / Activate
  const handleUnsuspendUser = async (user: User) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/users/${user.id}/unsuspend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Direct Coin Adjustment
  const handleAdjustCoins = async () => {
    if (!adjustCoinsUser || !token) return;
    try {
      const res = await fetch(`/api/admin/users/${adjustCoinsUser.id}/adjust-coins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: coinAmount,
          note: coinNote || 'Admin manual balance adjustment',
        }),
      });
      if (res.ok) {
        setAdjustCoinsUser(null);
        setCoinNote('');
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete User
  const handleDeleteUser = async () => {
    if (!deleteUser || !token) return;
    try {
      const res = await fetch(`/api/admin/users/${deleteUser.id}/delete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDeleteUser(null);
        fetchUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* CMS Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-card p-5 rounded-2xl border border-cyan-500/20 bg-slate-900/40">
        <div>
          <h2 className="text-xl font-display font-extrabold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <span>CMS User Accounts Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Full control panel to edit user profiles, assign verification badges, adjust coin balances, and manage timed suspensions.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Users</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 glass-card p-3 rounded-2xl border border-white/10">
        <div className="relative col-span-1 sm:col-span-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, username, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
        >
          <option value="">All Roles</option>
          <option value="user">Standard Users</option>
          <option value="admin">Admins / System</option>
          <option value="moderator">Moderators</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
        >
          <option value="">All Statuses</option>
          <option value="active">Active Accounts</option>
          <option value="suspended">Suspended Accounts</option>
          <option value="banned">Banned Accounts</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="glass-card rounded-3xl p-5 border border-white/10 overflow-x-auto shadow-2xl">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Loading user database...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No users matching search filters.</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-bold">
                <th className="pb-3 px-3">User Profile</th>
                <th className="pb-3 px-3">Role & Badge</th>
                <th className="pb-3 px-3">Account Status</th>
                <th className="pb-3 px-3">Coin Balance</th>
                <th className="pb-3 px-3 text-right">CMS Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-3 flex items-center gap-3">
                    <div className="relative">
                      <img src={u.avatarUrl} className="w-9 h-9 rounded-full object-cover border border-white/10" alt="" />
                      {u.isVerified && (
                        <div className="absolute -bottom-0.5 -right-0.5 bg-cyan-500 text-slate-950 rounded-full p-0.5" title="Verified User">
                          <CheckCircle2 className="w-3 h-3 fill-cyan-400 text-slate-950" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-white">
                        <span>{u.fullName}</span>
                        {u.role === 'admin' && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-black uppercase border border-purple-500/30">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">@{u.username} • {u.email}</p>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <span className="font-semibold text-cyan-300 capitalize">{u.role}</span>
                    {u.badge && (
                      <p className="text-[10px] text-amber-300 flex items-center gap-1 font-mono">
                        <Award className="w-2.5 h-2.5" />
                        {u.badge}
                      </p>
                    )}
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                        u.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : u.status === 'suspended'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {u.status === 'active' ? <UserCheck className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                      <span className="capitalize">{u.status}</span>
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-mono font-bold text-amber-300 flex items-center gap-1 text-sm">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>{(u.coinsBalance || 0).toLocaleString()}</span>
                    </div>
                  </td>

                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Edit Button */}
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
                        title="Edit User Profile & Role"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Adjust Coins Button */}
                      <button
                        onClick={() => setAdjustCoinsUser(u)}
                        className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all cursor-pointer"
                        title="Grant / Deduct Coins"
                      >
                        <Coins className="w-3.5 h-3.5" />
                      </button>

                      {/* Preview Dashboard Button */}
                      <button
                        onClick={() => setPreviewDashboardUser(u)}
                        className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
                        title="Preview User Dashboard"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Granular Restrictions Button */}
                      <button
                        onClick={() => handleOpenRestrictionsModal(u)}
                        className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-all cursor-pointer"
                        title="Granular User Restrictions & Discipline"
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </button>

                      {/* Force Logout Button */}
                      <button
                        onClick={() => handleForceLogout(u.id)}
                        className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer"
                        title="Force Logout All Sessions"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>

                      {/* Suspend / Unsuspend */}
                      {u.status === 'active' ? (
                        <button
                          onClick={() => setSuspendUser(u)}
                          className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all cursor-pointer"
                          title="Suspend User"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnsuspendUser(u)}
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
                          title="Activate Account"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Ban / Unban */}
                      {u.status !== 'banned' ? (
                        <button
                          onClick={() => confirmAndBanUser(u)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
                          title="Permanent Ban"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestoreUser(u.id)}
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
                          title="Unban / Restore Account"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete Button */}
                      <button
                        onClick={() => setDeleteUser(u)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
                        title="Purge Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination Footer */}
        {total > limit && (
          <div className="flex items-center justify-between mt-4 px-4 py-3 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-inner">
            <div className="text-xs text-slate-400">
              Showing <span className="font-semibold text-white">{Math.min(total, (page - 1) * limit + 1)}</span> to{' '}
              <span className="font-semibold text-white">{Math.min(total, page * limit)}</span> of{' '}
              <span className="font-semibold text-white">{total}</span> users
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all select-none ${
                  page === 1
                    ? 'bg-white/5 border-white/5 text-slate-500 cursor-not-allowed'
                    : 'bg-white/10 hover:bg-white/25 border-white/10 text-white hover:shadow-lg hover:shadow-cyan-500/10 active:scale-95 cursor-pointer'
                }`}
              >
                Previous
              </button>
              <div className="text-xs text-slate-300 bg-slate-950/40 px-3 py-1.5 rounded-xl border border-white/5 font-medium">
                Page {page} of {Math.ceil(total / limit)}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(Math.ceil(total / limit), p + 1))}
                disabled={page >= Math.ceil(total / limit)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all select-none ${
                  page >= Math.ceil(total / limit)
                    ? 'bg-white/5 border-white/5 text-slate-500 cursor-not-allowed'
                    : 'bg-white/10 hover:bg-white/25 border-white/10 text-white hover:shadow-lg hover:shadow-cyan-500/10 active:scale-95 cursor-pointer'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* EDIT USER MODAL */}
      {editUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-3xl border border-cyan-500/30 bg-slate-900/90 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-display font-extrabold text-white text-base flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-400" />
                <span>Edit User Profile</span>
              </h3>
              <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Username</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">System Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Custom Badge Title</label>
                  <input
                    type="text"
                    value={editForm.badge}
                    onChange={(e) => setEditForm({ ...editForm, badge: e.target.value })}
                    placeholder="e.g. VIP Creator"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Coins Balance</label>
                  <input
                    type="number"
                    value={editForm.coinsBalance}
                    onChange={(e) => setEditForm({ ...editForm, coinsBalance: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isVerified"
                  checked={editForm.isVerified}
                  onChange={(e) => setEditForm({ ...editForm, isVerified: e.target.checked })}
                  className="rounded border-white/20 bg-slate-950 text-cyan-500 focus:ring-0"
                />
                <label htmlFor="isVerified" className="text-slate-300 font-bold cursor-pointer flex items-center gap-1">
                  <span>Official Verification Badge</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 inline" />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => setEditUser(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndSaveUserEdit}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-extrabold text-xs cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUSPEND USER MODAL */}
      {suspendUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-3xl border border-amber-500/30 bg-slate-900/90 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-display font-extrabold text-white text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Timed Account Suspension</span>
              </h3>
              <button onClick={() => setSuspendUser(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Select suspension duration for <strong className="text-white">@{suspendUser.username}</strong>:
            </p>

            <div className="grid grid-cols-4 gap-2">
              {[1, 3, 7, 30].map((days) => (
                <button
                  key={days}
                  onClick={() => setSuspendDays(days)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    suspendDays === days
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-lg shadow-amber-500/20'
                      : 'bg-slate-950/80 text-slate-300 border-white/10 hover:border-amber-500/40'
                  }`}
                >
                  {days} Days
                </button>
              ))}
            </div>

            <div className="text-xs space-y-2">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Custom Days</label>
                <input
                  type="number"
                  value={suspendDays}
                  onChange={(e) => setSuspendDays(Number(e.target.value))}
                  min={1}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Suspension Reason</label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g. Terms breach, inappropriate language in comments..."
                  rows={2}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => setSuspendUser(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndSuspendUser}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer shadow-lg shadow-amber-500/20"
              >
                Apply {suspendDays}-Day Suspension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIRECT COIN ADJUSTMENT MODAL */}
      {adjustCoinsUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-3xl border border-amber-500/30 bg-slate-900/90 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-display font-extrabold text-white text-base flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Adjust User Coin Balance</span>
              </h3>
              <button onClick={() => setAdjustCoinsUser(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              Current balance for <strong className="text-white">@{adjustCoinsUser.username}</strong>: {' '}
              <span className="font-mono font-bold text-amber-200">{(adjustCoinsUser.coinsBalance || 0).toLocaleString()} coins</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Coin Delta (+ to grant, - to deduct)</label>
                <input
                  type="number"
                  value={coinAmount}
                  onChange={(e) => setCoinAmount(Number(e.target.value))}
                  placeholder="e.g. 500 or -200"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Audit Note / Reason</label>
                <input
                  type="text"
                  value={coinNote}
                  onChange={(e) => setCoinNote(e.target.value)}
                  placeholder="e.g. Creator reward, Event bonus, Refund adjustment..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => setAdjustCoinsUser(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustCoins}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer shadow-lg shadow-amber-500/20"
              >
                Execute Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE USER MODAL */}
      {deleteUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-3xl border border-rose-500/30 bg-slate-900/90 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-display font-extrabold text-white text-base flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <span>Confirm Account Purge</span>
              </h3>
              <button onClick={() => setDeleteUser(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to purge account <strong className="text-white">@{deleteUser.username}</strong> ({deleteUser.fullName})?
              This will revoke all active sessions and mark the account as soft-deleted in the system audit logs.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => setDeleteUser(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-xs cursor-pointer shadow-lg shadow-rose-500/20"
              >
                Purge Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRANULAR RESTRICTION & DISCIPLINE MODAL */}
      {restrictModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-xl w-full p-6 rounded-3xl border border-purple-500/30 bg-slate-900/95 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-display font-extrabold text-white text-base flex items-center gap-2 text-purple-300">
                  <Shield className="w-5 h-5 text-purple-400" />
                  <span>User Restriction & Moderation Control</span>
                </h3>
                <p className="text-xs text-slate-400">Target user: <strong className="text-white">@{restrictModalUser.username}</strong> ({restrictModalUser.fullName})</p>
              </div>
              <button onClick={() => setRestrictModalUser(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Apply New Restriction Form */}
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-3 text-xs">
              <h4 className="font-bold text-purple-200 uppercase text-[10px] tracking-wider">Issue New Restriction</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Restriction Type</label>
                  <select
                    value={restrictionType}
                    onChange={(e) => setRestrictionType(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-semibold"
                  >
                    <option value="posting_restriction">Posting Restriction (Disable Creating Posts)</option>
                    <option value="commenting_restriction">Commenting Restriction (Disable Comments)</option>
                    <option value="messaging_restriction">Messaging Restriction (Disable DMs & Chat)</option>
                    <option value="gifting_restriction">Gifting Restriction (Disable Sending Gifts)</option>
                    <option value="coin_earning_restriction">Coin Earning Restriction (Disable Coin Rewards)</option>
                    <option value="withdrawal_restriction">Withdrawal Restriction (Disable Cashouts)</option>
                    <option value="complete_account_restriction">Complete Account Restriction (Full Lockdown)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Duration Preset</label>
                  <select
                    disabled={isPermanentRestriction}
                    value={restrictionHours}
                    onChange={(e) => setRestrictionHours(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white font-semibold disabled:opacity-50"
                  >
                    <option value={1}>1 Hour</option>
                    <option value={24}>24 Hours (1 Day)</option>
                    <option value={168}>168 Hours (7 Days)</option>
                    <option value={720}>720 Hours (30 Days)</option>
                    <option value={2160}>2160 Hours (90 Days)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPermanent"
                  checked={isPermanentRestriction}
                  onChange={(e) => setIsPermanentRestriction(e.target.checked)}
                  className="rounded border-white/20 bg-slate-950 text-purple-500 focus:ring-0"
                />
                <label htmlFor="isPermanent" className="text-slate-300 font-bold cursor-pointer">
                  Permanent Restriction (No expiry date)
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Restriction Reason & Policy Citation</label>
                <textarea
                  value={restrictionReason}
                  onChange={(e) => setRestrictionReason(e.target.value)}
                  placeholder="e.g. Repeated spamming in comments or violating community guidelines..."
                  rows={2}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-600"
                />
              </div>

              <button
                onClick={handleApplyRestriction}
                className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-extrabold text-xs cursor-pointer transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                <span>Apply Restriction</span>
              </button>
            </div>

            {/* Active & Historical Restrictions Ledger */}
            <div className="space-y-3">
              <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Restriction History & Active Penalties ({activeRestrictionsList.length})</span>
              </h4>

              {activeRestrictionsList.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950/50 border border-white/5 text-slate-400 text-xs text-center">
                  No active or past restrictions recorded for this user.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {activeRestrictionsList.map((r) => (
                    <div
                      key={r.id}
                      className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
                        r.isActive
                          ? 'bg-purple-950/30 border-purple-500/40'
                          : 'bg-slate-950/40 border-white/5 opacity-60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-purple-300 capitalize">{r.restrictionType.replace(/_/g, ' ')}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${r.isActive ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'}`}>
                            {r.isActive ? 'Active' : 'Lifted'}
                          </span>
                        </div>
                        <p className="text-slate-300 mt-1">{r.reason}</p>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">
                          Applied: {new Date(r.createdAt).toLocaleString()} | Expires: {r.isPermanent ? 'Permanent' : r.expiresAt ? new Date(r.expiresAt).toLocaleString() : 'N/A'}
                        </p>
                      </div>

                      {r.isActive && (
                        <button
                          onClick={() => handleRemoveRestriction(r.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-[10px] shrink-0 cursor-pointer"
                        >
                          Lift Restriction
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                onClick={() => setRestrictModalUser(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW USER DASHBOARD MODAL */}
      {previewDashboardUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card max-w-lg w-full p-6 rounded-3xl border border-cyan-500/40 bg-slate-900/95 shadow-2xl space-y-5 animate-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-3">
                <img
                  src={previewDashboardUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                  alt={previewDashboardUser.fullName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-cyan-400 shadow-md"
                />
                <div>
                  <h3 className="font-display font-extrabold text-white text-base flex items-center gap-2">
                    <span>{previewDashboardUser.fullName}</span>
                    {previewDashboardUser.isVerified && <span className="text-cyan-400 text-xs">✓</span>}
                  </h3>
                  <p className="text-cyan-300 text-xs font-semibold">@{previewDashboardUser.username} • Role: {previewDashboardUser.role}</p>
                </div>
              </div>
              <button onClick={() => setPreviewDashboardUser(null)} className="text-slate-400 hover:text-white cursor-pointer p-1">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/5 space-y-1">
                <div className="text-slate-400 font-medium">Coin Balance</div>
                <div className="text-amber-400 text-base font-black flex items-center gap-1.5">
                  <Coins className="w-4 h-4" />
                  <span>{previewDashboardUser.coinsBalance || 500} NIX</span>
                </div>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/5 space-y-1">
                <div className="text-slate-400 font-medium">Account Status</div>
                <div className="text-emerald-400 text-sm font-bold uppercase tracking-wide">
                  {previewDashboardUser.status || 'Active'}
                </div>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/5 space-y-1">
                <div className="text-slate-400 font-medium">Mobile Phone</div>
                <div className="text-white font-mono text-xs">{previewDashboardUser.phone || 'N/A'}</div>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/5 space-y-1">
                <div className="text-slate-400 font-medium">Email Address</div>
                <div className="text-white font-mono text-xs truncate">{previewDashboardUser.email}</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-500/20 rounded-2xl p-4 space-y-2">
              <h4 className="text-white font-bold text-xs flex items-center gap-1.5">
                <Award className="w-4 h-4 text-cyan-400" />
                <span>Demo User Dashboard Preview Mode</span>
              </h4>
              <p className="text-slate-300 text-xs leading-relaxed">
                You are inspecting <strong className="text-white">{previewDashboardUser.fullName}'s</strong> dashboard metrics, wallet balances, and account telemetry. You can adjust coins, manage role permissions, or view recent activities directly from this panel.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setPreviewDashboardUser(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs cursor-pointer transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
