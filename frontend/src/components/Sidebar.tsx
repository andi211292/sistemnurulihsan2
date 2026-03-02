"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
    const pathname = usePathname();

    const menuItems = [
        { name: "Beranda", path: "/" },
        { name: "Data Santri", path: "/santri" },
        { name: "Live Monitor RFID", path: "/monitor" },
        { name: "Jurnal Tahfidz", path: "/tahfidz" },
        { name: "Koperasi & E-Money", path: "/keuangan/emoney" },
        { name: "Tagihan Syahriyah", path: "/keuangan/syahriyah" },
        { name: "👨‍🏫 Data Guru", path: "/guru" },
        { name: "⚖️ Kedisiplinan", path: "/kedisiplinan" },
        { name: "🖨️ Laporan Bulanan", path: "/laporan" },
    ];

    return (
        <div className="w-64 bg-gray-900 text-white h-full fixed left-0 top-0 overflow-y-auto">
            <div className="p-6 border-b border-gray-800">
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                    Pesantren Nurul Ihsan
                </h1>
                <p className="text-sm text-gray-400 mt-1">Admin Dashboard</p>
            </div>

            <nav className="p-4 space-y-2 mt-4">
                {menuItems.map((item) => {
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
