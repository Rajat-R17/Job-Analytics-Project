/* =========================================================
   APP CONFIGURATION & BASE API URL
   Supports switching between local dev & production environments
========================================================= */

window.APP_CONFIG = window.APP_CONFIG || {
  // If deployed to production, update API_BASE_URL or set window.APP_CONFIG.API_BASE_URL
  API_BASE_URL: window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:"
    ? "http://localhost:5000"
    : `${window.location.protocol}//${window.location.host}`
};

const API_BASE_URL = window.APP_CONFIG.API_BASE_URL;
