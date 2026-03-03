"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const [role, setRole] = useState("SUPER_ADMIN");
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const savedRole = localStorage.getItem("user_role");
        if (savedRole) {
            setRole(savedRole);
        }
    }, [pathname]); // Refresh role check if navigating

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_role");
        router.push("/login");
        router.refresh(); // force a full re-render
    };

    const menuItems = [
        { name: "Beranda", path: "/", allowed: ["SUPER_ADMIN", "KASIR_KOP_PUSAT", "KASIR_KOP_LUAR", "KASIR_SYAHRIYAH", "PENGURUS_SANTRI", "PENGURUS_SEKOLAH", "GURU_BP", "PENGURUS_KEAMANAN"] },
        { name: "Data Santri", path: "/santri", allowed: ["SUPER_ADMIN"] },
        { name: "Live Monitor RFID", path: "/monitor", allowed: ["SUPER_ADMIN", "PENGURUS_KEAMANAN"] },
        { name: "Jurnal Tahfidz", path: "/tahfidz", allowed: ["SUPER_ADMIN", "PENGURUS_SANTRI"] },
        { name: "Koperasi & E-Money", path: "/keuangan/emoney", allowed: ["SUPER_ADMIN", "KASIR_KOP_PUSAT", "KASIR_KOP_LUAR"] },
        { name: "Tagihan Syahriyah", path: "/keuangan/syahriyah", allowed: ["SUPER_ADMIN", "KASIR_SYAHRIYAH_PUTRA", "KASIR_SYAHRIYAH_PUTRI"] },
        { name: "👨‍🏫 Data Guru", path: "/guru", allowed: ["SUPER_ADMIN", "PENGURUS_SEKOLAH"] },
        { name: "⚖️ Kedisiplinan", path: "/kedisiplinan", allowed: ["SUPER_ADMIN", "PENGURUS_SANTRI", "GURU_BP", "PENGURUS_KEAMANAN"] },
        { name: "🖨️ Laporan Bulanan", path: "/laporan", allowed: ["SUPER_ADMIN"] },
        { name: "📊 Laporan Keuangan", path: "/laporan-keuangan", allowed: ["SUPER_ADMIN", "KASIR_KOP_PUSAT"] },
    ];

    const filteredMenus = menuItems.filter(item => item.allowed.includes(role));

    return (
        <div className="w-64 bg-gray-900 text-white h-full fixed left-0 top-0 overflow-y-auto">
            <div className="p-6 border-b border-gray-800">
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                    Pesantren Nurul Ihsan
                </h1>
                <p className="text-sm text-gray-400 mt-1">Admin Dashboard</p>
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

            <div className="absolute bottom-0 w-full p-4 border-t border-gray-800">
                <div className="flex items-center space-x-3 text-sm text-gray-400">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span>Local Server Active</span>
                </div>
            </div>
        </div>
    );
}
