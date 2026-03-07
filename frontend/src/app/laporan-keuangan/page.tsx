"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://50.50.50.10:8080";

const NAMA_BULAN = [
    "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

interface TunggakanItem {
    student_id: number;
    nama: string;
    kelas: string;
    asrama: string;
    gender: string;
    total_tagihan: number;
    status: string;
}

export default function LaporanKeuanganPage() {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const [bulan, setBulan] = useState(currentMonth);
    const [tahun, setTahun] = useState(currentYear);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isLoadingTunggakan, setIsLoadingTunggakan] = useState(false);
    const [isDownloadingTunggakan, setIsDownloadingTunggakan] = useState(false);
    const [tunggakanData, setTunggakanData] = useState<TunggakanItem[] | null>(null);
    const [tunggakanPeriod, setTunggakanPeriod] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const getAuthHeader = () => {
        const token = localStorage.getItem("access_token");
        return { Authorization: `Bearer ${token}` };
    };

    const handleDownloadCSV = async () => {
        setIsDownloading(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch(
                `${API_URL}/api/keuangan/laporan/keuangan?bulan=${bulan}&tahun=${tahun}`,
                { headers: getAuthHeader() }
            );
            if (!res.ok) {
                const err = await res.json().catch(() => null);
                throw new Error(err?.detail || `Error ${res.status}`);
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Laporan_Keuangan_${bulan}_${tahun}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            setSuccess(`Laporan ${NAMA_BULAN[bulan]} ${tahun} berhasil diunduh!`);
        } catch (e: any) {
            setError(e.message || "Gagal mengunduh laporan.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleCekTunggakan = async () => {
        setIsLoadingTunggakan(true);
        setError(null);
        setTunggakanData(null);
        try {
            const res = await fetch(
                `${API_URL}/api/keuangan/laporan/tunggakan?bulan=${bulan}&tahun=${tahun}&format=json`,
                { headers: getAuthHeader() }
            );
            if (!res.ok) {
                const err = await res.json().catch(() => null);
                throw new Error(err?.detail || `Error ${res.status}`);
            }
            const data = await res.json();
            setTunggakanData(data.data);
            setTunggakanPeriod(`${NAMA_BULAN[bulan]} ${tahun}`);
        } catch (e: any) {
            setError(e.message || "Gagal mengambil data tunggakan.");
        } finally {
            setIsLoadingTunggakan(false);
        }
    };

    const handleDownloadTunggakan = async () => {
        setIsDownloadingTunggakan(true);
        try {
            const res = await fetch(
                `${API_URL}/api/keuangan/laporan/tunggakan?bulan=${bulan}&tahun=${tahun}&format=csv`,
                { headers: getAuthHeader() }
            );
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Tunggakan_Syahriyah_${bulan}_${tahun}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e: any) {
            setError("Gagal mengunduh CSV tunggakan.");
        } finally {
            setIsDownloadingTunggakan(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">📊 Laporan Keuangan</h1>
                <p className="text-gray-500 mt-1 text-sm">Rekap transaksi dan tunggakan Syahriyah bulanan.</p>
            </div>

            {/* Alerts */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded flex items-start gap-3">
                    <span className="text-red-500 text-lg">⚠️</span>
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}
            {success && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4 rounded flex items-start gap-3">
                    <span className="text-green-500 text-lg">✅</span>
                    <p className="text-sm text-green-700">{success}</p>
                </div>
            )}

            {/* Period Selector */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
                <h2 className="text-base font-semibold text-gray-700 mb-3">Pilih Periode</h2>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Bulan</label>
                        <select
                            value={bulan}
                            onChange={(e) => { setBulan(Number(e.target.value)); setTunggakanData(null); }}
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
                        >
                            {NAMA_BULAN.slice(1).map((nama, i) => (
                                <option key={i + 1} value={i + 1}>{nama}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Tahun</label>
                        <input
                            type="number" min="2020" max="2100"
                            value={tahun}
                            onChange={(e) => { setTahun(Number(e.target.value)); setTunggakanData(null); }}
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-emerald-400"
                        />
                    </div>
                </div>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Card 1: Laporan Keuangan CSV */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-xl">📊</div>
                        <div>
                            <h3 className="font-semibold text-gray-800">Laporan Keuangan</h3>
                            <p className="text-xs text-gray-500">Rekap Syahriyah & E-Money</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">Unduh file CSV berisi total pemasukan Syahriyah, Top-Up, dan pengeluaran E-Money.</p>
                    <button
                        onClick={handleDownloadCSV}
                        disabled={isDownloading}
                        className="w-full py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:-translate-y-0.5 disabled:opacity-60"
                        style={{ backgroundColor: "#10b981" }}
                    >
                        {isDownloading ? "⏳ Menyiapkan..." : "⬇️ Download CSV Keuangan"}
                    </button>
                </div>

                {/* Card 2: Tunggakan Syahriyah */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-xl">⚠️</div>
                        <div>
                            <h3 className="font-semibold text-gray-800">Tunggakan Syahriyah</h3>
                            <p className="text-xs text-gray-500">Santri belum lunas</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">Tampilkan & unduh daftar santri yang belum membayar Syahriyah pada periode yang dipilih.</p>
                    <button
                        onClick={handleCekTunggakan}
                        disabled={isLoadingTunggakan}
                        className="w-full py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:-translate-y-0.5 disabled:opacity-60"
                        style={{ backgroundColor: "#ef4444" }}
                    >
                        {isLoadingTunggakan ? "⏳ Memuat..." : "🔍 Cek Tunggakan"}
                    </button>
                </div>
            </div>

            {/* Tunggakan Table */}
            {tunggakanData !== null && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold text-gray-800">
                                Daftar Tunggakan — {tunggakanPeriod}
                            </h3>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {tunggakanData.length === 0
                                    ? "✅ Semua santri sudah lunas!"
                                    : `${tunggakanData.length} santri belum lunas`}
                            </p>
                        </div>
                        {tunggakanData.length > 0 && (
                            <button
                                onClick={handleDownloadTunggakan}
                                disabled={isDownloadingTunggakan}
                                className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-2 rounded-lg"
                                style={{ backgroundColor: "#f59e0b" }}
                            >
                                {isDownloadingTunggakan ? "⏳" : "⬇️"} Export CSV
                            </button>
                        )}
                    </div>

                    {tunggakanData.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">
                            <div className="text-5xl mb-3">🎉</div>
                            <p className="font-medium text-gray-600">Semua santri sudah lunas Syahriyah!</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-left">
                                        <th className="px-3 py-2.5 text-xs font-semibold text-gray-600 rounded-l-lg">No</th>
                                        <th className="px-3 py-2.5 text-xs font-semibold text-gray-600">Nama Santri</th>
                                        <th className="px-3 py-2.5 text-xs font-semibold text-gray-600">Kelas</th>
                                        <th className="px-3 py-2.5 text-xs font-semibold text-gray-600">Asrama</th>
                                        <th className="px-3 py-2.5 text-xs font-semibold text-gray-600">Gender</th>
                                        <th className="px-3 py-2.5 text-xs font-semibold text-gray-600">Tagihan</th>
                                        <th className="px-3 py-2.5 text-xs font-semibold text-gray-600 rounded-r-lg">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {tunggakanData.map((row, i) => (
                                        <tr key={row.student_id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-3 py-2.5 text-gray-500">{i + 1}</td>
                                            <td className="px-3 py-2.5 font-medium text-gray-800">{row.nama}</td>
                                            <td className="px-3 py-2.5 text-gray-600">{row.kelas}</td>
                                            <td className="px-3 py-2.5 text-gray-600">{row.asrama}</td>
                                            <td className="px-3 py-2.5">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.gender === 'PUTRA' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                                                    {row.gender}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-gray-700">Rp {row.total_tagihan?.toLocaleString("id-ID")}</td>
                                            <td className="px-3 py-2.5">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                    {row.status === 'PARTIAL' ? 'Sebagian' : 'Belum Bayar'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
