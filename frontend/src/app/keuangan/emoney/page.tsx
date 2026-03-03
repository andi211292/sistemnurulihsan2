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
}

interface FinancialProfile {
    student: StudentInfo;
    balance: number;
}

export default function EMoneyPage() {
    const [rfidInput, setRfidInput] = useState("");
    const [profile, setProfile] = useState<FinancialProfile | null>(null);

    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Track user role
    const [userRole, setUserRole] = useState<string>("SUPER_ADMIN");

    // Transaction form state for E-Money
    const [nominal, setNominal] = useState("");
    const [keterangan, setKeterangan] = useState("");
    const [txType, setTxType] = useState<"TOPUP" | "PAYMENT">("PAYMENT");

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }

        // Fetch role
        const savedRole = localStorage.getItem("user_role");
        if (savedRole) {
            setUserRole(savedRole);
            // Auto default to payment if they are LUAR
            if (savedRole === "KASIR_KOP_LUAR") {
                setTxType("PAYMENT");
            }
        }
    }, [profile, successMsg, error]);

    const loadData = async (uid: string) => {
        if (!uid || !uid.trim()) return;
        setLoading(true);
        setError(null);
        setSuccessMsg(null);
        setProfile(null);

        try {
            // Fetch profile + wallet
            const profileRes = await apiFetch(`http://127.0.0.1:8080/api/keuangan/profil/${uid}`);
            if (!profileRes.ok) {
                if (profileRes.status === 404) throw new Error("Santri dengan kartu RFID ini tidak terdaftar");
                throw new Error("Gagal mengambil data keuangan");
            }
            const profileData = await profileRes.json();
            setProfile(profileData);
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

    const handleTransaction = async (e: FormEvent) => {
        e.preventDefault();
        if (!profile || !nominal || !keterangan) return;

        setActionLoading(true);
        setError(null);

        try {
            const payload = {
                rfid_uid: profile.student.rfid_uid || rfidInput,
                amount: parseFloat(nominal),
                type: txType,
                description: keterangan
            };

            const res = await apiFetch("http://127.0.0.1:8080/api/keuangan/transaksi", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "Gagal memproses transaksi");
            }

            setSuccessMsg("Transaksi E-Money berhasil diproses!");

            setNominal("");
            setKeterangan("");
            await loadData(rfidInput.trim());

            setTimeout(() => setSuccessMsg(null), 3000);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const formatRupiah = (number: number) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0
        }).format(number);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Koperasi & E-Money</h1>
                <p className="text-gray-500 mt-1">Sistem informasi transaksi dan saldo e-money santri</p>
            </div>

            {/* Notifications */}
            {error && (
                <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl font-medium animate-pulse">
                    {error}
                </div>
            )}
            {successMsg && (
                <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-medium flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    {successMsg}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 items-start">
                {/* SCANNER FIELD */}
                {!profile && (
                    <div className="bg-white p-12 rounded-2xl shadow-sm border border-emerald-100 flex flex-col items-center justify-center min-h-[400px]">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Menunggu Scan Kartu untuk Transaksi</h2>
                        <p className="text-gray-500 mb-8 text-center max-w-md">Silakan tempelkan kartu RFID santri untuk melihat sisa saldo atau bertransaksi di Koperasi (E-Money).</p>

                        <form onSubmit={handleScan} className="w-full max-w-md relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={rfidInput}
                                onChange={(e) => setRfidInput(e.target.value)}
                                placeholder="Ketik UID manual & Enter"
                                className="w-full pl-5 pr-12 py-4 text-center text-lg bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-emerald-500 focus:bg-white transition-all shadow-inner outline-none"
                                disabled={loading}
                                autoComplete="off"
                            />
                            {loading && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </form>
                    </div>
                )}

                {/* FINANCIAL PROFILE & TRANSACTIONS */}
                {profile && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* BALANCE */}
                        <div className="bg-emerald-600 p-8 rounded-3xl shadow-lg relative overflow-hidden text-white w-full h-fit">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-20 -mt-20"></div>

                            <div className="relative z-10 flex justify-between items-start mb-12">
                                <div>
                                    <h3 className="text-2xl font-bold">{profile.student.full_name}</h3>
                                    <p className="text-emerald-100">Kelas {profile.student.student_class} • {profile.student.nis}</p>
                                </div>
                                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
                                </div>
                            </div>

                            <div className="relative z-10">
                                <p className="text-emerald-100 font-medium mb-1">Sisa Saldo E-Money</p>
                                <h2 className="text-5xl font-extrabold tracking-tight">{formatRupiah(profile.balance)}</h2>
                            </div>
                        </div>

                        {/* E-MONEY INPUT FORM */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col h-fit">
                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                                <h3 className="text-lg font-bold text-gray-800">Cepat Transaksi</h3>
                                <button
                                    type="button"
                                    onClick={() => { setProfile(null); setRfidInput(""); }}
                                    className="text-sm text-gray-400 hover:text-red-500 font-medium transition-colors border border-gray-200 px-3 py-1 rounded-full"
                                >
                                    Tutup
                                </button>
                            </div>

                            <form onSubmit={handleTransaction} className="space-y-5">
                                <p className="text-sm text-gray-500">Mengesekusi tranksasi pembelian non-tagihan (Koperasi/Kantin) atau penitipan uang saku (Top Up).</p>
                                <div className="flex gap-2 mb-2 p-1 bg-gray-100 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setTxType("PAYMENT")}
                                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${txType === "PAYMENT" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                                    >
                                        Debit (Potong Saldo)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTxType("TOPUP")}
                                        disabled={userRole === "KASIR_KOP_LUAR"}
                                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${txType === "TOPUP" ? "bg-emerald-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"} disabled:opacity-30 disabled:cursor-not-allowed`}
                                        title={userRole === "KASIR_KOP_LUAR" ? "Role Anda (Koperasi Luar) tidak diizinkan melakukan Top-Up" : "Pilih Top-Up Saldo"}
                                    >
                                        Top Up Saldo
                                    </button>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nominal Transaksi (Rp)</label>
                                    <input
                                        type="number"
                                        required
                                        min="100"
                                        value={nominal}
                                        onChange={(e) => setNominal(e.target.value)}
                                        placeholder="Contoh: 15000"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors font-mono text-lg"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan / Item</label>
                                    <input
                                        type="text"
                                        required
                                        value={keterangan}
                                        onChange={(e) => setKeterangan(e.target.value)}
                                        placeholder="Contoh: Jajan Kantin"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                                    />
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={actionLoading}
                                        className={`w-full text-white font-bold py-4 px-4 rounded-xl transition-all shadow-lg disabled:opacity-50 flex justify-center items-center text-lg ${txType === "TOPUP" ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"}`}
                                    >
                                        {actionLoading ? (
                                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : txType === "TOPUP" ? "Top Up Saldo" : "Proses Transaksi Debit"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
