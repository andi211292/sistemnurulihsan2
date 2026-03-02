"use client";

import { useEffect, useState } from "react";
import Head from "next/head";

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

export default function LaporanPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [violations, setViolations] = useState<Violation[]>([]);
    const [loading, setLoading] = useState(true);

    const [currentMonth, setCurrentMonth] = useState("");

    useEffect(() => {
        // Set current month string
        const date = new Date();
        const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        setCurrentMonth(`${monthNames[date.getMonth()]} ${date.getFullYear()}`);

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Students
                const stRes = await fetch("http://127.0.0.1:8080/api/students/");
                if (stRes.ok) setStudents(await stRes.json());

                // Fetch Transactions (Using Info/Log endpoint from Keuangan if available, fallback to mock if no global endpoint)
                // Assuming we can fetch recent global transactions from our wallet structure or just summing up for now.
                // We will implement a basic global fetcher assuming we have one, or just map through students if needed.
                // For this UI, let's fetch violations first.
                const violRes = await fetch("http://127.0.0.1:8080/api/academic/student-violations");
                if (violRes.ok) setViolations(await violRes.json());

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

    // Derived Statistics
    const totalStudents = students.length;
    const totalViolations = violations.length;
    const totalPoints = violations.reduce((acc, curr) => acc + curr.points, 0);

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
                                <div className="text-red-800 font-semibold mb-2 print:text-black">Angka Pelanggaran (Bulan Ini)</div>
                                <div className="text-4xl font-black text-red-600 print:text-black">{totalViolations} Kasus</div>
                            </div>
                            <div className="bg-orange-50 border border-orange-100 p-6 rounded-xl print:border-black print:bg-white print:rounded-none">
                                <div className="text-orange-800 font-semibold mb-2 print:text-black">Akumulasi Poin Takzir</div>
                                <div className="text-4xl font-black text-orange-600 print:text-black">-{totalPoints} Poin</div>
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
                                    {violations.length > 0 ? violations.map(v => (
                                        <tr key={v.id}>
                                            <td className="px-6 py-3">{v.violation_date}</td>
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
