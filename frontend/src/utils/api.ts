export const apiFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("access_token");

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
        // Unauthorized: Token might be expired or invalid
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_role");
        window.location.href = "/login";
    }

    return res;
};
