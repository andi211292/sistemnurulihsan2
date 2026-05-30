"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { apiFetch } from "@/utils/api";

// Definisikan tipe dan daftar role (sama dengan pengguna page)
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

interface MenuItem {
  key: string;
  name: string;
  icon: string;
}

export default function HakAksesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [selectedRole, setSelectedRole] = useState(ROLE_OPTIONS[1].value); // Default ke Kasir Putra
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [menusRes, permsRes] = await Promise.all([
        apiFetch("/api/permissions/menus"),
        apiFetch("/api/permissions")
      ]);

      if (menusRes.ok && permsRes.ok) {
        setMenus(await menusRes.json());
        setPermissions(await permsRes.json());
      } else {
        throw new Error("Gagal memuat data");
      }
    } catch (err: any) {
      showToast(err.message || "Gagal memuat konfigurasi hak akses", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleAccess = (menuKey: string) => {
    if (selectedRole === "SUPER_ADMIN") return; // Super admin tidak bisa diubah

    setPermissions(prev => {
      const rolePerms = prev[selectedRole] || [];
      const newPerms = rolePerms.includes(menuKey)
        ? rolePerms.filter(k => k !== menuKey)
        : [...rolePerms, menuKey];
      
      return { ...prev, [selectedRole]: newPerms };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Format payload untuk API
      const rolePerms = permissions[selectedRole] || [];
      const payload = {
        role: selectedRole,
        permissions: menus.map(m => ({
          menu_key: m.key,
          is_allowed: rolePerms.includes(m.key)
        }))
      };

      const res = await apiFetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Gagal menyimpan");
      
      showToast(`Hak akses untuk role ini berhasil disimpan ✅`);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const isSuperAdmin = selectedRole === "SUPER_ADMIN";
  const roleConfig = ROLE_OPTIONS.find(r => r.value === selectedRole)!;
  const currentRolePerms = permissions[selectedRole] || [];

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

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Hak Akses Role</h1>
              <p className="text-sm text-gray-500 mt-1">Atur menu yang dapat diakses oleh masing-masing role pengguna.</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar Role Selection */}
            <div className="w-full md:w-64 shrink-0 space-y-2">
              <h2 className="font-semibold text-gray-700 px-3 py-2 text-sm uppercase tracking-wider">Pilih Role</h2>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {ROLE_OPTIONS.map(role => (
                  <button
                    key={role.value}
                    onClick={() => setSelectedRole(role.value)}
                    className={`w-full text-left px-4 py-3 text-sm font-medium border-b border-gray-50 last:border-0 transition-colors flex items-center justify-between
                      ${selectedRole === role.value ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-icons text-[18px] opacity-70">{role.icon}</span>
                      {role.label}
                    </span>
                    {selectedRole === role.value && <span className="material-icons text-indigo-600 text-[18px]">chevron_right</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Permission Configuration */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-gray-400">
                  <span className="material-icons animate-spin text-4xl text-indigo-300 block mb-3">autorenew</span>
                  Memuat data...
                </div>
              ) : (
                <>
                  <div className={`p-6 border-b border-gray-100 flex items-center justify-between ${roleConfig.color.replace('text-', 'bg-').replace('bg-', 'bg-opacity-10 ')}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white shadow-sm`}>
                        <span className={`material-icons text-2xl ${roleConfig.color.split(' ')[1]}`}>{roleConfig.icon}</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-800">{roleConfig.label}</h2>
                        <p className="text-sm text-gray-600">
                          {isSuperAdmin ? "Role ini memiliki akses penuh ke seluruh sistem." : "Konfigurasi akses menu untuk role ini."}
                        </p>
                      </div>
                    </div>
                    {!isSuperAdmin && (
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition shadow-sm flex items-center gap-2 disabled:opacity-60"
                      >
                        <span className="material-icons text-[18px]">save</span>
                        {saving ? "Menyimpan..." : "Simpan Hak Akses"}
                      </button>
                    )}
                  </div>

                  <div className="p-0">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Menu Sistem</th>
                          <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Akses Diizinkan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {menus.map((menu) => {
                          const isAllowed = isSuperAdmin ? true : currentRolePerms.includes(menu.key);
                          
                          return (
                            <tr key={menu.key} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <span className="material-icons text-gray-400">{menu.icon}</span>
                                  <div>
                                    <p className="font-semibold text-gray-800 text-sm">{menu.name}</p>
                                    <p className="text-xs text-gray-400 font-mono mt-0.5">{menu.key}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <label className={`relative inline-flex items-center ${isSuperAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                                  <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={isAllowed}
                                    disabled={isSuperAdmin}
                                    onChange={() => handleToggleAccess(menu.key)}
                                  />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
