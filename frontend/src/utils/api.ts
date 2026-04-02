export const apiFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("access_token");
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    
    // Pastikan URL selalu menggunakan Base URL jika tidak dimulai dengan http
    const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;

    const headers = new Headers(options.headers || {});
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    // Set Default Content-Type to JSON if not provided
    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }

    const res = await fetch(url, {
        ...options,
        headers,
    });

    if (res.status === 401) {
        // HANYA usir user jika token benar-benar ditolak di pintu utama (bukan background stats)
        // Dan pastikan tidak sedang di halaman login agar tidak looping
        if (window.location.pathname !== "/login") {
            console.error("Autentikasi gagal (401), mengalihkan ke login...");
            localStorage.removeItem("access_token");
            localStorage.removeItem("user_role");
            window.location.href = "/login";
        }
    }

    return res;
};
