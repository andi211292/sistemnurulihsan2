"use client";

import { useEffect, useState } from "react";

interface StudentLeave {
    id: number;
    student_id: number;
    start_date: string;
    end_date: string;
    start_time: string | null;
    end_time: string | null;
    reason: string;
    notes: string | null;
    is_returned: boolean;
    return_timestamp: string | null;
}

interface StudentViolation {
    id: number;
    student_id: number;
    violation_date: string;
    violation_type: string;
    punishment: string;
    points: number;
}

interface StudentRef {
    student_id: number;
    full_name: string;
}

export default function KedisiplinanPage() {
    const [activeTab, setActiveTab] = useState<"violation" | "leave">("violation");

    const [leaves, setLeaves] = useState<StudentLeave[]>([]);
    const [violations, setViolations] = useState<StudentViolation[]>([]);
    const [students, setStudents] = useState<StudentRef[]>([]);

    // Forms
    const [leaveForm, setLeaveForm] = useState({ student_id: "", start_date: "", end_date: "", start_time: "", end_time: "", reason: "SAKIT", notes: "" });
    const [violationForm, setViolationForm] = useState({ student_id: "", violation_date: "", violation_type: "", punishment: "", points: 10 });
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = async () => {
        try {
            // Load students for dropdown
            if (students.length === 0) {
                const stRes = await fetch("http://127.0.0.1:8080/api/students/");
                if (stRes.ok) setStudents(await stRes.json());
            }

            if (activeTab === "leave") {
                const lRes = await fetch("http://127.0.0.1:8080/api/academic/student-leaves");
                if (lRes.ok) setLeaves(await lRes.json());
            } else {
                const vRes = await fetch("http://127.0.0.1:8080/api/academic/student-violations");
                if (vRes.ok) setViolations(await vRes.json());
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const submitLeave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = { ...leaveForm, student_id: parseInt(leaveForm.student_id) };
            if (leaveForm.reason !== "IZIN_KELUAR") {
                payload.start_time = "";
                payload.end_time = "";
            }

            const res = await fetch("http://127.0.0.1:8080/api/academic/student-leaves", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert("Perizinan tersimpan!");
                setLeaveForm({ student_id: "", start_date: "", end_date: "", start_time: "", end_time: "", reason: "SAKIT", notes: "" });
                fetchData();
            }
        } finally {
            setIsSaving(false);
        }
    };

    const markReturned = async (leave_id: number) => {
        try {
            const res = await fetch(`http://127.0.0.1:8080/api/academic/student-leaves/${leave_id}/return`, {
                method: "PUT"
            });
            if (res.ok) {
                alert("Status kepulangan santri berhasil diperbarui!");
                fetchData();
            } else {
                alert("Gagal memperbarui status.");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const submitViolation = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch("http://127.0.0.1:8080/api/academic/student-violations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...violationForm, student_id: parseInt(violationForm.student_id) })
            });
            if (res.ok) {
                alert("Pelanggaran dicatat!");
                setViolationForm({ student_id: "", violation_date: "", violation_type: "", punishment: "", points: 10 });
                fetchData();
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">⚖️ Mahkamah Kedisiplinan</h1>
                <p className="text-gray-500 mt-1">Sistem pencatatan pelanggaran (Takzir) dan perizinan pulang santri.</p>
            </div>

            <div className="flex space-x-1 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab("violation")}
                    className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === "violation" ? "border-sky-500 text-sky-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                >
                    Catat Pelanggaran
                </button>
                <button
                    onClick={() => setActiveTab("leave")}
                    className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === "leave" ? "border-emerald-500 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                >
                    Buku Induk Perizinan
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* FORM PANEL */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="font-bold text-gray-900 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100/50">
                        {activeTab === "violation" ? "⚠️ Input Kasus Baru" : "📝 Buat Surat Izin"}
                    </h2>

                    {activeTab === "violation" ? (
                        <form onSubmit={submitViolation} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Santri</label>
                                <select required value={violationForm.student_id} onChange={e => setViolationForm({ ...violationForm, student_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-gray-50">
                                    <option value="">- Pilih Santri -</option>
                                    {students.map(s => <option key={s.student_id} value={s.student_id}>{s.full_name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                                    <input required type="date" value={violationForm.violation_date} onChange={e => setViolationForm({ ...violationForm, violation_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-gray-50" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Poin</label>
                                    <input required type="number" min="1" value={violationForm.points} onChange={e => setViolationForm({ ...violationForm, points: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-lg bg-gray-50" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Penyebab / Bentuk Pelanggaran</label>
                                <input required type="text" value={violationForm.violation_type} onChange={e => setViolationForm({ ...violationForm, violation_type: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-gray-50" placeholder="Terlambat masuk kelas..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tindakan / Takzir</label>
                                <input required type="text" value={violationForm.punishment} onChange={e => setViolationForm({ ...violationForm, punishment: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-gray-50" placeholder="Bersihkan halaman masjid" />
                            </div>
                            <button type="submit" disabled={isSaving} className="w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 rounded-lg mt-2">Simpan Kasus</button>
                        </form>
                    ) : (
                        <form onSubmit={submitLeave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Santri yang Izin</label>
                                <select required value={leaveForm.student_id} onChange={e => setLeaveForm({ ...leaveForm, student_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-gray-50">
                                    <option value="">- Pilih Santri -</option>
                                    {students.map(s => <option key={s.student_id} value={s.student_id}>{s.full_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Alasan</label>
                                <select value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-gray-50">
                                    <option value="SAKIT">Sakit / Dirawat</option>
                                    <option value="IZIN">Izin Keperluan Keluarga</option>
                                    <option value="PULANG">Pulang Kampung</option>
                                    <option value="IZIN_KELUAR">Izin Keluar Sementara (Jam-jaman)</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tgl</label>
                                    <input required type="date" value={leaveForm.start_date} onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-gray-50" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tgl</label>
                                    <input required type="date" value={leaveForm.end_date} onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-gray-50" />
                                </div>
                            </div>
                            {leaveForm.reason === "IZIN_KELUAR" && (
                                <div className="grid grid-cols-2 gap-3 pb-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Jam Berangkat</label>
                                        <input required type="time" value={leaveForm.start_time} onChange={e => setLeaveForm({ ...leaveForm, start_time: e.target.value })} className="w-full px-3 py-2 border border-sky-300 rounded-lg bg-sky-50 focus:ring-sky-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Jam Kembali</label>
                                        <input required type="time" value={leaveForm.end_time} onChange={e => setLeaveForm({ ...leaveForm, end_time: e.target.value })} className="w-full px-3 py-2 border border-sky-300 rounded-lg bg-sky-50 focus:ring-sky-500" />
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan Tambahan</label>
                                <textarea value={leaveForm.notes} onChange={e => setLeaveForm({ ...leaveForm, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-gray-50 h-20 placeholder-gray-400" placeholder="Opsional..."></textarea>
                            </div>
                            <button type="submit" disabled={isSaving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg mt-2">Terbitkan Izin</button>
                        </form>
                    )}
                </div>

                {/* TABLE PANEL */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <h2 className="font-semibold text-gray-700">Database Rekapitulasi</h2>
                    </div>

                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-white text-gray-600 font-semibold border-b border-gray-200">
                                {activeTab === "violation" ? (
                                    <tr>
                                        <th className="px-6 py-4">Nama Santri</th>
                                        <th className="px-6 py-4">Nama Kasus</th>
                                        <th className="px-6 py-4">Tanggal Kejadian</th>
                                        <th className="px-6 py-4">Takzir Disiplin</th>
                                        <th className="px-6 py-4 text-center">Poin (−)</th>
                                    </tr>
                                ) : (
                                    <tr>
                                        <th className="px-6 py-4">Nama Santri</th>
                                        <th className="px-6 py-4">Waktu & Durasi Izin</th>
                                        <th className="px-6 py-4 text-center">Alasan</th>
                                        <th className="px-6 py-4">Keterangan</th>
                                        <th className="px-6 py-4 text-center">Status Kepulangan</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {activeTab === "violation" && violations.map(v => (
                                    <tr key={v.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 font-medium text-sky-800">{students.find(s => s.student_id === v.student_id)?.full_name || `Santri #${v.student_id}`}</td>
                                        <td className="px-6 py-3 text-red-600 font-medium">{v.violation_type}</td>
                                        <td className="px-6 py-3 text-gray-500">{v.violation_date}</td>
                                        <td className="px-6 py-3">{v.punishment}</td>
                                        <td className="px-6 py-3 text-center text-red-700 font-bold">-{v.points}</td>
                                    </tr>
                                ))}
                                {activeTab === "leave" && leaves.map(l => (
                                    <tr key={l.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 font-medium text-emerald-800">{students.find(s => s.student_id === l.student_id)?.full_name || `Santri #${l.student_id}`}</td>
                                        <td className="px-6 py-3 text-gray-500">
                                            {l.start_date} <span className="text-xs text-gray-400 mx-1">s/d</span> {l.end_date}
                                            {l.reason === "IZIN_KELUAR" && (
                                                <div className="text-xs mt-1 font-semibold text-sky-600">Terjadwal: {l.start_time} - {l.end_time}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            <span className={`px-2 py-1 rounded-md text-xs font-semibold ${l.reason === "SAKIT" ? 'bg-orange-100 text-orange-700' : l.reason === "IZIN_KELUAR" ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {l.reason.replace("_", " ")}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 max-w-[200px] truncate" title={l.notes || "-"}>{l.notes || "-"}</td>
                                        <td className="px-6 py-3 text-center flex flex-col items-center justify-center gap-1">
                                            {l.is_returned ? (
                                                <span className="text-xs font-bold text-emerald-600 flex items-center justify-center"><svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg> Telah Kembali</span>
                                            ) : (
                                                <span className="text-xs font-bold text-orange-600">Berada di Luar Asrama</span>
                                            )}
                                            {!l.is_returned && (
                                                <button onClick={() => markReturned(l.id)} className="px-2 py-1 mt-1 bg-white border border-gray-300 text-gray-700 text-xs rounded hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                                                    Tandai Kembali
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}

                                {(activeTab === "violation" && violations.length === 0) && (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Belum ada pelanggaran disiplin (Pondok aman terkedali).</td></tr>
                                )}
                                {(activeTab === "leave" && leaves.length === 0) && (
                                    <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">Belum ada santri yang mengambil cuti/izin.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
