"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { apiFetch } from "@/utils/api";

interface TahfidzRecord {
    record_id: number;
    surah: string;
    start_ayat: number;
    end_ayat: number;
    grade: string;
    date_recorded: string;
}

interface StudentProfile {
    student: {
        student_id: number;
        nis: string;
        full_name: string;
        student_class: string;
        dormitory: string;
    };
    recent_records: TahfidzRecord[];
}

export default function TahfidzPage() {
    const [rfidInput, setRfidInput] = useState("");
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Form State
    const [surah, setSurah] = useState("");
    const [startAyat, setStartAyat] = useState("");
    const [endAyat, setEndAyat] = useState("");
    const [grade, setGrade] = useState("Lancar");
    const [notes, setNotes] = useState("");

    const inputRef = useRef<HTMLInputElement>(null);

    // Autofocus handler
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [profile, successMsg]); // Re-focus on load or after success/clear

    const handleScan = async (e: FormEvent) => {
        e.preventDefault();
        if (!rfidInput.trim()) return;

        setLoading(true);
        setError(null);
        setSuccessMsg(null);
        setProfile(null);

        try {
            const res = await apiFetch(`http://127.0.0.1:8080/api/tahfidz/scan/${rfidInput}`);
            if (!res.ok) {
                if (res.status === 404) throw new Error("Santri dengan kartu ini tidak ditemukan");
                throw new Error("Terjadi kesalahan sistem");
            }
            const data = await res.json();
            setProfile(data);
        } catch (err: any) {
            setError(err.message);
            // Wait a bit, then clean up error and refocus
            setTimeout(() => {
                setError(null);
                setRfidInput("");
                inputRef.current?.focus();
            }, 3000);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitRecord = async (e: FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        setLoading(true);
        try {
            const payload = {
                surah,
                start_ayat: parseInt(startAyat),
                end_ayat: parseInt(endAyat),
                grade,
                notes: notes || null,
                student_id: profile.student.student_id,
                ustadz_user_id: 1, // Hardcoded Ustadz ID for now
                date_recorded: new Date().toISOString().split('T')[0] // YYYY-MM-DD
            };

            const res = await apiFetch("http://127.0.0.1:8080/api/tahfidz/input", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Gagal menyimpan hafalan");

            setSuccessMsg("Setoran hafalan berhasil disimpan!");

            // Reset everything after 2 seconds for the next student
            setTimeout(() => {
                setProfile(null);
                setRfidInput("");
                setSurah("");
                setStartAyat("");
                setEndAyat("");
                setGrade("Lancar");
                setNotes("");
                setSuccessMsg(null);
                inputRef.current?.focus();
            }, 2000);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Jurnal Tahfidz Pintar</h1>
                <p className="text-gray-500 mt-1">Sistem pencatatan setoran hafalan presisi dengan RFID scanner</p>
            </div>

            {/* Notifications */}
            {error && (
                <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl font-medium">
                    {error}
                </div>
            )}
            {successMsg && (
                <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-medium flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    {successMsg}
                </div>
            )}

            {/* Main Container */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* SCANNER FIELD (Always visible) */}
                {!profile && (
                    <div className="lg:col-span-12 bg-white p-12 rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center min-h-[400px]">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Menunggu Scan Kartu Santri...</h2>
                        <p className="text-gray-500 mb-8 text-center max-w-sm">Tempelkan kartu RFID ke alat pembaca. Sistem akan otomatis memunculkan profil santri.</p>

                        <form onSubmit={handleScan} className="w-full max-w-md relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={rfidInput}
                                onChange={(e) => setRfidInput(e.target.value)}
                                placeholder="Atau ketik UID manual & Enter"
                                className="w-full pl-5 pr-12 py-4 text-center text-lg bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-emerald-500 focus:bg-white transition-all shadow-inner outline-none"
                                disabled={loading}
                                autoComplete="off"
                            />
                            {loading && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </form>
                    </div>
                )}

                {/* PROFILE & HISTORY (SPLIT VIEW LEFT) */}
                {profile && (
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-0"></div>
                            <div className="relative z-10 flex items-start gap-4">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center font-bold text-xl text-emerald-700 border-2 border-white shadow-md">
                                    {profile.student.full_name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">{profile.student.full_name}</h3>
                                    <p className="text-emerald-600 font-medium">Kelas {profile.student.student_class}</p>
                                    <p className="text-sm text-gray-500 mt-1">NIS: {profile.student.nis} • {profile.student.dormitory}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                5 Setoran Terakhir
                            </h4>
                            {profile.recent_records.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-4">Belum ada riwayat setoran</p>
                            ) : (
                                <div className="space-y-3">
                                    {profile.recent_records.map(rec => (
                                        <div key={rec.record_id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center">
                                            <div>
                                                <p className="font-medium text-gray-900">{rec.surah}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">Ayat {rec.start_ayat} - {rec.end_ayat}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-xs px-2 py-1 rounded font-medium ${rec.grade.includes("Sangat") ? "bg-emerald-100 text-emerald-700" :
                                                    rec.grade === "Lancar" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"
                                                    }`}>
                                                    {rec.grade}
                                                </span>
                                                <p className="text-xs text-gray-400 mt-1">{rec.date_recorded}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* INPUT FORM (SPLIT VIEW RIGHT) */}
                {profile && (
                    <div className="lg:col-span-7 bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800">Form Setoran Baru</h3>
                            <button
                                type="button"
                                onClick={() => { setProfile(null); setRfidInput(""); }}
                                className="text-sm text-gray-400 hover:text-red-500 font-medium transition-colors"
                            >
                                Batal (Scan Ulang)
                            </button>
                        </div>

                        <form onSubmit={handleSubmitRecord} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Surah</label>
                                <input
                                    type="text"
                                    required
                                    value={surah}
                                    onChange={(e) => setSurah(e.target.value)}
                                    placeholder="Contoh: Al-Baqarah"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dari Ayat</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={startAyat}
                                        onChange={(e) => setStartAyat(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Ayat</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={endAyat}
                                        onChange={(e) => setEndAyat(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kualitas Hafalan</label>
                                <select
                                    value={grade}
                                    onChange={(e) => setGrade(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors bg-white"
                                >
                                    <option value="Sangat Lancar">Sangat Lancar</option>
                                    <option value="Lancar">Lancar</option>
                                    <option value="Kurang Lancar">Kurang Lancar</option>
                                    <option value="Terbata-bata">Terbata-bata</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan Ustadz (Opsional)</label>
                                <textarea
                                    rows={3}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Tuliskan evaluasi tajwid atau makhraj..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                                ></textarea>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50 flex justify-center items-center"
                                >
                                    {loading ? (
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        "Simpan Setoran Hafalan"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
