import re

with open('frontend/src/app/keuangan/pengeluaran/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add apiFetch import
import_pattern = r'import \{ useRouter \} from "next/navigation";'
if "apiFetch" not in text:
    text = text.replace(
        'import { useRouter } from "next/navigation";',
        'import { useRouter } from "next/navigation";\nimport { apiFetch } from "@/utils/api";'
    )

# 2. Fix fetchData
orig_fetch1 = """        const token = localStorage.getItem("access_token");
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
            const scopeQuery = scope !== "ALL" ? `&gender_scope=${scope}` : "";
            const expRes = await fetch(`${apiUrl}/api/keuangan/pengeluaran/?month=${filterMonth}&year=${filterYear}${scopeQuery}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });"""

new_fetch1 = """
        try {
            // Fetch Categories
            const catRes = await apiFetch(`/api/keuangan/pengeluaran/kategori`);
            if (catRes.ok) {
                const catData = await catRes.json();
                setCategories(catData);
            }

            // Fetch Expenses
            const scopeQuery = scope !== "ALL" ? `&gender_scope=${scope}` : "";
            const expRes = await apiFetch(`/api/keuangan/pengeluaran/?month=${filterMonth}&year=${filterYear}${scopeQuery}`);"""

text = text.replace(orig_fetch1.replace('\r',''), new_fetch1.replace('\r',''))

# 3. Fix handleSaveExpense
orig_fetch2 = """        const token = localStorage.getItem("access_token");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        try {
            const response = await fetch(`${apiUrl}/api/keuangan/pengeluaran/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },"""

new_fetch2 = """
        try {
            const response = await apiFetch(`/api/keuangan/pengeluaran/`, {
                method: "POST","""

text = text.replace(orig_fetch2.replace('\r',''), new_fetch2.replace('\r',''))

# 4. Fix handleAddCategory
orig_fetch3 = """        const token = localStorage.getItem("access_token");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

        try {
            const response = await fetch(`${apiUrl}/api/keuangan/pengeluaran/kategori`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },"""

new_fetch3 = """
        try {
            const response = await apiFetch(`/api/keuangan/pengeluaran/kategori`, {
                method: "POST","""

text = text.replace(orig_fetch3.replace('\r',''), new_fetch3.replace('\r',''))

with open('frontend/src/app/keuangan/pengeluaran/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Patching API Fetch complete")
