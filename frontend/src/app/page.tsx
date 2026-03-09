"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/api";

export default function Home() {
  const [userRole, setUserRole] = useState("SUPER_ADMIN");
  const [totalStudents, setTotalStudents] = useState(0);
  const [emptyClassesCount, setEmptyClassesCount] = useState(0);

  useEffect(() => {
    const savedRole = localStorage.getItem("user_role");
    if (savedRole) {
      setUserRole(savedRole);
    }

    // Fetch basic stats
    const fetchStats = async () => {
      try {
        // Get total students
        const resStudents = await apiFetch(`/api/students/`);
        if (resStudents.ok) {
          const data = await resStudents.json();
          setTotalStudents(data.length);
        }

        // Get empty classes
        const resEmpty = await apiFetch(`/api/academic/empty-classes`);
        if (resEmpty.ok) {
          const dataObj = await resEmpty.json();
          if (Array.isArray(dataObj)) {
            setEmptyClassesCount(dataObj.length);
          }
        }
      } catch (e) {
        console.error("Failed to load dashboard stats", e);
      }
    };

    fetchStats();
  }, []);

  const roleNameMapping: { [key: string]: string } = {
    "SUPER_ADMIN": "Administrator Pusat",
    "KASIR_KOP_PUSAT": "Kasir Koperasi Pusat",
    "KASIR_KOP_LUAR": "Kasir Warung Luar",
    "KASIR_SYAHRIYAH_PUTRA": "Kasir Syahriyah (Putra)",
    "KASIR_SYAHRIYAH_PUTRI": "Kasir Syahriyah (Putri)",
    "PENGURUS_SANTRI": "Pengurus Santri",
    "PENGURUS_SEKOLAH": "Pengurus Sekolah (Kurikulum)",
    "GURU_BP": "Guru BP",
    "PENGURUS_KEAMANAN": "Keamanan Pondok"
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Selamat Datang!</h1>
        <p className="text-gray-600 mt-2 text-lg">
          Anda login sebagai <span className="font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">{roleNameMapping[userRole] || userRole}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {/* Stat Card 1 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Santri Aktif</p>
            <h3 className="text-3xl font-bold text-gray-900">{totalStudents}</h3>
          </div>
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          </div>
        </div>

        {/* Stat Card 2 */}
        {(userRole === "SUPER_ADMIN" || userRole === "PENGURUS_SEKOLAH") && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Kelas Kosong Hari Ini</p>
              <h3 className="text-3xl font-bold text-gray-900">{emptyClassesCount}</h3>
            </div>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center text-red-600">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
          </div>
        )}

        {/* Stat Card 3 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Status Server</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
              <h3 className="text-xl font-bold text-emerald-600">Terhubung</h3>
            </div>
          </div>
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path></svg>
          </div>
        </div>
      </div>

      {/* Quick Actions / Info Banner */}
      <div className="mt-8 bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-20 translate-x-20"></div>
        <div className="relative z-10 w-full md:w-2/3">
          <h2 className="text-2xl font-bold mb-3">Sistem Terintegrasi RFID</h2>
          <p className="text-emerald-100 leading-relaxed">
            Sistem manajemen Pondok Pesantren Nurul Ihsan dirancang menggunakan arsitektur local-first dengan dukungan pemindai kartu RFID untuk absensi masjid, kantin, transaksi syahriyah, dan uang saku digital E-Money.
          </p>
        </div>
      </div>
    </div>
  );
}
