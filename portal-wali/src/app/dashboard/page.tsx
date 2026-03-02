"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";

interface Student {
    student_id: number;
    nis: string;
    full_name: string;
    student_class: string;
    dormitory: string;
}

interface Wallet {
    balance: number;
}

interface Billing {
    id: number;
    month: string;
    year: string;
    total_amount: number;
    status: string;
}

interface StudentViolation {
    id: number;
    violation_date: string;
    violation_type: string;
    punishment: string;
    points: number;
}

interface StudentLeave {
    id: number;
    start_date: string;
    end_date: string;
    reason: string;
    is_returned: boolean;
}

interface TahfidzRecord {
    record_id: number;
    surah: string;
    start_ayat: number;
    end_ayat: number;
    grade: string;
    date_recorded: string;
}

interface Attendance {
    attendance_id: number;
    type: string;
    status: string;
    timestamp: string;
}

interface MealLog {
    meal_log_id: number;
    meal_type: string;
    timestamp: string;
}

export default function DashboardPage() {
    const router = useRouter();

    const [student, setStudent] = useState<Student | null>(null);
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [billings, setBillings] = useState<Billing[]>([]);
    const [tahfidz, setTahfidz] = useState<TahfidzRecord[]>([]);
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [meals, setMeals] = useState<MealLog[]>([]);
    const [violations, setViolations] = useState<StudentViolation[]>([]);
    const [leaves, setLeaves] = useState<StudentLeave[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Basic Session Check
        const nis = sessionStorage.getItem("guardian_session_nis");
        if (!nis) {
            router.push("/");
            return;
        }

        fetchDashboardData(nis);
    }, [router]);

    const fetchDashboardData = async (nis: string) => {
        try {
            setLoading(true);

            // 1. Fetch Student Info
            const { data: stData, error: stError } = await supabase
                .from('students')
                .select('*')
                .eq('nis', nis)
                .single();

            if (stError || !stData) throw new Error("Data santri tidak ditemukan");
            setStudent(stData);

            const studentId = stData.student_id;

            // 2. Fetch Wallet
            const { data: wData } = await supabase
                .from('wallets')
                .select('balance')
                .eq('student_id', studentId)
                .single();
            if (wData) setWallet(wData);

            // 3. Fetch Billings (Syahriyah)
            const { data: bData } = await supabase
                .from('billings')
                .select('*')
                .eq('student_id', studentId)
                .order('id', { ascending: false });
            if (bData) setBillings(bData);

            // 4. Fetch Tahfidz (Last 3)
            const { data: tData } = await supabase
                .from('tahfidz_records')
                .select('*')
                .eq('student_id', studentId)
                .order('timestamp', { ascending: false }) // Fallback order if date_recorded is same
                .limit(3);
            if (tData) setTahfidz(tData);

            // 5. Fetch Activity Today (Attendance & Meals)
            // Getting latest 3 attendances and 3 meals for the dashboard stream
            const { data: attData } = await supabase
                .from('attendances')
                .select('*')
                .eq('student_id', studentId)
                .order('timestamp', { ascending: false })
                .limit(3);
            if (attData) setAttendance(attData);

            const { data: mData } = await supabase
                .from('meal_logs')
                .select('*')
                .eq('student_id', studentId)
                .order('timestamp', { ascending: false })
                .limit(3);
            if (mData) setMeals(mData);

            // 6. Fetch Violations
            const { data: vData } = await supabase
                .from('student_violations')
                .select('*')
                .eq('student_id', studentId)
                .order('violation_date', { ascending: false });
            if (vData) setViolations(vData);

            // 7. Fetch Leaves
            const { data: lData } = await supabase
                .from('student_leaves')
                .select('*')
                .eq('student_id', studentId)
                .order('start_date', { ascending: false });
            if (lData) setLeaves(lData);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        sessionStorage.clear();
        router.push("/");
    };

    const formatRupiah = (num: number) => {
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
    };

    const formatDate = (isoStr: string) => {
        if (!isoStr) return "-";
        const d = new Date(isoStr);
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatTime = (isoStr: string) => {
        if (!isoStr) return "-";
        const d = new Date(isoStr);
        return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-medium">Memuat data dari pesantren...</p>
            </div>
        );
    }

    if (error || !student) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-6">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Gagal Memuat</h2>
                    <p className="text-gray-500 mb-6">{error || "Sesi tidal valid"}</p>
                    <button onClick={handleLogout} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl">Kembali ke Login</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">

            {/* HEADER TRAY */}
            <div className="bg-emerald-700 pt-12 pb-24 px-6 rounded-b-[2.5rem] shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="flex justify-between items-center relative z-10">
                    <div className="text-white">
                        <p className="text-emerald-100 text-sm font-medium">Portal Wali Santri</p>
                        <h1 className="text-2xl font-bold">Pesantren Nurul Ihsan</h1>
                    </div>
                    <button onClick={handleLogout} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl backdrop-blur-sm transition-colors text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    </button>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 sm:px-6 -mt-16 space-y-6 relative z-20">

                {/* KARTU 1: PROFIL & KEUANGAN */}
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 overflow-hidden">
                    <div className="flex items-center gap-4 border-b border-gray-100 pb-5 mb-5">
                        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center font-bold text-2xl text-emerald-700">
                            {student.full_name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 leading-tight">{student.full_name}</h2>
                            <p className="text-gray-500 text-sm">Kelas {student.student_class} • {student.dormitory}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                            <p className="text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-1">E-Money</p>
                            <p className="text-xl font-bold text-emerald-900">{wallet ? formatRupiah(wallet.balance) : "Rp 0"}</p>
                        </div>

                        <div className={`rounded-2xl p-4 border ${billings.filter(b => b.status !== 'PAID').length > 0 ? "bg-red-50 border-red-100" : "bg-blue-50 border-blue-100"}`}>
                            <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${billings.filter(b => b.status !== 'PAID').length > 0 ? "text-red-800" : "text-blue-800"}`}>Syahriyah</p>
                            {billings.filter(b => b.status !== 'PAID').length > 0 ? (
                                <div>
                                    <p className="text-sm font-bold text-red-900 leading-tight">{billings.filter(b => b.status !== 'PAID').length} Tunggakan</p>
                                    <p className="text-xs text-red-700 mt-0.5 max-w-full truncate">Bulan {billings.filter(b => b.status !== 'PAID')[0]?.month}</p>
                                </div>
                            ) : (
                                <p className="text-lg font-bold text-blue-900">LUNAS ✅</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* KARTU 2: AKADEMIK / TAHFIDZ */}
                <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
                    <div className="flex justify-between items-end mb-5">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                            Jurnal Tahfidz
                        </h3>
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">3 Terakhir</span>
                    </div>

                    {tahfidz.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 rounded-2xl border border-gray-100">
                            <p className="text-gray-400 text-sm">Belum ada riwayat hafalan minggu ini</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tahfidz.map(t => (
                                <div key={t.record_id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                                    <div>
                                        <p className="font-bold text-gray-900">{t.surah}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Ayat {t.start_ayat} - {t.end_ayat}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${t.grade.includes("Sangat") ? "bg-emerald-100 text-emerald-700" :
                                            t.grade === "Lancar" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"
                                            }`}>{t.grade}</span>
                                        <p className="text-xs text-gray-400 mt-1">{formatDate(t.date_recorded)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* KARTU 3: AKTIVITAS HARI INI */}
                <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
                    <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                        <svg className="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        Aktivitas Scanner Boarding
                    </h3>

                    {attendance.length === 0 && meals.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 rounded-2xl border border-gray-100">
                            <p className="text-gray-400 text-sm">Belum ada aktivitas kartu hari ini</p>
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-gray-100 ml-3 space-y-6">

                            {attendance.map(a => (
                                <div key={`att-${a.attendance_id}`} className="relative pl-6">
                                    <div className="absolute w-3 h-3 bg-emerald-500 rounded-full -left-[7px] top-1.5 ring-4 ring-white"></div>
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold text-sm text-gray-900">Absensi {a.type.replace('_', ' ')}</p>
                                            <span className="text-xs text-gray-400 font-mono">{formatTime(a.timestamp)}</span>
                                        </div>
                                        <p className="text-xs text-emerald-600 font-medium mt-0.5">Berhasil (Tap Masjid/Kelas)</p>
                                    </div>
                                </div>
                            ))}

                            {meals.map(m => (
                                <div key={`meal-${m.meal_log_id}`} className="relative pl-6">
                                    <div className="absolute w-3 h-3 bg-yellow-400 rounded-full -left-[7px] top-1.5 ring-4 ring-white"></div>
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold text-sm text-gray-900">Makan {m.meal_type}</p>
                                            <span className="text-xs text-gray-400 font-mono">{formatTime(m.timestamp)}</span>
                                        </div>
                                        <p className="text-xs text-yellow-600 font-medium mt-0.5">Jatah Diambil (Ruang Makan)</p>
                                    </div>
                                </div>
                            ))}

                        </div>
                    )}
                </div>

                {/* KARTU 4: RINCIAN TAGIHAN & PEMBAYARAN */}
                <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
                    <div className="flex justify-between items-end mb-5">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z"></path></svg>
                            Rincian Tagihan Syahriyah
                        </h3>
                    </div>

                    {billings.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 rounded-2xl border border-gray-100">
                            <p className="text-gray-400 text-sm">Belum ada data tagihan</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {billings.map(b => (
                                <div key={b.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                                    <div>
                                        <p className="font-bold text-gray-900">Bulan {b.month} {b.year}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{formatRupiah(b.total_amount)}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${b.status === "PAID" ? "bg-emerald-100 text-emerald-700" :
                                            b.status === "PARTIAL" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                                            }`}>
                                            {b.status === "PAID" ? "Lunas" : b.status === "PARTIAL" ? "Mencicil" : "Belum Bayar"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* KARTU 5: CATATAN KEDISIPLINAN */}
                <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
                    <div className="flex justify-between items-end mb-5">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            Catatan Kedisiplinan
                        </h3>
                    </div>

                    {violations.length === 0 ? (
                        <div className="text-center py-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <p className="text-emerald-600 font-medium text-sm">Alhamdulillah, tidak ada catatan pelanggaran.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {violations.map(v => (
                                <div key={v.id} className="bg-red-50 p-3 rounded-xl border border-red-100">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-red-900 text-sm">{v.violation_type}</p>
                                            <p className="text-xs text-red-700 mt-1">Takzir: {v.punishment}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-bold bg-red-200 text-red-800 px-2 py-0.5 rounded">-{v.points} Poin</span>
                                            <p className="text-xs text-red-500 mt-1">{formatDate(v.violation_date)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* KARTU 6: RIWAYAT IZIN & SAKIT */}
                <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
                    <div className="flex justify-between items-end mb-5">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            Riwayat Izin & Sakit
                        </h3>
                    </div>

                    {leaves.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 rounded-2xl border border-gray-100">
                            <p className="text-gray-400 text-sm">Belum ada riwayat izin atau sakit.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {leaves.map(l => (
                                <div key={l.id} className="bg-gray-50 p-3 rounded-xl flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm capitalize">{l.reason.replace('_', ' ')}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{formatDate(l.start_date)} s/d {formatDate(l.end_date)}</p>
                                    </div>
                                    <div>
                                        {l.is_returned ? (
                                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded uppercase tracking-wider">Kembali</span>
                                        ) : (
                                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded uppercase tracking-wider">Di Luar</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
