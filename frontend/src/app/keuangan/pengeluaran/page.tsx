"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// --- INFER TYPES ---
interface ExpenseCategory {
    category_id: number;
    name: string;
    frequency: string;
    is_active: boolean;
}

interface Expense {
    expense_id: number;
    category_id: number;
    amount: number;
    expense_date: string;
    description: string;
    recorded_by_name: string;
    category?: ExpenseCategory;
}

export default function PengeluaranPage() {
    const router = useRouter();
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Filter state
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const [filterMonth, setFilterMonth] = useState<number>(currentMonth);
    const [filterYear, setFilterYear] = useState<number>(currentYear);

    // New Expense State
    const [newExpense, setNewExpense] = useState({
        category_id: "",
        amount: "",
        expense_date: new Date().toISOString().split('T')[0],
        description: ""
    });

    // New Category Modal State
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newCategoryFrequency, setNewCategoryFrequency] = useState("INSIDENTAL");

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            router.push("/login");
            return;
        }
        fetchData();
    }, [filterMonth, filterYear]);

    const fetchData = async () => {
        setIsLoading(true);
        const token = localStorage.getItem("access_token");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        try {
            // Fetch Categories
            const catRes = await fetch(`${apiUrl}/api/keuangan/pengeluaran/kategori`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (catRes.ok) {
                const catData = await catRes.json();
                setCategories(catData);
            }

            // Fetch Expenses
            const expRes = await fetch(`${apiUrl}/api/keuangan/pengeluaran/?month=${filterMonth}&year=${filterYear}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (expRes.ok) {
                const expData = await expRes.json();
                setExpenses(expData);
            }
        } catch (error) {
            console.error("Failed to fetch pengeluaran metadata:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newExpense.category_id || !newExpense.amount || !newExpense.expense_date) return;

        setIsSaving(true);
        const token = localStorage.getItem("access_token");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        try {
            const response = await fetch(`${apiUrl}/api/keuangan/pengeluaran/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    category_id: parseInt(newExpense.category_id),
                    amount: parseFloat(newExpense.amount),
                    expense_date: newExpense.expense_date,
                    description: newExpense.description
                })
            });

            if (response.ok) {
                setNewExpense({ ...newExpense, amount: "", description: "" });
                fetchData();
                alert("Pengeluaran berhasil dicatat!");
            } else {
                const err = await response.json();
                alert("Gagal: " + (err.detail || "Kesalahan server"));
            }
        } catch (error) {
            alert("Kesalahan jaringan");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName) return;

        const token = localStorage.getItem("access_token");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        try {
            const response = await fetch(`${apiUrl}/api/keuangan/pengeluaran/kategori`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newCategoryName,
                    frequency: newCategoryFrequency,
                    is_active: true
                })
            });

            if (response.ok) {
                setNewCategoryName("");
                setShowCategoryModal(false);
                fetchData();
            } else {
                alert("Gagal menambah kategori (Mungkin nama sudah ada)");
            }
        } catch (error) {
            alert("Kesalahan jaringan");
        }
    };

    const totalExpenseAmount = expenses.reduce((sum, item) => sum + item.amount, 0);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">💸 Pengeluaran Kas</h1>
                    <p className="text-gray-500 mt-1">Catat dan pantau beban operasional bulanan/harian pesantren</p>
                </div>
                <div className="flex gap-4">
                    <select
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(Number(e.target.value))}
                        className="p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>Bulan {m}</option>
                        ))}
                    </select>
                    <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(Number(e.target.value))}
                        className="p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                        {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-6 text-white shadow-lg shadow-red-500/30">
                    <h3 className="text-red-100 mb-1">Total Kas Keluar (Bulan Ini)</h3>
                    <div className="text-4xl font-bold">
                        Rp {totalExpenseAmount.toLocaleString('id-ID')}
                    </div>
                    <div className="mt-4 text-sm text-red-100 flex items-center">
                        <span className="material-icons text-sm mr-1">trending_up</span> Beban operasional dicatat
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Input Kas Keluar */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-fit">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800">Catat Pengeluaran</h2>
                        <button 
                            onClick={() => setShowCategoryModal(true)}
                            className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md hover:bg-emerald-100 transition"
                        >
                            + Kategori Baru
                        </button>
                    </div>
                    
                    <form onSubmit={handleSaveExpense} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                            <input
                                type="date"
                                required
                                value={newExpense.expense_date}
                                onChange={(e) => setNewExpense({...newExpense, expense_date: e.target.value})}
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Pengeluaran</label>
                            <select
                                required
                                value={newExpense.category_id}
                                onChange={(e) => setNewExpense({...newExpense, category_id: e.target.value})}
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                <option value="" disabled>-- Pilih Kategori --</option>
                                {categories.map(c => (
                                    <option key={c.category_id} value={c.category_id}>
                                        {c.name} ({c.frequency})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nominal (Rp)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                placeholder="Contoh: 150000"
                                value={newExpense.amount}
                                onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan Tambahan</label>
                            <textarea
                                rows={2}
                                placeholder="Misal: Bayar tagihan listrik masjid bulan ini"
                                value={newExpense.description}
                                onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition disabled:opacity-50"
                        >
                            {isSaving ? "Menyimpan..." : "Simpan Pencatatan"}
                        </button>
                    </form>
                </div>

                {/* Tabel Riwayat */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h2 className="text-lg font-bold text-gray-800">Riwayat Pengeluaran</h2>
                    </div>
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500">Memuat data...</div>
                    ) : expenses.length === 0 ? (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                            <span className="material-icons text-5xl text-gray-300 mb-4">receipt_long</span>
                            <p>Belum ada pengeluaran dicatat pada bulan ini</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
                                        <th className="p-4 font-medium">Tanggal</th>
                                        <th className="p-4 font-medium">Kategori</th>
                                        <th className="p-4 font-medium">Keterangan</th>
                                        <th className="p-4 font-medium text-right">Nominal (Rp)</th>
                                        <th className="p-4 font-medium">Kasir</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenses.map((expense) => (
                                        <tr key={expense.expense_id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                                            <td className="p-4 text-gray-800 whitespace-nowrap">
                                                {new Date(expense.expense_date).toLocaleDateString('id-ID', {
                                                    day: '2-digit', month: 'short', year: 'numeric'
                                                })}
                                            </td>
                                            <td className="p-4">
                                                <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                                                    {expense.category?.name || "Uncategorized"}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-600 text-sm max-w-xs truncate">
                                                {expense.description || "-"}
                                            </td>
                                            <td className="p-4 text-right font-semibold text-red-600">
                                                {expense.amount.toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-4 text-gray-500 text-sm">
                                                {expense.recorded_by_name}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Tambah Kategori */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-800">Tambah Kategori Baru</h3>
                            <button onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-gray-700">
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleAddCategory} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kategori</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Tagihan Listrik"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Frekuensi</label>
                                <select
                                    value={newCategoryFrequency}
                                    onChange={(e) => setNewCategoryFrequency(e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                >
                                    <option value="HARIAN">Harian</option>
                                    <option value="MINGGUAN">Mingguan</option>
                                    <option value="BULANAN">Bulanan</option>
                                    <option value="INSIDENTAL">Insidental (Sewaktu-waktu)</option>
                                </select>
                            </div>
                            <div className="pt-2">
                                <button type="submit" className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition">
                                    Simpan Kategori
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
