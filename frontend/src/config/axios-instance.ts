import { getCookies } from "@/lib/get-cookies";

import axios from "axios";

export const apiInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

apiInstance.interceptors.request.use(async (config) => {
  const { token } = await getCookies();

  if (token) {
    config.headers["authorization"] = `Bearer ${token.value}`;
  }

  return config;
});
