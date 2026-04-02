"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

// ---- Tipe Data ----
const ROLE_OPTIONS = [
  { value: "SUPER_ADMIN", label: "Super Admin", color: "bg-purple-100 text-purple-700", icon: "shield" },
  { value: "KASIR_SYAHRIYAH_PUTRA", label: "Kasir Iuran Putra", color: "bg-blue-100 text-blue-700", icon: "payments" },
  { value: "KASIR_SYAHRIYAH_PUTRI", label: "Kasir Iuran Putri", color: "bg-pink-100 text-pink-700", icon: "payments" },
  { value: "KASIR_KOP_PUSAT", label: "Kasir Koperasi Pusat", color: "bg-cyan-100 text-cyan-700", icon: "store" },
  { value: "KASIR_KOP_LUAR", label: "Kasir Koperasi Luar", color: "bg-teal-100 text-teal-700", icon: "store" },
  { value: "PENGURUS_SANTRI", label: "Pengurus Santri", color: "bg-green-100 text-green-700", icon: "people" },
  { value: "PENGURUS_SEKOLAH", label: "Pengurus Sekolah", color: "bg-yellow-100 text-yellow-700", icon: "school" },
  { value: "GURU_BP", label: "Guru BP", color: "bg-orange-100 text-orange-700", icon: "psychology" },
  { value: "PENGURUS_KEAMANAN", label: "Pengurus Keamanan", color: "bg-red-100 text-red-700", icon: "security" },
  { value: "USTADZ", label: "Ustadz", color: "bg-emerald-100 text-emerald-700", icon: "menu_book" },
  { value: "WALI", label: "Wali Santri", color: "bg-gray-100 text-gray-700", icon: "family_restroom" },
];

interface User {
  user_id: number;
  username: string;
  role: string;
  email: string | null;
  is_active: boolean;
}

const getRoleConfig = (role: string) =>
  ROLE_OPTIONS.find((r) => r.value === role) || {
    label: role, color: "bg-gray-100 text-gray-700", icon: "person"
  };

// ---- Modal Komponen ----
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
        >
          <span className="material-icons">close</span>
        </button>
        {children}
      </div>
    </div>
  );
}

// ---- Halaman Utama ----
export default function PenggunaPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<User | null>(null);
  const [showResetModal, setShowResetModal] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<User | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form state
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("PENGURUS_SANTRI");
  const [formEmail, setFormEmail] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formNewPassword, setFormNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data);
    } catch {
      showToast("Gagal memuat data pengguna", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filteredUsers = users.filter((u) => {
    const matchSearch = u.username.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "ALL" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  // ---- Handlers ----
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: formUsername, password: formPassword, role: formRole, email: formEmail || null, is_active: formActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Gagal");
      showToast(`Akun '${formUsername}' berhasil dibuat ✅`);
      setShowAddModal(false);
      setFormUsername(""); setFormPassword(""); setFormEmail(""); setFormRole("PENGURUS_SANTRI"); setFormActive(true);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${showEditModal.user_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: formRole, email: formEmail || null, is_active: formActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Gagal");
      showToast(`Akun '${showEditModal.username}' berhasil diperbarui ✅`);
      setShowEditModal(null);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResetModal) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${showResetModal.user_id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: formNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Gagal");
      showToast(`Password '${showResetModal.username}' berhasil direset ✅`);
      setShowResetModal(null);
      setFormNewPassword("");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!showDeleteConfirm) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${showDeleteConfirm.user_id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Gagal");
      showToast(`Akun '${showDeleteConfirm.username}' dihapus ✅`);
      setShowDeleteConfirm(null);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (user: User) => {
    setFormRole(user.role);
    setFormEmail(user.email || "");
    setFormActive(user.is_active);
    setShowEditModal(user);
  };

  const activeCount = users.filter(u => u.is_active).length;
  const inactiveCount = users.filter(u => !u.is_active).length;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col lg:ml-64">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-6 space-y-6">

          {/* Toast Notification */}
          {toastMsg && (
            <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-xl text-white font-medium text-sm transition-all
              ${toastMsg.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>
              {toastMsg.text}
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-11 h-11 bg-indigo-100 rounded-xl flex items-center justify-center">
                <span className="material-icons text-indigo-600">manage_accounts</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{users.length}</p>
                <p className="text-xs text-gray-500">Total Akun</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center">
                <span className="material-icons text-emerald-600">check_circle</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700">{activeCount}</p>
                <p className="text-xs text-gray-500">Akun Aktif</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="w-11 h-11 bg-red-100 rounded-xl flex items-center justify-center">
                <span className="material-icons text-red-500">block</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{inactiveCount}</p>
                <p className="text-xs text-gray-500">Akun Nonaktif</p>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <span className="material-icons absolute left-3 top-2.5 text-gray-400 text-lg">search</span>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cari username..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="ALL">Semua Role</option>
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition shadow-sm"
            >
              <span className="material-icons text-lg">person_add</span>
              Tambah Pengguna
            </button>
          </div>

          {/* User Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-400">
                <span className="material-icons animate-spin text-4xl text-indigo-300 block mb-3">autorenew</span>
                Memuat data...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <span className="material-icons text-5xl text-gray-200 block mb-3">person_off</span>
                Tidak ada akun ditemukan
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pengguna</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredUsers.map((user) => {
                      const rc = getRoleConfig(user.role);
                      return (
                        <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800 text-sm">{user.username}</p>
                                <p className="text-xs text-gray-400">ID #{user.user_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${rc.color}`}>
                              <span className="material-icons text-xs">{rc.icon}</span>
                              {rc.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {user.is_active ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
                                <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span> Nonaktif
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{user.email || "—"}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditModal(user)}
                                title="Edit"
                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              >
                                <span className="material-icons text-[18px]">edit</span>
                              </button>
                              <button
                                onClick={() => { setFormNewPassword(""); setShowResetModal(user); }}
                                title="Reset Password"
                                className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              >
                                <span className="material-icons text-[18px]">lock_reset</span>
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(user)}
                                title="Hapus"
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              >
                                <span className="material-icons text-[18px]">delete_outline</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ---- MODAL: Tambah Pengguna ---- */}
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddUser} className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span className="material-icons text-indigo-600">person_add</span>
              Tambah Akun Pengguna
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
              <input value={formUsername} onChange={e => setFormUsername(e.target.value)} required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="contoh: kasir_putra" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Minimal 6 karakter" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select value={formRole} onChange={e => setFormRole(e.target.value)} required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (opsional)</label>
              <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="email@pesantren.com" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formActive} onChange={e => setFormActive(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
              <span className="text-sm text-gray-700">Akun Aktif</span>
            </label>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowAddModal(false)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Batal
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition">
                {submitting ? "Menyimpan..." : "Simpan Akun"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ---- MODAL: Edit Pengguna ---- */}
      {showEditModal && (
        <Modal onClose={() => setShowEditModal(null)}>
          <form onSubmit={handleEditUser} className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span className="material-icons text-amber-600">edit</span>
              Edit: <span className="text-indigo-600">{showEditModal.username}</span>
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select value={formRole} onChange={e => setFormRole(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (opsional)</label>
              <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formActive} onChange={e => setFormActive(e.target.checked)} className="w-4 h-4 accent-indigo-600" />
              <span className="text-sm text-gray-700">Akun Aktif</span>
            </label>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowEditModal(null)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Batal
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 bg-amber-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-amber-600 disabled:opacity-60 transition">
                {submitting ? "Menyimpan..." : "Perbarui"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ---- MODAL: Reset Password ---- */}
      {showResetModal && (
        <Modal onClose={() => setShowResetModal(null)}>
          <form onSubmit={handleResetPassword} className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span className="material-icons text-amber-500">lock_reset</span>
              Reset Password: <span className="text-indigo-600">{showResetModal.username}</span>
            </h3>
            <p className="text-sm text-gray-500">Masukkan password baru untuk akun ini.</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru *</label>
              <input type="password" value={formNewPassword} onChange={e => setFormNewPassword(e.target.value)} required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="Minimal 6 karakter" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowResetModal(null)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Batal
              </button>
              <button type="submit" disabled={submitting || formNewPassword.length < 6}
                className="flex-1 bg-amber-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition">
                {submitting ? "Mereset..." : "Reset Password"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ---- MODAL: Konfirmasi Hapus ---- */}
      {showDeleteConfirm && (
        <Modal onClose={() => setShowDeleteConfirm(null)}>
          <div className="p-6 space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="material-icons text-3xl text-red-500">person_remove</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800">Hapus Akun?</h3>
              <p className="text-sm text-gray-500 mt-1">
                Akun <strong className="text-red-600">{showDeleteConfirm.username}</strong> akan dihapus permanen.
                Tindakan ini tidak bisa dibatalkan!
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                Batal
              </button>
              <button onClick={handleDeleteUser} disabled={submitting}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition">
                {submitting ? "Menghapus..." : "Ya, Hapus!"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
