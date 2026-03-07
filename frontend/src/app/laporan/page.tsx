"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/api";

interface Student {
    student_id: number;
    nis: string;
    full_name: string;
    student_class: string;
    dormitory: string;
}

interface Transaction {
    transaction_id: number;
    amount: number;
    type: string;
    description: string;
    created_at: string;
}

interface Violation {
    id: number;
    student_id: number;
    violation_date: string;
    violation_type: string;
    punishment: string;
    points: number;
}

interface Leave {
    id: number;
    student_id: number;
    start_date: string;
    end_date: string;
    reason: string;
    notes: string | null;
    is_returned: boolean;
}

export default function LaporanPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [violations, setViolations] = useState<Violation[]>([]);
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState("");
    const [currentMonthNum, setCurrentMonthNum] = useState(0);
    const [currentYear, setCurrentYear] = useState(0);

    useEffect(() => {
        const date = new Date();
        const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        setCurrentMonth(`${monthNames[date.getMonth()]} ${date.getFullYear()}`);
        setCurrentMonthNum(date.getMonth() + 1);
        setCurrentYear(date.getFullYear());

        const fetchData = async () => {
            setLoading(true);
            try {
                const stRes = await fetch("http://50.50.50.10:8080/api/students/");
                if (stRes.ok) setStudents(await stRes.json());

                // Gunakan apiFetch (membawa token JWT otomatis)
                const violRes = await apiFetch("http://50.50.50.10:8080/api/academic/student-violations");
                if (violRes.ok) setViolations(await violRes.json());

                const leaveRes = await apiFetch("http://50.50.50.10:8080/api/academic/student-leaves");
                if (leaveRes.ok) setLeaves(await leaveRes.json());

            } catch (error) {
                console.error("Failed to load report data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handlePrint = () => {
        window.print();
    };

    const handleExportCSVPelanggaran = () => {
        if (violations.length === 0) return;

        const headers = ["Tanggal", "NIS", "Nama Santri", "Kelas", "Pelanggaran", "Poin", "Takzir"];
        const rows = violations.map(v => {
            const student = students.find(s => s.student_id === v.student_id);
            return [
                `"${v.violation_date}"`,
                `"${student?.nis || ''}"`,
                `"${student?.full_name || ''}"`,
                `"${student?.student_class || ''}"`,
                `"${v.violation_type}"`,
                v.points,
                `"${v.punishment}"`
            ].join(";");
        });

        const csvContent = [headers.join(";"), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Data_Pelanggaran_${currentMonth}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Filter pelanggaran & izin bulan ini saja
    const violasisBulanIni = violations.filter(v => {
        if (!v.violation_date) return false;
        const d = new Date(v.violation_date);
        return d.getMonth() + 1 === currentMonthNum && d.getFullYear() === currentYear;
    });
    const leavesBulanIni = leaves.filter(l => {
        if (!l.start_date) return false;
        const d = new Date(l.start_date);
        return d.getMonth() + 1 === currentMonthNum && d.getFullYear() === currentYear;
    });

    // Derived Statistics
    const totalStudents = students.length;
    const totalViolations = violasisBulanIni.length;
    const totalPoints = violasisBulanIni.reduce((acc, curr) => acc + curr.points, 0);
    const totalLeaves = leavesBulanIni.length;

    const formatDate = (iso: string) => {
        if (!iso) return "-";
        return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    };

    return (
        <div className="space-y-6 print:space-y-4 print:bg-white print:text-black min-h-screen">

            {/* INVISIBLE ON SCREEN, VISIBLE ON PRINT (Kop Surat) */}
            <div className="hidden print:block w-full border-b-4 border-emerald-900 pb-4 mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-emerald-900 uppercase tracking-widest">Pondok Pesantren Nurul Ihsan</h1>
                        <p className="text-gray-800 text-sm mt-1">Jl. KH. Wahid Hasyim No.123, Kabupaten Jombang, Jawa Timur</p>
                        <p className="text-gray-800 text-sm">Telp: (0321) 861234 | Email: info@nurulihsan.ac.id</p>
                    </div>
                </div>
                <div className="mt-8 text-center w-full">
                    <h2 className="text-xl font-bold uppercase decoration-2 underline underline-offset-4">Laporan Evaluasi Bulanan</h2>
                    <p className="font-semibold mt-2">Periode: {currentMonth}</p>
                </div>
            </div>

            {/* SCREEN ONLY ACTION BAR */}
            <div className="flex justify-between items-center print:hidden bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">🖨️ Cetak Laporan Bulanan</h1>
                    <p className="text-gray-500 mt-1">Rekap data demografi, keuangan, dan kedisiplinan periode {currentMonth}.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleExportCSVPelanggaran}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-transform active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        Export CSV Kedisiplinan
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-transform active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                        Print Laporan PDF
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20 print:hidden">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                </div>
            ) : (
                <div className="space-y-8 print:space-y-6">
                    {/* SECTION 1: Executive Summary */}
                    <section>
                        <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4 print:text-black">1. Ringkasan Eksekutif (Dashboard)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
                            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl print:border-black print:bg-white print:rounded-none">
                                <div className="text-emerald-800 font-semibold mb-2 print:text-black">Total Santri Aktif</div>
                                <div className="text-4xl font-black text-emerald-600 print:text-black">{totalStudents} Jiwa</div>
                            </div>
                            <div className="bg-red-50 border border-red-100 p-6 rounded-xl print:border-black print:bg-white print:rounded-none">
                                <div className="text-red-800 font-semibold mb-2 print:text-black">Pelanggaran (Bulan Ini)</div>
                                <div className="text-4xl font-black text-red-600 print:text-black">{totalViolations} Kasus</div>
                            </div>
                            <div className="bg-orange-50 border border-orange-100 p-6 rounded-xl print:border-black print:bg-white print:rounded-none">
                                <div className="text-orange-800 font-semibold mb-2 print:text-black">Akumulasi Poin Takzir</div>
                                <div className="text-4xl font-black text-orange-600 print:text-black">-{totalPoints} Poin</div>
                            </div>
                            <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl print:border-black print:bg-white print:rounded-none">
                                <div className="text-blue-800 font-semibold mb-2 print:text-black">Izin / Sakit (Bulan Ini)</div>
                                <div className="text-4xl font-black text-blue-600 print:text-black">{totalLeaves} Santri</div>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 2: Demografi Santri */}
                    <section className="print:break-inside-avoid">
                        <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4 print:text-black">2. Demografi Distribusi Asrama</h3>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-black">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 border-b border-gray-200 print:bg-white print:border-black">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold text-gray-700 print:text-black">Nama Asrama / Kamar</th>
                                        <th className="px-6 py-3 font-semibold text-gray-700 text-center print:text-black">Jumlah Penghuni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 print:divide-black">
                                    {/* Grouping Logic for Dormitories */}
                                    {Array.from(new Set(students.map(s => s.dormitory))).map(dorm => {
                                        const count = students.filter(s => s.dormitory === dorm).length;
                                        return (
                                            <tr key={dorm}>
                                                <td className="px-6 py-3 font-medium text-gray-900 print:text-black">{dorm}</td>
                                                <td className="px-6 py-3 text-center text-gray-700 print:text-black">{count} Santri</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* SECTION 3: Kasus Major */}
                    <section className="print:break-inside-avoid">
                        <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4 print:text-black">3. Residu / Catatan Kedisiplinan Kritis (Bulan Ini)</h3>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-black">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 border-b border-gray-200 print:bg-white print:border-black">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold text-gray-700 print:text-black">Tanggal</th>
                                        <th className="px-6 py-3 font-semibold text-gray-700 print:text-black">Santri Terlibat</th>
                                        <th className="px-6 py-3 font-semibold text-gray-700 print:text-black">Pelanggaran</th>
                                        <th className="px-6 py-3 font-semibold text-gray-700 text-center print:text-black">Poin/Takzir</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 print:divide-black text-gray-700 print:text-black">
                                    {violasisBulanIni.length > 0 ? violasisBulanIni.map(v => (
                                        <tr key={v.id}>
                                            <td className="px-6 py-3">{formatDate(v.violation_date)}</td>
                                            <td className="px-6 py-3 font-medium">{students.find(s => s.student_id === v.student_id)?.full_name || `Santri #${v.student_id}`}</td>
                                            <td className="px-6 py-3 text-red-600 font-medium print:text-black">{v.violation_type}</td>
                                            <td className="px-6 py-3 text-center w-48 truncate" title={v.punishment}>-{v.points} ({v.punishment})</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={4} className="px-6 py-8 text-center italic text-gray-500 print:text-black">Nihil / Nol Kasus. Keadaan kondusif.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* SECTION 4: Riwayat Izin & Sakit */}
                    <section className="print:break-inside-avoid">
                        <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4 print:text-black">4. Riwayat Izin & Sakit (Bulan Ini)</h3>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-black">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 border-b border-gray-200 print:bg-white print:border-black">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold text-gray-700 print:text-black">Santri</th>
                                        <th className="px-6 py-3 font-semibold text-gray-700 print:text-black">Kelas</th>
                                        <th className="px-6 py-3 font-semibold text-gray-700 print:text-black">Alasan</th>
                                        <th className="px-6 py-3 font-semibold text-gray-700 print:text-black">Mulai</th>
                                        <th className="px-6 py-3 font-semibold text-gray-700 print:text-black">Selesai</th>
                                        <th className="px-6 py-3 font-semibold text-gray-700 text-center print:text-black">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 print:divide-black text-gray-700 print:text-black">
                                    {leavesBulanIni.length > 0 ? leavesBulanIni.map(l => {
                                        const st = students.find(s => s.student_id === l.student_id);
                                        return (
                                            <tr key={l.id}>
                                                <td className="px-6 py-3 font-medium">{st?.full_name || `Santri #${l.student_id}`}</td>
                                                <td className="px-6 py-3 text-gray-500">{st?.student_class || "-"}</td>
                                                <td className="px-6 py-3">{l.reason.replace("_", " ")}</td>
                                                <td className="px-6 py-3">{formatDate(l.start_date)}</td>
                                                <td className="px-6 py-3">{formatDate(l.end_date)}</td>
                                                <td className="px-6 py-3 text-center">
                                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase ${l.is_returned ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                                        {l.is_returned ? "Kembali" : "Di Luar"}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr><td colSpan={6} className="px-6 py-8 text-center italic text-gray-500 print:text-black">Tidak ada izin bulan ini.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* SIGNATURE AREA (Only really visible/makes sense on print) */}
                    <div className="hidden print:flex justify-end mt-16 pt-8">
                        <div className="text-center w-64 text-black">
                            <p className="mb-20">Jombang, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />Kepala Administrasi Pesantren</p>
                            <p className="font-bold underline decoration-1 underline-offset-4">K.H. Fulan bin Fulan</p>
                            <p className="text-sm mt-1">NIP: 19800101 200501 1 003</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
