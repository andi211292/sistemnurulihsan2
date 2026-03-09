"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/utils/api";

const API_URL = "";

const SESI_JAMAAH = ["SHALAT_SUBUH", "SHALAT_DZUHUR", "SHALAT_ASHAR", "SHALAT_MAGHRIB", "SHALAT_ISYA"];
const SESI_SEKOLAH = ["SEKOLAH_PAGI", "DINIYAH_SORE", "KLASIKAL"];
const SESI_KAMAR = ["MALAM_KAMAR"];

const SESI_LABEL: Record<string, string> = {
    SHALAT_SUBUH: "🕌 Subuh",
    SHALAT_DZUHUR: "🕌 Dzuhur",
    SHALAT_ASHAR: "🕌 Ashar",
    SHALAT_MAGHRIB: "🕌 Maghrib",
    SHALAT_ISYA: "🕌 Isya",
    SEKOLAH_PAGI: "🏫 Sekolah Pagi",
    DINIYAH_SORE: "📖 Diniyah Sore",
    KLASIKAL: "📚 Klasikal",
    MALAM_KAMAR: "🌙 Malam Kamar",
};

interface RekapData {
    tanggal: string;
    total_santri: number;
    jamaah: { hadir: number; izin: number; alpa: number; total: number };
    sekolah: { hadir: number; izin: number; alpa: number; total: number };
    kamar: { hadir: number; izin: number; alpa: number; total: number };
    detail_per_sesi: Record<string, number>;
}

interface AbsensiDetail {
    student_id: number;
    nama: string;
    kelas: string;
    sesi: string;
    status: string;
    device_id: string;
    waktu: string;
}

function ProgressBar({ hadir, izin, total }: { hadir: number; izin: number; total: number }) {
    if (total === 0) return <div className="h-2 bg-gray-100 rounded-full" />;
    const pHadir = (hadir / total) * 100;
    const pIzin = (izin / total) * 100;
    return (
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
            <div style={{ width: `${pHadir}%` }} className="bg-emerald-500 transition-all" />
            <div style={{ width: `${pIzin}%` }} className="bg-amber-400 transition-all" />
        </div>
    );
}

function KategoriCard({ label, icon, data }: { label: string; icon: string; data: RekapData["jamaah"] }) {
    const alpa = data.alpa;
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{icon}</span>
                <h3 className="font-bold text-gray-800">{label}</h3>
            </div>
            <ProgressBar hadir={data.hadir} izin={data.izin} total={data.total} />
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div>
                    <p className="text-xl font-bold text-emerald-600">{data.hadir}</p>
                    <p className="text-xs text-gray-500">Hadir</p>
                </div>
                <div>
                    <p className="text-xl font-bold text-amber-500">{data.izin}</p>
                    <p className="text-xs text-gray-500">Izin</p>
                </div>
                <div>
                    <p className="text-xl font-bold text-red-500">{alpa}</p>
                    <p className="text-xs text-gray-500">Alpa</p>
                </div>
            </div>
        </div>
    );
}

// Fungsi tanggal lokal (bukan UTC) — penting untuk WIB
function getLocalDateStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

export default function AbsensiPage() {
    const [tanggal, setTanggal] = useState(getLocalDateStr);
    const [gender, setGender] = useState("");
    const [rekap, setRekap] = useState<RekapData | null>(null);
    const [detail, setDetail] = useState<AbsensiDetail[]>([]);
    const [sesiFilter, setSesiFilter] = useState("");
    const [loading, setLoading] = useState(false);

    const loadRekap = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ tanggal });
            if (gender) params.append("gender", gender);
            const res = await apiFetch(`${API_URL}/api/absensi/rekap?${params}`);
            if (res.ok) setRekap(await res.json());
        } finally {
            setLoading(false);
        }
    }, [tanggal, gender]);

    const loadDetail = useCallback(async () => {
        const params = new URLSearchParams({ tanggal });
        if (gender) params.append("gender", gender);
        if (sesiFilter) params.append("sesi", sesiFilter);
        const res = await apiFetch(`${API_URL}/api/absensi/rekap/santri?${params}`);
        if (res.ok) setDetail(await res.json());
    }, [tanggal, gender, sesiFilter]);

    useEffect(() => { loadRekap(); }, [loadRekap]);
    useEffect(() => { loadDetail(); }, [loadDetail]);

    // Auto-refresh setiap 30 detik
    useEffect(() => {
        const interval = setInterval(() => {
            loadRekap();
            loadDetail();
        }, 30000);
        return () => clearInterval(interval);
    }, [loadRekap, loadDetail]);

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            HADIR: "bg-emerald-100 text-emerald-700",
            IZIN: "bg-amber-100 text-amber-700",
            SAKIT: "bg-blue-100 text-blue-700",
            ALPA: "bg-red-100 text-red-700",
        };
        return `px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || "bg-gray-100 text-gray-600"}`;
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">📍 Monitor Absensi</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Rekap harian per kategori (Jamaah, Sekolah, Kamar)</p>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <input
                        type="date" value={tanggal}
                        onChange={e => setTanggal(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <select value={gender} onChange={e => setGender(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        <option value="">Semua</option>
                        <option value="PUTRA">Putra</option>
                        <option value="PUTRI">Putri</option>
                    </select>
                    <button onClick={() => { loadRekap(); loadDetail(); }}
                        className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-600">
                        {loading ? "⏳" : "🔄 Refresh"}
                    </button>
                </div>
            </div>

            {/* Rekap Cards */}
            {rekap && (
                <>
                    <p className="text-xs text-gray-400 mb-3">Total santri: {rekap.total_santri}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <KategoriCard label="Jamaah Shalat" icon="🕌" data={rekap.jamaah} />
                        <KategoriCard label="Sekolah & Diniyah" icon="🏫" data={rekap.sekolah} />
                        <KategoriCard label="Keberadaan Malam" icon="🌙" data={rekap.kamar} />
                    </div>

                    {/* Detail per sesi */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
                        <h3 className="font-bold text-gray-700 mb-3">Detail Sesi</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {Object.entries(rekap.detail_per_sesi).map(([sesi, count]) => (
                                <button key={sesi}
                                    onClick={() => setSesiFilter(sesiFilter === sesi ? "" : sesi)}
                                    className={`p-3 rounded-xl border text-left transition-all ${sesiFilter === sesi ? "border-emerald-400 bg-emerald-50" : "border-gray-200 hover:border-gray-300"}`}>
                                    <p className="text-xs text-gray-500">{SESI_LABEL[sesi] || sesi}</p>
                                    <p className="text-lg font-bold text-gray-800">{count}</p>
                                    <p className="text-xs text-gray-400">hadir</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Tabel Detail Santri */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-700">
                        Detail Santri {sesiFilter ? `— ${SESI_LABEL[sesiFilter] || sesiFilter}` : "(semua sesi)"}
                    </h3>
                    {sesiFilter && (
                        <button onClick={() => setSesiFilter("")}
                            className="text-xs text-gray-400 hover:text-red-500">✕ Reset filter</button>
                    )}
                </div>
                {detail.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">Belum ada data absensi</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-left">
                                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-600 rounded-l-lg">Nama</th>
                                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-600">Kelas</th>
                                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-600">Sesi</th>
                                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-600">Status</th>
                                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-600">Alat</th>
                                    <th className="px-3 py-2.5 text-xs font-semibold text-gray-600 rounded-r-lg">Waktu</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {detail.map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-3 py-2.5 font-medium text-gray-800">{row.nama}</td>
                                        <td className="px-3 py-2.5 text-gray-500 text-xs">{row.kelas}</td>
                                        <td className="px-3 py-2.5 text-gray-600 text-xs">{SESI_LABEL[row.sesi] || row.sesi}</td>
                                        <td className="px-3 py-2.5">
                                            <span className={statusBadge(row.status)}>{row.status}</span>
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-400 text-xs font-mono">{row.device_id || "—"}</td>
                                        <td className="px-3 py-2.5 text-gray-600">{row.waktu}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
