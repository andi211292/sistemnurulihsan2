"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { apiFetch } from "@/utils/api";

interface StudentInfo {
    student_id: number;
    nis: string;
    rfid_uid?: string;
    full_name: string;
    student_class: string;
    dormitory: string;
    gender: "PUTRA" | "PUTRI";
}

interface FinancialProfile {
    student: StudentInfo;
}

interface PaymentTransaction {
    id: number;
    amount_paid: number;
    payment_date: string;
}

interface Billing {
    id: number;
    month: string;
    year: string;
    total_amount: number;
    details: string;
    status: string;
    transactions: PaymentTransaction[];
}

interface BillingWithStudent extends Billing {
    student: StudentInfo;
}

type TabType = "KASIR" | "REKAP" | "BAYAR_LANGSUNG";

export default function SyahriyahPage() {
    const [activeTab, setActiveTab] = useState<TabType>("KASIR");
    const [activeGender, setActiveGender] = useState<"PUTRA" | "PUTRI">("PUTRA");
    const [userRole, setUserRole] = useState("SUPER_ADMIN");

    // Kasir States
    const [rfidInput, setRfidInput] = useState("");
    const [profile, setProfile] = useState<FinancialProfile | null>(null);
    const [billings, setBillings] = useState<Billing[]>([]);

    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Installment states
    const [installmentAmounts, setInstallmentAmounts] = useState<{ [key: number]: string }>({});

    // Create Billing Modal States
    const [showBillingModal, setShowBillingModal] = useState(false);
    const [showBulkBillingModal, setShowBulkBillingModal] = useState(false);
    const [newBillingMonth, setNewBillingMonth] = useState("Januari");
    const [newBillingYear, setNewBillingYear] = useState(new Date().getFullYear().toString());
    const [newBillingDetails, setNewBillingDetails] = useState("");
    const [newBillingTotalAmount, setNewBillingTotalAmount] = useState("");

    // Search Autocomplete States
    const [studentsList, setStudentsList] = useState<StudentInfo[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);

    // Rekap States
    const [rekapMonth, setRekapMonth] = useState("Semua");
    const [rekapYear, setRekapYear] = useState(new Date().getFullYear().toString());
    const [rekapStatusFilter, setRekapStatusFilter] = useState("Semua");
    const [rekapData, setRekapData] = useState<BillingWithStudent[]>([]);
    const [rekapLoading, setRekapLoading] = useState(false);

    // Bayar Langsung States
    const BIAYA_DEFAULT = 300000;
    const [blStudentId, setBlStudentId] = useState<number | null>(null);
    const [blStudentName, setBlStudentName] = useState("");
    const [blSearchQuery, setBlSearchQuery] = useState("");
    const [blShowDropdown, setBlShowDropdown] = useState(false);
    const [blBulan, setBlBulan] = useState("Maret");
    const [blTahun, setBlTahun] = useState(new Date().getFullYear().toString());
    const [blNominal, setBlNominal] = useState(BIAYA_DEFAULT.toString());
    const [blLoading, setBlLoading] = useState(false);
    const [blSuccess, setBlSuccess] = useState<string | null>(null);
    const [blError, setBlError] = useState<string | null>(null);
    const blSearchRef = useRef<HTMLDivElement>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const searchWrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Fetch all students for the autocomplete
        const fetchStudents = async () => {
            try {
                const res = await apiFetch(`/api/students/`);
                if (res.ok) setStudentsList(await res.json());
            } catch (err) {
                console.error("Gagal mengambil daftar santri");
            }
        };
        fetchStudents();
    }, []);

    useEffect(() => {
        if (inputRef.current && activeTab === "KASIR" && !profile) {
            inputRef.current.focus();
        }

        // Fetch role and lock gender
        const savedRole = localStorage.getItem("user_role");
        if (savedRole) {
            setUserRole(savedRole);
            if (savedRole === "KASIR_SYAHRIYAH_PUTRA") {
                setActiveGender("PUTRA");
            } else if (savedRole === "KASIR_SYAHRIYAH_PUTRI") {
                setActiveGender("PUTRI");
            }
        }
    }, [profile, successMsg, error, activeTab]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Close bayar-langsung dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (blSearchRef.current && !blSearchRef.current.contains(e.target as Node)) {
                setBlShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleBayarLangsung = async () => {
        if (!blStudentId) {
            setBlError("Pilih santri terlebih dahulu.");
            return;
        }
        setBlLoading(true);
        setBlError(null);
        setBlSuccess(null);
        try {
            const res = await apiFetch(`/api/keuangan/syahriyah/bayar-langsung`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    student_id: blStudentId,
                    bulan: blBulan,
                    tahun: blTahun,
                    nominal: parseInt(blNominal) || BIAYA_DEFAULT,
                    catatan: "Bayar tunai"
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Gagal memproses pembayaran");
            setBlSuccess(data.message);
            setBlStudentId(null);
            setBlStudentName("");
            setBlSearchQuery("");
        } catch (err: any) {
            setBlError(err.message);
        } finally {
            setBlLoading(false);
        }
    };

    const loadRekapData = async () => {
        setRekapLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (rekapMonth && rekapMonth !== "Semua") params.append("month", rekapMonth);
            if (rekapYear && rekapYear !== "Semua") params.append("year", rekapYear);

            const res = await apiFetch(`/api/keuangan/tagihan/rekap?${params.toString()}`);
            if (!res.ok) throw new Error("Gagal mengambil data rekap");
            const data = await res.json();
            setRekapData(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setRekapLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === "REKAP") {
            loadRekapData();
        }
    }, [activeTab, rekapMonth, rekapYear]);

    // Reset current actions when gender changes
    useEffect(() => {
        setProfile(null);
        setRfidInput("");
        setSearchQuery("");
        setBillings([]);
        // Optional: refresh rekap
    }, [activeGender]);

    const loadData = async (uid: string) => {
        if (!uid || !uid.trim()) return;
        setLoading(true);
        setError(null);
        setSuccessMsg(null);
        setProfile(null);
        setBillings([]);

        try {
            // Fetch profile
            const profileRes = await apiFetch(`/api/keuangan/profil/${uid}`);
            if (!profileRes.ok) {
                if (profileRes.status === 404) throw new Error("Santri dengan kartu RFID ini tidak terdaftar");
                throw new Error("Gagal mengambil data santri");
            }
            const profileData = await profileRes.json();
            setProfile(profileData);

            // Fetch billings
            const billingsRes = await apiFetch(`/api/keuangan/tagihan/${uid}`);
            if (billingsRes.ok) {
                const billingsData = await billingsRes.json();
                setBillings(billingsData);
            } else {
                throw new Error("Akses ditolak atau Tagihan tidak ditemukan");
            }
        } catch (err: any) {
            setError(err.message);
            setTimeout(() => {
                setError(null);
                setRfidInput("");
            }, 3000);
        } finally {
            setLoading(false);
        }
    };

    const handleScan = async (e: FormEvent) => {
        e.preventDefault();
        if (!rfidInput.trim()) return;
        await loadData(rfidInput.trim());
    };

    const handleSelectStudent = async (student: StudentInfo) => {
        setSearchQuery(student.full_name);
        setShowDropdown(false);
        // Backend `get_student_by_rfid` now supports NIS fallback
        await loadData(student.nis || student.student_id.toString());
    };

    const handleCreateBilling = async (e: FormEvent) => {
        e.preventDefault();
        if (!profile || !newBillingMonth || !newBillingYear || !newBillingTotalAmount) return;

        setActionLoading(true);
        setError(null);

        try {
            const payload = {
                student_id: profile.student.student_id,
                month: newBillingMonth,
                year: newBillingYear,
                details: newBillingDetails,
                total_amount: parseFloat(newBillingTotalAmount)
            };

            const res = await apiFetch(`/api/keuangan/tagihan`, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "Gagal membuat tagihan baru");
            }

            setSuccessMsg("Tagihan baru berhasil dibuat!");

            // Reset modal form
            setNewBillingDetails("");
            setNewBillingTotalAmount("");
            setShowBillingModal(false);

            await loadData(rfidInput.trim());
            setTimeout(() => setSuccessMsg(null), 3000);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleCreateBulkBilling = async (e: FormEvent) => {
        e.preventDefault();
        if (!newBillingMonth || !newBillingYear || !newBillingTotalAmount) return;

        setActionLoading(true);
        setError(null);

        try {
            const payload = {
                gender: activeGender,
                month: newBillingMonth,
                year: newBillingYear,
                details: newBillingDetails,
                total_amount: parseFloat(newBillingTotalAmount)
            };

            const res = await apiFetch(`/api/keuangan/tagihan/bulk`, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "Gagal membuat tagihan massal");
            }

            const result = await res.json();
            setSuccessMsg(`Tagihan massal ${activeGender} berhasil dibuat! (${result.created} dibuat, ${result.skipped} dilewati karena sudah ada)`);

            // Reset modal form
            setNewBillingDetails("");
            setNewBillingTotalAmount("");
            setShowBulkBillingModal(false);

            if (activeTab === "REKAP") loadRekapData();
            setTimeout(() => setSuccessMsg(null), 5000);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handlePayInstallment = async (billingId: number) => {
        const amtStr = installmentAmounts[billingId];
        if (!amtStr) {
            setError("Masukkan nominal cicilan/pembayaran");
            setTimeout(() => setError(null), 3000);
            return;
        }

        setActionLoading(true);
        setError(null);

        try {
            const payload = {
                billing_id: billingId,
                amount_paid: parseFloat(amtStr),
                notes: "Cicilan via Kasir (Tarik Tunai / Transfer langsung)"
            };

            const res = await apiFetch(`/api/keuangan/tagihan/bayar`, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "Gagal mencatat pembayaran cicilan");
            }

            setSuccessMsg(`Berhasil mencatat pembayaran tagihan!`);
            // Reset input for this specific billing
            setInstallmentAmounts({ ...installmentAmounts, [billingId]: "" });

            await loadData(rfidInput.trim());

            setTimeout(() => setSuccessMsg(null), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleInstallmentChange = (billingId: number, value: string) => {
        setInstallmentAmounts({
            ...installmentAmounts,
            [billingId]: value
        });
    };

    const formatRupiah = (number: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0
        }).format(number);
    };

    const handleExportCSV = () => {
        if (filteredRekap.length === 0) {
            setError("Tidak ada data untuk diexport");
            setTimeout(() => setError(null), 3000);
            return;
        }

        // CSV Header
        const headers = ["Nama Santri", "Kelas", "NIS", "Periode", "Total Tagihan", "Terbayar", "Sisa Tunggakan", "Status"];

        // CSV Rows
        const rows = filteredRekap.map(b => {
            const paid = b.transactions ? b.transactions.reduce((acc, t) => acc + t.amount_paid, 0) : 0;
            const sisa = b.total_amount - paid;
            return [
                `"${b.student.full_name}"`,
                `"${b.student.student_class}"`,
                `"${b.student.nis}"`,
                `"${b.month} ${b.year}"`,
                b.total_amount,
                paid,
                Math.max(0, sisa),
                `"${b.status}"`
            ].join(";");
        });

        const csvContent = [headers.join(";"), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Rekap_Tagihan_${rekapMonth}_${rekapYear}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredRekap = rekapData.filter(b =>
        (rekapStatusFilter === "Semua" || b.status === rekapStatusFilter) &&
        b.student.gender === activeGender
    );
    const totalTagihanDiterbitkan = filteredRekap.reduce((acc, curr) => acc + curr.total_amount, 0);
    const totalTerbayar = filteredRekap.reduce((acc, curr) => {
        const paid = curr.transactions ? curr.transactions.reduce((sum, t) => sum + t.amount_paid, 0) : 0;
        return acc + paid;
    }, 0);
    const totalSisaTunggakan = totalTagihanDiterbitkan - totalTerbayar;

    const filteredStudents = studentsList.filter(s =>
        s.gender === activeGender &&
        (s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.nis.toLowerCase().includes(searchQuery.toLowerCase()))
    ).slice(0, 10); // Limit to 10 results at a time

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tagihan Syahriyah</h1>
                    <p className="text-gray-500 mt-1">Sistem administrasi tagihan bulanan dan cicilan pembayaran</p>
                </div>
                {activeTab === "KASIR" && profile && (
                    <button
                        onClick={() => { setProfile(null); setRfidInput(""); setSearchQuery(""); }}
                        className="text-sm text-gray-500 hover:text-red-500 font-medium transition-colors border border-gray-200 px-4 py-2 rounded-full"
                    >
                        Tutup & Ganti Santri
                    </button>
                )}
            </div>

            {/* Gender Switch Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-2xl w-full max-w-sm mx-auto shadow-inner mb-6">
                <button
                    onClick={() => setActiveGender("PUTRA")}
                    disabled={userRole === "KASIR_SYAHRIYAH_PUTRI"}
                    className={`flex-1 py-3 px-6 text-center rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${activeGender === "PUTRA" ? "bg-white text-sky-600 shadow-md ring-1 ring-black/5" : "text-gray-500 hover:text-gray-700"} disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={userRole === "KASIR_SYAHRIYAH_PUTRI" ? "Kasir Putri tidak diizinkan mengakses data Putra" : "Data Keuangan Putra"}
                >
                    <span className="text-xl">👦</span> Keuangan Putra
                </button>
                <button
                    onClick={() => setActiveGender("PUTRI")}
                    disabled={userRole === "KASIR_SYAHRIYAH_PUTRA"}
                    className={`flex-1 py-3 px-6 text-center rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${activeGender === "PUTRI" ? "bg-white text-rose-600 shadow-md ring-1 ring-black/5" : "text-gray-500 hover:text-gray-700"} disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={userRole === "KASIR_SYAHRIYAH_PUTRA" ? "Kasir Putra tidak diizinkan mengakses data Putri" : "Data Keuangan Putri"}
                >
                    <span className="text-xl">🧕</span> Keuangan Putri
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200 mt-2 mb-6">
                <button
                    onClick={() => setActiveTab("KASIR")}
                    className={`py-3 px-6 font-bold flex-1 sm:flex-none border-b-4 transition-colors ${activeTab === "KASIR" ? (activeGender === "PUTRA" ? "border-sky-500 text-sky-600" : "border-rose-500 text-rose-600") : "border-transparent text-gray-500 hover:border-gray-300"}`}
                >
                    💳 Kasir & Input Cicilan
                </button>
                <button
                    onClick={() => setActiveTab("REKAP")}
                    className={`py-3 px-6 font-bold flex-1 sm:flex-none border-b-4 transition-colors ${activeTab === "REKAP" ? (activeGender === "PUTRA" ? "border-sky-500 text-sky-600" : "border-rose-500 text-rose-600") : "border-transparent text-gray-500 hover:border-gray-300"}`}
                >
                    📊 Rekapitulasi Global
                </button>
                <button
                    onClick={() => { setActiveTab("BAYAR_LANGSUNG"); setBlSuccess(null); setBlError(null); }}
                    className={`py-3 px-6 font-bold flex-1 sm:flex-none border-b-4 transition-colors ${activeTab === "BAYAR_LANGSUNG" ? "border-emerald-500 text-emerald-600" : "border-transparent text-gray-500 hover:border-gray-300"}`}
                >
                    ⚡ Bayar Langsung
                </button>
            </div>

            {/* Notifications */}
            {error && (
                <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl font-medium animate-pulse">
                    {error}
                </div>
            )}
            {successMsg && (
                <div className="p-4 bg-sky-50 text-sky-700 border border-sky-200 rounded-xl font-medium flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    {successMsg}
                </div>
            )}

            {/* ===== TAB: BAYAR LANGSUNG ===== */}
            {activeTab === "BAYAR_LANGSUNG" && (
                <div className="max-w-lg mx-auto">
                    <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-xl">⚡</div>
                            <div>
                                <h2 className="font-bold text-gray-800">Bayar Syahriyah Langsung</h2>
                                <p className="text-xs text-gray-500">Tanpa perlu buat tagihan manual terlebih dahulu</p>
                            </div>
                        </div>

                        {blError && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{blError}</div>
                        )}
                        {blSuccess && (
                            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 font-medium">{blSuccess}</div>
                        )}

                        {/* Cari Santri */}
                        <div className="mb-4" ref={blSearchRef}>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Santri</label>
                            {blStudentId ? (
                                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                    <span className="text-sm font-semibold text-emerald-700">✅ {blStudentName}</span>
                                    <button onClick={() => { setBlStudentId(null); setBlStudentName(""); setBlSearchQuery(""); }} className="text-xs text-gray-400 hover:text-red-500">Ganti</button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Ketik nama santri..."
                                        value={blSearchQuery}
                                        onChange={(e) => { setBlSearchQuery(e.target.value); setBlShowDropdown(true); }}
                                        onFocus={() => setBlShowDropdown(true)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                                    />
                                    {blShowDropdown && blSearchQuery.length > 0 && (
                                        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            {studentsList
                                                .filter(s => s.full_name.toLowerCase().includes(blSearchQuery.toLowerCase()) &&
                                                    (activeGender === "PUTRA" ? s.gender === "PUTRA" : s.gender === "PUTRI"))
                                                .slice(0, 8)
                                                .map(s => (
                                                    <li key={s.student_id}
                                                        onClick={() => { setBlStudentId(s.student_id); setBlStudentName(`${s.full_name} (${s.student_class})`); setBlSearchQuery(""); setBlShowDropdown(false); }}
                                                        className="px-3 py-2 text-sm hover:bg-emerald-50 cursor-pointer border-b border-gray-50 last:border-0"
                                                    >
                                                        <span className="font-medium">{s.full_name}</span>
                                                        <span className="text-gray-400 ml-2 text-xs">{s.student_class} · {s.dormitory}</span>
                                                    </li>
                                                ))
                                            }
                                            {studentsList.filter(s => s.full_name.toLowerCase().includes(blSearchQuery.toLowerCase()) && (activeGender === "PUTRA" ? s.gender === "PUTRA" : s.gender === "PUTRI")).length === 0 && (
                                                <li className="px-3 py-2 text-sm text-gray-400">Tidak ada hasil</li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Bulan & Tahun */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bulan</label>
                                <select value={blBulan} onChange={e => setBlBulan(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-400">
                                    {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map(b => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tahun</label>
                                <input type="number" min="2020" max="2100" value={blTahun} onChange={e => setBlTahun(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-400" />
                            </div>
                        </div>

                        {/* Nominal */}
                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nominal (Rp)</label>
                            <input type="number" value={blNominal} onChange={e => setBlNominal(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-400"
                                placeholder="300000" />
                            <p className="text-xs text-gray-400 mt-1">Default Rp 300.000 — sesuaikan jika ada ketentuan berbeda</p>
                        </div>

                        {/* Konfirmasi */}
                        <button
                            onClick={handleBayarLangsung}
                            disabled={blLoading || !blStudentId}
                            className="w-full py-3 font-bold text-white rounded-xl transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                            style={{ backgroundColor: blLoading ? "#6b7280" : "#10b981" }}
                        >
                            {blLoading ? "⏳ Memproses..." : `✅ Konfirmasi Bayar — ${blBulan} ${blTahun}`}
                        </button>
                    </div>
                </div>
            )}

            {activeTab === "KASIR" && (
                <div className="grid grid-cols-1 gap-6 items-start">
                    {/* SCANNER FIELD */}
                    {!profile && (
                        <div className="bg-white p-12 rounded-2xl shadow-sm border border-sky-100 flex flex-col items-center justify-center min-h-[400px]">
                            <div className="w-20 h-20 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mb-6">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">Pencarian Santri & Scan Kartu</h2>
                            <p className="text-gray-500 mb-8 text-center max-w-md">Ketik nama santri/NIS untuk mencari secara manual, atau tempelkan kartu RFID santri untuk membuka halaman kasir.</p>

                            <div className="w-full max-w-md space-y-4 relative" ref={searchWrapperRef}>
                                {/* Search by Name/NIS input */}
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Cari Nama atau NIS Santri..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setShowDropdown(true);
                                        }}
                                        onFocus={() => setShowDropdown(true)}
                                        className="w-full pl-10 pr-4 py-3 text-sm bg-white border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-sky-500 transition-all outline-none"
                                        autoComplete="off"
                                    />
                                    {showDropdown && searchQuery.trim() !== "" && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                            {filteredStudents.length > 0 ? (
                                                filteredStudents.map(student => (
                                                    <div
                                                        key={student.student_id}
                                                        onClick={() => handleSelectStudent(student)}
                                                        className="px-4 py-3 hover:bg-sky-50 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center transition-colors"
                                                    >
                                                        <div>
                                                            <p className="font-bold text-sm text-gray-800">{student.full_name}</p>
                                                            <p className="text-xs text-gray-500">Kls: {student.student_class} | Asrama: {student.dormitory}</p>
                                                        </div>
                                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-mono">{student.nis}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-4 py-3 text-sm text-gray-500 text-center">Tidak ada santri yang cocok.</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-center gap-4 text-gray-400 text-xs font-bold uppercase">
                                    <span className="h-px bg-gray-200 flex-1"></span>
                                    ATAU SCAN RFID
                                    <span className="h-px bg-gray-200 flex-1"></span>
                                </div>

                                {/* Scan RFID Form */}
                                <form onSubmit={handleScan} className="relative">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={rfidInput}
                                        onChange={(e) => setRfidInput(e.target.value)}
                                        placeholder="Tempelkan Kartu RFID..."
                                        className="w-full text-center py-3 text-sm bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl focus:ring-0 focus:border-sky-500 transition-all outline-none focus:bg-white"
                                        disabled={loading}
                                        autoComplete="off"
                                    />
                                    {loading && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </form>
                            </div>
                        </div>
                    )}

                    {/* BILLINGS PANEL */}
                    {profile && (
                        <div className="flex flex-col gap-6">
                            {/* Profile Info Row */}
                            <div className="bg-sky-50 text-sky-800 p-4 rounded-xl border border-sky-200 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-lg">{profile.student.full_name}</p>
                                    <p className="text-sm opacity-80">{profile.student.nis} - Kelas {profile.student.student_class}</p>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                                    <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                        Daftar Tagihan & Cicilan
                                    </h4>
                                    <button
                                        onClick={() => setShowBillingModal(true)}
                                        className="bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-500/30 font-semibold px-4 py-2 rounded-lg text-sm transition-all"
                                    >
                                        + Buat Tagihan Santri Ini
                                    </button>
                                </div>

                                {billings.length === 0 ? (
                                    <p className="text-gray-500 text-sm py-4 text-center">Belum ada data tagihan terkait santri ini.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {billings.map(b => {
                                            const totalPaid = b.transactions ? b.transactions.reduce((acc, curr) => acc + curr.amount_paid, 0) : 0;
                                            const sisaTagihan = b.total_amount - totalPaid;

                                            return (
                                                <div key={b.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col gap-3 transition-colors hover:border-sky-200">

                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-bold text-gray-900 border-b-2 border-emerald-400 inline-block pb-1 mb-2">
                                                                Tagihan {b.month} {b.year}
                                                            </p>

                                                            {b.details && (
                                                                <div className="text-xs text-gray-500 mt-1 mb-2">
                                                                    Rincian: {b.details}
                                                                </div>
                                                            )}

                                                            <div className="flex gap-4 mt-2">
                                                                <div>
                                                                    <p className="text-xs text-gray-500">Total Tagihan</p>
                                                                    <p className="font-semibold text-gray-700">{formatRupiah(b.total_amount)}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-500">Telah Dibayar</p>
                                                                    <p className="font-semibold text-emerald-600">{formatRupiah(totalPaid)}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="text-right">
                                                            <span className={`text-xs px-2.5 py-1 rounded-full font-black shadow-sm ${b.status === "PAID" ? "bg-emerald-500 text-white" :
                                                                b.status === "PARTIAL" ? "bg-amber-400 text-white" : "bg-red-500 text-white"
                                                                }`}>
                                                                {b.status}
                                                            </span>
                                                            <div className="mt-4">
                                                                <p className="text-xs font-bold text-gray-400">SISA TAGIHAN</p>
                                                                <p className={`text-lg font-black ${sisaTagihan > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                                    {formatRupiah(Math.max(0, sisaTagihan))}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* INLINE INSTALLMENT FORM */}
                                                    {b.status !== "PAID" && (
                                                        <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2 items-center bg-white p-2 rounded-lg shadow-sm">
                                                            <input
                                                                type="number"
                                                                placeholder="Nominal Cicilan Baru (Rp)"
                                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-sky-500 focus:border-sky-500 outline-none"
                                                                value={installmentAmounts[b.id] || ""}
                                                                onChange={(e) => handleInstallmentChange(b.id, e.target.value)}
                                                            />
                                                            <button
                                                                onClick={() => handlePayInstallment(b.id)}
                                                                disabled={actionLoading}
                                                                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-5 py-2 rounded-lg text-sm transition-transform shadow-md disabled:opacity-50"
                                                            >
                                                                Bayar/Cicil
                                                            </button>
                                                        </div>
                                                    )}

                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === "REKAP" && (
                <div className="space-y-6">
                    {/* Filter Bar */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Periode Bulan</label>
                            <select
                                value={rekapMonth}
                                onChange={(e) => setRekapMonth(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 outline-none"
                            >
                                <option value="Semua">Semua Bulan</option>
                                {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
                            <select
                                value={rekapYear}
                                onChange={(e) => setRekapYear(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 outline-none"
                            >
                                <option value="Semua">Semua Tahun</option>
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Filter Status</label>
                            <select
                                value={rekapStatusFilter}
                                onChange={(e) => setRekapStatusFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 outline-none"
                            >
                                <option value="Semua">Semua Status</option>
                                <option value="PAID">Lunas (PAID)</option>
                                <option value="PARTIAL">Mencicil (PARTIAL)</option>
                                <option value="UNPAID">Belum Bayar (UNPAID)</option>
                            </select>
                        </div>
                        <div className="flex-1 min-w-[200px] flex items-end">
                            <button
                                onClick={handleExportCSV}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                Export Excel (CSV)
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end p-2 border-t border-gray-100">
                        <button
                            onClick={() => setShowBulkBillingModal(true)}
                            className="bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-500/30 font-bold px-5 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                            Buat Tagihan Massal ({activeGender})
                        </button>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-sky-500 to-sky-600 text-white p-6 rounded-2xl shadow-md border border-sky-400">
                            <p className="text-sky-100 font-medium mb-1">Total Tagihan Diterbitkan</p>
                            <h3 className="text-3xl font-bold">{formatRupiah(totalTagihanDiterbitkan)}</h3>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 rounded-2xl shadow-md border border-emerald-400">
                            <p className="text-emerald-100 font-medium mb-1">Total Uang Terbayar</p>
                            <h3 className="text-3xl font-bold">{formatRupiah(totalTerbayar)}</h3>
                        </div>
                        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-2xl shadow-md border border-red-400">
                            <p className="text-red-100 font-medium mb-1">Total Sisa Tunggakan</p>
                            <h3 className="text-3xl font-bold">{formatRupiah(totalSisaTunggakan)}</h3>
                        </div>
                    </div>

                    {/* Report Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-sm">
                                        <th className="px-6 py-4 font-bold text-gray-700">Nama Santri</th>
                                        <th className="px-6 py-4 font-bold text-gray-700">Periode</th>
                                        <th className="px-6 py-4 font-bold text-gray-700">Total Tagihan</th>
                                        <th className="px-6 py-4 font-bold text-gray-700">Terbayar</th>
                                        <th className="px-6 py-4 font-bold text-gray-700">Sisa Tunggakan</th>
                                        <th className="px-6 py-4 font-bold text-gray-700 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rekapLoading ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                                <div className="inline-block w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                                <p>Memuat rekap data...</p>
                                            </td>
                                        </tr>
                                    ) : filteredRekap.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                                <p>Tidak ada tagihan yang sesuai dengan filter.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRekap.map((b) => {
                                            const paid = b.transactions ? b.transactions.reduce((acc, t) => acc + t.amount_paid, 0) : 0;
                                            const sisa = b.total_amount - paid;
                                            return (
                                                <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-gray-900">{b.student.full_name}</p>
                                                        <p className="text-xs text-gray-500">Kls {b.student.student_class} - {b.student.nis}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">
                                                        {b.month} {b.year}
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-gray-900">
                                                        {formatRupiah(b.total_amount)}
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-emerald-600">
                                                        {formatRupiah(paid)}
                                                    </td>
                                                    <td className={`px-6 py-4 font-bold ${sisa > 0 ? "text-red-600" : "text-gray-400"}`}>
                                                        {formatRupiah(Math.max(0, sisa))}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`text-xs px-2.5 py-1 rounded-full font-black shadow-sm ${b.status === "PAID" ? "bg-emerald-500 text-white" :
                                                            b.status === "PARTIAL" ? "bg-amber-400 text-white" : "bg-red-500 text-white"
                                                            }`}>
                                                            {b.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE BILLING MODAL (only shown via Kasir active context) */}
            {showBillingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowBillingModal(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900">Buat Tagihan Baru</h3>
                            <button onClick={() => setShowBillingModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <form onSubmit={handleCreateBilling} className="p-6 space-y-4 text-left">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bulan</label>
                                    <select
                                        value={newBillingMonth}
                                        onChange={(e) => setNewBillingMonth(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 outline-none"
                                    >
                                        {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-1/3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
                                    <input
                                        type="number"
                                        required
                                        value={newBillingYear}
                                        onChange={(e) => setNewBillingYear(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Tagihan (Rp)</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    placeholder="Contoh: 500000"
                                    value={newBillingTotalAmount}
                                    onChange={(e) => setNewBillingTotalAmount(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 outline-none font-mono text-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rincian Komponen Biaya</label>
                                <textarea
                                    rows={3}
                                    placeholder="Contoh: Uang Makan 250rb, Gedung 50rb"
                                    value={newBillingDetails}
                                    onChange={(e) => setNewBillingDetails(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 outline-none resize-none"
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowBillingModal(false)}
                                    className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-5 py-2 text-white bg-sky-600 rounded-lg hover:bg-sky-700 font-bold shadow-md shadow-sky-600/20 disabled:opacity-50 flex items-center gap-2 transition-all"
                                >
                                    {actionLoading ? "Memproses..." : "Simpan Tagihan Baru"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CREATE BULK BILLING MODAL */}
            {showBulkBillingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowBulkBillingModal(false)}></div>
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-sky-50 to-sky-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-sky-900 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                Buat Tagihan Massal ({activeGender})
                            </h3>
                            <button onClick={() => setShowBulkBillingModal(false)} className="text-sky-400 hover:text-sky-600 transition-colors bg-white rounded-full p-1 shadow-sm">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <div className="px-6 py-3 bg-white border-b border-gray-100 text-sm text-gray-500">
                            Tagihan ini akan dibuat otomatis untuk <strong>seluruh santri {activeGender}</strong>. Jika santri sudah memiliki tagihan di bulan & tahun yang sama, maka akan dilewati.
                        </div>

                        <form onSubmit={handleCreateBulkBilling} className="p-6 space-y-4 text-left">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bulan</label>
                                    <select
                                        value={newBillingMonth}
                                        onChange={(e) => setNewBillingMonth(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 outline-none"
                                    >
                                        {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-1/3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
                                    <input
                                        type="number"
                                        required
                                        value={newBillingYear}
                                        onChange={(e) => setNewBillingYear(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Tagihan (Rp)</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    placeholder="Contoh: 500000"
                                    value={newBillingTotalAmount}
                                    onChange={(e) => setNewBillingTotalAmount(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 outline-none font-mono text-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rincian Komponen Biaya</label>
                                <textarea
                                    rows={3}
                                    placeholder="Contoh: Uang Makan 250rb, Gedung 50rb"
                                    value={newBillingDetails}
                                    onChange={(e) => setNewBillingDetails(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-sky-500 focus:border-sky-500 outline-none resize-none"
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowBulkBillingModal(false)}
                                    className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="px-5 py-2 text-white bg-sky-600 rounded-lg hover:bg-sky-700 font-bold shadow-md shadow-sky-600/20 disabled:opacity-50 flex items-center gap-2 transition-all"
                                >
                                    {actionLoading ? "Memproses..." : `Generate Tagihan ${activeGender}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
