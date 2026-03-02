"use client";

import { useEffect, useState, useRef } from "react";

interface Student {
    student_id: number;
    nis: string;
    rfid_uid: string | null;
    full_name: string;
    student_class: string;
    dormitory: string;
    gender: "PUTRA" | "PUTRI";
}

export default function SantriPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"add" | "edit">("add");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form states
    const [formData, setFormData] = useState({
        id: 0,
        nis: "",
        rfid_uid: "",
        full_name: "",
        student_class: "",
        dormitory: "",
        gender: "PUTRA" as "PUTRA" | "PUTRI",
    });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const res = await fetch("http://127.0.0.1:8080/api/students/");
            if (!res.ok) {
                throw new Error("Gagal mengambil data dari server lokal");
            }
            const data = await res.json();
            setStudents(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const openAddModal = () => {
        setModalMode("add");
        setFormData({ id: 0, nis: "", rfid_uid: "", full_name: "", student_class: "", dormitory: "", gender: "PUTRA" });
        setFormError(null);
        setIsModalOpen(true);
    };

    const openEditModal = (student: Student) => {
        setModalMode("edit");
        // Store student ID in formData to use it during submit
        setFormData({
            id: student.student_id,
            nis: student.nis,
            rfid_uid: student.rfid_uid || "",
            full_name: student.full_name,
            student_class: student.student_class,
            dormitory: student.dormitory,
            gender: student.gender,
        });
        setFormError(null);
        setIsModalOpen(true);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFormLoading(true);
        setError(null);

        try {
            const text = await file.text();
            const lines = text.split('\n').filter(l => l.trim() !== '');
            if (lines.length < 2) throw new Error("File CSV kosong atau format tidak valid");

            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

            const payload = [];
            for (let i = 1; i < lines.length; i++) {
                // simple split assuming no commas inside values
                const cols = lines[i].split(',').map(c => c.trim());
                if (cols.length < headers.length) continue;

                let studentObj: any = {};
                headers.forEach((h, idx) => {
                    studentObj[h] = cols[idx] === "" ? null : cols[idx];
                });

                if (studentObj.nis && studentObj.full_name && studentObj.student_class && studentObj.dormitory) {
                    payload.push(studentObj);
                }
            }

            if (payload.length === 0) throw new Error("Tidak ada data valid yang bisa diimport");

            const res = await fetch("http://127.0.0.1:8080/api/students/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Gagal import massal CSV");
            }

            const resData = await res.json();
            alert(`Import Berhasil!\n${resData.data.inserted} data disisipkan, ${resData.data.updated} data diperbarui.`);

            fetchStudents();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setFormLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError(null);

        try {
            if (modalMode === "add") {
                const res = await fetch("http://127.0.0.1:8080/api/students/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        nis: formData.nis,
                        rfid_uid: formData.rfid_uid || null,
                        full_name: formData.full_name,
                        student_class: formData.student_class,
                        dormitory: formData.dormitory,
                        gender: formData.gender
                    })
                });
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.detail || "Gagal menambah santri");
                }
            } else {
                const res = await fetch(`http://127.0.0.1:8080/api/students/${formData.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        nis: formData.nis,
                        rfid_uid: formData.rfid_uid || null,
                        full_name: formData.full_name,
                        student_class: formData.student_class,
                        dormitory: formData.dormitory,
                        gender: formData.gender
                    })
                });

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.detail || "Gagal mengupdate data santri");
                }
            }

            setIsModalOpen(false);
            fetchStudents(); // refresh data
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (student_id: number, name: string) => {
        if (!window.confirm(`Yakin ingin menghapus santri bernama ${name} secara permanen? Peringatan: Seluruh data keuangannya maupun absensinya mungkin dapat memicu error historis jika dihapus paksa.`)) {
            return;
        }

        try {
            setLoading(true);
            const res = await fetch(`http://127.0.0.1:8080/api/students/${student_id}`, {
                method: "DELETE"
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Gagal menghapus data");
            }
            alert(`Sukes menghapus santri ${name} dari sistem.`);
            fetchStudents();
        } catch (err: any) {
            alert(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 relative">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Data Master Santri</h1>
                    <p className="text-gray-500 mt-1">Mengelola data rekap seluruh santri di pesantren</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                        disabled={formLoading}
                    >
                        {formLoading ? "Memproses CSV..." : "Import CSV"}
                    </button>
                    <input
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <button
                        onClick={openAddModal}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                        + Tambah Santri
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                        <span className="ml-3 text-gray-500">Memuat Data Server Lokal...</span>
                    </div>
                ) : error ? (
                    <div className="p-8 text-center text-red-500 bg-red-50">
                        <p className="font-medium">Error: {error}</p>
                        <p className="text-sm mt-2">Pastikan server FastAPI lokal (127.0.0.1:8080) sedang menyala.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">NIS</th>
                                    <th className="px-6 py-4">Nama Lengkap</th>
                                    <th className="px-6 py-4">Gender</th>
                                    <th className="px-6 py-4">Kelas</th>
                                    <th className="px-6 py-4">Asrama</th>
                                    <th className="px-6 py-4 text-center">Status RFID</th>
                                    <th className="px-6 py-4">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {students.map((st) => (
                                    <tr key={st.student_id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-500">#{st.student_id}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{st.nis}</td>
                                        <td className="px-6 py-4">{st.full_name}</td>
                                        <td className="px-6 py-4 font-semibold text-gray-600">{st.gender === "PUTRI" ? "🧕 Putri" : "👦 Putra"}</td>
                                        <td className="px-6 py-4">{st.student_class}</td>
                                        <td className="px-6 py-4">{st.dormitory}</td>
                                        <td className="px-6 py-4 text-center">
                                            {st.rfid_uid ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                    Terdaftar
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    Kosong
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 flex gap-4">
                                            <button
                                                onClick={() => openEditModal(st)}
                                                className="text-emerald-600 hover:text-emerald-900 font-medium transition-colors"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(st.student_id, st.full_name)}
                                                className="text-red-600 hover:text-red-900 font-medium transition-colors cursor-pointer"
                                            >
                                                Hapus
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {students.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                            Belum ada data santri di database lokal.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL OVERLAY */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900">
                                {modalMode === "add" ? "Tambah Data Santri" : "Edit Data Santri"}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {formError && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                                    {formError}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">NIS</label>
                                <input required type="text" value={formData.nis} onChange={e => setFormData({ ...formData, nis: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Contoh: 2024001" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                                <input required type="text" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Ahmad Abdullah" />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                    <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value as "PUTRA" | "PUTRI" })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                        <option value="PUTRA">Putra</option>
                                        <option value="PUTRI">Putri</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kelas</label>
                                    <input required type="text" value={formData.student_class} onChange={e => setFormData({ ...formData, student_class: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="10A" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Asrama</label>
                                    <input required type="text" value={formData.dormitory} onChange={e => setFormData({ ...formData, dormitory: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Al-Fatih" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">UID RFID (Opsional)</label>
                                <input type="text" value={formData.rfid_uid} onChange={e => setFormData({ ...formData, rfid_uid: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="TAP kartu disini..." />
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                                >
                                    {formLoading ? "Menyimpan..." : "Simpan Santri"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* END MODAL OVERLAY */}
        </div>
    );
}
