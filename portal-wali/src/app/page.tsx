"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";

export default function LoginPage() {
  const [nis, setNis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nis.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Cek langsung ke public table students di Supabase menggunakan NIS
      const { data, error: sbError } = await supabase
        .from('students')
        .select('*')
        .eq('nis', nis.trim())
        .single();

      if (sbError || !data) {
        throw new Error("Nomor Induk Santri (NIS) tidak ditemukan.");
      }

      // 2. Jika sukses, simpan sesi sederhana di localStorage/sessionStorage
      sessionStorage.setItem("guardian_session_nis", data.nis);
      sessionStorage.setItem("guardian_session_name", data.full_name);

      // 3. Arahkan ke dashboard wali
      router.push("/dashboard");

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto w-24 h-24 bg-emerald-600 rounded-full flex items-center justify-center shadow-lg mb-4">
          {/* Simple Mosque / Dome Icon placeholder */}
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
        </div>
        <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
          Portal Wali Santri
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Pesantren Nurul Ihsan
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-gray-100">

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="nis" className="block text-sm font-medium text-gray-700">
                Nomor Induk Santri (NIS)
              </label>
              <div className="mt-1">
                <input
                  id="nis"
                  name="nis"
                  type="text"
                  required
                  value={nis}
                  onChange={(e) => setNis(e.target.value)}
                  placeholder="Masukkan NIS putra/putri Anda"
                  className="appearance-none block w-full px-4 py-3 border-2 border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm text-lg transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-50"
              >
                {loading ? "Memverifikasi Data..." : "Masuk ke Dashboard"}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Bantuan Akses</span>
              </div>
            </div>

            <div className="mt-6 text-center text-sm text-gray-600">
              Jika Anda lupa NIS, silakan hubungi <span className="font-semibold text-emerald-600">Tata Usaha Pesantren</span>.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
