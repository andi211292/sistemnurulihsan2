"use client";

import { useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

export default function LaporanKeuanganPage() {
    const [selectedBulan, setSelectedBulan] = useState(new Date().getMonth() + 1);
    const [selectedTahun, setSelectedTahun] = useState(new Date().getFullYear());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDownloadCSV = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const token = localStorage.getItem("access_token");

            // Use standard fetch or axios for blob download
            const response = await axios.get(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/keuangan/laporan/keuangan`,
                {
                    params: { bulan: selectedBulan, tahun: selectedTahun },
                    responseType: 'blob', // Important for downloading files
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            // Create a URL for the blob
            const url = window.URL.createObjectURL(new Blob([response.data]));

            // Create a temporary link element to trigger the download
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Laporan_Keuangan_${selectedBulan}_${selectedTahun}.csv`); // Filename
            document.body.appendChild(link);
            link.click();

            // Clean up
            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);

        } catch (err: any) {
            console.error(err);
            setError(
                err.response?.data?.detail ||
                "Terjadi kesalahan saat mengunduh laporan. Pastikan koneksi server berjalan dan Anda memiliki akses."
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Laporan Keuangan</h1>
                <p className="text-gray-600 mt-1">Unduh rekapitulasi transaksi Syahriyah dan E-Money.</p>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded shadow-sm">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 max-w-2xl">
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Bulan</label>
                        <select
                            value={selectedBulan}
                            onChange={(e) => setSelectedBulan(Number(e.target.value))}
                            className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5"
                        >
                            <option value={1}>Januari</option>
                            <option value={2}>Februari</option>
                            <option value={3}>Maret</option>
                            <option value={4}>April</option>
                            <option value={5}>Mei</option>
                            <option value={6}>Juni</option>
                            <option value={7}>Juli</option>
                            <option value={8}>Agustus</option>
                            <option value={9}>September</option>
                            <option value={10}>Oktober</option>
                            <option value={11}>November</option>
                            <option value={12}>Desember</option>
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Tahun</label>
                        <input
                            type="number"
                            min="2020"
                            max="2100"
                            value={selectedTahun}
                            onChange={(e) => setSelectedTahun(Number(e.target.value))}
                            className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5"
                        />
                    </div>
                </div>

                <button
                    onClick={handleDownloadCSV}
                    disabled={isLoading}
                    className="w-full py-3 px-4 flex justify-center items-center gap-2 text-white font-medium rounded-lg shadow-emerald-500/30 transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0 hover:bg-emerald-600 outline-none"
                    style={{ backgroundColor: "#10b981" }}
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Sedang Menyiapkan Laporan...
                        </>
                    ) : (
                        <>
                            <span className="text-xl">📊</span>
                            Download Laporan CSV
                        </>
                    )}
                </button>

                <p className="text-xs text-gray-500 text-center mt-4">
                    Data mencakup seluruh pemasukan Syahriyah dan Top-Up E-Money, serta pengeluaran Jajan Santri pada bulan tersebut.
                </p>
            </div>
        </div>
    );
}
