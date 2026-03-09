"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/api";

interface LogStudentInfo {
    full_name: string;
    student_class: string;
    nis: string;
}

interface AttendanceLogLatest {
    attendance_id: number;
    timestamp: string;
    type: string;
    status: string;
    student: LogStudentInfo;
}

interface MealLogLatest {
    meal_log_id: number;
    timestamp: string;
    meal_type: string;
    student: LogStudentInfo;
}

export default function LiveMonitorPage() {
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLogLatest[]>([]);
    const [mealLogs, setMealLogs] = useState<MealLogLatest[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await apiFetch(`/api/rfid/log-terbaru`);
                if (!res.ok) throw new Error("Gagal mengambil live data");
                const data = await res.json();
                setAttendanceLogs(data.attendance);
                setMealLogs(data.meals);
                setError(null);
            } catch (err: any) {
                setError(err.message);
            }
        };

        fetchLogs(); // initial fetch
        const intervalId = setInterval(fetchLogs, 2000); // Poll every 2 seconds

        return () => clearInterval(intervalId); // cleanup
    }, []);

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Live Monitor RFID</h1>
                <p className="text-gray-500 mt-1">
                    Pantauan langsung aktivitas santri secara real-time. Memperbarui otomatis setiap 2 detik.
                </p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200">
                    <p className="font-medium">Koneksi Error</p>
                    <p className="text-sm">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Panel Kiri: Absensi */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="bg-gray-900 px-6 py-4 flex justify-between items-center">
                        <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            Monitor Kehadiran (Masjid/Kelas)
                        </h2>
                    </div>
                    <div className="p-0 flex-1">
                        {attendanceLogs.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">Belum ada aktivitas tap kartu</div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {attendanceLogs.map((log) => (
                                    <li key={`att-${log.attendance_id}`} className="p-6 hover:bg-gray-50 transition-colors flex items-center justify-between">
                                        <div>
                                            <p className="text-lg font-bold text-gray-900">{log.student.full_name}</p>
                                            <p className="text-sm text-gray-500">{log.student.nis} - Kelas {log.student.student_class}</p>
                                            <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                {log.type.replace("_", " ")}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-mono font-medium text-gray-900">{formatTime(log.timestamp)}</p>
                                            {log.status === "HADIR" ? (
                                                <p className="text-emerald-600 font-bold text-sm mt-1 uppercase">✓ BERHASIL</p>
                                            ) : (
                                                <p className="text-red-600 font-bold text-sm mt-1 uppercase">SILANG KLAIM</p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Panel Kanan: Ruang Makan */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="bg-emerald-700 px-6 py-4 flex justify-between items-center">
                        <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse"></div>
                            Monitor Ruang Makan
                        </h2>
                    </div>
                    <div className="p-0 flex-1">
                        {mealLogs.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">Belum ada aktivitas tap makan</div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {mealLogs.map((log) => (
                                    <li key={`meal-${log.meal_log_id}`} className="p-6 hover:bg-gray-50 transition-colors flex items-center justify-between">
                                        <div>
                                            <p className="text-lg font-bold text-gray-900">{log.student.full_name}</p>
                                            <p className="text-sm text-gray-500">{log.student.nis} - Kelas {log.student.student_class}</p>
                                            <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                                Jatah {log.meal_type}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-mono font-medium text-gray-900">{formatTime(log.timestamp)}</p>
                                            <p className="text-emerald-600 font-bold text-sm mt-1 uppercase">✓ BERHASIL</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
