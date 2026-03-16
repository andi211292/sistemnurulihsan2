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
    gender: string; // PUTRA | PUTRI
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
const GENDER_FROM_ROLE: Record<string, string> = {
    KASIR_SYAHRIYAH_PUTRA: "PUTRA",
    KASIR_SYAHRIYAH_PUTRI: "PUTRI",
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
    const [toastMsg, setToastMsg] = useState<{ text: string; ok: boolean } | null>(null);
    const [userRole, setUserRole] = useState<string>("");
    const [genderFilter, setGenderFilter] = useState<string>(""); // "" = semua

    // Modal state
    const [showFeeModal, setShowFeeModal] = useState(false);
    const [editingFee, setEditingFee] = useState<FeeDefinition | null>(null);
    const [feeForm, setFeeForm] = useState({ nama_iuran: "", tipe_periode: "BULANAN", nominal: "", kategori_dana: "" });

    // Multi-payment form
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [checkedFees, setCheckedFees] = useState<Set<number>>(new Set());
    const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
    const [payStatus, setPayStatus] = useState("LUNAS");
    const [payNote, setPayNote] = useState("");

    const showToast = (text: string, ok = true) => {
        setToastMsg({ text, ok });
        setTimeout(() => setToastMsg(null), 3500);
    };

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [feeRes, stuRes] = await Promise.all([
                apiFetch("/api/iuran/definitions"),
                apiFetch("/api/students"),
            ]);
            if (feeRes.ok) setFeeDefs(await feeRes.json());
            if (stuRes.ok) {
                const all: Student[] = await stuRes.json();
                setStudents(all);
            }
        } catch (e) {
            console.error("fetchData error:", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) { router.push("/login"); return; }
        const role = localStorage.getItem("user_role") || "";
        setUserRole(role);
        const gf = GENDER_FROM_ROLE[role] || "";
        setGenderFilter(gf);
        fetchData();
    }, [fetchData, router]);

    // Filter students by search + gender
    useEffect(() => {
        let pool = students;
        if (genderFilter) pool = students.filter(s => s.gender?.toUpperCase() === genderFilter);
        if (!studentSearch.trim()) {
            setFilteredStudents(pool.slice(0, 60));
        } else {
            const q = studentSearch.toLowerCase();
            setFilteredStudents(
                pool.filter(s =>
                    s.full_name?.toLowerCase().includes(q) ||
                    s.nis?.toLowerCase().includes(q) ||
                    s.student_class?.toLowerCase().includes(q)
                ).slice(0, 60)
            );
        }
    }, [studentSearch, students, genderFilter]);

    const toggleFee = (id: number) => {
        setCheckedFees(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const totalChecked = Array.from(checkedFees).reduce((sum, id) => {
        const fee = feeDefs.find(f => f.id === id);
        return sum + (fee?.nominal || 0);
    }, 0);

    const handleSavePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) { showToast("Pilih santri dulu", false); return; }
        if (checkedFees.size === 0) { showToast("Centang minimal 1 iuran", false); return; }

        setIsSaving(true);
        let successCount = 0;
        let failCount = 0;

        for (const feeId of Array.from(checkedFees)) {
            const fee = feeDefs.find(f => f.id === feeId);
            if (!fee) continue;

            const now = new Date();
            let periodeLabel = "";
            if (fee.tipe_periode === "BULANAN") periodeLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
            else if (fee.tipe_periode === "SEMESTER") periodeLabel = `${now.getFullYear()}-S${now.getMonth() < 6 ? 1 : 2}`;
            else periodeLabel = String(now.getFullYear());

            try {
                const res = await apiFetch("/api/iuran/payments", {
                    method: "POST",
                    body: JSON.stringify({
                        student_id: selectedStudent.student_id,
                        fee_definition_id: feeId,
                        nominal_dibayar: fee.nominal,
                        tanggal_bayar: payDate,
                        status: payStatus,
                        catatan: payNote,
                        periode_label: periodeLabel,
                    })
                });
                if (res.ok) successCount++;
                else failCount++;
            } catch { failCount++; }
        }

        setIsSaving(false);
        if (successCount > 0) {
            showToast(`✅ ${successCount} iuran berhasil dicatat untuk ${selectedStudent.full_name}!`);
            setCheckedFees(new Set());
            setPayNote("");
            setSelectedStudent(null);
            setStudentSearch("");
        }
        if (failCount > 0) showToast(`⚠️ ${failCount} iuran gagal disimpan`, false);
    };

    // ---- Fee Modal Handlers ----
    const openAddFeeModal = () => { setEditingFee(null); setFeeForm({ nama_iuran: "", tipe_periode: "BULANAN", nominal: "", kategori_dana: "" }); setShowFeeModal(true); };
    const openEditFeeModal = (fee: FeeDefinition) => { setEditingFee(fee); setFeeForm({ nama_iuran: fee.nama_iuran, tipe_periode: fee.tipe_periode, nominal: String(fee.nominal), kategori_dana: fee.kategori_dana || "" }); setShowFeeModal(true); };

    const handleSaveFee = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const url = editingFee ? `/api/iuran/definitions/${editingFee.id}` : `/api/iuran/definitions`;
            const res = await apiFetch(url, { method: editingFee ? "PUT" : "POST", body: JSON.stringify({ ...feeForm, nominal: parseFloat(feeForm.nominal) }) });
            if (res.ok) { setShowFeeModal(false); fetchData(); showToast(editingFee ? "Iuran diperbarui!" : "Iuran baru ditambahkan!"); }
            else { const err = await res.json(); alert("Gagal: " + (err.detail || "Error")); }
        } finally { setIsSaving(false); }
    };

    const handleToggleActive = async (fee: FeeDefinition) => {
        await apiFetch(`/api/iuran/definitions/${fee.id}`, { method: "PUT", body: JSON.stringify({ is_active: !fee.is_active }) });
        fetchData();
        showToast(`Iuran "${fee.nama_iuran}" ${fee.is_active ? "dinonaktifkan" : "diaktifkan"}`);
    };

    const activeFees = feeDefs.filter(f => f.is_active);
    const genderBadge = genderFilter === "PUTRA" ? "🙋‍♂️ Putra" : genderFilter === "PUTRI" ? "🙋‍♀️ Putri" : "👥 Semua";

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Toast */}
            {toastMsg && (
                <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-medium transition-all ${toastMsg.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
                    {toastMsg.text}
                </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">📋 Manajemen Iuran Santri</h1>
                    <p className="text-gray-500 mt-1 flex items-center gap-2">
                        Kelola iuran wajib & catat pembayaran
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${genderFilter === "PUTRA" ? "bg-blue-100 text-blue-700" : genderFilter === "PUTRI" ? "bg-pink-100 text-pink-700" : "bg-gray-100 text-gray-600"}`}>
                            {genderBadge}
                        </span>
                    </p>
                </div>
                {activeTab === "daftar" && (
                    <button onClick={openAddFeeModal} className="bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition flex items-center gap-2">
                        <span className="material-icons text-sm">add</span> Tambah Iuran
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
                    {isLoading ? <div className="p-12 text-center text-gray-400">Memuat data...</div>
                        : feeDefs.length === 0 ? <div className="p-12 text-center text-gray-400">Belum ada iuran. Klik Tambah Iuran untuk mulai.</div>
                        : (
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                                <tr>
                                    <th className="p-4">Nama Iuran</th>
                                    <th className="p-4">Periode</th>
                                    <th className="p-4">Kategori Dana</th>
                                    <th className="p-4 text-right">Nominal (Rp)</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {feeDefs.map(fee => (
                                    <tr key={fee.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                                        <td className="p-4 font-medium text-gray-800">{fee.nama_iuran}</td>
                                        <td className="p-4"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PERIODE_COLOR[fee.tipe_periode]}`}>{PERIODE_LABEL[fee.tipe_periode]}</span></td>
                                        <td className="p-4 text-gray-600">{fee.kategori_dana || "-"}</td>
                                        <td className="p-4 text-right font-bold text-gray-800">{fee.nominal.toLocaleString("id-ID")}</td>
                                        <td className="p-4 text-center">
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${fee.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>{fee.is_active ? "Aktif" : "Nonaktif"}</span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex gap-2 justify-center">
                                                <button onClick={() => openEditFeeModal(fee)} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">Edit</button>
                                                <button onClick={() => handleToggleActive(fee)} className={`text-xs px-3 py-1.5 rounded-lg transition ${fee.is_active ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}>{fee.is_active ? "Nonaktifkan" : "Aktifkan"}</button>
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
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* LEFT: Student + Checklist */}
                    <div className="lg:col-span-3 space-y-5">

                        {/* Step 1: Pilih Santri */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                                Pilih Santri <span className="text-xs text-gray-400 font-normal ml-1">({students.filter(s => !genderFilter || s.gender?.toUpperCase() === genderFilter).length} santri {genderBadge})</span>
                            </h3>
                            {/* Search */}
                            <input type="text" placeholder="🔍 Ketik nama, NIS, atau kelas..."
                                value={studentSearch}
                                onChange={e => { setStudentSearch(e.target.value); if (selectedStudent) setSelectedStudent(null); }}
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm mb-2" />

                            {selectedStudent ? (
                                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${selectedStudent.gender === "PUTRI" ? "bg-pink-500" : "bg-blue-500"}`}>
                                        {selectedStudent.full_name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-800">{selectedStudent.full_name}</p>
                                        <p className="text-xs text-gray-500">{selectedStudent.nis} · {selectedStudent.student_class} · {selectedStudent.dormitory}</p>
                                    </div>
                                    <button type="button" onClick={() => { setSelectedStudent(null); setStudentSearch(""); setCheckedFees(new Set()); }} className="text-gray-400 hover:text-red-500 transition">
                                        <span className="material-icons text-base">close</span>
                                    </button>
                                </div>
                            ) : studentSearch.length > 0 && (
                                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                                    {filteredStudents.length === 0
                                        ? <div className="p-4 text-center text-gray-400 text-sm">Santri tidak ditemukan</div>
                                        : filteredStudents.map(s => (
                                            <button key={s.student_id} type="button"
                                                onClick={() => { setSelectedStudent(s); setStudentSearch(s.full_name); }}
                                                className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b border-gray-50 text-sm flex items-center gap-3">
                                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${s.gender === "PUTRI" ? "bg-pink-400" : "bg-blue-400"}`}>
                                                    {s.full_name.charAt(0)}
                                                </span>
                                                <div>
                                                    <p className="font-medium text-gray-800">{s.full_name}</p>
                                                    <p className="text-xs text-gray-400">{s.nis} · {s.student_class} · {s.dormitory}</p>
                                                </div>
                                            </button>
                                        ))
                                    }
                                </div>
                            )}
                        </div>

                        {/* Step 2: Centang Iuran */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                                Pilih Iuran yang Dibayar <span className="text-xs text-gray-400 font-normal">(bisa lebih dari 1)</span>
                            </h3>
                            {isLoading ? <div className="text-gray-400 text-sm text-center py-4">Memuat iuran...</div>
                            : activeFees.length === 0 ? <div className="text-gray-400 text-sm text-center py-4">Belum ada iuran aktif</div>
                            : (
                                <div className="space-y-2">
                                    {/* Select all */}
                                    <button type="button"
                                        onClick={() => checkedFees.size === activeFees.length ? setCheckedFees(new Set()) : setCheckedFees(new Set(activeFees.map(f => f.id)))}
                                        className="text-xs text-emerald-600 hover:underline mb-1">
                                        {checkedFees.size === activeFees.length ? "Batalkan semua" : "Pilih semua"}
                                    </button>
                                    {activeFees.map(fee => {
                                        const checked = checkedFees.has(fee.id);
                                        return (
                                            <label key={fee.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition select-none ${checked ? "bg-emerald-50 border-emerald-300" : "bg-gray-50 border-gray-200 hover:bg-gray-100"}`}>
                                                <input type="checkbox" checked={checked} onChange={() => toggleFee(fee.id)} className="w-4 h-4 accent-emerald-600 rounded" />
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-800 text-sm">{fee.nama_iuran}</p>
                                                    <p className="text-xs text-gray-500">{PERIODE_LABEL[fee.tipe_periode]} {fee.kategori_dana ? `· Dana ${fee.kategori_dana}` : ""}</p>
                                                </div>
                                                <span className="font-bold text-gray-700 text-sm">Rp {fee.nominal.toLocaleString("id-ID")}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Summary & Confirm */}
                    <div className="lg:col-span-2 space-y-5">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sticky top-6">
                            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                                Konfirmasi & Simpan
                            </h3>

                            {/* Preview */}
                            {selectedStudent && checkedFees.size > 0 ? (
                                <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ringkasan Pembayaran</p>
                                    <p className="font-bold text-gray-800">{selectedStudent.full_name}</p>
                                    <div className="space-y-1">
                                        {Array.from(checkedFees).map(id => {
                                            const fee = feeDefs.find(f => f.id === id)!;
                                            return (
                                                <div key={id} className="flex justify-between text-sm">
                                                    <span className="text-gray-600">{fee.nama_iuran}</span>
                                                    <span className="font-semibold text-gray-800">Rp {fee.nominal.toLocaleString("id-ID")}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-emerald-700">
                                        <span>Total</span>
                                        <span>Rp {totalChecked.toLocaleString("id-ID")}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 rounded-xl p-4 mb-4 text-center text-gray-400 text-sm">
                                    <span className="material-icons text-3xl text-gray-200 block mb-1">receipt_long</span>
                                    Pilih santri & centang iuran dulu
                                </div>
                            )}

                            <form onSubmit={handleSavePayment} className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Tanggal Bayar</label>
                                    <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                                    <select value={payStatus} onChange={e => setPayStatus(e.target.value)}
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none">
                                        <option value="LUNAS">✅ LUNAS</option>
                                        <option value="DICICIL">🟡 DICICIL</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Catatan (opsional)</label>
                                    <textarea rows={2} value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Contoh: Bayar tunai lewat bendahara"
                                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
                                </div>
                                <button type="submit" disabled={isSaving || !selectedStudent || checkedFees.size === 0}
                                    className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition disabled:opacity-40 flex items-center justify-center gap-2">
                                    {isSaving ? (
                                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Menyimpan...</>
                                    ) : (
                                        <><span className="material-icons text-base">save</span> Simpan {checkedFees.size > 0 ? `${checkedFees.size} Iuran` : ""}</>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Gender filter override for SUPER_ADMIN */}
                        {userRole === "SUPER_ADMIN" && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                                <p className="text-xs font-semibold text-gray-500 mb-2">Filter Santri</p>
                                <div className="flex gap-2">
                                    {["", "PUTRA", "PUTRI"].map(g => (
                                        <button key={g} onClick={() => setGenderFilter(g)}
                                            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${genderFilter === g ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                                            {g === "" ? "👥 Semua" : g === "PUTRA" ? "🙋‍♂️ Putra" : "🙋‍♀️ Putri"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
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
