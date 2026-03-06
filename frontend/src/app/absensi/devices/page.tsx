"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/utils/api";

const API_URL = "http://127.0.0.1:8080";

const TIPE_SESI_LIST = [
    "SHALAT_SUBUH", "SHALAT_DZUHUR", "SHALAT_ASHAR", "SHALAT_MAGHRIB", "SHALAT_ISYA",
    "SEKOLAH_PAGI", "DINIYAH_SORE", "MALAM_KAMAR", "KLASIKAL"
];

interface Device {
    id: number;
    device_id: string;
    nama_lokasi: string;
    tipe_sesi: string;
    jam_mulai: number;
    jam_selesai: number;
    is_active: boolean;
}

const emptyForm = { device_id: "", nama_lokasi: "", tipe_sesi: "SHALAT_SUBUH", jam_mulai: 3, jam_selesai: 7, is_active: true };

export default function DevicesPage() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [form, setForm] = useState({ ...emptyForm });
    const [editId, setEditId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    const load = async () => {
        const res = await apiFetch(`${API_URL}/api/absensi/devices`);
        if (res.ok) setDevices(await res.json());
    };

    useEffect(() => { load(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await apiFetch(`${API_URL}/api/absensi/devices`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) {
                setMsg("✅ Alat berhasil disimpan!");
                setForm({ ...emptyForm });
                setEditId(null);
                load();
            } else {
                setMsg("❌ Gagal menyimpan.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (d: Device) => {
        setForm({
            device_id: d.device_id, nama_lokasi: d.nama_lokasi, tipe_sesi: d.tipe_sesi,
            jam_mulai: d.jam_mulai, jam_selesai: d.jam_selesai, is_active: d.is_active
        });
        setEditId(d.device_id);
    };

    const handleDelete = async (device_id: string) => {
        if (!confirm(`Hapus alat ${device_id}?`)) return;
        await apiFetch(`${API_URL}/api/absensi/devices/${device_id}`, { method: "DELETE" });
        load();
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">🔧 Kelola Alat RFID</h1>

            {msg && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
                    {msg}
                </div>
            )}

            {/* Form */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
                <h2 className="font-semibold text-gray-700 mb-4">{editId ? `Edit: ${editId}` : "Tambah Alat Baru"}</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Device ID (unik)</label>
                        <input required value={form.device_id} onChange={e => setForm({ ...form, device_id: e.target.value })}
                            disabled={!!editId}
                            placeholder="ESP32-MASJID-01"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm disabled:bg-gray-50" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Nama Lokasi</label>
                        <input required value={form.nama_lokasi} onChange={e => setForm({ ...form, nama_lokasi: e.target.value })}
                            placeholder="Masjid Utama"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Tipe Sesi Absensi</label>
                        <select value={form.tipe_sesi} onChange={e => setForm({ ...form, tipe_sesi: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
                            {TIPE_SESI_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Jam Mulai</label>
                            <input type="number" min={0} max={23} value={form.jam_mulai}
                                onChange={e => setForm({ ...form, jam_mulai: +e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Jam Selesai</label>
                            <input type="number" min={0} max={24} value={form.jam_selesai}
                                onChange={e => setForm({ ...form, jam_selesai: +e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:col-span-2">
                        <input type="checkbox" id="is_active" checked={form.is_active}
                            onChange={e => setForm({ ...form, is_active: e.target.checked })}
                            className="rounded border-gray-300 text-emerald-500" />
                        <label htmlFor="is_active" className="text-sm text-gray-600">Alat aktif</label>
                    </div>
                    <div className="md:col-span-2 flex gap-3">
                        <button type="submit" disabled={loading}
                            className="flex-1 py-2.5 font-semibold text-white rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-sm">
                            {loading ? "⏳ Menyimpan..." : editId ? "💾 Update Alat" : "➕ Tambah Alat"}
                        </button>
                        {editId && (
                            <button type="button" onClick={() => { setForm({ ...emptyForm }); setEditId(null); }}
                                className="px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
                                Batal
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Tabel */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Device ID</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Lokasi</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Sesi</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Jam Aktif</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {devices.length === 0 && (
                            <tr><td colSpan={6} className="text-center text-gray-400 py-8">Belum ada alat terdaftar</td></tr>
                        )}
                        {devices.map(d => (
                            <tr key={d.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-mono text-xs text-gray-700">{d.device_id}</td>
                                <td className="px-4 py-3 text-gray-800">{d.nama_lokasi}</td>
                                <td className="px-4 py-3">
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs font-medium">{d.tipe_sesi}</span>
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-xs">{d.jam_mulai}:00 – {d.jam_selesai}:00</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                                        {d.is_active ? "Aktif" : "Nonaktif"}
                                    </span>
                                </td>
                                <td className="px-4 py-3 flex gap-2">
                                    <button onClick={() => handleEdit(d)} className="text-xs text-blue-500 hover:underline">Edit</button>
                                    <button onClick={() => handleDelete(d.device_id)} className="text-xs text-red-500 hover:underline">Hapus</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
