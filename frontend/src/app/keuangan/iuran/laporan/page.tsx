"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/utils/api";

// ---- Types ----
interface RekapFee {
    fee_id: number; nama_iuran: string; tipe_periode: string; nominal: number;
    kategori_dana: string; periode_label: string; total_santri: number;
    sudah_bayar_count: number; belum_bayar_count: number; total_terkumpul: number;
    sudah_bayar: SantriRow[]; belum_bayar: SantriRow[];
}
interface SantriRow {
    student_id: number; nis: string; full_name: string; student_class: string;
    dormitory: string; gender: string; nominal_dibayar?: number; status?: string; tanggal_bayar?: string;
}
interface TunggakanSantri {
    student_id: number; nis: string; full_name: string; student_class: string;
    dormitory: string; gender: string; total_tunggakan: number;
    tunggakan: { nama_iuran: string; nominal: number; sisa: number; status: string; periode_label: string }[];
}
interface KategoriData {
    bulan: number; tahun: number; grand_total: number;
    per_kategori: { kategori: string; total: number; transaksi: number; rincian: { nama_iuran: string; total: number }[] }[];
}

const BULAN_NAMES = ["", "Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const fmtRp = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

export default function LaporanIuranPage() {
    const router = useRouter();
    const now = new Date();

    const [activeTab, setActiveTab] = useState<"rekap" | "tunggakan" | "kategori">("rekap");
    const [isLoading, setIsLoading] = useState(false);

    // Rekap state
    const [rekapData, setRekapData] = useState<RekapFee[]>([]);
    const [rekapPeriode, setRekapPeriode] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`);
    const [expandedFee, setExpandedFee] = useState<number | null>(null);
    const [showTab, setShowTab] = useState<"sudah" | "belum">("belum");

    // Tunggakan state
    const [tunggakanData, setTunggakanData] = useState<TunggakanSantri[]>([]);
    const [tunggakanGender, setTunggakanGender] = useState("");
    const [expandedTunggakan, setExpandedTunggakan] = useState<number | null>(null);

    // Kategori state
    const [kategoriData, setKategoriData] = useState<KategoriData | null>(null);
    const [katBulan, setKatBulan] = useState(now.getMonth() + 1);
    const [katTahun, setKatTahun] = useState(now.getFullYear());

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) { router.push("/login"); return; }
    }, [router]);

    const fetchRekap = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await apiFetch(`/api/iuran/laporan/bulanan?periode=${rekapPeriode}`);
            if (res.ok) setRekapData(await res.json());
        } finally { setIsLoading(false); }
    }, [rekapPeriode]);

    const fetchTunggakan = useCallback(async () => {
        setIsLoading(true);
        try {
            const q = tunggakanGender ? `?gender=${tunggakanGender}` : "";
            const res = await apiFetch(`/api/iuran/laporan/tunggakan${q}`);
            if (res.ok) setTunggakanData(await res.json());
        } finally { setIsLoading(false); }
    }, [tunggakanGender]);

    const fetchKategori = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await apiFetch(`/api/iuran/laporan/kategori?bulan=${katBulan}&tahun=${katTahun}`);
            if (res.ok) setKategoriData(await res.json());
        } finally { setIsLoading(false); }
    }, [katBulan, katTahun]);

    useEffect(() => { if (activeTab === "rekap") fetchRekap(); }, [activeTab, fetchRekap]);
    useEffect(() => { if (activeTab === "tunggakan") fetchTunggakan(); }, [activeTab, fetchTunggakan]);
    useEffect(() => { if (activeTab === "kategori") fetchKategori(); }, [activeTab, fetchKategori]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-800">📊 Laporan Iuran Santri</h1>
                <p className="text-gray-500 mt-1">Rekap pembayaran, tunggakan, dan penerimaan per kategori dana</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 flex-wrap">
                {[
                    { key: "rekap", label: "📋 Rekap Bulanan" },
                    { key: "tunggakan", label: "⚠️ Daftar Tunggakan" },
                    { key: "kategori", label: "💰 Penerimaan per Dana" },
                ].map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key as "rekap"|"tunggakan"|"kategori")}
                        className={`px-5 py-2.5 rounded-xl font-medium text-sm transition ${activeTab === t.key ? "bg-gray-900 text-white shadow" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ===== TAB: REKAP BULANAN ===== */}
            {activeTab === "rekap" && (
                <div className="space-y-5">
                    {/* Periode picker */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-4 items-end">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Periode</label>
                            <input type="text" value={rekapPeriode} onChange={e => setRekapPeriode(e.target.value)}
                                placeholder="2026-03 / 2026 / 2026-S1"
                                className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-800 outline-none text-sm w-48" />
                        </div>
                        <button onClick={fetchRekap} className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition">
                            {isLoading ? "Memuat..." : "🔄 Tampilkan"}
                        </button>
                    </div>

                    {/* Summary bar */}
                    {rekapData.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {rekapData.map(r => (
                                <div key={r.fee_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                                    <p className="text-xs text-gray-500 mb-1">{r.nama_iuran}</p>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <p className="text-2xl font-black text-gray-800">{r.sudah_bayar_count}<span className="text-sm font-normal text-gray-400">/{r.total_santri}</span></p>
                                            <p className="text-xs text-gray-400">Sudah bayar</p>
                                        </div>
                                        <div className={`text-xs font-bold px-2 py-1 rounded-full ${r.belum_bayar_count === 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                            {r.belum_bayar_count} belum
                                        </div>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="mt-3 bg-gray-100 rounded-full h-1.5">
                                        <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${r.total_santri > 0 ? (r.sudah_bayar_count/r.total_santri)*100 : 0}%` }}></div>
                                    </div>
                                    <p className="text-xs text-emerald-600 font-semibold mt-2">{fmtRp(r.total_terkumpul)}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Detail per iuran */}
                    <div className="space-y-3">
                        {isLoading ? (
                            <div className="bg-white rounded-2xl p-10 text-center text-gray-400">Memuat data...</div>
                        ) : rekapData.length === 0 ? (
                            <div className="bg-white rounded-2xl p-10 text-center text-gray-400">Tidak ada data untuk periode ini</div>
                        ) : rekapData.map(r => (
                            <div key={r.fee_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <button className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition"
                                    onClick={() => setExpandedFee(expandedFee === r.fee_id ? null : r.fee_id)}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                                            <span className="material-icons text-gray-600 text-base">receipt_long</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-gray-800">{r.nama_iuran}</p>
                                            <p className="text-xs text-gray-400">Periode: {r.periode_label} · {fmtRp(r.nominal)}/santri</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right hidden sm:block">
                                            <p className="font-bold text-emerald-600">{fmtRp(r.total_terkumpul)}</p>
                                            <p className="text-xs text-gray-400">{r.sudah_bayar_count}/{r.total_santri} santri</p>
                                        </div>
                                        <span className="material-icons text-gray-400">{expandedFee === r.fee_id ? "expand_less" : "expand_more"}</span>
                                    </div>
                                </button>

                                {expandedFee === r.fee_id && (
                                    <div className="border-t border-gray-100 p-5">
                                        <div className="flex gap-2 mb-4">
                                            <button onClick={() => setShowTab("belum")}
                                                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${showTab === "belum" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                                                ❌ Belum Bayar ({r.belum_bayar_count})
                                            </button>
                                            <button onClick={() => setShowTab("sudah")}
                                                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${showTab === "sudah" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                                                ✅ Sudah Bayar ({r.sudah_bayar_count})
                                            </button>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-50 text-xs text-gray-500">
                                                    <tr>
                                                        <th className="px-3 py-2">Nama</th>
                                                        <th className="px-3 py-2">NIS</th>
                                                        <th className="px-3 py-2">Kelas</th>
                                                        <th className="px-3 py-2">Asrama</th>
                                                        {showTab === "sudah" && <>
                                                            <th className="px-3 py-2 text-right">Dibayar</th>
                                                            <th className="px-3 py-2">Status</th>
                                                            <th className="px-3 py-2">Tanggal</th>
                                                        </>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {(showTab === "belum" ? r.belum_bayar : r.sudah_bayar).map((s, i) => (
                                                        <tr key={i} className="hover:bg-gray-50">
                                                            <td className="px-3 py-2 font-medium text-gray-800">{s.full_name}</td>
                                                            <td className="px-3 py-2 text-gray-500">{s.nis}</td>
                                                            <td className="px-3 py-2 text-gray-500">{s.student_class}</td>
                                                            <td className="px-3 py-2 text-gray-500">{s.dormitory}</td>
                                                            {showTab === "sudah" && <>
                                                                <td className="px-3 py-2 text-right font-semibold text-emerald-600">{fmtRp(s.nominal_dibayar || 0)}</td>
                                                                <td className="px-3 py-2"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.status === "LUNAS" ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"}`}>{s.status}</span></td>
                                                                <td className="px-3 py-2 text-gray-500">{s.tanggal_bayar || "-"}</td>
                                                            </>}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {(showTab === "belum" ? r.belum_bayar : r.sudah_bayar).length === 0 && (
                                                <p className="text-center text-gray-400 text-sm py-4">Tidak ada data</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ===== TAB: TUNGGAKAN ===== */}
            {activeTab === "tunggakan" && (
                <div className="space-y-5">
                    {/* Filter */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                        <div className="flex gap-2">
                            {[{ v: "", l: "👥 Semua" }, { v: "PUTRA", l: "🙋‍♂️ Putra" }, { v: "PUTRI", l: "🙋‍♀️ Putri" }].map(g => (
                                <button key={g.v} onClick={() => setTunggakanGender(g.v)}
                                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${tunggakanGender === g.v ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                                    {g.l}
                                </button>
                            ))}
                        </div>
                        <button onClick={fetchTunggakan} className="px-5 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition ml-auto">
                            {isLoading ? "Memuat..." : "🔄 Refresh"}
                        </button>
                    </div>

                    {/* Summary */}
                    {tunggakanData.length > 0 && (
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-red-50 rounded-2xl border border-red-100 p-4 text-center">
                                <p className="text-3xl font-black text-red-700">{tunggakanData.length}</p>
                                <p className="text-xs text-red-500 mt-1">Santri dengan tunggakan</p>
                            </div>
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                                <p className="text-3xl font-black text-gray-800">{tunggakanData.reduce((s, t) => s + t.tunggakan.length, 0)}</p>
                                <p className="text-xs text-gray-400 mt-1">Total item tunggakan</p>
                            </div>
                            <div className="bg-orange-50 rounded-2xl border border-orange-100 p-4 text-center">
                                <p className="text-xl font-black text-orange-700">{fmtRp(tunggakanData.reduce((s, t) => s + t.total_tunggakan, 0))}</p>
                                <p className="text-xs text-orange-500 mt-1">Total nilai tunggakan</p>
                            </div>
                        </div>
                    )}

                    {/* List */}
                    <div className="space-y-3">
                        {isLoading ? (
                            <div className="bg-white rounded-2xl p-10 text-center text-gray-400">Memuat data...</div>
                        ) : tunggakanData.length === 0 ? (
                            <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-10 text-center">
                                <span className="material-icons text-5xl text-emerald-300 block mb-3">check_circle</span>
                                <p className="text-emerald-700 font-semibold">Tidak ada tunggakan! Semua santri sudah bayar.</p>
                            </div>
                        ) : tunggakanData.map(st => (
                            <div key={st.student_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition"
                                    onClick={() => setExpandedTunggakan(expandedTunggakan === st.student_id ? null : st.student_id)}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${st.gender === "PUTRI" ? "bg-pink-500" : "bg-blue-500"}`}>
                                            {st.full_name.charAt(0)}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-gray-800">{st.full_name}</p>
                                            <p className="text-xs text-gray-400">{st.nis} · {st.student_class} · {st.dormitory}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="font-bold text-red-600">{fmtRp(st.total_tunggakan)}</p>
                                            <p className="text-xs text-gray-400">{st.tunggakan.length} item</p>
                                        </div>
                                        <span className="material-icons text-gray-400">{expandedTunggakan === st.student_id ? "expand_less" : "expand_more"}</span>
                                    </div>
                                </button>
                                {expandedTunggakan === st.student_id && (
                                    <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-2">
                                        {st.tunggakan.map((t, i) => (
                                            <div key={i} className="flex justify-between items-center bg-red-50 rounded-xl px-4 py-2.5 text-sm">
                                                <div>
                                                    <p className="font-semibold text-gray-800">{t.nama_iuran}</p>
                                                    <p className="text-xs text-gray-400">Periode: {t.periode_label}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.status === "DICICIL" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{t.status}</span>
                                                    <p className="font-bold text-red-600 mt-1">{fmtRp(t.sisa)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ===== TAB: KATEGORI DANA ===== */}
            {activeTab === "kategori" && (
                <div className="space-y-5">
                    {/* Filter bulan */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-4 items-end">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Bulan</label>
                            <select value={katBulan} onChange={e => setKatBulan(Number(e.target.value))}
                                className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-800 outline-none text-sm">
                                {BULAN_NAMES.slice(1).map((b, i) => <option key={i+1} value={i+1}>{b}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Tahun</label>
                            <select value={katTahun} onChange={e => setKatTahun(Number(e.target.value))}
                                className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-800 outline-none text-sm">
                                {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <button onClick={fetchKategori} className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition">
                            {isLoading ? "Memuat..." : "🔄 Tampilkan"}
                        </button>
                    </div>

                    {kategoriData && (
                        <>
                            {/* Grand Total */}
                            <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-2xl p-6 text-white">
                                <p className="text-sm text-gray-300 mb-1">Total Penerimaan Iuran — {BULAN_NAMES[kategoriData.bulan]} {kategoriData.tahun}</p>
                                <p className="text-4xl font-black tracking-tight">{fmtRp(kategoriData.grand_total)}</p>
                                <p className="text-xs text-gray-400 mt-2">{kategoriData.per_kategori.length} kategori dana</p>
                            </div>

                            {/* Per Kategori */}
                            {kategoriData.per_kategori.length === 0 ? (
                                <div className="bg-white rounded-2xl p-10 text-center text-gray-400">
                                    <span className="material-icons text-5xl text-gray-200 block mb-3">payments</span>
                                    Belum ada penerimaan di bulan ini
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {kategoriData.per_kategori.map((k, i) => {
                                        const pct = kategoriData.grand_total > 0 ? (k.total / kategoriData.grand_total) * 100 : 0;
                                        const colors = ["bg-emerald-500", "bg-blue-500", "bg-purple-500", "bg-orange-500", "bg-pink-500"];
                                        const color = colors[i % colors.length];
                                        return (
                                            <div key={k.kategori} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <p className="font-bold text-gray-800">{k.kategori}</p>
                                                        <p className="text-xs text-gray-400">{k.transaksi} transaksi</p>
                                                    </div>
                                                    <span className="text-lg font-black text-gray-700">{pct.toFixed(1)}%</span>
                                                </div>
                                                <p className="text-2xl font-black text-gray-900 mb-3">{fmtRp(k.total)}</p>
                                                <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                                                    <div className={`${color} h-2 rounded-full`} style={{ width: `${pct}%` }}></div>
                                                </div>
                                                {/* Rincian per iuran */}
                                                <div className="space-y-1.5">
                                                    {k.rincian.map((r, j) => (
                                                        <div key={j} className="flex justify-between text-xs text-gray-500">
                                                            <span>{r.nama_iuran}</span>
                                                            <span className="font-semibold">{fmtRp(r.total)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                    {isLoading && <div className="bg-white rounded-2xl p-10 text-center text-gray-400">Memuat data...</div>}
                </div>
            )}
        </div>
    );
}
