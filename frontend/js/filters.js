/* =========================================================
   FILTERS.JS — Job Explorer & Search Controller
========================================================= */

let currentPage = 1;
const rowsPerPage = 25;
let currentTotalPages = 1;
let currentFilteredJobs = [];

const searchInput = document.getElementById("jobSearch");
const locationFilter = document.getElementById("locationFilter");
const experienceFilter = document.getElementById("experienceFilter");
const salaryFilter = document.getElementById("salaryFilter");
const sortFilter = document.getElementById("sortFilter");

const tableBody = document.getElementById("jobsTableBody");

const totalJobsEl = document.getElementById("totalJobs");
const highestSalaryEl = document.getElementById("highestSalary");
const topCompanyEl = document.getElementById("topCompany");
const topLocationEl = document.getElementById("topLocation");

const pageInfo = document.getElementById("pageInfo");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");

const exportCsvBtn = document.getElementById("exportCsvBtn");

/* POPULATE DROPDOWNS FROM BACKEND */
async function populateDropdowns() {
  try {
    const [citiesRes, expRes] = await Promise.all([
      fetch(`${API_BASE_URL}/analytics/all-cities`),
      fetch(`${API_BASE_URL}/analytics/experience-level`)
    ]);

    if (citiesRes.ok && locationFilter) {
      const cities = await citiesRes.json();
      locationFilter.innerHTML = `<option value="">All Locations</option>`;
      cities.forEach((city) => {
        const opt = document.createElement("option");
        opt.value = city;
        opt.textContent = city;
        locationFilter.appendChild(opt);
      });
    }

    if (expRes.ok && experienceFilter) {
      const expBins = await expRes.json();
      experienceFilter.innerHTML = `<option value="">All Experience</option>`;
      Object.keys(expBins).forEach((bin) => {
        const opt = document.createElement("option");
        opt.value = bin;
        opt.textContent = bin;
        experienceFilter.appendChild(opt);
      });
    }
  } catch (err) {
    console.error("Failed to populate filter dropdowns:", err);
  }
}

/* FETCH & RENDER JOBS (PAGINATED FROM BACKEND) */
async function loadJobsExplorer() {
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">Loading job opportunities...</td></tr>`;

  const search = searchInput?.value.trim() || "";
  const city = locationFilter?.value || "";
  const experience = experienceFilter?.value || "";
  const salary = salaryFilter?.value || "";
  const sort = sortFilter?.value || "latest";

  const queryParams = new URLSearchParams({
    page: currentPage,
    limit: rowsPerPage,
    search,
    city,
    experience,
    salary,
    sort
  });

  try {
    const response = await fetch(`${API_BASE_URL}/analytics/filter?${queryParams.toString()}`);
    if (!response.ok) throw new Error("Failed to fetch filtered jobs.");

    const result = await response.json();

    currentFilteredJobs = result.data || [];
    currentTotalPages = result.totalPages || 1;

    updateKPIs(result.total, currentFilteredJobs);
    renderJobsTable(currentFilteredJobs);
    updatePagination(result.page, result.totalPages);

  } catch (error) {
    console.error("Failed to load jobs explorer:", error);
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#ef4444;">Failed to load job listings. Please check backend connection.</td></tr>`;
  }
}

/* UPDATE OVERVIEW KPIS */
function updateKPIs(total, jobs) {
  if (totalJobsEl) totalJobsEl.textContent = total.toLocaleString();

  if (!jobs.length) {
    if (highestSalaryEl) highestSalaryEl.textContent = "₹0";
    if (topCompanyEl) topCompanyEl.textContent = "N/A";
    if (topLocationEl) topLocationEl.textContent = "N/A";
    return;
  }

  let highest = 0;
  const companyCount = {};
  const locationCount = {};

  jobs.forEach((j) => {
    const sal = j.salaryMidpoint || j.maximumSalary || 0;
    if (sal > highest) highest = sal;

    if (j.companyName && j.companyName !== "N/A") {
      companyCount[j.companyName] = (companyCount[j.companyName] || 0) + 1;
    }
    if (j.normalizedCity && j.normalizedCity !== "Other") {
      locationCount[j.normalizedCity] = (locationCount[j.normalizedCity] || 0) + 1;
    }
  });

  const topComp = Object.keys(companyCount).reduce((a, b) => (companyCount[a] > companyCount[b] ? a : b), "N/A");
  const topLoc = Object.keys(locationCount).reduce((a, b) => (locationCount[a] > locationCount[b] ? a : b), "N/A");

  if (highestSalaryEl) highestSalaryEl.textContent = highest > 0 ? `₹${(highest / 100000).toFixed(1)} LPA` : "Undisclosed";
  if (topCompanyEl) topCompanyEl.textContent = topComp;
  if (topLocationEl) topLocationEl.textContent = topLoc;
}

/* RENDER JOBS TABLE */
function renderJobsTable(jobs) {
  tableBody.innerHTML = "";

  if (!jobs.length) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">No jobs found matching the selected filters.</td></tr>`;
    return;
  }

  jobs.forEach((job) => {
    const row = document.createElement("tr");
    const salText = job.salaryMidpoint > 0
      ? `₹${(job.minimumSalary / 100000).toFixed(1)}L - ₹${(job.maximumSalary / 100000).toFixed(1)}L PA`
      : job.rawSalary || "Not disclosed";

    row.innerHTML = `
      <td><strong>${job.title || "N/A"}</strong></td>
      <td>${job.companyName || "N/A"}</td>
      <td>${job.location || "N/A"}</td>
      <td>${job.experience || "N/A"}</td>
      <td><span style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-weight: 500;">${salText}</span></td>
      <td>${job.jobUploaded || "N/A"}</td>
      <td>${job.AggregateRating !== "N/A" ? `${job.AggregateRating} ⭐` : "N/A"}</td>
    `;
    tableBody.appendChild(row);
  });
}

/* PAGINATION CONTROLS */
function updatePagination(page, totalPages) {
  if (pageInfo) pageInfo.textContent = `Page ${page} of ${totalPages}`;
  if (prevPageBtn) prevPageBtn.disabled = page <= 1;
  if (nextPageBtn) nextPageBtn.disabled = page >= totalPages;
}

if (prevPageBtn) {
  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      loadJobsExplorer();
    }
  });
}

if (nextPageBtn) {
  nextPageBtn.addEventListener("click", () => {
    if (currentPage < currentTotalPages) {
      currentPage++;
      loadJobsExplorer();
    }
  });
}

/* CSV EXPORT */
function exportToCSV() {
  if (!currentFilteredJobs.length) {
    alert("No jobs available to export.");
    return;
  }

  const headers = ["Job Title", "Company", "Location", "Experience", "Salary", "Uploaded", "Rating"];
  const rows = currentFilteredJobs.map((job) => [
    `"${job.title || "N/A"}"`,
    `"${job.companyName || "N/A"}"`,
    `"${job.location || "N/A"}"`,
    `"${job.experience || "N/A"}"`,
    `"${job.rawSalary || "Not disclosed"}"`,
    `"${job.jobUploaded || "N/A"}"`,
    `"${job.AggregateRating || "N/A"}"`
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `job-market-report-page${currentPage}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

if (exportCsvBtn) {
  exportCsvBtn.addEventListener("click", exportToCSV);
}

/* REGISTER SINGLE EVENT LISTENERS */
let searchDebounce;
function setupEventListeners() {
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        currentPage = 1;
        loadJobsExplorer();
      }, 400);
    });

    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        currentPage = 1;
        loadJobsExplorer();
      }
    });
  }

  [locationFilter, experienceFilter, salaryFilter, sortFilter].forEach((element) => {
    if (element) {
      element.addEventListener("change", () => {
        currentPage = 1;
        loadJobsExplorer();
      });
    }
  });
}

async function initializeExplorer() {
  await populateDropdowns();
  setupEventListeners();
  await loadJobsExplorer();
}

initializeExplorer();