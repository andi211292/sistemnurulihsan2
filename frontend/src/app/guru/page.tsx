"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/api";

interface Teacher {
    teacher_id: number;
    nip: string;
    full_name: string;
    subject: string;
    status: string;
}

interface ClassSchedule {
    schedule_id: number;
    teacher_id: number;
    student_class: string;
    subject: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
}

interface TeacherAttendance {
    id: number;
    teacher_id: number;
    schedule_id: number | null;
    date: string;
    timestamp: string;
    status: string;
}

interface EmptyClassInfo {
    schedule_id: number;
    student_class: string;
    subject: string;
    time: string;
    teacher_name: string;
    status: string;
}

export default function GuruPage() {
    const [activeTab, setActiveTab] = useState<"data" | "schedule" | "attendance" | "monitor">("data");

    // States
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
    const [attendances, setAttendances] = useState<TeacherAttendance[]>([]);
    const [emptyClasses, setEmptyClasses] = useState<EmptyClassInfo[]>([]);

    const [loading, setLoading] = useState(false);

    // Form Modals states
    const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
    const [formTeacher, setFormTeacher] = useState({ nip: "", full_name: "", subject: "", status: "ACTIVE" });

    const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);
    const [formSchedule, setFormSchedule] = useState({ teacher_id: "", student_class: "", subject: "", day_of_week: "SENIN", start_time: "08:00", end_time: "09:30" });

    // Attendance Form
    const [attScheduleId, setAttScheduleId] = useState("");

    // Fetchers
    const fetchTeachers = async () => {
        try {
            const res = await apiFetch("http://50.50.50.10:8080/api/academic/teachers");
            if (res.ok) setTeachers(await res.json());
        } catch (e) { }
    };

    const fetchSchedules = async () => {
        try {
            const res = await apiFetch("http://50.50.50.10:8080/api/academic/schedules");
            if (res.ok) setSchedules(await res.json());
        } catch (e) { }
    };

    const fetchAttendances = async () => {
        try {
            const res = await apiFetch("http://50.50.50.10:8080/api/academic/teacher-attendances");
            if (res.ok) setAttendances(await res.json());
        } catch (e) { }
    };

    const fetchEmptyClasses = async () => {
        setLoading(true);
        try {
            const res = await apiFetch("http://50.50.50.10:8080/api/academic/empty-classes");
            if (res.ok) setEmptyClasses(await res.json());
        } catch (e) { } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchTeachers(); // Always need teacher names
        if (activeTab === "schedule") fetchSchedules();
        if (activeTab === "attendance") {
            fetchSchedules();
            fetchAttendances();
        }
        if (activeTab === "monitor") fetchEmptyClasses();
    }, [activeTab]);

    // Handlers
    const handleAddTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await apiFetch("http://50.50.50.10:8080/api/academic/teachers", {
            method: "POST", body: JSON.stringify(formTeacher)
        });
        if (res.ok) {
            setIsAddTeacherOpen(false); setFormTeacher({ nip: "", full_name: "", subject: "", status: "ACTIVE" }); fetchTeachers();
        }
    };

    const handleAddSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await apiFetch("http://50.50.50.10:8080/api/academic/schedules", {
            method: "POST",
            body: JSON.stringify({ ...formSchedule, teacher_id: parseInt(formSchedule.teacher_id) })
        });
        if (res.ok) {
            setIsAddScheduleOpen(false); fetchSchedules();
        }
    };

    const handleAddAttendance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!attScheduleId) return;
        const sched = schedules.find(s => s.schedule_id === parseInt(attScheduleId));
        if (!sched) return;

        const res = await apiFetch("http://50.50.50.10:8080/api/academic/teacher-attendances", {
            method: "POST",
            body: JSON.stringify({
                teacher_id: sched.teacher_id,
                schedule_id: sched.schedule_id,
                date: new Date().toISOString().split('T')[0],
                status: "HADIR"
            })
        });
        if (res.ok) {
            setAttScheduleId(""); fetchAttendances(); alert("Kehadiran Berhasil Disimpan!");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">👨‍🏫 Sistem Administrasi Guru</h1>
                <p className="text-gray-500 mt-1">Kelola data pengajar, jadwal kelas per-jam, hingga monitor kelas kosong secara real-time.</p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 border-b border-gray-200 overflow-x-auto pb-1">
                <button onClick={() => setActiveTab("data")} className={`whitespace-nowrap py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === "data" ? "border-emerald-500 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    Data Master Guru
                </button>
                <button onClick={() => setActiveTab("schedule")} className={`whitespace-nowrap py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === "schedule" ? "border-emerald-500 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    Buku Jadwal Pelajaran
                </button>
                <button onClick={() => setActiveTab("attendance")} className={`whitespace-nowrap py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === "attendance" ? "border-emerald-500 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    Presensi Kelas
                </button>
                <button onClick={() => setActiveTab("monitor")} className={`whitespace-nowrap flex items-center gap-2 py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === "monitor" ? "border-red-500 text-red-600 bg-red-50/50" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Monitor Kelas Kosong
                </button>
            </div>

            {/* Content: TAB 1 - Data Guru */}
            {activeTab === "data" && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h2 className="font-semibold text-gray-700">Daftar Pengajar & Ustadz</h2>
                        <button onClick={() => setIsAddTeacherOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">+ Tambah Guru</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-white text-gray-600 font-semibold border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">NIP</th>
                                    <th className="px-6 py-4">Nama Lengkap</th>
                                    <th className="px-6 py-4">Spesialisasi Mapel</th>
                                    <th className="px-6 py-4 text-center">Status Berhenti/Aktif</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {teachers.map(t => (
                                    <tr key={t.teacher_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{t.nip}</td>
                                        <td className="px-6 py-4 text-emerald-800 font-bold">{t.full_name}</td>
                                        <td className="px-6 py-4 text-gray-600">{t.subject}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${t.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{t.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Content: TAB 2 - Jadwal Pelajaran */}
            {activeTab === "schedule" && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h2 className="font-semibold text-gray-700">Penjadwalan KBM (Kegiatan Belajar Mengajar)</h2>
                        <button onClick={() => setIsAddScheduleOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">+ Buat Jadwal / Kelas</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-white text-gray-600 font-semibold border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Hari & Waktu</th>
                                    <th className="px-6 py-4">Nama Kelas</th>
                                    <th className="px-6 py-4">Mata Pelajaran</th>
                                    <th className="px-6 py-4">Guru Pengampu</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {schedules.map(s => (
                                    <tr key={s.schedule_id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-sky-800">{s.day_of_week}</div>
                                            <div className="text-xs text-gray-500 mt-1">{s.start_time} - {s.end_time}</div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-purple-700">{s.student_class}</td>
                                        <td className="px-6 py-4 text-gray-600">{s.subject}</td>
                                        <td className="px-6 py-4 text-emerald-700 font-bold">{teachers.find(t => t.teacher_id === s.teacher_id)?.full_name || "-"}</td>
                                    </tr>
                                ))}
                                {schedules.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Jadwal masih kosong.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Content: TAB 3 - Presensi Manual */}
            {activeTab === "attendance" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="font-bold text-gray-900 mb-4">Input Kehadiran Kelas</h2>
                        <form onSubmit={handleAddAttendance} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Kelas yang Dihadiri</label>
                                <select required value={attScheduleId} onChange={e => setAttScheduleId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500">
                                    <option value="">-- Pilih Jadwal Kelas --</option>
                                    {schedules.map(s => (
                                        <option key={s.schedule_id} value={s.schedule_id}>HARI {s.day_of_week} | {s.start_time} - {s.student_class} ({s.subject}) - {teachers.find(t => t.teacher_id === s.teacher_id)?.full_name.split(' ')[0]}</option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-emerald-500/30">
                                Simpan Hadir
                            </button>
                        </form>
                    </div>
                    <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <h2 className="font-semibold text-gray-700">Log Pengajar Masuk Hari Ini</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-white text-gray-600 font-semibold border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4">Tgl & Jam Absen</th>
                                        <th className="px-6 py-4">Guru</th>
                                        <th className="px-6 py-4 text-center">ID Kelas</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {attendances.map(a => (
                                        <tr key={a.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-gray-500 text-xs font-mono">{new Date(a.timestamp).toLocaleString("id-ID")}</td>
                                            <td className="px-6 py-4 font-bold text-emerald-800">{teachers.find(t => t.teacher_id === a.teacher_id)?.full_name}</td>
                                            <td className="px-6 py-4 text-center text-gray-400">#{a.schedule_id || "?"}</td>
                                            <td className="px-6 py-4 text-center text-emerald-600 font-bold">{a.status}</td>
                                        </tr>
                                    ))}
                                    {attendances.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">Belum ada absen guru hari ini.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Content: TAB 4 - Dashboard Kelas Kosong */}
            {activeTab === "monitor" && (
                <div className="bg-red-50 rounded-xl shadow-inner border border-red-100 overflow-hidden p-6 min-h-[50vh]">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-extrabold text-red-700 flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse"></span>
                                Monitor Kelas Darurat (Real-time)
                            </h2>
                            <p className="text-red-500/80 text-sm mt-1">Sistem mendeteksi jadwal yang jamnya sudah masuk hari ini, tapi gurunya belum mengisi Absensi Kehadiran.</p>
                        </div>
                        <button onClick={fetchEmptyClasses} disabled={loading} className="px-4 py-2 bg-white text-red-600 border border-red-200 shadow-sm rounded-lg hover:bg-red-100 flex items-center font-bold text-sm">
                            {loading ? "Menyapu data..." : "Refresh Satpam"}
                        </button>
                    </div>

                    {emptyClasses.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {emptyClasses.map(ec => (
                                <div key={ec.schedule_id} className="bg-white rounded-xl shadow-lg border border-red-200 p-5 transform transition-transform hover:-translate-y-1">
                                    <div className="flex justify-between items-start mb-3 border-b border-gray-100 pb-2">
                                        <div className="font-black text-2xl text-red-600">{ec.student_class}</div>
                                        <div className="text-sm font-bold bg-red-100 text-red-800 px-2 py-1 rounded">{ec.time}</div>
                                    </div>
                                    <div className="text-gray-900 font-medium">{ec.subject}</div>
                                    <div className="mt-3 text-sm text-gray-500 flex justify-between items-center">
                                        <span>Diduga Kosong Oleh:</span>
                                        <span className="font-bold text-gray-800">{ec.teacher_name}</span>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-dashed border-red-100 text-xs text-red-500 font-mono text-center">
                                        [STATUS TERAKHIR: {ec.status}]
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-2xl border border-dashed border-red-200">
                            <h3 className="text-2xl font-bold text-emerald-600">Alhamdulillah! 🎉</h3>
                            <p className="text-emerald-500/80 mt-2">Tidak ada kelas yang dilaporkan kosong saat ini. KBM berjalan sempurna.</p>
                        </div>
                    )}
                </div>
            )}


            {/* MODAL Overlay - Add Teacher */}
            {isAddTeacherOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900">Tambah Guru Staf</h3>
                            <button onClick={() => setIsAddTeacherOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <form onSubmit={handleAddTeacher} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">NIP (Nomor Induk Pegawai)</label>
                                <input required type="text" value={formTeacher.nip} onChange={e => setFormTeacher({ ...formTeacher, nip: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500" placeholder="Contoh: 19992000" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap & Gelar</label>
                                <input required type="text" value={formTeacher.full_name} onChange={e => setFormTeacher({ ...formTeacher, full_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500" placeholder="Ust. Ahmad Fulan, S.Pd" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bidang Studi Keahlian</label>
                                <input required type="text" value={formTeacher.subject} onChange={e => setFormTeacher({ ...formTeacher, subject: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500" placeholder="Bahasa Arab" />
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                                <button type="button" onClick={() => setIsAddTeacherOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Batal</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">Simpan Guru</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL Overlay - Add Schedule */}
            {isAddScheduleOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900">Rakit Jadwal Kelas</h3>
                            <button onClick={() => setIsAddScheduleOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <form onSubmit={handleAddSchedule} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Penugasan Ustadz/Ustadzah</label>
                                <select required value={formSchedule.teacher_id} onChange={e => setFormSchedule({ ...formSchedule, teacher_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500">
                                    <option value="">-- Pilih Guru --</option>
                                    {teachers.map(t => <option key={t.teacher_id} value={t.teacher_id}>{t.full_name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ruangan / Kelas</label>
                                    <input required type="text" value={formSchedule.student_class} onChange={e => setFormSchedule({ ...formSchedule, student_class: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500" placeholder="10-IMPA" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pelajaran</label>
                                    <input required type="text" value={formSchedule.subject} onChange={e => setFormSchedule({ ...formSchedule, subject: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500" placeholder="Nahwu Shorof" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hari Pelaksanaan</label>
                                <select required value={formSchedule.day_of_week} onChange={e => setFormSchedule({ ...formSchedule, day_of_week: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500">
                                    <option value="SENIN">Senin</option>
                                    <option value="SELASA">Selasa</option>
                                    <option value="RABU">Rabu</option>
                                    <option value="KAMIS">Kamis</option>
                                    <option value="JUMAT">Jumat</option>
                                    <option value="SABTU">Sabtu</option>
                                    <option value="AHAD">Ahad / Minggu</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Jam Bel (Masuk)</label>
                                    <input required type="time" value={formSchedule.start_time} onChange={e => setFormSchedule({ ...formSchedule, start_time: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Jam Bel (Keluar)</label>
                                    <input required type="time" value={formSchedule.end_time} onChange={e => setFormSchedule({ ...formSchedule, end_time: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500" />
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                                <button type="button" onClick={() => setIsAddScheduleOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Batal</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">Terbitkan Jadwal</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

