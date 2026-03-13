"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/api";

interface GalleryItem {
    gallery_id: number;
    title: string;
    url: string;
    category: string;
    created_at: string;
    uploader_name: string;
}

const CATEGORIES = [
    "Pendidikan & Akademik",
    "Tahfidz & Diniyah",
    "Kegiatan Asrama",
    "Olahraga & Ekstrakurikuler",
    "Fasilitas",
    "Lainnya"
];

export default function GaleriPage() {
    const [items, setItems] = useState<GalleryItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form Inputs
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");
    const [category, setCategory] = useState(CATEGORIES[0]);

    const fetchData = async () => {
        try {
            const res = await apiFetch(`/api/gallery/`);
            if (res.ok) setItems(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const submitGallery = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = {
                title,
                url,
                category,
                uploaded_by_user_id: 1 // Admin dummy
            };
            
            const res = await apiFetch(`/api/gallery/`, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                alert("Foto berhasil ditambahkan ke galeri!");
                setTitle("");
                setUrl("");
                fetchData();
            } else {
                alert("Gagal menambahkan foto");
            }
        } finally {
            setIsSaving(false);
        }
    };

    const deleteItem = async (id: number) => {
        if (!confirm("Hapus foto ini dari galeri?")) return;
        try {
            const res = await apiFetch(`/api/gallery/${id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                fetchData();
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">📸 Galeri Kegiatan Nusantara</h1>
                <p className="text-gray-500 mt-1">Kelola dokumentasi visual kegiatan pesantren yang akan tampil di Portal Wali.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* FORM PANEL */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-fit">
                    <h2 className="font-bold text-gray-900 mb-4 bg-sky-50 p-3 rounded-lg border border-sky-100 flex items-center gap-2">
                        <span className="material-icons text-sky-500">add_photo_alternate</span> Tambah Foto
                    </h2>

                    <form onSubmit={submitGallery} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Judul / Deskripsi Singkat</label>
                            <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-gray-50" placeholder="Contoh: Apel Pagi Hari Santri" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">URL Gambar</label>
                            <input required type="url" value={url} onChange={e => setUrl(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-gray-50" placeholder="https://contoh.com/gambar.jpg" />
                            <p className="text-[10px] text-gray-400 mt-1">*Masukkan direct link (.jpg, .png)</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Album</label>
                            <select required value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-gray-50">
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        
                        {url && (
                            <div className="border border-dashed border-gray-300 rounded-lg p-2 mt-2 bg-gray-50 flex items-center justify-center min-h-[120px] overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt="Preview" className="max-h-32 object-contain" onError={(e) => (e.currentTarget.src = 'https://placehold.co/600x400?text=Invalid+Image+URL')} />
                            </div>
                        )}
                        
                        <button type="submit" disabled={isSaving} className="w-full bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 rounded-lg mt-2 shadow-sm transition-all duration-200">
                            Upload ke Galeri
                        </button>
                    </form>
                </div>

                {/* GRID GALLERY PANEL */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="font-semibold text-gray-700 mb-4 border-b pb-2">Koleksi Terkini</h2>

                    {items.length === 0 ? (
                        <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                            <span className="material-icons text-5xl mb-2 text-gray-300">image_not_supported</span>
                            <p>Galeri masih kosong.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                            {items.map((item) => (
                                <div key={item.gallery_id} className="group relative rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-gray-50 aspect-video flex flex-col justify-end">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={item.url} alt={item.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    
                                    {/* Gradient overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
                                    
                                    <div className="relative z-10 p-3 w-full translate-y-2 group-hover:translate-y-0 transition-transform">
                                        <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md rounded text-[9px] font-bold text-white mb-1 inline-block uppercase tracking-wider">{item.category}</span>
                                        <h3 className="font-bold text-white text-sm line-clamp-1 leading-tight">{item.title}</h3>
                                        <p className="text-white/60 text-[10px] mt-0.5">{new Date(item.created_at).toLocaleDateString("id-ID")}</p>
                                    </div>

                                    {/* Delete Button */}
                                    <button 
                                        onClick={() => deleteItem(item.gallery_id)}
                                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm z-20"
                                        title="Hapus"
                                    >
                                        <span className="material-icons text-sm">delete</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
