import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
});

// Attach the JWT to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("smartcoop_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear the session and bounce to login.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("smartcoop_token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// Extracts a human-readable message from an axios error. Surfaces per-field
// validation errors (from zod) when present.
export function apiError(err) {
  const data = err?.response?.data;
  if (data?.errors && typeof data.errors === "object") {
    const parts = Object.values(data.errors).flat().filter(Boolean);
    if (parts.length) return parts.join(" ");
  }
  return data?.message || err?.message || "Something went wrong. Please try again.";
}

export default api;
