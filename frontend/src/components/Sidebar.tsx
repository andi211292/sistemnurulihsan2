"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const [role, setRole] = useState("SUPER_ADMIN");
    const [allowedMenus, setAllowedMenus] = useState<string[]>([]);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const savedRole = localStorage.getItem("user_role");
        if (savedRole) {
            setRole(savedRole);
        }
        // Baca daftar menu yang diizinkan dari cache login
        const saved = localStorage.getItem("allowed_menus");
        if (saved) {
            try {
                setAllowedMenus(JSON.parse(saved));
            } catch {
                setAllowedMenus([]);
            }
        } else if (savedRole === "SUPER_ADMIN") {
            // Fallback: Super Admin dapat semua menu
            setAllowedMenus(menuItems.map(m => m.path));
        }
    }, [pathname]);

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_role");
        localStorage.removeItem("allowed_menus");
        router.push("/login");
        router.refresh();
    };

    const menuItems = [
        { name: "Beranda", path: "/" },
        { name: "Data Santri", path: "/santri" },
        { name: "Live Monitor RFID", path: "/monitor" },
        { name: "📍 Monitor Absensi", path: "/absensi" },
        { name: "🔧 Kelola Alat RFID", path: "/absensi/devices" },
        { name: "Jurnal Tahfidz", path: "/tahfidz" },
        { name: "Koperasi & E-Money", path: "/keuangan/emoney" },
        { name: "💸 Pengeluaran Kas", path: "/keuangan/pengeluaran" },
        { name: "📋 Manajemen Iuran", path: "/keuangan/iuran" },
        { name: "📊 Laporan Iuran", path: "/keuangan/iuran/laporan" },
        { name: "👨‍🏫 Data Guru", path: "/guru" },
        { name: "⚖️ Kedisiplinan", path: "/kedisiplinan" },
        { name: "🏥 Klinik Kesehatan", path: "/kesehatan" },
        { name: "🏆 Bintang Prestasi", path: "/ranking" },
        { name: "📸 Galeri Kegiatan", path: "/galeri" },
        { name: "🖨️ Laporan Bulanan", path: "/laporan" },
        { name: "📊 Laporan Keuangan", path: "/laporan-keuangan" },
        { name: "👤 Manajemen Pengguna", path: "/pengguna" },
        { name: "⚙️ Hak Akses Role", path: "/pengguna/hak-akses" },
    ];

    // Super Admin selalu dapat semua menu, role lain filter dari allowedMenus
    const filteredMenus = role === "SUPER_ADMIN"
        ? menuItems
        : menuItems.filter(item => allowedMenus.includes(item.path));

    return (
        <>
            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div className={`w-64 bg-gray-900 text-white h-full fixed left-0 top-0 overflow-y-auto z-50 transition-transform duration-300 transform 
                ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
                
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                            Pesantren Nurul Ihsan
                        </h1>
                        <p className="text-sm text-gray-400 mt-1">Admin Dashboard</p>
                    </div>
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="lg:hidden text-gray-400 hover:text-white"
                    >
                        <span className="material-icons">close</span>
                    </button>
                </div>

                <div className="px-6 pb-2 mb-4 border-b border-gray-800 pb-4">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-lg text-emerald-100 uppercase">
                            {role.charAt(0)}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white break-all">{role}</p>
                            <p className="text-xs text-emerald-400">Terotentikasi ✓</p>
                        </div>
                    </div>
                    {isMounted && (
                        <button
                            onClick={handleLogout}
                            className="w-full mt-2 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-red-600/20 hover:text-red-400 border border-gray-700 py-1.5 rounded transition-colors"
                        >
                            Keluar (Logout)
                        </button>
                    )}
                </div>

                <nav className="p-4 space-y-2">
                    {filteredMenus.map((item) => {
                        const isActive = pathname === item.path || (pathname.startsWith(item.path) && item.path !== '/');

                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`block px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                                    ? "bg-emerald-600 font-medium text-white shadow-lg shadow-emerald-500/30"
                                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                                    }`}
                            >
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-8 px-6 pb-8 border-t border-gray-800 pt-6">
                    <div className="flex items-center space-x-3 text-sm text-gray-400">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span>Local Server Active</span>
                    </div>
                </div>
            </div>
        </>
    );
}
