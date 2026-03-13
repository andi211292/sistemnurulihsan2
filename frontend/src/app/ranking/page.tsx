"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/api";

interface StudentRankingDetail {
    ranking_id: number;
    student_id: number;
    category: string;
    position: number;
    month: string;
    year: string;
    notes: string | null;
    created_at: string;
    student_name: string;
    student_class: string;
}

interface StudentRef {
    student_id: number;
    full_name: string;
    student_class: string;
}

const CATEGORIES = [
    "Santri Teladan",
    "Tahfidz Terbaik",
    "Akademik Diniyah",
    "Bintang Asrama",
    "Kebersihan Kamar"
];

const POSITIONS = [1, 2, 3];

export default function RankingPage() {
    const [rankings, setRankings] = useState<StudentRankingDetail[]>([]);
    const [students, setStudents] = useState<StudentRef[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Filters & Selectors
    const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const currentYear = new Date().getFullYear().toString();
    
    const [filterMonth, setFilterMonth] = useState(currentMonth);
    const [filterYear, setFilterYear] = useState(currentYear);
    const [filterCategory, setFilterCategory] = useState(CATEGORIES[0]);

    // Form inputs
    const [selectedStudent, setSelectedStudent] = useState("");
    const [selectedPosition, setSelectedPosition] = useState(1);
    const [notes, setNotes] = useState("");

    const fetchData = async () => {
        try {
            // Load students
            if (students.length === 0) {
                const stRes = await apiFetch(`/api/students/`);
                if (stRes.ok) setStudents(await stRes.json());
            }

            // Load rankings based on filters
            const url = `/api/ranking/?month=${filterMonth}&year=${filterYear}&category=${encodeURIComponent(filterCategory)}`;
            const rRes = await apiFetch(url);
            if (rRes.ok) setRankings(await rRes.json());
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filterMonth, filterYear, filterCategory]);

    const submitRanking = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = {
                student_id: parseInt(selectedStudent),
                category: filterCategory,
                position: selectedPosition,
                month: filterMonth,
                year: filterYear,
                notes: notes,
                created_by_user_id: 1 // Admin dummy
            };
            
            const res = await apiFetch(`/api/ranking/`, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                alert("Juara berhasil ditambahkan!");
                setSelectedStudent("");
                setNotes("");
                fetchData();
            } else {
                const errorData = await res.json();
                alert(`Gagal: ${errorData.detail}`);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const deleteRanking = async (ranking_id: number) => {
        if (!confirm("Hapus data juara ini?")) return;
        try {
            const res = await apiFetch(`/api/ranking/${ranking_id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                fetchData();
            }
        } catch (error) {
            console.error(error);
        }
    };

    // Helper to get styling based on position
    const getPositionStyle = (pos: number) => {
        if (pos === 1) return "bg-amber-100 text-amber-700 border-amber-300";
        if (pos === 2) return "bg-slate-200 text-slate-700 border-slate-300";
        if (pos === 3) return "bg-orange-100 text-orange-800 border-orange-300";
        return "bg-gray-100 text-gray-700 border-gray-300";
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">🏆 Bintang Prestasi</h1>
                    <p className="text-gray-500 mt-1">Kelola santri berprestasi bulanan untuk ditampilkan di Portal Wali.</p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Kategori Prestasi</label>
                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-3 py-2 border rounded-lg bg-gray-50 font-medium text-gray-800 outline-none focus:ring-2 focus:ring-amber-500">
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Bulan</label>
                    <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="px-3 py-2 border rounded-lg bg-gray-50">
                        {Array.from({length: 12}, (_, i) => i + 1).map(m => {
                            const mm = m.toString().padStart(2, '0');
                            return <option key={mm} value={mm}>{mm}</option>
                        })}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tahun</label>
                    <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="px-3 py-2 border rounded-lg bg-gray-50">
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                        <option value="2027">2027</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* FORM PANEL */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit">
                    <h2 className="font-bold text-gray-900 mb-4 bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-center gap-2">
                        <span className="material-icons text-amber-500">star</span> Tambah Juara Baru
                    </h2>

                    <form onSubmit={submitRanking} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Posisi Juara</label>
                            <select required value={selectedPosition} onChange={e => setSelectedPosition(parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg bg-gray-50 font-bold">
                                {POSITIONS.map(p => (
                                    <option key={p} value={p}>Juara {p}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Santri</label>
                            <select required value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-gray-50">
                                <option value="">- Pilih Santri -</option>
                                {students.map(s => <option key={s.student_id} value={s.student_id}>{s.full_name} ({s.student_class})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan / Pesan Singkat</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-gray-50 h-20 placeholder-gray-400" placeholder="Contoh: Konsisten setoran 2 juz sehari..."></textarea>
                        </div>
                        
                        <button type="submit" disabled={isSaving} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 rounded-lg mt-2 shadow-sm transition-all duration-200">
                            Simpan Bintang Prestasi
                        </button>
                    </form>
                </div>

                {/* PODIUM PANEL */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col p-6">
                    <h2 className="font-semibold text-gray-700 mb-6 flex justify-between">
                        <span>Daftar {filterCategory}</span>
                        <span className="text-amber-600 bg-amber-50 px-3 rounded-full text-sm">Bulan {filterMonth} / {filterYear}</span>
                    </h2>

                    <div className="space-y-4">
                        {rankings.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                                <span className="material-icons text-5xl mb-2 text-gray-300">emoji_events</span>
                                <p>Belum ada juara yang ditentukan untuk kategori ini.</p>
                            </div>
                        ) : (
                            rankings.map((r) => (
                                <div key={r.ranking_id} className={`border-2 rounded-xl p-4 flex items-center gap-4 relative ${getPositionStyle(r.position)}`}>
                                    <div className="w-14 h-14 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center font-black text-2xl shadow-sm">
                                        #{r.position}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg">{r.student_name}</h3>
                                        <p className="text-sm opacity-80 font-medium">Kelas: {r.student_class}</p>
                                        {r.notes && (
                                            <p className="text-xs mt-2 italic bg-white/40 p-2 rounded-md">&quot;{r.notes}&quot;</p>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => deleteRanking(r.ranking_id)}
                                        className="w-8 h-8 rounded-full bg-white/50 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors shadow-sm"
                                        title="Hapus Juara"
                                    >
                                        <span className="material-icons text-sm">close</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
