"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/utils/api";

type RoleType = "SUPER_ADMIN" | "KASIR_SYAHRIYAH_PUTRA" | "KASIR_SYAHRIYAH_PUTRI" | "KASIR_KOP_PUSAT" | "KASIR_KOP_LUAR" | "UNKNOWN";

interface FeeDefinition {
    id: number;
    nama_iuran: string;
    tipe_periode: "BULANAN" | "SEMESTER" | "TAHUNAN" | "INSIDENTAL";
    nominal: number;
    kategori_dana: string | null;
    is_active: boolean;
}

interface Student {
    student_id: number;
    nis: string;
    full_name: string;
    student_class: string;
    dormitory: string;
    gender: string;
    is_active: boolean;
}

interface Tagihan {
    payment_id: number;
    fee_definition: FeeDefinition;
    periode_label: string;
    status: string;
    nominal_tagihan: number;
    nominal_dibayar: number;
    sisa_tagihan: number;
}

const PERIODE_LABEL: Record<string, string> = { BULANAN: "Bulanan", SEMESTER: "Semester", TAHUNAN: "Tahunan", INSIDENTAL: "Insidental" };
const PERIODE_COLOR: Record<string, string> = { BULANAN: "bg-blue-100 text-blue-700", SEMESTER: "bg-purple-100 text-purple-700", TAHUNAN: "bg-orange-100 text-orange-700", INSIDENTAL: "bg-gray-100 text-gray-700" };

export default function ManajemenIuranPage() {
    const router = useRouter();
    const [userRole, setUserRole] = useState<RoleType>("UNKNOWN");
    const [genderFilter, setGenderFilter] = useState<string>("");

    const [activeTab, setActiveTab] = useState<"daftar" | "bayar" | "generate">("daftar");
    const [isLoading, setIsLoading] = useState(true);
    const [toastMsg, setToastMsg] = useState<{ text: string; ok: boolean } | null>(null);

    // Data Master
    const [feeDefs, setFeeDefs] = useState<FeeDefinition[]>([]);
    const [students, setStudents] = useState<Student[]>([]);

    // State Pembayaran
    const [studentSearch, setStudentSearch] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [tagihanList, setTagihanList] = useState<Tagihan[]>([]);
    const [customCart, setCustomCart] = useState<{ fee_id: number, periode: string, nominal: number }[]>([]);
    
    // Checked items (from Tagihan + Custom Cart)
    const [checkedTagihan, setCheckedTagihan] = useState<Set<number>>(new Set());
    const [checkedCustom, setCheckedCustom] = useState<Set<number>>(new Set()); // index base

    const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
    const [payStatus, setPayStatus] = useState("LUNAS");
    const [payNote, setPayNote] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Generate Tab State
    const [genPeriode, setGenPeriode] = useState(new Date().toISOString().slice(0, 7)); // e.g. 2026-03
    const [isGenerating, setIsGenerating] = useState(false);

    // Modal Master State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formFee, setFormFee] = useState<Partial<FeeDefinition>>({});

    const activeFees = feeDefs.filter(f => f.is_active);

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        const role = localStorage.getItem("user_role") as RoleType;
        if (!token) { router.push("/login"); return; }
        setUserRole(role);
        if (role === "KASIR_SYAHRIYAH_PUTRA") setGenderFilter("PUTRA");
        else if (role === "KASIR_SYAHRIYAH_PUTRI") setGenderFilter("PUTRI");
        fetchData();
    }, [router]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [feesRes, studentsRes] = await Promise.all([
                apiFetch("/api/iuran/definitions"),
                apiFetch("/api/students")
            ]);
            if (feesRes.ok) setFeeDefs(await feesRes.json());
            if (studentsRes.ok) {
                const data = await studentsRes.json();
                setStudents(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTagihan = async (studentId: number) => {
        try {
            const res = await apiFetch(`/api/iuran/status/${studentId}`);
            if (res.ok) {
                const data: Tagihan[] = await res.json();
                // Hanya tampilkan yang menunggak atau dicicil
                setTagihanList(data.filter(t => t.status !== "LUNAS"));
            }
        } catch (err) {
            console.error("Gagal load tagihan", err);
        }
    };

    // Saat pilih student, load tagihan
    useEffect(() => {
        if (selectedStudent) {
            fetchTagihan(selectedStudent.student_id);
            setCheckedTagihan(new Set());
            setCheckedCustom(new Set());
            setCustomCart([]);
        } else {
            setTagihanList([]);
        }
    }, [selectedStudent]);

    const showToast = (text: string, ok: boolean = true) => {
        setToastMsg({ text, ok });
        setTimeout(() => setToastMsg(null), 3000);
    };

    // ==== TAB 1: MASTER IURAN ====
    const openAddFeeModal = () => {
        setFormFee({ tipe_periode: "BULANAN", is_active: true });
        setIsModalOpen(true);
    };
    const openEditFeeModal = (f: FeeDefinition) => {
        setFormFee(f);
        setIsModalOpen(true);
    };
    const handleSaveFee = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = formFee.id ? `/api/iuran/definitions/${formFee.id}` : "/api/iuran/definitions";
        const method = formFee.id ? "PUT" : "POST";
        const res = await apiFetch(url, { method, body: JSON.stringify(formFee) });
        if (res.ok) {
            showToast("Berhasil menyimpan Iuran");
            setIsModalOpen(false);
            fetchData();
        } else {
            const err = await res.json();
            showToast(err.detail || "Gagal menyimpan", false);
        }
    };
    const handleToggleActive = async (f: FeeDefinition) => {
        const res = await apiFetch(`/api/iuran/definitions/${f.id}`, { method: "PUT", body: JSON.stringify({ is_active: !f.is_active }) });
        if (res.ok) fetchData();
    };

    // ==== TAB 2: CATAT PEMBAYARAN ====
    const filteredStudents = studentSearch.length >= 2 ? students.filter(s => {
        const matchG = !genderFilter || s.gender?.toUpperCase() === genderFilter;
        const matchS = s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) || 
                       s.nis.includes(studentSearch) || s.student_class?.toLowerCase().includes(studentSearch.toLowerCase());
        return matchG && matchS;
    }).slice(0, 10) : [];

    const handleSavePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent || (checkedTagihan.size === 0 && checkedCustom.size === 0)) return;
        setIsSaving(true);

        const payloads = [];

        // Payload dari Tagihan
        for (const tId of Array.from(checkedTagihan)) {
            const t = tagihanList.find(x => x.payment_id === tId);
            if (t) {
                payloads.push({
                    student_id: selectedStudent.student_id,
                    fee_definition_id: t.fee_definition.id,
                    periode_label: t.periode_label,
                    nominal_dibayar: t.nominal_tagihan, // bayar full
                    tanggal_bayar: payDate,
                    status: payStatus,
                    catatan: payNote
                });
            }
        }

        // Payload dari Custom Cart (Prepayment)
        for (const i of Array.from(checkedCustom)) {
            const c = customCart[i];
            payloads.push({
                student_id: selectedStudent.student_id,
                fee_definition_id: c.fee_id,
                periode_label: c.periode,
                nominal_dibayar: c.nominal, 
                tanggal_bayar: payDate,
                status: payStatus,
                catatan: payNote
            });
        }

        let successCount = 0;
        for (const body of payloads) {
            const res = await apiFetch("/api/iuran/payments", { method: "POST", body: JSON.stringify(body) });
            if (res.ok) successCount++;
        }

        setIsSaving(false);
        showToast(`Berhasil menyimpan ${successCount} pembayaran`);
        
        // Refresh tagihan
        fetchTagihan(selectedStudent.student_id);
        setCheckedTagihan(new Set());
        setCheckedCustom(new Set());
        setCustomCart([]);
        setPayNote("");
    };

    const addCustomToCart = () => {
        const selectFee = document.getElementById("customFee") as HTMLSelectElement;
        const inputPeriode = document.getElementById("customPeriode") as HTMLInputElement;
        if (!selectFee.value || !inputPeriode.value) return showToast("Pilih iuran & periode dulu!", false);
        
        const fee = activeFees.find(f => f.id === parseInt(selectFee.value));
        if (!fee) return;

        // Cegah duplikat dengan tagihan yang sudah ada dari server
        const alreadyInTagihan = tagihanList.some(t => t.fee_definition.id === fee.id && t.periode_label === inputPeriode.value);
        if (alreadyInTagihan) {
            return showToast("Tunggakan untuk periode ini sudah ada di atas!", false);
        }

        const newCartList = [...customCart, { fee_id: fee.id, periode: inputPeriode.value, nominal: fee.nominal }];
        setCustomCart(newCartList);
        
        // Auto check the newly added item
        const newChecked = new Set(checkedCustom);
        newChecked.add(newCartList.length - 1);
        setCheckedCustom(newChecked);
    };

    // Hitung Total
    let totalChecked = 0;
    tagihanList.forEach(t => { if (checkedTagihan.has(t.payment_id)) totalChecked += t.sisa_tagihan; });
    customCart.forEach((c, i) => { if (checkedCustom.has(i)) totalChecked += c.nominal; });

    // ==== TAB 3: GENERATE MASSAL ====
    const handleGenerate = async () => {
        if (!confirm(`Konfirmasi pembuatan tagihan massal untuk periode ${genPeriode}?\nTagihan yang sudah dibuat sebelumnya tidak akan digandakan (aman).`)) return;
        setIsGenerating(true);
        const res = await apiFetch("/api/iuran/generate", {
            method: "POST", body: JSON.stringify({ periode_label: genPeriode })
        });
        setIsGenerating(false);
        if (res.ok) {
            const data = await res.json();
            showToast(data.message);
        } else {
            showToast("Gagal melakukan generate tagihan", false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
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
                        Kelola master iuran, rekap tagihan, & pembayaran
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${genderFilter === "PUTRA" ? "bg-blue-100 text-blue-700" : genderFilter === "PUTRI" ? "bg-pink-100 text-pink-700" : "bg-gray-100 text-gray-600"}`}>
                            {genderFilter === "PUTRA" ? "👨 PUTRA" : genderFilter === "PUTRI" ? "👩 PUTRI" : "ALL"}
                        </span>
                    </p>
                </div>
                {activeTab === "daftar" && (
                    <button onClick={openAddFeeModal} className="bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition flex items-center gap-2 shadow-md">
                        <span className="material-icons text-sm">add</span> Tambah Iuran
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 pb-2">
                {[
                    { key: "bayar", label: "💳 Catat Pembayaran", icon: "point_of_sale" },
                    { key: "generate", label: "⚙️ Buat Tagihan Massal", icon: "autorenew" },
                    { key: "daftar", label: "📋 Master Iuran", icon: "format_list_bulleted" }
                ].map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                        className={`px-5 py-3 rounded-t-xl font-medium text-sm transition flex items-center gap-2 ${activeTab === tab.key ? "bg-emerald-600 text-white shadow" : "bg-transparent text-gray-500 hover:bg-gray-100"}`}>
                        <span className="material-icons text-base">{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            {/* ==== TAB BAYAR (KASIR) ==== */}
            {activeTab === "bayar" && (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-3 space-y-5">
                        {/* STEP 1: SANTRI */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                                Cari Santri
                            </h3>
                            <input type="text" placeholder="🔍 Ketik nama atau NIS..."
                                value={studentSearch}
                                onChange={e => { setStudentSearch(e.target.value); if (selectedStudent) setSelectedStudent(null); }}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm mb-2" />

                            {selectedStudent ? (
                                <div className="flex items-center gap-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg ${selectedStudent.gender === "PUTRI" ? "bg-pink-500" : "bg-blue-500"}`}>
                                        {selectedStudent.full_name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-900 text-lg">{selectedStudent.full_name}</p>
                                        <p className="text-xs text-gray-600 font-medium">{selectedStudent.nis} · Kls {selectedStudent.student_class} · {selectedStudent.dormitory}</p>
                                    </div>
                                    <button type="button" onClick={() => { setSelectedStudent(null); setStudentSearch(""); }} className="p-2 bg-white rounded-full text-gray-400 hover:text-red-500 shadow-sm transition">
                                        <span className="material-icons">close</span>
                                    </button>
                                </div>
                            ) : studentSearch.length >= 2 && (
                                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                                    {filteredStudents.length === 0 ? <div className="p-4 text-center text-gray-400 text-sm">Santri tidak ditemukan</div>
                                    : filteredStudents.map(s => (
                                        <button key={s.student_id} type="button" onClick={() => { setSelectedStudent(s); setStudentSearch(s.full_name); }}
                                            className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b border-gray-50 text-sm flex items-center gap-3 transition">
                                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${s.gender === "PUTRI" ? "bg-pink-400" : "bg-blue-400"}`}>
                                                {s.full_name.charAt(0)}
                                            </span>
                                            <div>
                                                <p className="font-bold text-gray-800">{s.full_name}</p>
                                                <p className="text-xs text-gray-400 font-medium">{s.nis} · Kls {s.student_class}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* STEP 2: TAGIHAN BUKU BESAR */}
                        {selectedStudent && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-fade-in">
                                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">2</span>
                                    Daftar Tagihan & Tunggakan
                                </h3>
                                
                                {tagihanList.length === 0 ? (
                                    <div className="bg-emerald-50 rounded-xl p-8 text-center text-emerald-600 font-medium">
                                        <span className="material-icons text-4xl mb-2 text-emerald-300">verified</span><br/>
                                        Alhamdulillah, tidak ada tunggakan!
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                                            <span className="text-xs font-bold text-gray-500 ml-2">DATA DB: {tagihanList.length} Tagihan Terbuka</span>
                                            <button type="button" onClick={() => {
                                                if (checkedTagihan.size === tagihanList.length) setCheckedTagihan(new Set());
                                                else setCheckedTagihan(new Set(tagihanList.map(t => t.payment_id)));
                                            }} className="text-xs px-3 py-1 bg-white border rounded shadow-sm text-gray-600 hover:bg-gray-100">
                                                {checkedTagihan.size === tagihanList.length ? "Batalkan Semua" : "Centang Semua"}
                                            </button>
                                        </div>

                                        {tagihanList.map(t => {
                                            const chk = checkedTagihan.has(t.payment_id);
                                            return (
                                                <label key={t.payment_id} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition select-none ${chk ? "bg-emerald-50 border-emerald-400 ring-1 ring-emerald-200" : "bg-white border-red-200 hover:bg-gray-50"}`}>
                                                    <input type="checkbox" checked={chk} onChange={() => {
                                                        const s = new Set(checkedTagihan);
                                                        chk ? s.delete(t.payment_id) : s.add(t.payment_id);
                                                        setCheckedTagihan(s);
                                                    }} className="w-5 h-5 accent-emerald-600 rounded" />
                                                    <div className="flex-1">
                                                        <p className="font-bold text-gray-900 text-base">{t.fee_definition.nama_iuran}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded">{t.status.replace("_", " ")}</span>
                                                            <span className="text-xs text-gray-500 font-medium">Periode: {t.periode_label}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-black text-red-600 text-lg">Rp {t.sisa_tagihan.toLocaleString("id-ID")}</span>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* TAMBAH TAGIHAN MANUAL (PREPAYMENT) */}
                                <div className="mt-8 pt-6 border-t border-gray-100">
                                    <h4 className="font-bold text-gray-700 mb-3 text-sm flex items-center gap-2">
                                        <span className="material-icons text-blue-500 text-base">add_circle</span>
                                        Bayar Iuran Dimuka (Prepayment)
                                    </h4>
                                    <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                                        <select id="customFee" className="flex-1 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none cursor-pointer">
                                            <option value="">-- Pilih Iuran --</option>
                                            {activeFees.map(f => <option key={f.id} value={f.id}>{f.nama_iuran} (Rp {f.nominal.toLocaleString("id-ID")})</option>)}
                                        </select>
                                        <input id="customPeriode" type="month" className="w-40 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-center font-medium outline-none cursor-pointer hover:bg-gray-100" />
                                        <button type="button" onClick={addCustomToCart} className="px-4 py-2.5 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 shadow-sm transition whitespace-nowrap">
                                            Buat
                                        </button>
                                    </div>

                                    {/* List Custom Cart */}
                                    {customCart.length > 0 && (
                                        <div className="mt-3 space-y-2">
                                            {customCart.map((c, i) => {
                                                const fee = activeFees.find(f => f.id === c.fee_id);
                                                const chk = checkedCustom.has(i);
                                                return (
                                                    <label key={i} className={`flex justify-between items-center p-3 border rounded-xl cursor-pointer ${chk ? "bg-blue-50 border-blue-400" : "bg-white border-gray-200"}`}>
                                                        <div className="flex items-center gap-3">
                                                            <input type="checkbox" checked={chk} onChange={() => { const s = new Set(checkedCustom); chk ? s.delete(i) : s.add(i); setCheckedCustom(s); }} className="w-4 h-4 accent-blue-600" />
                                                            <div>
                                                                <p className="font-bold text-blue-900 text-sm">{fee?.nama_iuran}</p>
                                                                <p className="text-xs text-blue-600">Periode: {c.periode}</p>
                                                            </div>
                                                        </div>
                                                        <span className="font-bold text-blue-700">Rp {c.nominal.toLocaleString("id-ID")}</span>
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: KASIR SUMMARY */}
                    <div className="lg:col-span-2 space-y-5">
                        <div className="bg-gray-900 text-white rounded-3xl shadow-xl p-4 sm:p-6 sticky top-6 border border-gray-800">
                            <h3 className="font-black text-gray-300 mb-4 sm:mb-6 flex items-center justify-between uppercase tracking-wider text-xs sm:text-sm">
                                <span>Total Diterima Kasir</span>
                                <span className="material-icons text-emerald-400">payments</span>
                            </h3>

                            <div className="text-center bg-gray-800 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 shadow-inner border border-gray-700">
                                <p className="text-xs text-gray-400 mb-1 font-bold tracking-widest">TOTAL TAGIHAN DIPILIH</p>
                                <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-400 tabular-nums tracking-tighter truncate">
                                    {totalChecked.toLocaleString("id-ID")}
                                </p>
                            </div>

                            <form onSubmit={handleSavePayment} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 tracking-wide">TANGGAL BAYAR</label>
                                    <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                                        className="w-full p-3 bg-gray-800 border-none rounded-xl text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 tracking-wide">CATATAN TRANSAKSI (OPSIONAL)</label>
                                    <textarea rows={2} value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="Contoh: Transfer BRI a.n Ibu Budi, dll..."
                                        className="w-full p-3 bg-gray-800 border-none rounded-xl text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none placeholder-gray-500" />
                                </div>
                                <button type="submit" disabled={isSaving || totalChecked === 0}
                                    className="w-full py-4 bg-emerald-500 text-gray-900 rounded-2xl font-black text-lg hover:bg-emerald-400 transition-all disabled:opacity-30 disabled:hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                                    {isSaving ? "MENYIMPAN..." : "PROSES PEMBAYARAN"}
                                </button>
                                {totalChecked === 0 && (
                                    <p className="text-center text-xs text-rose-400 font-medium">Pilih minimal 1 tagihan untuk diproses.</p>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ==== TAB GENERATE MASSAL ==== */}
            {activeTab === "generate" && (
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-icons text-4xl">autorenew</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-800">Robot Pembuat Tagihan</h2>
                            <p className="text-gray-500 mt-2 text-sm max-w-sm mx-auto">Buat tagihan (invoice) otomatis untuk semua santri yang berstatus aktif dalam 1 klik.</p>
                        </div>

                        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-left max-w-sm mx-auto">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Pilih Periode Tagihan</label>
                            <input type="month" value={genPeriode} onChange={e => setGenPeriode(e.target.value)}
                                className="w-full p-4 bg-white border border-gray-200 rounded-xl font-bold text-lg text-gray-800 text-center focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>

                        <div className="bg-yellow-50 text-yellow-800 rounded-xl p-4 text-xs font-medium text-left">
                            <span className="material-icons text-sm align-text-bottom mr-1 text-yellow-600">info</span>
                            Sistem ini dirancang <strong>Idempotent</strong>. Jika ada santri yang sudah bayar dimuka, atau tagihan bulan tersebut sudah dibuat sebelumnya, sistem otomatis akan melewatinya (TIDAK DOUBLE).
                        </div>

                        <button onClick={handleGenerate} disabled={isGenerating}
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 shadow-md transition disabled:opacity-50">
                            {isGenerating ? "MENGHITUNG & MEMBUAT TAGIHAN..." : "BUAT TAGIHAN MASSAL SEKARANG"}
                        </button>
                    </div>
                </div>
            )}

            {/* ==== TAB MASTER DAFTAR IURAN ==== */}
            {activeTab === "daftar" && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {isLoading ? <div className="p-12 text-center text-gray-400 font-medium">Memuat data master...</div>
                        : feeDefs.length === 0 ? <div className="p-12 text-center text-gray-400">Belum ada iuran. Klik Tambah Iuran di pojok kanan atas.</div>
                        : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead className="bg-gray-50 text-xs text-gray-500 font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4 px-6">Nama Iuran</th>
                                        <th className="p-4">Tipe Periode</th>
                                        <th className="p-4">Kategori Dana</th>
                                        <th className="p-4 text-right">Nominal Tagihan</th>
                                        <th className="p-4 text-center">Status</th>
                                        <th className="p-4 text-center">Aksi Lanjutan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {feeDefs.map(fee => (
                                        <tr key={fee.id} className="hover:bg-gray-50/50 transition">
                                            <td className="p-4 px-6 font-bold text-gray-800 text-sm">{fee.nama_iuran}</td>
                                            <td className="p-4"><span className={`text-xs font-black tracking-wide px-3 py-1.5 rounded-full ${PERIODE_COLOR[fee.tipe_periode]}`}>{PERIODE_LABEL[fee.tipe_periode]}</span></td>
                                            <td className="p-4 text-sm font-medium text-gray-500">
                                                {fee.kategori_dana ? <span className="flex items-center gap-1"><span className="material-icons text-xs text-gray-400">account_balance_wallet</span> {fee.kategori_dana}</span> : "-"}
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="font-black text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">Rp {fee.nominal.toLocaleString("id-ID")}</span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${fee.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-500"}`}>
                                                    {fee.is_active ? "🟢 AKTIF" : "🔴 NONAKTIF"}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex gap-2 justify-center">
                                                    <button onClick={() => openEditFeeModal(fee)} className="text-xs font-bold bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition shadow-sm">Edit</button>
                                                    <button onClick={() => handleToggleActive(fee)} className={`text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm border ${fee.is_active ? "bg-white border-red-200 text-red-600 hover:bg-red-50" : "bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}>{fee.is_active ? "Nonaktifkan" : "Aktifkan"}</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Modal Form Iuran */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-800">{formFee.id ? "Edit Master Iuran" : "Buat Iuran Baru"}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition"><span className="material-icons">close</span></button>
                        </div>
                        <form onSubmit={handleSaveFee} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">NAMA IURAN</label>
                                <input required type="text" value={formFee.nama_iuran || ""} onChange={e => setFormFee({...formFee, nama_iuran: e.target.value})} placeholder="Cth: Makan, Pembangunan..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">TIPE PERIODE</label>
                                    <select value={formFee.tipe_periode} onChange={e => setFormFee({...formFee, tipe_periode: e.target.value as any})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium">
                                        <option value="BULANAN">Bulanan</option>
                                        <option value="SEMESTER">Semester</option>
                                        <option value="TAHUNAN">Tahunan</option>
                                        <option value="INSIDENTAL">Sekali Bayar</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1.5">NOMINAL (Rp)</label>
                                    <input required type="number" min="0" value={formFee.nominal || ""} onChange={e => setFormFee({...formFee, nominal: Number(e.target.value)})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-800 focus:ring-2 focus:ring-emerald-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1.5">KATEGORI DANA (Opsional)</label>
                                <input type="text" value={formFee.kategori_dana || ""} onChange={e => setFormFee({...formFee, kategori_dana: e.target.value})} placeholder="Cth: Dana Operasional, Pembangunan" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none font-medium text-sm" />
                            </div>
                            <div className="pt-4 border-t border-gray-100 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition">Batal</button>
                                <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md transition">Simpan Master</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
