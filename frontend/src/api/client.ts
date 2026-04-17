import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pmct.session");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.method && config.method !== "get") {
    config.headers["X-Client-Timestamp"] = new Date().toISOString();
  }
  return config;
});

export default api;

