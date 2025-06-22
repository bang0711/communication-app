import { getCookies } from "@/lib/get-cookies";
import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Include credentials for cross-origin requests
});

apiClient.interceptors.request.use(async (config) => {
  const { betterAuthCookie } = await getCookies();

  if (betterAuthCookie) {
    config.headers["Authorization"] = `Bearer ${betterAuthCookie.value}`;
    config.headers["session_token"] = `Bearer ${betterAuthCookie.value}`;
  }

  return config;
});
