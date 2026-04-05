import re

with open('frontend/src/app/keuangan/pengeluaran/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. State changes
orig1 = """    const currentYear = new Date().getFullYear();
    const [filterMonth, setFilterMonth] = useState<number>(currentMonth);
    const [filterYear, setFilterYear] = useState<number>(currentYear);"""

new1 = """    const currentYear = new Date().getFullYear();
    const [filterMonth, setFilterMonth] = useState<number>(currentMonth);
    const [filterYear, setFilterYear] = useState<number>(currentYear);
    const [userRole, setUserRole] = useState<string>("");
    const [genderScope, setGenderScope] = useState<string>("ALL");"""

# 2. useEffect changes
orig2 = """    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            router.push("/login");
            return;
        }
        fetchData();
    }, [filterMonth, filterYear]);"""

new2 = """    useEffect(() => {
        const token = localStorage.getItem("access_token");
        const role = localStorage.getItem("user_role") || "";
        if (!token) {
            router.push("/login");
            return;
        }
        setUserRole(role);
        
        // Auto lock gender scope if Kasir khusus
        let activeScope = genderScope;
        if (role === "KASIR_SYAHRIYAH_PUTRA") {
            activeScope = "PUTRA";
            setGenderScope("PUTRA");
        } else if (role === "KASIR_SYAHRIYAH_PUTRI") {
            activeScope = "PUTRI";
            setGenderScope("PUTRI");
        }
        
        fetchData(activeScope);
    }, [filterMonth, filterYear, genderScope]);"""

# 3. fetchData changes
orig3 = """    const fetchData = async () => {
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
            });"""

new3 = """    const fetchData = async (scope = genderScope) => {
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
            const scopeQuery = scope !== "ALL" ? `&gender_scope=${scope}` : "";
            const expRes = await fetch(`${apiUrl}/api/keuangan/pengeluaran/?month=${filterMonth}&year=${filterYear}${scopeQuery}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });"""

# 4. POST Changes
orig4 = """                body: JSON.stringify({
                    category_id: parseInt(newExpense.category_id),
                    amount: parseFloat(newExpense.amount),
                    expense_date: newExpense.expense_date,
                    description: newExpense.description
                })"""

new4 = """                body: JSON.stringify({
                    category_id: parseInt(newExpense.category_id),
                    amount: parseFloat(newExpense.amount),
                    expense_date: newExpense.expense_date,
                    description: newExpense.description,
                    gender_scope: genderScope === "ALL" ? null : genderScope
                })"""

# 5. UI Changes
orig5 = """                <div className="flex flex-row w-full sm:w-auto gap-3 sm:gap-4">
                    <select"""

new5 = """                <div className="flex flex-row w-full sm:w-auto gap-3 sm:gap-4 flex-wrap">
                    {/* Render Gender Filter only if not a specific Kasir */}
                    {(userRole !== "KASIR_SYAHRIYAH_PUTRA" && userRole !== "KASIR_SYAHRIYAH_PUTRI") && (
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            {["ALL", "PUTRA", "PUTRI"].map(scope => (
                                <button
                                    key={scope}
                                    onClick={() => setGenderScope(scope)}
                                    className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${genderScope === scope ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                                >
                                    {scope === "ALL" ? "Semua" : scope === "PUTRA" ? "👦 Putra" : "👧 Putri"}
                                </button>
                            ))}
                        </div>
                    )}
                    <select"""

text = text.replace(orig1.replace('\r',''), new1.replace('\r',''))
text = text.replace(orig2.replace('\r',''), new2.replace('\r',''))
text = text.replace(orig3.replace('\r',''), new3.replace('\r',''))
text = text.replace(orig4.replace('\r',''), new4.replace('\r',''))
text = text.replace(orig5.replace('\r',''), new5.replace('\r',''))

with open('frontend/src/app/keuangan/pengeluaran/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
    
print("Frontend Patching Done!")
