import axios from "axios";
import { API_URL } from "@/config/config";

/**
 * Client HTTP ke backend (origin dari `API_URL`).
 *
 * Backend harus mengizinkan origin dev client di CORS_ORIGINS-nya, karena
 * browser request lintas origin langsung ke API.
 */
export const apiServer = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});
