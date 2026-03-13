"use client";

import { useEffect, useState, useRef } from "react";
import * as XLSX from "xlsx";
import { apiFetch } from "@/utils/api";

interface Student {
    student_id: number;
    nis: string;
    rfid_uid: string | null;
    full_name: string;
    student_class: string;
    kelas_sekolah?: number | null;
    tingkatan_diniyah?: string | null;
    dormitory: string;
    gender: "PUTRA" | "PUTRI";
    batas_jajan_harian?: number;
}

export default function SantriPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"add" | "edit">("add");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const csvInputRef = useRef<HTMLInputElement>(null);

    // Form states
    const [formData, setFormData] = useState({
        id: 0,
        nis: "",
        rfid_uid: "",
        full_name: "",
        student_class: "",
        kelas_sekolah: "" as string | number,
        tingkatan_diniyah: "",
        dormitory: "",
        gender: "PUTRA" as "PUTRA" | "PUTRI",
        batas_jajan_harian: 15000,
    });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const res = await apiFetch(`/api/students/`);
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
        setFormData({
            id: 0,
            nis: "",
            rfid_uid: "",
            full_name: "",
            student_class: "",
            kelas_sekolah: "",
            tingkatan_diniyah: "",
            dormitory: "",
            gender: "PUTRA",
            batas_jajan_harian: 15000,
        });
        setFormError(null);
        setIsModalOpen(true);
    };

    const openEditModal = (student: Student) => {
        setModalMode("edit");
        setFormData({
            id: student.student_id,
            nis: student.nis,
            rfid_uid: student.rfid_uid || "",
            full_name: student.full_name,
            student_class: student.student_class,
            kelas_sekolah: student.kelas_sekolah ?? "",
            tingkatan_diniyah: student.tingkatan_diniyah || "",
            dormitory: student.dormitory,
            gender: student.gender,
            batas_jajan_harian: student.batas_jajan_harian !== undefined && student.batas_jajan_harian !== null ? student.batas_jajan_harian : 15000,
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
            const formData = new FormData();
            formData.append("file", file);

            const res = await apiFetch(`/api/students/import_excel`, {
                method: "POST",
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Gagal import massal Excel");
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

    const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFormLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await apiFetch(`/api/students/import_csv`, {
                method: "POST",
                body: formData
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
            if (csvInputRef.current) csvInputRef.current.value = "";
        }
    };

    const downloadExcelTemplate = () => {
        const data = [
            {
                "NIS": "12345",
                "Nama Lengkap": "Ahmad Fulan",
                "Kelas_Diniyah": "Al-Imrithi",
                "Tingkatan_Diniyah": "Imrithi",
                "Kelas_Sekolah": 8,
                "Asrama": "Gedung Baru",
                "Gender": "PUTRA",
                "UID_RFID": "4265130963"
            },
            {
                "NIS": "12346",
                "Nama Lengkap": "Siti Fatimah",
                "Kelas_Diniyah": "Alfiyah 1",
                "Tingkatan_Diniyah": "Alfiyah 1",
                "Kelas_Sekolah": 10,
                "Asrama": "Gedung Putri",
                "Gender": "PUTRI",
                "UID_RFID": ""
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template Santri");
        XLSX.writeFile(workbook, "template_import_santri.xlsx");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError(null);

        try {
            const payload = {
                nis: formData.nis,
                rfid_uid: formData.rfid_uid || null,
                full_name: formData.full_name,
                student_class: formData.student_class,
                kelas_sekolah: formData.kelas_sekolah !== "" ? Number(formData.kelas_sekolah) : null,
                tingkatan_diniyah: formData.tingkatan_diniyah || null,
                dormitory: formData.dormitory,
                gender: formData.gender,
                batas_jajan_harian: formData.batas_jajan_harian
            };
            if (modalMode === "add") {
                const res = await apiFetch(`/api/students/`, {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.detail || "Gagal menambah santri");
                }
            } else {
                const res = await apiFetch(`/api/students/${formData.id}`, {
                    method: "PUT",
                    body: JSON.stringify(payload)
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
            const res = await apiFetch(`/api/students/${student_id}`, {
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
                        onClick={downloadExcelTemplate}
                        className="bg-white border border-emerald-600 text-emerald-600 hover:bg-emerald-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                        📝 Unduh Template Excel
                    </button>
                    <button
                        onClick={() => csvInputRef.current?.click()}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                        disabled={formLoading}
                    >
                        {formLoading ? "Memproses..." : "📥 Import CSV"}
                    </button>
                    <input
                        type="file"
                        accept=".csv"
                        ref={csvInputRef}
                        onChange={handleCsvUpload}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                        disabled={formLoading}
                    >
                        {formLoading ? "Memproses..." : "📥 Import Excel"}
                    </button>
                    <input
                        type="file"
                        accept=".xlsx, .xls"
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                    <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value as "PUTRA" | "PUTRI" })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                        <option value="PUTRA">Putra</option>
                                        <option value="PUTRI">Putri</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Asrama / Kamar</label>
                                    <input required type="text" value={formData.dormitory} onChange={e => setFormData({ ...formData, dormitory: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Al-Fatih" />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kelas Diniyah</label>
                                    <input type="text" value={formData.student_class} onChange={e => setFormData({ ...formData, student_class: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Al-Imrithi" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tingkatan Diniyah</label>
                                    <select value={formData.tingkatan_diniyah} onChange={e => setFormData({ ...formData, tingkatan_diniyah: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                        <option value="">— Pilih —</option>
                                        <option value="Jurrumiyah">Jurrumiyah</option>
                                        <option value="Imrithi">Imrithi</option>
                                        <option value="Alfiyah 1">Alfiyah 1</option>
                                        <option value="Alfiyah 2">Alfiyah 2</option>
                                        <option value="Tahfidz Quran">Tahfidz Quran</option>
                                        <option value="Takhassus">Takhassus</option>
                                        <option value="Al-Maqsud">Al-Maqsud</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kelas Sekolah</label>
                                    <select value={formData.kelas_sekolah} onChange={e => setFormData({ ...formData, kelas_sekolah: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                        <option value="">— Pilih —</option>
                                        <option value={7}>Kelas 7</option>
                                        <option value={8}>Kelas 8</option>
                                        <option value={9}>Kelas 9</option>
                                        <option value={10}>Kelas 10</option>
                                        <option value={11}>Kelas 11</option>
                                        <option value={12}>Kelas 12</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">UID RFID (Opsional)</label>
                                <input type="text" value={formData.rfid_uid} onChange={e => setFormData({ ...formData, rfid_uid: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="TAP kartu disini..." />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Limit Jajan Harian (E-Money)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 sm:text-sm">Rp</span>
                                    </div>
                                    <input type="number" required min="0" step="500" value={formData.batas_jajan_harian} onChange={e => setFormData({ ...formData, batas_jajan_harian: parseInt(e.target.value) || 0 })} className="w-full pl-9 px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="15000" />
                                </div>
                                <p className="mt-1 text-xs text-gray-500">Membatasi transaksi pengeluaran santri di hari yang sama.</p>
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
