const RAW_API_URL =
  import.meta.env.VITE_API_URL || "https://sistema-ventas-bb.onrender.com";

export const API_URL = RAW_API_URL.replace(/\/+$/, "");
