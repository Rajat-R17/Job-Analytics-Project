/* =========================================================
   APP CONFIGURATION & BASE API URL
   Supports switching between local dev & production environments
========================================================= */

window.APP_CONFIG = window.APP_CONFIG || {};

// Support URL query parameter ?api=... or localStorage override
try {
  const urlParams = new URLSearchParams(window.location.search);
  const queryApiUrl = urlParams.get("api") || urlParams.get("apiUrl") || urlParams.get("backend");
  if (queryApiUrl) {
    localStorage.setItem("RENDER_BACKEND_URL", queryApiUrl);
  }
} catch (e) {
  // Ignore URL search params error if restricted
}

// Default Production Render Backend URL
const DEFAULT_RENDER_BACKEND =
  localStorage.getItem("RENDER_BACKEND_URL") ||
  window.APP_CONFIG.RENDER_BACKEND_URL ||
  "https://job-analytics-backend.onrender.com";

function resolveApiBaseUrl() {
  if (window.APP_CONFIG.API_BASE_URL) {
    return window.APP_CONFIG.API_BASE_URL.replace(/\/+$/, "");
  }

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    protocol === "file:";

  if (isLocal) {
    return "http://localhost:5000";
  }

  // Production static frontend (Vercel / Netlify / GitHub Pages) -> Render Backend
  return DEFAULT_RENDER_BACKEND.replace(/\/+$/, "");
}

const API_BASE_URL = resolveApiBaseUrl();
console.log(`🔌 Active API Base URL: ${API_BASE_URL}`);
