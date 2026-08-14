/* =========================================================
   AUTHENTICATION & ROUTE GUARD MODULE — auth.js
========================================================= */

(function () {
  // Public pages that do not require authentication guard
  const publicPages = ["signin.html", "signup.html", "login.html"];
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  // Check auth status for protected dashboard pages
  const loggedInUserRaw = localStorage.getItem("loggedInUser");
  const loggedInUser = loggedInUserRaw ? JSON.parse(loggedInUserRaw) : null;

  if (!publicPages.includes(currentPage)) {
    if (!loggedInUser) {
      console.warn("🔒 Unauthenticated access attempt. Redirecting to signin.html");
      window.location.href = "signin.html";
      return;
    }
  } else {
    // If user is already logged in and visits login/signin/signup, redirect to dashboard
    if (loggedInUser && (currentPage === "signin.html" || currentPage === "signup.html" || currentPage === "login.html")) {
      window.location.href = "index.html";
      return;
    }
  }

  // Handle Register Form
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("registerName").value.trim();
      const email = document.getElementById("registerEmail").value.trim();
      const password = document.getElementById("registerPassword").value.trim();

      if (!name || !email || !password) {
        alert("Please fill in all required fields.");
        return;
      }

      const users = JSON.parse(localStorage.getItem("users")) || [];
      const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

      if (existing) {
        alert("An account with this email already exists.");
        return;
      }

      // Store non-sensitive user metadata (without plaintext password in session)
      const newUserProfile = { name, email };
      users.push({ name, email, passwordHash: btoa(password) }); // Basic obfuscation for demo store

      localStorage.setItem("users", JSON.stringify(users));
      localStorage.setItem("loggedInUser", JSON.stringify(newUserProfile));

      window.location.href = "index.html";
    });
  }

  // Handle Login Form
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value.trim();

      const users = JSON.parse(localStorage.getItem("users")) || [];
      const validUser = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && (u.passwordHash === btoa(password) || u.password === password)
      );

      if (!validUser) {
        alert("Invalid email or password credentials.");
        return;
      }

      const userProfile = { name: validUser.name, email: validUser.email };
      localStorage.setItem("loggedInUser", JSON.stringify(userProfile));
      window.location.href = "index.html";
    });
  }

  // Handle Logout Buttons
  document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("loggedInUser");
        window.location.href = "signin.html";
      });
    }
  });
})();