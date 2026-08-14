/* =========================================================
   COMPARATOR PAGE SCRIPT — comparator.js
========================================================= */

let comparisonChart;
let salaryCompareChart;
let radarChart;

const cityA = document.getElementById("cityA");
const cityB = document.getElementById("cityB");
const compareBtn = document.getElementById("compareBtn");

/* LOAD CITY DROPDOWNS */
async function loadCitiesDropdown() {
  try {
    const response = await fetch(`${API_BASE_URL}/analytics/all-cities`);
    if (!response.ok) throw new Error("Failed to load cities list.");

    const cities = await response.json();

    if (cityA && cityB) {
      cityA.innerHTML = "";
      cityB.innerHTML = "";

      cities.forEach((city) => {
        const optA = document.createElement("option");
        optA.value = city;
        optA.textContent = city;

        const optB = document.createElement("option");
        optB.value = city;
        optB.textContent = city;

        cityA.appendChild(optA);
        cityB.appendChild(optB);
      });

      cityA.value = cities.includes("Bengaluru") ? "Bengaluru" : cities[0] || "";
      cityB.value = cities.includes("Pune") ? "Pune" : cities[1] || "";
    }
  } catch (err) {
    console.error("Failed to populate city dropdowns:", err);
  }
}

/* FETCH CITY DATA */
async function fetchCityData(cityName) {
  try {
    const response = await fetch(`${API_BASE_URL}/analytics/filter?city=${encodeURIComponent(cityName)}&limit=100`);
    if (!response.ok) return { data: [], total: 0 };
    return await response.json();
  } catch (err) {
    return { data: [], total: 0 };
  }
}

/* CALCULATION HELPERS */
function getAverageSalary(jobs) {
  if (!jobs || !jobs.length) return 0;
  const valid = jobs.filter((j) => j.salaryMidpoint > 0);
  if (!valid.length) return 0;
  const sum = valid.reduce((acc, j) => acc + j.salaryMidpoint, 0);
  return Number((sum / valid.length / 100000).toFixed(1));
}

function getTopSkill(jobs) {
  if (!jobs || !jobs.length) return "N/A";
  const count = {};
  jobs.forEach((j) => {
    if (!j.tagsAndSkills) return;
    j.tagsAndSkills.split(",").forEach((s) => {
      const clean = s.trim();
      if (clean) count[clean] = (count[clean] || 0) + 1;
    });
  });
  return Object.keys(count).reduce((a, b) => (count[a] > count[b] ? a : b), "N/A");
}

function getTopCompany(jobs) {
  if (!jobs || !jobs.length) return "N/A";
  const count = {};
  jobs.forEach((j) => {
    const c = j.companyName;
    if (c && c !== "N/A") count[c] = (count[c] || 0) + 1;
  });
  return Object.keys(count).reduce((a, b) => (count[a] > count[b] ? a : b), "N/A");
}

function getSalaryBands(jobs) {
  const bands = {
    "0-3 LPA": 0,
    "3-6 LPA": 0,
    "6-10 LPA": 0,
    "10-15 LPA": 0,
    "15-20 LPA": 0,
    "20+ LPA": 0
  };

  if (!jobs) return bands;

  jobs.forEach((j) => {
    if (j.salaryMidpoint <= 0) return;
    const lpa = j.salaryMidpoint / 100000;
    if (lpa <= 3) bands["0-3 LPA"]++;
    else if (lpa <= 6) bands["3-6 LPA"]++;
    else if (lpa <= 10) bands["6-10 LPA"]++;
    else if (lpa <= 15) bands["10-15 LPA"]++;
    else if (lpa <= 20) bands["15-20 LPA"]++;
    else bands["20+ LPA"]++;
  });

  return bands;
}

/* RADAR CHART — NORMALIZED 0-100 SCORES */
function loadCompetitivenessRadar(nameA, nameB, resA, resB) {
  const radarCanvas = document.getElementById("competitivenessRadarChart");
  if (!radarCanvas) return;

  const dataA = resA.data || [];
  const dataB = resB.data || [];

  const totalA = resA.total || dataA.length;
  const totalB = resB.total || dataB.length;

  const avgA = getAverageSalary(dataA);
  const avgB = getAverageSalary(dataB);

  function getSkillCount(data) {
    const set = new Set();
    data.forEach((j) => j.tagsAndSkills && j.tagsAndSkills.split(",").forEach((s) => set.add(s.trim().toLowerCase())));
    return set.size;
  }

  const skillDivA = getSkillCount(dataA);
  const skillDivB = getSkillCount(dataB);

  const maxVol = Math.max(totalA, totalB, 1);
  const maxSal = Math.max(avgA, avgB, 1);
  const maxSkill = Math.max(skillDivA, skillDivB, 1);

  const normA = [
    Math.round((totalA / maxVol) * 100),
    Math.round((avgA / maxSal) * 100),
    Math.round((skillDivA / maxSkill) * 100),
    Math.min(100, Math.round(totalA / 150)),
    Math.min(100, Math.round(skillDivA * 1.5))
  ];

  const normB = [
    Math.round((totalB / maxVol) * 100),
    Math.round((avgB / maxSal) * 100),
    Math.round((skillDivB / maxSkill) * 100),
    Math.min(100, Math.round(totalB / 150)),
    Math.min(100, Math.round(skillDivB * 1.5))
  ];

  if (radarChart) radarChart.destroy();

  radarChart = new Chart(radarCanvas, {
    type: "radar",
    data: {
      labels: ["Job Volume (Index)", "Avg Salary (Index)", "Skill Diversity", "Growth Proxy", "Market Flexibility"],
      datasets: [
        {
          label: `${nameA} (Normalized 0-100)`,
          data: normA,
          backgroundColor: "rgba(37, 99, 235, 0.2)",
          borderColor: "#2563eb",
          pointBackgroundColor: "#2563eb"
        },
        {
          label: `${nameB} (Normalized 0-100)`,
          data: normB,
          backgroundColor: "rgba(16, 185, 129, 0.2)",
          borderColor: "#10b981",
          pointBackgroundColor: "#10b981"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: { stepSize: 20 }
        }
      },
      plugins: { legend: { position: "bottom" } }
    }
  });
}

/* MAIN COMPARISON LOADER */
async function loadComparison() {
  if (!cityA || !cityB) return;

  const nameA = cityA.value || "Bengaluru";
  const nameB = cityB.value || "Pune";

  const resA = await fetchCityData(nameA);
  const resB = await fetchCityData(nameB);

  const dataA = resA.data || [];
  const dataB = resB.data || [];

  const totalA = resA.total || dataA.length;
  const totalB = resB.total || dataB.length;

  const avgA = getAverageSalary(dataA);
  const avgB = getAverageSalary(dataB);

  const topSkillA = getTopSkill(dataA);
  const topSkillB = getTopSkill(dataB);

  const topCompA = getTopCompany(dataA);
  const topCompB = getTopCompany(dataB);

  // Update KPI cards
  const totalJobsEl = document.getElementById("totalJobsCompare");
  if (totalJobsEl) totalJobsEl.textContent = `${nameA}: ${totalA.toLocaleString()} | ${nameB}: ${totalB.toLocaleString()}`;

  const avgSalEl = document.getElementById("avgSalaryCompare");
  if (avgSalEl) avgSalEl.textContent = `${nameA}: ₹${avgA}L | ${nameB}: ₹${avgB}L`;

  const topSkillEl = document.getElementById("topSkillCompare");
  if (topSkillEl) topSkillEl.textContent = `${nameA}: ${topSkillA} | ${nameB}: ${topSkillB}`;

  const topCompEl = document.getElementById("topCompanyCompare");
  if (topCompEl) topCompEl.textContent = `${nameA}: ${topCompA} | ${nameB}: ${topCompB}`;

  // Destroy previous chart instances
  if (comparisonChart) comparisonChart.destroy();
  if (salaryCompareChart) salaryCompareChart.destroy();

  // 1. Jobs + Salary Bar Chart
  const compCanvas = document.getElementById("comparisonChart");
  if (compCanvas) {
    comparisonChart = new Chart(compCanvas, {
      type: "bar",
      data: {
        labels: [nameA, nameB],
        datasets: [
          { label: "Total Jobs", data: [totalA, totalB], backgroundColor: "#3b82f6" },
          { label: "Average Salary (LPA)", data: [avgA, avgB], backgroundColor: "#10b981" }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  // 2. Salary Band Comparison
  const bandsA = getSalaryBands(dataA);
  const bandsB = getSalaryBands(dataB);

  const salCompCanvas = document.getElementById("salaryCompareChart");
  if (salCompCanvas) {
    salaryCompareChart = new Chart(salCompCanvas, {
      type: "bar",
      data: {
        labels: Object.keys(bandsA),
        datasets: [
          { label: nameA, data: Object.values(bandsA), backgroundColor: "#2563eb" },
          { label: nameB, data: Object.values(bandsB), backgroundColor: "#10b981" }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  // 3. Normalized Radar Chart
  loadCompetitivenessRadar(nameA, nameB, resA, resB);

  // 4. Dynamic Insight Summary
  const insightEl = document.getElementById("comparisonInsight");
  if (insightEl) {
    const strongerVol = totalA >= totalB ? nameA : nameB;
    const strongerSal = avgA >= avgB ? nameA : nameB;

    insightEl.innerHTML = `
      📈 <b>${strongerVol}</b> currently leads in total hiring volume (${(totalA >= totalB ? totalA : totalB).toLocaleString()} jobs).<br><br>
      💰 <b>${strongerSal}</b> provides the stronger average salary opportunity (<b>₹${avgA >= avgB ? avgA : avgB} LPA</b>).<br><br>
      🚀 <b>${nameA}</b> top skill is <b>${topSkillA}</b> while <b>${nameB}</b> demands <b>${topSkillB}</b>.
    `;
  }
}

async function initializeComparator() {
  await loadCitiesDropdown();
  await loadComparison();
}

if (compareBtn) {
  compareBtn.addEventListener("click", loadComparison);
}

if (document.readyState === "complete" || document.readyState === "interactive") {
  setTimeout(initializeComparator, 1);
} else {
  window.addEventListener("DOMContentLoaded", initializeComparator);
}