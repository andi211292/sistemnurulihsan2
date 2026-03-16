"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/utils/api";

interface FeeDefinition {
    id: number;
    nama_iuran: string;
    tipe_periode: string;
    nominal: number;
    kategori_dana: string;
    is_active: boolean;
}

interface Student {
    student_id: number;
    nis: string;
    full_name: string;
    student_class: string;
    dormitory: string;
}

const PERIODE_LABEL: Record<string, string> = {
    BULANAN: "Bulanan", SEMESTER: "Semester", TAHUNAN: "Tahunan", INSIDENTAL: "Insidental"
};

const PERIODE_COLOR: Record<string, string> = {
    BULANAN: "bg-blue-100 text-blue-700",
    SEMESTER: "bg-purple-100 text-purple-700",
    TAHUNAN: "bg-yellow-100 text-yellow-700",
    INSIDENTAL: "bg-gray-100 text-gray-600",
};

export default function ManajemenIuranPage() {
    const router = useRouter();
    const [feeDefs, setFeeDefs] = useState<FeeDefinition[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [studentSearch, setStudentSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<"daftar" | "bayar">("daftar");
    const [toastMsg, setToastMsg] = useState<string | null>(null);

    // Modal state
    const [showFeeModal, setShowFeeModal] = useState(false);
    const [editingFee, setEditingFee] = useState<FeeDefinition | null>(null);
    const [feeForm, setFeeForm] = useState({ nama_iuran: "", tipe_periode: "BULANAN", nominal: "", kategori_dana: "" });

    // Payment form state
    const [payForm, setPayForm] = useState({
        student_id: "",
        student_name: "",
        fee_definition_id: "",
        nominal_dibayar: "",
        tanggal_bayar: new Date().toISOString().split("T")[0],
        status: "LUNAS",
        catatan: "",
        periode_label: ""
    });

    const showToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 3000);
    };

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Use apiFetch so requests go through Next.js proxy (same as other pages)
            const [feeRes, stuRes] = await Promise.all([
                apiFetch("/api/iuran/definitions"),
                apiFetch("/api/students"),
            ]);
            if (feeRes.ok) {
                const feeData = await feeRes.json();
                setFeeDefs(feeData);
            } else {
                console.error("[Iuran] Failed to load fee definitions:", feeRes.status);
            }
            if (stuRes.ok) {
                const stuData = await stuRes.json();
                setStudents(stuData);
                setFilteredStudents(stuData.slice(0, 50)); // Show first 50 by default
            } else {
                console.error("[Iuran] Failed to load students:", stuRes.status);
            }
        } catch (err) {
            console.error("[Iuran] Fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) { router.push("/login"); return; }
        fetchData();
    }, [fetchData, router]);

    // Live search filter
    useEffect(() => {
        if (!studentSearch.trim()) {
            setFilteredStudents(students.slice(0, 50));
        } else {
            const q = studentSearch.toLowerCase();
            setFilteredStudents(
                students.filter(s =>
                    s.full_name.toLowerCase().includes(q) ||
                    s.nis.toLowerCase().includes(q) ||
                    s.student_class.toLowerCase().includes(q)
                ).slice(0, 50)
            );
        }
    }, [studentSearch, students]);

    const openAddFeeModal = () => {
        setEditingFee(null);
        setFeeForm({ nama_iuran: "", tipe_periode: "BULANAN", nominal: "", kategori_dana: "" });
        setShowFeeModal(true);
    };

    const openEditFeeModal = (fee: FeeDefinition) => {
        setEditingFee(fee);
        setFeeForm({ nama_iuran: fee.nama_iuran, tipe_periode: fee.tipe_periode, nominal: String(fee.nominal), kategori_dana: fee.kategori_dana || "" });
        setShowFeeModal(true);
    };

    const handleSaveFee = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const url = editingFee ? `/api/iuran/definitions/${editingFee.id}` : `/api/iuran/definitions`;
            const method = editingFee ? "PUT" : "POST";
            const res = await apiFetch(url, {
                method,
                body: JSON.stringify({ ...feeForm, nominal: parseFloat(feeForm.nominal) })
            });
            if (res.ok) {
                setShowFeeModal(false);
                fetchData();
                showToast(editingFee ? "Iuran berhasil diperbarui!" : "Iuran baru berhasil ditambahkan!");
            } else {
                const err = await res.json();
                alert("Gagal: " + (err.detail || "Error"));
            }
        } finally { setIsSaving(false); }
    };

    const handleToggleActive = async (fee: FeeDefinition) => {
        await apiFetch(`/api/iuran/definitions/${fee.id}`, {
            method: "PUT",
            body: JSON.stringify({ is_active: !fee.is_active })
        });
        fetchData();
        showToast(`Iuran "${fee.nama_iuran}" ${fee.is_active ? "dinonaktifkan" : "diaktifkan"}`);
    };

    const handleSavePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!payForm.student_id) { alert("Pilih santri terlebih dahulu"); return; }
        if (!payForm.fee_definition_id) { alert("Pilih jenis iuran terlebih dahulu"); return; }
        if (!payForm.nominal_dibayar || parseFloat(payForm.nominal_dibayar) <= 0) { alert("Masukkan nominal yang valid"); return; }

        setIsSaving(true);
        try {
            const selectedFee = feeDefs.find(f => f.id === parseInt(payForm.fee_definition_id));
            let periodeLabel = payForm.periode_label;
            if (!periodeLabel && selectedFee) {
                const now = new Date();
                if (selectedFee.tipe_periode === "BULANAN") periodeLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                else if (selectedFee.tipe_periode === "SEMESTER") periodeLabel = `${now.getFullYear()}-S${now.getMonth() < 6 ? 1 : 2}`;
                else periodeLabel = String(now.getFullYear());
            }
            const res = await apiFetch(`/api/iuran/payments`, {
                method: "POST",
                body: JSON.stringify({
                    student_id: parseInt(payForm.student_id),
                    fee_definition_id: parseInt(payForm.fee_definition_id),
                    nominal_dibayar: parseFloat(payForm.nominal_dibayar),
                    tanggal_bayar: payForm.tanggal_bayar,
                    status: payForm.status,
                    catatan: payForm.catatan,
                    periode_label: periodeLabel
                })
            });
            if (res.ok) {
                showToast(`✅ Pembayaran ${payForm.student_name} berhasil dicatat!`);
                setPayForm({ student_id: "", student_name: "", fee_definition_id: "", nominal_dibayar: "", tanggal_bayar: new Date().toISOString().split("T")[0], status: "LUNAS", catatan: "", periode_label: "" });
                setStudentSearch("");
            } else {
                const err = await res.json();
                alert("Gagal: " + (err.detail || "Error"));
            }
        } finally { setIsSaving(false); }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Toast Notification */}
            {toastMsg && (
                <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium animate-bounce">
                    {toastMsg}
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">📋 Manajemen Iuran Santri</h1>
                    <p className="text-gray-500 mt-1">Kelola definisi iuran wajib dan catat pembayaran santri</p>
                </div>
                {activeTab === "daftar" && (
                    <button onClick={openAddFeeModal} className="bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition flex items-center gap-2">
                        <span className="material-icons text-sm">add</span> Tambah Iuran Baru
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                {[{ key: "daftar", label: "📋 Daftar Iuran" }, { key: "bayar", label: "💳 Catat Pembayaran" }].map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key as "daftar" | "bayar")}
                        className={`px-5 py-2.5 rounded-xl font-medium text-sm transition ${activeTab === tab.key ? "bg-emerald-600 text-white shadow" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ---- TAB: DAFTAR IURAN ---- */}
            {activeTab === "daftar" && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {isLoading ? (
                        <div className="p-12 text-center text-gray-400">
                            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            Memuat data iuran...
                        </div>
                    ) : feeDefs.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <span className="material-icons text-5xl text-gray-200 block mb-3">receipt_long</span>
                            Belum ada data iuran. Klik &quot;Tambah Iuran Baru&quot; untuk mulai.
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                                <tr>
                                    <th className="p-4 font-medium">Nama Iuran</th>
                                    <th className="p-4 font-medium">Periode</th>
                                    <th className="p-4 font-medium">Kategori Dana</th>
                                    <th className="p-4 font-medium text-right">Nominal (Rp)</th>
                                    <th className="p-4 font-medium text-center">Status</th>
                                    <th className="p-4 font-medium text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {feeDefs.map(fee => (
                                    <tr key={fee.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                                        <td className="p-4 font-medium text-gray-800">{fee.nama_iuran}</td>
                                        <td className="p-4">
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PERIODE_COLOR[fee.tipe_periode] || "bg-gray-100 text-gray-600"}`}>
                                                {PERIODE_LABEL[fee.tipe_periode] || fee.tipe_periode}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-600">{fee.kategori_dana || "-"}</td>
                                        <td className="p-4 text-right font-bold text-gray-800">
                                            {fee.nominal.toLocaleString("id-ID")}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${fee.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                                                {fee.is_active ? "Aktif" : "Nonaktif"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex gap-2 justify-center">
                                                <button onClick={() => openEditFeeModal(fee)} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">Edit Nominal</button>
                                                <button onClick={() => handleToggleActive(fee)} className={`text-xs px-3 py-1.5 rounded-lg transition ${fee.is_active ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}>
                                                    {fee.is_active ? "Nonaktifkan" : "Aktifkan"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* ---- TAB: CATAT PEMBAYARAN ---- */}
            {activeTab === "bayar" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-5">Form Pencatatan Pembayaran</h2>
                        {isLoading ? (
                            <div className="text-center py-8 text-gray-400">
                                <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                Memuat data santri ({students.length > 0 ? `${students.length} santri` : "..."})
                            </div>
                        ) : (
                        <form onSubmit={handleSavePayment} className="space-y-4">
                            {/* ---- STUDENT SEARCH (instead of broken <select>) ---- */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Santri <span className="text-gray-400 font-normal">({students.length} terdaftar)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="🔍 Ketik nama, NIS, atau kelas santri..."
                                    value={studentSearch}
                                    onChange={e => {
                                        setStudentSearch(e.target.value);
                                        setPayForm(prev => ({ ...prev, student_id: "", student_name: "" }));
                                    }}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                                />
                                {payForm.student_id ? (
                                    <div className="mt-2 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm">
                                        <span className="material-icons text-emerald-600 text-base">check_circle</span>
                                        <span className="font-semibold text-emerald-800">{payForm.student_name}</span>
                                        <button type="button" onClick={() => { setPayForm(prev => ({ ...prev, student_id: "", student_name: "" })); setStudentSearch(""); }}
                                            className="ml-auto text-red-400 hover:text-red-600">
                                            <span className="material-icons text-base">close</span>
                                        </button>
                                    </div>
                                ) : (
                                    studentSearch.length > 0 && (
                                        <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                                            {filteredStudents.length === 0 ? (
                                                <div className="p-3 text-center text-gray-400 text-sm">Tidak ada santri ditemukan</div>
                                            ) : filteredStudents.map(s => (
                                                <button key={s.student_id} type="button"
                                                    onClick={() => {
                                                        setPayForm(prev => ({ ...prev, student_id: String(s.student_id), student_name: s.full_name }));
                                                        setStudentSearch(s.full_name);
                                                    }}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 border-b border-gray-50 text-sm">
                                                    <span className="font-medium text-gray-800">{s.full_name}</span>
                                                    <span className="text-gray-400 ml-2 text-xs">{s.nis} · {s.student_class} · {s.dormitory}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Iuran</label>
                                <select required value={payForm.fee_definition_id} onChange={e => setPayForm({ ...payForm, fee_definition_id: e.target.value })}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                                    <option value="" disabled>-- Pilih Iuran --</option>
                                    {feeDefs.filter(f => f.is_active).map(f => (
                                        <option key={f.id} value={f.id}>{f.nama_iuran} — Rp {f.nominal.toLocaleString("id-ID")}/{PERIODE_LABEL[f.tipe_periode]}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nominal Dibayar (Rp)</label>
                                    <input type="number" required min="1" value={payForm.nominal_dibayar} onChange={e => setPayForm({ ...payForm, nominal_dibayar: e.target.value })}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Bayar</label>
                                    <input type="date" required value={payForm.tanggal_bayar} onChange={e => setPayForm({ ...payForm, tanggal_bayar: e.target.value })}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select value={payForm.status} onChange={e => setPayForm({ ...payForm, status: e.target.value })}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                                        <option value="LUNAS">LUNAS</option>
                                        <option value="DICICIL">DICICIL</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Label Periode (opsional)</label>
                                    <input type="text" placeholder="Contoh: 2026-03 / 2026" value={payForm.periode_label} onChange={e => setPayForm({ ...payForm, periode_label: e.target.value })}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                                <textarea rows={2} value={payForm.catatan} onChange={e => setPayForm({ ...payForm, catatan: e.target.value })}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                            <button type="submit" disabled={isSaving || !payForm.student_id}
                                className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition disabled:opacity-40">
                                {isSaving ? "Menyimpan..." : "Simpan Pembayaran"}
                            </button>
                        </form>
                        )}
                    </div>

                    {/* Info Panel */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-bold text-gray-700 mb-4">💡 Panduan Label Periode</h3>
                        <div className="space-y-3 text-sm text-gray-600">
                            <div className="bg-blue-50 rounded-lg p-3">
                                <p className="font-semibold text-blue-700">Iuran Bulanan</p>
                                <p>Format: <code className="bg-blue-100 px-1 rounded">YYYY-MM</code></p>
                                <p>Contoh: <code className="bg-blue-100 px-1 rounded">2026-03</code> (Maret 2026)</p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-3">
                                <p className="font-semibold text-purple-700">Iuran Semester</p>
                                <p>Format: <code className="bg-purple-100 px-1 rounded">YYYY-S1</code> atau <code className="bg-purple-100 px-1 rounded">YYYY-S2</code></p>
                                <p>Contoh: <code className="bg-purple-100 px-1 rounded">2026-S1</code> (Semester 1)</p>
                            </div>
                            <div className="bg-yellow-50 rounded-lg p-3">
                                <p className="font-semibold text-yellow-700">Iuran Tahunan</p>
                                <p>Format: <code className="bg-yellow-100 px-1 rounded">YYYY</code></p>
                                <p>Contoh: <code className="bg-yellow-100 px-1 rounded">2026</code></p>
                            </div>
                            <p className="text-gray-400 italic text-xs">* Jika kosong, sistem akan otomatis mengisi berdasarkan tanggal hari ini.</p>
                        </div>

                        {/* Stats */}
                        <div className="mt-6 pt-4 border-t border-gray-100">
                            <h4 className="font-semibold text-gray-600 text-sm mb-3">📊 Rangkuman</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-gray-800">{students.length}</p>
                                    <p className="text-xs text-gray-500 mt-1">Total Santri</p>
                                </div>
                                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-emerald-700">{feeDefs.filter(f => f.is_active).length}</p>
                                    <p className="text-xs text-emerald-600 mt-1">Jenis Iuran Aktif</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Tambah/Edit Iuran */}
            {showFeeModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800">{editingFee ? "Edit Iuran" : "Tambah Iuran Baru"}</h3>
                            <button onClick={() => setShowFeeModal(false)} className="text-gray-400 hover:text-gray-700"><span className="material-icons">close</span></button>
                        </div>
                        <form onSubmit={handleSaveFee} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Iuran</label>
                                <input type="text" required value={feeForm.nama_iuran} onChange={e => setFeeForm({ ...feeForm, nama_iuran: e.target.value })}
                                    disabled={!!editingFee} placeholder="Contoh: Makan, PHBI, ..."
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Periode</label>
                                <select value={feeForm.tipe_periode} onChange={e => setFeeForm({ ...feeForm, tipe_periode: e.target.value })}
                                    disabled={!!editingFee}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-60">
                                    <option value="BULANAN">Bulanan</option>
                                    <option value="SEMESTER">Semester</option>
                                    <option value="TAHUNAN">Tahunan</option>
                                    <option value="INSIDENTAL">Insidental</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nominal (Rp)</label>
                                <input type="number" required min="0" value={feeForm.nominal} onChange={e => setFeeForm({ ...feeForm, nominal: e.target.value })}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Dana</label>
                                <input type="text" value={feeForm.kategori_dana} onChange={e => setFeeForm({ ...feeForm, kategori_dana: e.target.value })}
                                    placeholder="Makan / Pembangunan / Kegiatan"
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                            <button type="submit" disabled={isSaving} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition disabled:opacity-50">
                                {isSaving ? "Menyimpan..." : (editingFee ? "Simpan Perubahan" : "Tambah Iuran")}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
