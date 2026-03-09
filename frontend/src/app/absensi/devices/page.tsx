"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/utils/api";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://50.50.50.20:8080")";

const TIPE_SESI_LIST = [
    { value: "SHALAT_SUBUH", label: "🕌 Subuh" },
    { value: "SHALAT_DZUHUR", label: "🕌 Dzuhur" },
    { value: "SHALAT_ASHAR", label: "🕌 Ashar" },
    { value: "SHALAT_MAGHRIB", label: "🕌 Maghrib" },
    { value: "SHALAT_ISYA", label: "🕌 Isya" },
    { value: "SEKOLAH_PAGI", label: "🏫 Sekolah Pagi" },
    { value: "DINIYAH_SORE", label: "📖 Diniyah Sore" },
    { value: "MALAM_KAMAR", label: "🌙 Malam Kamar" },
    { value: "KLASIKAL", label: "📚 Klasikal" },
];

interface JadwalSesi {
    id: number;
    tipe_sesi: string;
    jam_mulai: string;
    jam_selesai: string;
    is_active: boolean;
}

interface Device {
    id: number;
    device_id: string;
    nama_lokasi: string;
    is_active: boolean;
    jadwal_sesi: JadwalSesi[];
}

const emptyDevice = { device_id: "", nama_lokasi: "", is_active: true };
const emptySesi = { tipe_sesi: "SHALAT_SUBUH", jam_mulai: "05:30", jam_selesai: "05:55", is_active: true };

export default function DevicesPage() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [devForm, setDevForm] = useState({ ...emptyDevice });
    const [editId, setEditId] = useState<string | null>(null);
    const [sesiForm, setSesiForm] = useState({ ...emptySesi });
    const [activeDev, setActiveDev] = useState<string | null>(null); // device_id yang sedang tambah sesi
    const [msg, setMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        const res = await apiFetch(`${API_URL}/api/absensi/devices`);
        if (res.ok) setDevices(await res.json());
    };

    useEffect(() => { load(); }, []);

    // ── Device CRUD ──
    const handleDeviceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await apiFetch(`${API_URL}/api/absensi/devices`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(devForm),
        });
        const data = await res.json();
        if (data.success) {
            setMsg("✅ Alat berhasil disimpan!");
            setDevForm({ ...emptyDevice });
            setEditId(null);
            load();
        }
        setLoading(false);
    };

    const handleDeleteDevice = async (device_id: string) => {
        if (!confirm(`Hapus alat ${device_id} beserta semua jadwalnya?`)) return;
        await apiFetch(`${API_URL}/api/absensi/devices/${device_id}`, { method: "DELETE" });
        load();
    };

    // ── Sesi CRUD ──
    const handleAddSesi = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeDev) return;
        const res = await apiFetch(`${API_URL}/api/absensi/devices/${activeDev}/sesi`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sesiForm),
        });
        if (res.ok) {
            setMsg(`✅ Jadwal ${sesiForm.tipe_sesi} ditambahkan!`);
            setSesiForm({ ...emptySesi });
            load();
        }
    };

    const handleDeleteSesi = async (device_id: string, sesi_id: number, tipe: string) => {
        if (!confirm(`Hapus jadwal ${tipe}?`)) return;
        await apiFetch(`${API_URL}/api/absensi/devices/${device_id}/sesi/${sesi_id}`, { method: "DELETE" });
        load();
    };

    const sesiLabel = (v: string) => TIPE_SESI_LIST.find(s => s.value === v)?.label || v;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">🔧 Kelola Alat RFID</h1>
            <p className="text-sm text-gray-500 mb-6">Satu alat bisa menangani beberapa sesi (contoh: 5 waktu shalat di Masjid)</p>

            {msg && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex justify-between">
                    {msg}
                    <button onClick={() => setMsg(null)} className="text-emerald-400 hover:text-emerald-600">✕</button>
                </div>
            )}

            {/* Form tambah/edit device */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
                <h2 className="font-semibold text-gray-700 mb-4">{editId ? `Edit: ${editId}` : "➕ Tambah Alat Baru"}</h2>
                <form onSubmit={handleDeviceSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Device ID (unik)</label>
                        <input required value={devForm.device_id} disabled={!!editId}
                            onChange={e => setDevForm({ ...devForm, device_id: e.target.value })}
                            placeholder="ESP32-MASJID-01"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm disabled:bg-gray-50" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Nama Lokasi</label>
                        <input required value={devForm.nama_lokasi}
                            onChange={e => setDevForm({ ...devForm, nama_lokasi: e.target.value })}
                            placeholder="Masjid Utama"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
                    </div>
                    <div className="flex items-end gap-2">
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                            <input type="checkbox" checked={devForm.is_active}
                                onChange={e => setDevForm({ ...devForm, is_active: e.target.checked })}
                                className="rounded" />
                            Aktif
                        </label>
                        <button type="submit" disabled={loading}
                            className="flex-1 py-2.5 font-semibold text-white rounded-lg bg-emerald-500 hover:bg-emerald-600 text-sm disabled:opacity-50">
                            {editId ? "💾 Update" : "➕ Tambah"}
                        </button>
                        {editId && (
                            <button type="button" onClick={() => { setDevForm({ ...emptyDevice }); setEditId(null); }}
                                className="px-3 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-lg">Batal</button>
                        )}
                    </div>
                </form>
            </div>

            {/* Daftar devices */}
            <div className="space-y-4">
                {devices.length === 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
                        Belum ada alat terdaftar
                    </div>
                )}
                {devices.map(d => (
                    <div key={d.device_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* Device header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50 bg-gray-50">
                            <div>
                                <span className="font-mono text-sm font-bold text-gray-700">{d.device_id}</span>
                                <span className="ml-2 text-gray-500 text-sm">· {d.nama_lokasi}</span>
                                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${d.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                                    {d.is_active ? "Aktif" : "Nonaktif"}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setDevForm({ device_id: d.device_id, nama_lokasi: d.nama_lokasi, is_active: d.is_active }); setEditId(d.device_id); }}
                                    className="text-xs text-blue-500 hover:underline">Edit</button>
                                <button onClick={() => handleDeleteDevice(d.device_id)}
                                    className="text-xs text-red-500 hover:underline">Hapus</button>
                                <button onClick={() => setActiveDev(activeDev === d.device_id ? null : d.device_id)}
                                    className="text-xs bg-emerald-500 text-white px-2.5 py-1 rounded-lg hover:bg-emerald-600">
                                    {activeDev === d.device_id ? "✕ Tutup" : "+ Jadwal"}
                                </button>
                            </div>
                        </div>

                        {/* Jadwal sesi list */}
                        <div className="px-5 py-3">
                            {d.jadwal_sesi.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">Belum ada jadwal sesi — klik "+ Jadwal" untuk menambah</p>
                            ) : (
                                <div className="space-y-1">
                                    {d.jadwal_sesi.map(j => (
                                        <div key={j.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50 hover:bg-gray-100">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm">{sesiLabel(j.tipe_sesi)}</span>
                                                <span className="text-xs font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                                    {j.jam_mulai} – {j.jam_selesai}
                                                </span>
                                                {!j.is_active && <span className="text-xs text-gray-400">(nonaktif)</span>}
                                            </div>
                                            <button onClick={() => handleDeleteSesi(d.device_id, j.id, j.tipe_sesi)}
                                                className="text-xs text-red-400 hover:text-red-600">✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Form tambah jadwal sesi (expand) */}
                        {activeDev === d.device_id && (
                            <div className="px-5 pb-4 border-t border-gray-100 pt-3 bg-emerald-50">
                                <p className="text-xs font-semibold text-emerald-700 mb-2">Tambah Jadwal Sesi Baru</p>
                                <form onSubmit={handleAddSesi} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Sesi</label>
                                        <select value={sesiForm.tipe_sesi}
                                            onChange={e => setSesiForm({ ...sesiForm, tipe_sesi: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm">
                                            {TIPE_SESI_LIST.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Jam Mulai</label>
                                        <input type="time" value={sesiForm.jam_mulai}
                                            onChange={e => setSesiForm({ ...sesiForm, jam_mulai: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Jam Selesai</label>
                                        <input type="time" value={sesiForm.jam_selesai}
                                            onChange={e => setSesiForm({ ...sesiForm, jam_selesai: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm" />
                                    </div>
                                    <div className="flex items-end">
                                        <button type="submit"
                                            className="w-full py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm">
                                            ✓ Simpan
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
