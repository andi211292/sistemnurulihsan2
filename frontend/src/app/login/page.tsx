"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            // OAuth2PasswordRequestForm expects form-urlencoded
            const formData = new URLSearchParams();
            formData.append("username", username);
            formData.append("password", password);

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://50.50.50.20:8080"}/api/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || "Gagal masuk. Periksa kembali kredensial Anda.");
            }

            const data = await res.json();

            // Simpan token JWT & Role di localStorage
            localStorage.setItem("access_token", data.access_token);
            localStorage.setItem("user_role", data.role);

            // Hapus yang bohongan jika ada
            localStorage.removeItem("dummy_role");

            // Redirect ke dashboard
            router.push("/");
            // Force refresh to reload layouts/components with new auth state
            router.refresh();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center flex-col items-center mb-6">
                    <div className="w-16 h-16 bg-emerald-600 rounded-2xl shadow-lg flex items-center justify-center mb-4 transform rotate-3">
                        <span className="text-3xl">🕌</span>
                    </div>
                    <h2 className="text-center text-3xl font-extrabold text-gray-900">
                        Masuk ke Sistem
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Pesantren Tahfidz Nurul Ihsan
                    </p>
                </div>

                <div className="bg-white py-8 px-4 shadow rounded-2xl sm:px-10 border border-gray-100">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-md">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <span className="text-red-500">⚠️</span>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-red-700">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Username</label>
                            <div className="mt-1">
                                <input
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-gray-50/50"
                                    placeholder="Masukkan username Anda..."
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <div className="mt-1">
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-gray-50/50"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors ${isLoading ? "opacity-75 cursor-not-allowed" : ""}`}
                            >
                                {isLoading ? "Memverifikasi..." : "Masuk"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
