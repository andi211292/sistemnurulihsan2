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
    batas_jajan_harian: number;
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
    notes?: string;
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

interface EmoneyTransaction {
    transaction_id: number;
    amount: number;
    type: string;
    created_at: string;
    description: string;
    balance_after: number;
}

interface MedicalRecord {
    medical_id: number;
    complaint: string;
    diagnosis: string | null;
    medicine_given: string | null;
    timestamp: string;
}

interface Ranking {
    id: number;
    full_name: string;
    category: string;
    position: number;
}

interface GalleryItem {
    id: number;
    title: string;
    url: string;
    category: string;
}

interface Notification {
    id: number;
    message: string;
    type: string;
    created_at: string;
    read: boolean;
}

export default function DashboardPage() {
    const router = useRouter();

    // VIEW STATE
    const [currentView, setCurrentView] = useState("dashboard"); // dashboard, jajan, absensi, keuangan, donasi, kesehatan, perizinan, ranking, galeri
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

    const [student, setStudent] = useState<Student | null>(null);
    const [wallet, setWallet] = useState<Wallet | null>(null);
    const [billings, setBillings] = useState<Billing[]>([]);
    const [tahfidz, setTahfidz] = useState<TahfidzRecord[]>([]);
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [meals, setMeals] = useState<MealLog[]>([]);
    const [violations, setViolations] = useState<StudentViolation[]>([]);
    const [leaves, setLeaves] = useState<StudentLeave[]>([]);
    const [transactions, setTransactions] = useState<EmoneyTransaction[]>([]);
    const [health, setHealth] = useState<MedicalRecord | null>(null);
    const [rankings, setRankings] = useState<Ranking[]>([]);
    const [gallery, setGallery] = useState<GalleryItem[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    
    const [todaySpend, setTodaySpend] = useState<number>(0);
    const [monthSpend, setMonthSpend] = useState<number>(0);

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

            // 2. Fetch Wallet & Transactions
            const { data: wData } = await supabase
                .from('wallets')
                .select('wallet_id, balance')
                .eq('student_id', studentId)
                .single();
            if (wData) {
                setWallet({ balance: wData.balance });

                // Fetch transactions for calculating spending and history
                const { data: transData } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('wallet_id', wData.wallet_id)
                    .order('created_at', { ascending: false });

                if (transData) {
                    setTransactions(transData);
                    
                    const now = new Date();
                    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

                    const today = transData.filter(t => t.type === 'PAYMENT' && t.created_at >= startOfDay)
                                          .reduce((acc, curr) => acc + curr.amount, 0);
                    const month = transData.filter(t => t.type === 'PAYMENT' && t.created_at >= startOfMonth)
                                           .reduce((acc, curr) => acc + curr.amount, 0);
                    
                    setTodaySpend(today);
                    setMonthSpend(month);
                }
            }

            // 3. Fetch Billings
            const { data: bData } = await supabase.from('billings').select('*').eq('student_id', studentId).order('id', { ascending: false });
            if (bData) setBillings(bData);

            // 4. Fetch Activities
            const { data: attData } = await supabase.from('attendances').select('*').eq('student_id', studentId).order('timestamp', { ascending: false });
            if (attData) setAttendance(attData);

            const { data: mData } = await supabase.from('meal_logs').select('*').eq('student_id', studentId).order('timestamp', { ascending: false });
            if (mData) setMeals(mData);

            // 5. Fetch Discipline & Leaves
            const { data: vData } = await supabase.from('student_violations').select('*').eq('student_id', studentId).order('violation_date', { ascending: false });
            if (vData) setViolations(vData);

            const { data: lData } = await supabase.from('student_leaves').select('*').eq('student_id', studentId).order('start_date', { ascending: false });
            if (lData) setLeaves(lData);

            // 6. Fetch New Features (with mocks if needed)
            // Health mapped from medical_records 
            // We assume they are sick if there's a record in the last 7 days
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { data: hData } = await supabase
                .from('medical_records')
                .select('*')
                .eq('student_id', studentId)
                .gte('timestamp', sevenDaysAgo.toISOString())
                .order('timestamp', { ascending: false })
                .limit(1)
                .single();
            setHealth(hData || null);

            // Ranking (Mock for now)
            setRankings([
                { id: 1, full_name: "Ahmad Fauzi", category: "Rajin Ibadah", position: 1 },
                { id: 2, full_name: "Abdul Rahman", category: "Hafalan Terbanyak", position: 2 },
                { id: 3, full_name: "Muhammad Fikri", category: "Paling Disiplin", position: 3 }
            ]);

            // Gallery (Mock for now)
            setGallery([
                { id: 1, title: "Belajar Bersama", url: "https://images.unsplash.com/photo-1577891729319-f4871c674881?auto=format", category: "Pendidikan" },
                { id: 2, title: "Setoran Hafalan", url: "https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format", category: "Tahfidz" },
                { id: 3, title: "Olahraga Pagi", url: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format", category: "Olahraga" }
            ]);

            // Notifications
            setNotifications([
                { id: 1, message: "Selamat Datang di Portal Wali Santri!", type: "info", created_at: new Date().toISOString(), read: false }
            ]);
        } catch (err: unknown) {
            if (err instanceof Error) setError(err.message);
            else setError("Terjadi kesalahan sistem");
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
                    <p className="text-gray-500 mb-6">{error || "Sesi tidak valid"}</p>
                    <button onClick={handleLogout} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl">Kembali ke Login</button>
                </div>
            </div>
        );
    }

    const WA_NUMBER = "6281919232004";

    const openWhatsApp = (msg: string) => {
        const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank', 'noreferrer');
    };

    const renderDashboard = () => (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <MenuCard title="Riwayat Jajan" icon="shopping_bag" color="bg-orange-100 text-orange-600" onClick={() => setCurrentView("jajan")} />
            <MenuCard title="Absensi Bulanan" icon="calendar_month" color="bg-emerald-100 text-emerald-600" onClick={() => setCurrentView("absensi")} />
            <MenuCard title="Top Up Saldo" icon="add_card" color="bg-blue-100 text-blue-600" onClick={() => setCurrentView("keuangan")} />
            <MenuCard title="Hubungi Keuangan" icon="support_agent" color="bg-indigo-100 text-indigo-600" onClick={() => openWhatsApp(`Halo admin keuangan Pesantren Nurul Ihsan, saya ingin menanyakan terkait pembayaran santri anak saya ${student.full_name}.`)} />
            <MenuCard title="Donasi QRIS" icon="qr_code_2" color="bg-purple-100 text-purple-600" onClick={() => setCurrentView("donasi")} />
            <MenuCard title="Kesehatan" icon="medical_services" color="bg-red-100 text-red-600" onClick={() => setCurrentView("kesehatan")} />
            <MenuCard title="Perizinan" icon="assignment_turned_in" color="bg-amber-100 text-amber-600" onClick={() => setCurrentView("perizinan")} />
            <MenuCard title="Kedisiplinan" icon="gavel" color="bg-rose-100 text-rose-600" onClick={() => setCurrentView("kedisiplinan")} />
            <MenuCard title="Ranking Santri" icon="emoji_events" color="bg-yellow-100 text-yellow-600" onClick={() => setCurrentView("ranking")} />
            <MenuCard title="Galeri Kegiatan" icon="auto_stories" color="bg-teal-100 text-teal-600" onClick={() => setCurrentView("galeri")} />
        </div>
    );

    const renderJajanView = () => {
        const filteredTrans = transactions.filter(t => {
            const date = new Date(t.created_at);
            return date.getMonth() + 1 === selectedMonth;
        });
        return (
            <div className="space-y-6">
                <ViewHeader title="Riwayat Jajan" onBack={() => setCurrentView("dashboard")} />
                <div className="grid grid-cols-2 gap-3">
                    <SummaryCard label="Hari Ini" value={formatRupiah(todaySpend)} />
                    <SummaryCard label="Bulan Ini" value={formatRupiah(monthSpend)} />
                </div>
                <MonthFilter selected={selectedMonth} onChange={setSelectedMonth} />
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {filteredTrans.length === 0 ? (
                        <EmptyState msg="Tidak ada transaksi di bulan ini" />
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-gray-600">Tanggal</th>
                                    <th className="px-4 py-3 font-semibold text-gray-600">Ket</th>
                                    <th className="px-4 py-3 font-semibold text-gray-600 text-right">Nominal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredTrans.map(t => (
                                    <tr key={t.transaction_id}>
                                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(t.created_at)}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{t.description || (t.type === 'PAYMENT' ? 'Jajan Kantin' : 'Top Up')}</td>
                                        <td className={`px-4 py-3 font-bold text-right ${t.type === 'PAYMENT' ? 'text-red-500' : 'text-emerald-600'}`}>
                                            {t.type === 'PAYMENT' ? '-' : '+'}{formatRupiah(t.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        );
    };

    const renderAbsensiView = () => {
        const filteredAtt = attendance.filter(a => {
            const date = new Date(a.timestamp);
            return date.getMonth() + 1 === selectedMonth;
        });
        
        // Count stats
        const hadir = filteredAtt.filter(a => a.status === 'HADIR').length;
        const izin = filteredAtt.filter(a => a.status === 'IZIN').length;
        const tidak = filteredAtt.filter(a => a.status === 'ALPHA').length;

        return (
            <div className="space-y-6">
                <ViewHeader title="Absensi Bulanan" onBack={() => setCurrentView("dashboard")} />
                <div className="grid grid-cols-3 gap-2">
                    <StatCard label="Hadir" value={hadir} color="text-emerald-600" />
                    <StatCard label="Izin" value={izin} color="text-amber-500" />
                    <StatCard label="Tidak" value={tidak} color="text-red-500" />
                </div>
                <MonthFilter selected={selectedMonth} onChange={setSelectedMonth} />
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {filteredAtt.length === 0 ? (
                        <EmptyState msg="Tidak ada data absensi di bulan ini" />
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {filteredAtt.map(a => (
                                <div key={a.attendance_id} className="px-4 py-3 flex justify-between items-center text-sm">
                                    <div>
                                        <p className="font-bold text-gray-900">{formatDate(a.timestamp)}</p>
                                        <p className="text-xs text-gray-500">Shalat {a.type.replace('_', ' ')}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                        a.status === 'HADIR' ? "bg-emerald-100 text-emerald-700" :
                                        a.status === 'IZIN' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                                    }`}>
                                        {a.status === 'HADIR' ? 'Hadir' : a.status === 'IZIN' ? 'Izin' : 'Tidak Hadir'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderKeuanganView = () => (
        <div className="space-y-6">
            <ViewHeader title="Keuangan & Top Up" onBack={() => setCurrentView("dashboard")} />
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h4 className="font-bold text-gray-900 mb-4">Top Up Saldo Jajan</h4>
                <div className="grid grid-cols-2 gap-3 mb-6">
                    {["20000", "50000", "100000", "200000"].map(v => (
                        <button key={v} onClick={() => openWhatsApp(`Halo admin, saya wali santri dari:\nNama Santri: ${student.full_name}\nKelas: ${student.student_class}\n\nSaya ingin top up saldo jajan sebesar ${formatRupiah(parseInt(v))}.`)} className="py-3 bg-gray-50 hover:bg-emerald-50 border border-gray-100 hover:border-emerald-200 rounded-xl font-bold text-gray-800 transition-all">
                            {formatRupiah(parseInt(v))}
                        </button>
                    ))}
                </div>
                <button onClick={() => openWhatsApp(`Halo admin, saya wali santri dari:\nNama Santri: ${student.full_name}\nKelas: ${student.student_class}\n\nSaya ingin top up saldo jajan dengan nominal khusus.`)} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold shadow-md shadow-emerald-100 flex items-center justify-center gap-2">
                    <span className="material-icons text-sm">payments</span> Top Up Nominal Lain
                </button>
            </div>
            <div className="bg-blue-600 p-6 rounded-3xl shadow-lg relative overflow-hidden text-white">
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <h4 className="font-bold text-lg mb-1">Butuh Bantuan?</h4>
                        <p className="text-blue-100 text-sm">Hubungi bagian keuangan untuk info SPP.</p>
                    </div>
                    <button onClick={() => openWhatsApp(`Halo admin keuangan Pesantren Nurul Ihsan, saya ingin menanyakan terkait pembayaran santri anak saya ${student.full_name}.`)} className="p-3 bg-white text-blue-600 rounded-2xl shadow-lg">
                        <span className="material-icons opacity-80">chat_bubble</span>
                    </button>
                </div>
            </div>
        </div>
    );

    const renderDonasiView = () => (
        <div className="space-y-6">
            <ViewHeader title="Donasi Pesantren" onBack={() => setCurrentView("dashboard")} />
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center">
                <p className="text-sm text-gray-600 mb-6 italic">&quot;Scan QRIS untuk berdonasi membantu pembangunan dan kegiatan Pesantren Nurul Ihsan.&quot;</p>
                <div className="bg-gray-50 p-4 rounded-2xl inline-block mb-6 border-4 border-emerald-600/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/qris_donasi_pesantren.jpg" alt="QRIS Donasi" className="w-64 h-auto" />
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                    {["20000", "50000", "100000", "500000"].map(v => (
                        <button key={v} onClick={() => openWhatsApp(`Saya telah melakukan donasi melalui QRIS sebesar ${formatRupiah(parseInt(v))} untuk Pesantren Nurul Ihsan.`)} className="py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl font-bold">
                            Rp {parseInt(v) / 1000}k
                        </button>
                    ))}
                </div>
                <button onClick={() => openWhatsApp(`Saya telah melakukan donasi melalui QRIS untuk Pesantren Nurul Ihsan.`)} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                    Konfirmasi Donasi
                </button>
            </div>
        </div>
    );

    const renderKesehatanView = () => (
        <div className="space-y-6">
            <ViewHeader title="Kesehatan Santri" onBack={() => setCurrentView("dashboard")} />
            <div className={`p-6 rounded-3xl shadow-lg ${health ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                        <span className="material-icons text-3xl">{health ? 'sick' : 'sentiment_very_satisfied'}</span>
                    </div>
                    <div>
                        <h4 className="text-xl font-bold">{health ? 'Status: Sakit / Perawatan' : 'Alhamdulillah, Sehat'}</h4>
                        <p className="text-white/80 text-sm">{health ? `Terdeteksi: ${formatDate(health.timestamp)}` : 'Santri dalam keadaan prima dan sehat.'}</p>
                    </div>
                </div>
            </div>
            {health && (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                    <InfoRow label="Keluhan Utama" value={health.complaint} />
                    <InfoRow label="Pemeriksaan" value={health.diagnosis ? "✅ Sudah Diperiksa" : "⌛ Menunggu / Memantau"} />
                    <div className="pt-4 border-t border-gray-50">
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1">Diagnosa & Tindakan</p>
                        <p className="text-gray-700 italic">&quot;{health.diagnosis || "Sedang dalam pantauan kesehatan."}&quot;</p>
                        {health.medicine_given && (
                            <p className="text-emerald-700 text-xs font-bold mt-2">Obat: {health.medicine_given}</p>
                        )}
                    </div>
                </div>
            )}
            <div className="text-center bg-gray-100 p-4 rounded-2xl italic text-[10px] text-gray-500">
                Data kesehatan terintegrasi dengan klinik pesantren. Pembaruan terakhir: {formatDate(health?.timestamp || new Date().toISOString())}
            </div>
        </div>
    );

    const renderPerizinanView = () => (
        <div className="space-y-6">
            <ViewHeader title="Perizinan Santri" onBack={() => setCurrentView("dashboard")} />
            <div className="space-y-4">
                {leaves.length === 0 ? (
                    <EmptyState msg="Belum ada riwayat izin" />
                ) : (
                    leaves.map(l => (
                        <div key={l.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${l.is_returned ? 'bg-gray-100 text-gray-400' : 'bg-amber-100 text-amber-600'}`}>
                                    <span className="material-icons">{l.is_returned ? 'check_circle' : 'directions_walk'}</span>
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 capitalize leading-tight">{l.reason.replace('_', ' ')}</p>
                                    {l.notes && <p className="text-sm text-gray-700 italic mt-0.5">&quot;{l.notes}&quot;</p>}
                                    <p className="text-xs text-gray-500 mt-1">{formatDate(l.start_date)} - {formatDate(l.end_date)}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${l.is_returned ? 'text-gray-400 border border-gray-200' : 'bg-amber-500 text-white'}`}>
                                {l.is_returned ? 'Selesai' : 'Aktif'}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    const renderKedisiplinanView = () => (
        <div className="space-y-6">
            <ViewHeader title="Catatan Kedisiplinan" onBack={() => setCurrentView("dashboard")} />
            <div className="space-y-4">
                {violations.length === 0 ? (
                    <EmptyState msg="Alhamdulillah, tidak ada catatan pelanggaran" />
                ) : (
                    violations.map(v => (
                        <div key={v.id} className="bg-white p-5 rounded-3xl shadow-sm border border-red-100 flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-red-100 text-red-600 shrink-0">
                                <span className="material-icons">gavel</span>
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-gray-900">{v.violation_type} ({v.points} poin)</p>
                                <p className="text-xs text-gray-500 mb-2">{formatDate(v.violation_date)}</p>
                                <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-xs mt-2">
                                    <p className="font-semibold text-red-800 mb-1">Tindakan/Hukuman:</p>
                                    <p className="text-red-600 font-bold">{v.punishment || "Menunggu keputusan pengurus"}</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl text-center border border-emerald-100 mt-6">
                <span className="material-icons text-emerald-500 mb-2 block">info</span>
                <p className="text-xs text-emerald-800 font-medium">Sistem poin pelanggaran terintegrasi langsung dengan database pengasuhan santri.</p>
            </div>
        </div>
    );

    const renderRankingView = () => (
        <div className="space-y-6">
            <ViewHeader title="Ranking Santri" onBack={() => setCurrentView("dashboard")} />
            <div className="bg-emerald-700 p-6 rounded-3xl shadow-xl text-center text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 flex justify-center items-center pointer-events-none">
                    <span className="material-icons text-[12rem] rotate-12">stars</span>
                </div>
                <h4 className="font-black text-2xl relative z-10 mb-1 leading-tight">Ranking Terbaik</h4>
                <p className="text-emerald-100 text-sm relative z-10 opacity-80 uppercase tracking-widest font-bold">Bulan {new Date().toLocaleString('id-ID', { month: 'long' })}</p>
            </div>
            <div className="space-y-4">
                {rankings.map((r, i) => (
                    <div key={r.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-5 translate-y-0 transition-transform active:scale-95">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${
                            i === 0 ? "bg-yellow-100 text-yellow-600" : i === 1 ? "bg-slate-100 text-slate-500" : "bg-orange-100 text-orange-600"
                        }`}>
                            {i + 1}
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 text-lg leading-tight">{r.full_name}</p>
                            <p className="text-xs text-emerald-600 font-semibold">{r.category}</p>
                        </div>
                        {i === 0 && <span className="material-icons ml-auto text-yellow-500 text-3xl">emoji_events</span>}
                    </div>
                ))}
            </div>
        </div>
    );

    const renderGaleriView = () => (
        <div className="space-y-6">
            <ViewHeader title="Galeri Kegiatan" onBack={() => setCurrentView("dashboard")} />
            <div className="grid grid-cols-2 gap-3">
                {gallery.map(g => (
                    <div key={g.id} className="relative group rounded-3xl overflow-hidden shadow-md aspect-square bg-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={g.url} alt={g.title} className="w-full h-full object-cover transition-transform group-active:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                            <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-0.5">{g.category}</span>
                            <p className="text-white text-xs font-bold leading-tight">{g.title}</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="p-10 border-4 border-dashed border-gray-200 rounded-[2.5rem] flex flex-col items-center justify-center text-gray-300">
                <span className="material-icons text-5xl mb-2">add_a_photo</span>
                <p className="text-sm font-bold">Foto Lain Sedang Dimuat...</p>
            </div>
        </div>
    );

    const renderContent = () => {
        switch(currentView) {
            case "jajan": return renderJajanView();
            case "absensi": return renderAbsensiView();
            case "keuangan": return renderKeuanganView();
            case "donasi": return renderDonasiView();
            case "kesehatan": return renderKesehatanView();
            case "perizinan": return renderPerizinanView();
            case "kedisiplinan": return renderKedisiplinanView();
            case "ranking": return renderRankingView();
            case "galeri": return renderGaleriView();
            default: return (
                <>
                    <SummaryModule 
                        todaySpend={todaySpend} 
                        limit={student?.batas_jajan_harian || 15000} 
                        balance={wallet?.balance || 0} 
                        nUnpaid={billings.filter(b => b.status !== 'PAID').length} 
                    />
                    {renderDashboard()}
                    <TahfidzModule data={tahfidz} />
                    <ActivityModule attendance={attendance.slice(0,3)} meals={meals.slice(0,3)} />
                </>
            );
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24 font-sans text-gray-900">
            {/* Header */}
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
            
            <Header student={student} onLogout={handleLogout} notifications={notifications} onViewDashboard={() => setCurrentView("dashboard")} />

            <div className="max-w-md mx-auto px-4 sm:px-6 -mt-16 space-y-6 relative z-20">
                {renderContent()}
            </div>

            {/* Bottom Nav Simulation */}
            {currentView !== 'dashboard' && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce">
                    <button onClick={() => setCurrentView("dashboard")} className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-black text-sm uppercase tracking-widest">
                        <span className="material-icons">grid_view</span> Menu Utama
                    </button>
                </div>
            )}
        </div>
    );
}

// UI HELPERS (STAY IN SAME FILE AS PLANNED)
function Header({ student, onLogout, notifications, onViewDashboard }: any) {
    return (
        <div className="bg-emerald-700 pt-12 pb-24 px-6 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white opacity-10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="flex justify-between items-start relative z-10">
                <div className="cursor-pointer" onClick={onViewDashboard}>
                    <p className="text-emerald-100 text-xs font-black uppercase tracking-[0.2em] mb-1">Pesantren Nurul Ihsan</p>
                    <h1 className="text-2xl font-black text-white leading-none">Portal Wali</h1>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <button className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md text-white">
                            <span className="material-icons">notifications</span>
                        </button>
                        {notifications.length > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-emerald-700 rounded-full"></div>}
                    </div>
                    <button onClick={onLogout} className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md text-white">
                        <span className="material-icons">power_settings_new</span>
                    </button>
                </div>
            </div>
            {student && (
                <div className="mt-8 relative z-10 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="w-14 h-14 bg-white/20 rounded-[1.25rem] backdrop-blur-xl flex items-center justify-center font-black text-2xl text-white shadow-xl shadow-black/10">
                        {student.full_name.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-white font-black text-lg leading-tight">{student.full_name}</h2>
                        <p className="text-emerald-200 text-xs font-bold">NIS: {student.nis} • Kelas {student.student_class}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

function MenuCard({ title, icon, color, onClick }: any) {
    return (
        <button onClick={onClick} className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center gap-3 transition-all active:scale-95 group">
            <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-6`}>
                <span className="material-icons text-3xl">{icon}</span>
            </div>
            <span className="text-[11px] font-black text-gray-700 uppercase tracking-tight leading-tight text-center">{title}</span>
        </button>
    );
}

function ViewHeader({ title, onBack }: any) {
    return (
        <div className="flex items-center gap-4 bg-white p-3 pr-6 rounded-2xl border border-gray-100 shadow-sm animate-in slide-in-from-top-2 duration-300">
            <button onClick={onBack} className="p-2 bg-gray-50 rounded-xl text-gray-400">
                <span className="material-icons">arrow_back</span>
            </button>
            <h3 className="font-black text-lg text-gray-800 tracking-tight">{title}</h3>
        </div>
    );
}

function SummaryModule({ todaySpend, limit, balance, nUnpaid }: any) {
    return (
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 p-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 rounded-3xl p-5 border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1.5 opacity-60">E-Wallet</p>
                    <p className="text-xl font-black text-emerald-950 tracking-tighter">
                        {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(balance)}
                    </p>
                    <div className="mt-4 w-full bg-emerald-200/50 rounded-full h-1.5">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min((todaySpend / limit) * 100, 100)}%` }}></div>
                    </div>
                    <p className="text-[9px] font-bold text-emerald-700 mt-2">Jajan Hari Ini: {Math.round(todaySpend/limit * 100)}%</p>
                </div>
                <div className={`rounded-3xl p-5 border ${nUnpaid > 0 ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 opacity-60 ${nUnpaid > 0 ? 'text-red-800' : 'text-blue-800'}`}>Syahriyah</p>
                    <p className={`text-xl font-black tracking-tighter ${nUnpaid > 0 ? 'text-red-950' : 'text-blue-950'}`}>
                        {nUnpaid > 0 ? `${nUnpaid} Tunggakan` : 'Lunas ✅'}
                    </p>
                    {nUnpaid > 0 && <p className="text-[9px] font-bold text-red-600 mt-4">Segera Lakukan Pembayaran</p>}
                </div>
            </div>
        </div>
    );
}

function TahfidzModule({ data }: any) {
    if (data.length === 0) return null;
    return (
        <div className="bg-emerald-900 p-6 rounded-[2.5rem] text-white">
            <h3 className="font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="material-icons text-emerald-400 text-sm">auto_stories</span> Hafalan Terbaru
            </h3>
            <div className="space-y-3">
                {data.slice(0,2).map((t: any) => (
                    <div key={t.record_id} className="bg-white/10 p-4 rounded-3xl backdrop-blur-sm border border-white/5">
                        <div className="flex justify-between items-start">
                            <p className="font-black text-sm">{t.surah}</p>
                            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-lg">{t.grade}</span>
                        </div>
                        <p className="text-[11px] text-white/50 font-bold mt-1">Ayat {t.start_ayat} - {t.end_ayat}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ActivityModule({ attendance, meals }: any) {
    return (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-6">
            <h3 className="font-black text-sm uppercase tracking-widest mb-5 flex items-center gap-2 text-gray-400">
                <span className="material-icons text-xs">timeline</span> Aktivitas Terakhir
            </h3>
            <div className="space-y-5">
                {attendance.map((a: any) => (
                    <div key={a.attendance_id} className="flex gap-4">
                        <div className="w-1 bg-emerald-500 rounded-full h-auto"></div>
                        <div>
                            <p className="text-xs font-black text-gray-900 uppercase">Absensi {a.type.replace('_', ' ')}</p>
                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">{new Date(a.timestamp).toLocaleTimeString('id-ID')}</p>
                        </div>
                    </div>
                ))}
                {meals.map((m: any) => (
                    <div key={m.meal_log_id} className="flex gap-4">
                        <div className="w-1 bg-orange-400 rounded-full h-auto"></div>
                        <div>
                            <p className="text-xs font-black text-gray-900 uppercase">Status Makan: {m.meal_type}</p>
                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">{new Date(m.timestamp).toLocaleTimeString('id-ID')}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MenuIcon({ name, color }: any) {
    return <span className={`material-icons ${color}`}>{name}</span>;
}

function SummaryCard({ label, value }: any) {
    return (
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-sm font-black text-gray-900">{value}</p>
        </div>
    );
}

function StatCard({ label, value, color }: any) {
    return (
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm text-center">
            <p className="text-2xl font-black text-gray-900 leading-none mb-1">{value}</p>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${color}`}>{label}</p>
        </div>
    );
}

function MonthFilter({ selected, onChange }: any) {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    return (
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {months.map((m, i) => (
                <button key={m} onClick={() => onChange(i + 1)} className={`px-4 py-2 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${
                    selected === i + 1 ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100'
                }`}>
                    {m}
                </button>
            ))}
        </div>
    );
}

function InfoRow({ label, value }: any) {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">{label}</span>
            <span className="text-gray-900 font-black">{value}</span>
        </div>
    );
}

function EmptyState({ msg }: { msg: string }) {
    return (
        <div className="p-10 text-center text-gray-400">
            <p className="text-sm font-bold italic">&quot;{msg}&quot;</p>
        </div>
    );
}
