"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/api";

interface MedicalRecordDetail {
    medical_id: number;
    student_id: number;
    complaint: string;
    diagnosis: string | null;
    medicine_given: string | null;
    handled_by_user_id: number;
    timestamp: string;
    sync_status: boolean;
    student_name: string;
    handler_name: string;
}

interface StudentRef {
    student_id: number;
    full_name: string;
}

export default function KesehatanPage() {
    const [records, setRecords] = useState<MedicalRecordDetail[]>([]);
    const [students, setStudents] = useState<StudentRef[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Form states
    const [form, setForm] = useState({
        student_id: "",
        complaint: "",
    });
    
    // Update existing record states
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [updateForm, setUpdateForm] = useState({
        diagnosis: "",
        medicine_given: ""
    });

    const fetchData = async () => {
        try {
            // Load students for dropdown
            if (students.length === 0) {
                const stRes = await apiFetch(`/api/students`);
                if (stRes.ok) setStudents(await stRes.json());
            }

            // Load medical records
            const mRes = await apiFetch(`/api/medical`);
            if (mRes.ok) setRecords(await mRes.json());
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const submitNewRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // Get real user_id from localStorage if available
            const savedUser = localStorage.getItem("user");
            let userId = 1;
            if (savedUser) {
                try {
                    userId = JSON.parse(savedUser).user_id;
                } catch (err) {
                    console.error("Failed to parse user from localStorage", err);
                }
            }

            const payload = {
                student_id: parseInt(form.student_id),
                complaint: form.complaint,
                handled_by_user_id: userId
            };
            const res = await apiFetch(`/api/medical`, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert("Data rekam medis berhasil dicatat!");
                setForm({ student_id: "", complaint: "" });
                fetchData();
            }
        } finally {
            setIsSaving(false);
        }
    };

    const submitUpdateRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!updatingId) return;
        
        setIsSaving(true);
        try {
            const res = await apiFetch(`/api/medical/${updatingId}`, {
                method: "PUT",
                body: JSON.stringify(updateForm)
            });
            if (res.ok) {
                alert("Diagnosa dan tindakan berhasil diperbarui!");
                setUpdatingId(null);
                setUpdateForm({ diagnosis: "", medicine_given: "" });
                fetchData();
            }
        } finally {
            setIsSaving(false);
        }
    };

    const startUpdate = (record: MedicalRecordDetail) => {
        setUpdatingId(record.medical_id);
        setUpdateForm({
            diagnosis: record.diagnosis || "",
            medicine_given: record.medicine_given || ""
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">🏥 Klinik Kesehatan Santri</h1>
                <p className="text-gray-500 mt-1">Sistem pencatatan rekam medis dan pantauan rawat santri.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* FORM PANEL */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="font-bold text-gray-900 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100/50 flex items-center gap-2">
                        <span className="material-icons text-red-500 text-lg">medical_services</span> Input Keluhan Baru
                    </h2>

                    <form onSubmit={submitNewRecord} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Santri Sakit</label>
                            <select required value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-gray-50">
                                <option value="">- Pilih Santri -</option>
                                {students.map(s => <option key={s.student_id} value={s.student_id}>{s.full_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Keluhan Utama</label>
                            <textarea required value={form.complaint} onChange={e => setForm({ ...form, complaint: e.target.value })} className="w-full px-3 py-2 border rounded-lg bg-gray-50 h-24 placeholder-gray-400" placeholder="Contoh: Demam, pusing, dan batuk sejak semalam..."></textarea>
                        </div>
                        
                        <button type="submit" disabled={isSaving} className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 rounded-lg mt-2 flex justify-center items-center gap-2">
                            <span className="material-icons text-sm">add</span> Daftarkan Santri
                        </button>
                    </form>
                </div>

                {/* TABLE PANEL */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h2 className="font-semibold text-gray-700">Daftar Pantauan & Rawat</h2>
                    </div>

                    <div className="overflow-x-auto flex-1 p-4">
                        <div className="space-y-4">
                            {records.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    <span className="material-icons text-4xl mb-2 opacity-50">sentiment_very_satisfied</span>
                                    <p>Alhamdulillah, tidak ada santri yang sakit.</p>
                                </div>
                            ) : (
                                records.map((r) => (
                                    <div key={r.medical_id} className={`border rounded-xl p-4 flex flex-col sm:flex-row gap-4 ${r.diagnosis ? 'bg-white border-gray-200' : 'bg-red-50 border-red-100'}`}>
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-gray-100 text-gray-500">
                                            <span className="material-icons">{r.diagnosis ? 'check_circle' : 'pending_actions'}</span>
                                        </div>
                                        
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-lg">{r.student_name}</h3>
                                                    <p className="text-xs text-gray-500">{new Date(r.timestamp).toLocaleString("id-ID")}</p>
                                                </div>
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold ${r.diagnosis ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                    {r.diagnosis ? 'Telah Diperiksa' : 'Menunggu / Pantauan'}
                                                </span>
                                            </div>
                                            
                                            <div className="mt-3 space-y-2">
                                                <div className="flex gap-2 text-sm">
                                                    <span className="font-semibold text-gray-700 w-24">Keluhan:</span>
                                                    <span className="text-gray-800">{r.complaint}</span>
                                                </div>
                                                
                                                {/* Edit Form OR Display Data */}
                                                {updatingId === r.medical_id ? (
                                                    <form onSubmit={submitUpdateRecord} className="bg-gray-50 p-3 rounded-lg border mt-2 space-y-3">
                                                        <div>
                                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Diagnosa & Tindakan</label>
                                                            <input required type="text" value={updateForm.diagnosis} onChange={e => setUpdateForm({...updateForm, diagnosis: e.target.value})} className="w-full px-2 py-1.5 text-sm border rounded bg-white" placeholder="Contoh: Gejala Tifus" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Obat Diberikan (Opsional)</label>
                                                            <input type="text" value={updateForm.medicine_given} onChange={e => setUpdateForm({...updateForm, medicine_given: e.target.value})} className="w-full px-2 py-1.5 text-sm border rounded bg-white" placeholder="Contoh: Paracetamol 3x1" />
                                                        </div>
                                                        <div className="flex gap-2 justify-end">
                                                            <button type="button" onClick={() => setUpdatingId(null)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">Batal</button>
                                                            <button type="submit" disabled={isSaving} className="px-3 py-1.5 text-xs bg-emerald-600 text-white font-medium rounded hover:bg-emerald-700">Simpan Update</button>
                                                        </div>
                                                    </form>
                                                ) : (
                                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mt-2 relative group">
                                                        <div className="flex gap-2 text-sm">
                                                            <span className="font-semibold text-gray-700 w-24">Diagnosa:</span>
                                                            <span className="text-gray-800 italic">{r.diagnosis || "Belum ada diagnosa"}</span>
                                                        </div>
                                                        <div className="flex gap-2 text-sm mt-1">
                                                            <span className="font-semibold text-gray-700 w-24">Obat:</span>
                                                            <span className="text-emerald-700 font-medium">{r.medicine_given || "-"}</span>
                                                        </div>
                                                        
                                                        {/* Edit Button */}
                                                        <button 
                                                            onClick={() => startUpdate(r)} 
                                                            className="absolute top-2 right-2 p-1.5 bg-white border shadow-sm rounded-md text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Update Diagnosa / Obat"
                                                        >
                                                            <span className="material-icons text-sm block">edit_note</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
