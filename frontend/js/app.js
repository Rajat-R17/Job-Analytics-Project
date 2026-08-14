/* =========================================================
   DASHBOARD MAIN SCRIPT — app.js
========================================================= */

/* USER WELCOME SECTION */
const welcomeText = document.getElementById("welcomeText");
const loggedInUserRaw = localStorage.getItem("loggedInUser");
const loggedInUser = loggedInUserRaw ? JSON.parse(loggedInUserRaw) : null;

if (welcomeText && loggedInUser?.name) {
  welcomeText.textContent = `Welcome back, ${loggedInUser.name} 👋`;
}

/* LIVE DATE & TIME */
const liveDate = document.getElementById("liveDate");
function updateDateTime() {
  const now = new Date();
  if (liveDate) {
    liveDate.textContent = now.toLocaleString();
  }
}
setInterval(updateDateTime, 1000);
updateDateTime();

/* ANIMATED KPI COUNTER */
function animateCounter(id, target, prefix = "", suffix = "") {
  const element = document.getElementById(id);
  if (!element) return;

  let current = 0;
  const increment = Math.max(1, Math.floor(target / 60));

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    element.textContent = prefix + current.toLocaleString() + suffix;
  }, 20);
}

/* KPI LOADING */
async function loadKPIs() {
  try {
    const [skillsRes, statesRes, salaryRes, companiesRes, avgSalaryRes] = await Promise.all([
      fetch(`${API_BASE_URL}/analytics/top-skills`),
      fetch(`${API_BASE_URL}/analytics/top-states`),
      fetch(`${API_BASE_URL}/analytics/salary-range`),
      fetch(`${API_BASE_URL}/analytics/top-companies`),
      fetch(`${API_BASE_URL}/analytics/average-salary`)
    ]);

    if (!skillsRes.ok || !statesRes.ok || !salaryRes.ok || !companiesRes.ok || !avgSalaryRes.ok) {
      throw new Error("One or more backend API endpoints returned an error.");
    }

    const skills = await skillsRes.json();
    const states = await statesRes.json();
    const salary = await salaryRes.json();
    const companies = await companiesRes.json();
    const avgSalaryData = await avgSalaryRes.json();

    const totalJobs = avgSalaryData.totalJobs || Object.values(salary).reduce((sum, v) => sum + v, 0);

    animateCounter("totalJobs", totalJobs);

    const topSkillEl = document.getElementById("topSkill");
    if (topSkillEl) topSkillEl.textContent = skills[0]?.skill || "N/A";

    const topCityEl = document.getElementById("topCity");
    if (topCityEl) topCityEl.textContent = states[0]?.state || "N/A";

    const topCompanyEl = document.getElementById("topCompany");
    if (topCompanyEl) topCompanyEl.textContent = companies[0]?.company || "N/A";

    const avgSalaryEl = document.getElementById("avgSalary");
    if (avgSalaryEl) avgSalaryEl.textContent = `₹${avgSalaryData.averageSalary} LPA`;

  } catch (error) {
    console.error("Dashboard KPI loading failed:", error);
    ["topSkill", "topCity", "topCompany", "avgSalary"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = "Error loading";
    });
  }
}

loadKPIs();

/* CHART VARIABLES */
let skillsChart;
let salaryChart;
let companiesChart;
let experienceChart;

/* DASHBOARD CHARTS LOADING */
async function loadCharts() {
  try {
    const [skillsRes, salaryRes, companiesRes, experienceRes] = await Promise.all([
      fetch(`${API_BASE_URL}/analytics/top-skills`),
      fetch(`${API_BASE_URL}/analytics/salary-range`),
      fetch(`${API_BASE_URL}/analytics/top-companies`),
      fetch(`${API_BASE_URL}/analytics/experience-level`)
    ]);

    const skills = await skillsRes.json();
    const salary = await salaryRes.json();
    const companies = await companiesRes.json();
    const experience = await experienceRes.json();

    // Destroy old chart instances before redrawing
    [skillsChart, salaryChart, companiesChart, experienceChart].forEach((chart) => chart && chart.destroy());

    // 1. TOP SKILLS CHART
    const skillsCanvas = document.getElementById("skillsChart");
    if (skillsCanvas) {
      skillsChart = new Chart(skillsCanvas, {
        type: "bar",
        data: {
          labels: skills.map((item) => item.skill),
          datasets: [{
            label: "Demand Count",
            data: skills.map((item) => item.count),
            backgroundColor: "#2563eb",
            borderRadius: 8
          }]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        }
      });
    }

    // 2. SALARY DISTRIBUTION CHART
    const salaryCanvas = document.getElementById("salaryChart");
    if (salaryCanvas) {
      // Filter out undisclosed for visual chart distribution
      const chartLabels = Object.keys(salary).filter((k) => k !== "Undisclosed");
      const chartValues = chartLabels.map((k) => salary[k]);

      salaryChart = new Chart(salaryCanvas, {
        type: "doughnut",
        data: {
          labels: chartLabels,
          datasets: [{
            data: chartValues,
            backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#ef4444"],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "70%",
          plugins: { legend: { position: "bottom" } }
        }
      });
    }

    // 3. TOP COMPANIES CHART
    const companiesCanvas = document.getElementById("companiesChart");
    if (companiesCanvas) {
      companiesChart = new Chart(companiesCanvas, {
        type: "bar",
        data: {
          labels: companies.map((item) => item.company),
          datasets: [{
            label: "Active Jobs",
            data: companies.map((item) => item.count),
            backgroundColor: "#10b981",
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        }
      });
    }

    // 4. EXPERIENCE LEVEL CHART
    const experienceCanvas = document.getElementById("experienceChart");
    if (experienceCanvas) {
      experienceChart = new Chart(experienceCanvas, {
        type: "bar",
        data: {
          labels: Object.keys(experience),
          datasets: [{
            label: "Job Opportunities",
            data: Object.values(experience),
            backgroundColor: "#8b5cf6",
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        }
      });
    }

    // 5. SMART MARKET SUMMARY
    const topCompany = companies[0]?.company || "N/A";
    const topSkill = skills[0]?.skill || "N/A";
    const insightCard = document.getElementById("insightCard");

    if (insightCard) {
      insightCard.innerHTML = `
        💻 <b>${topSkill}</b> currently leads skill demand across top hiring roles.<br><br>
        🏢 <b>${topCompany}</b> is the leading recruiter by active job volume.<br><br>
        💰 Compensation remains highly competitive across tech and analytics hubs.
      `;
    }

  } catch (error) {
    console.error("Dashboard chart loading failed:", error);
  }
}

loadCharts();

/* INDIA HEATMAP */
if (typeof google !== "undefined" && google.charts) {
  google.charts.load("current", { packages: ["geochart"] });
  google.charts.setOnLoadCallback(drawIndiaMap);
}

async function drawIndiaMap() {
  const mapElement = document.getElementById("indiaMap");
  if (!mapElement) return;

  try {
    const response = await fetch(`${API_BASE_URL}/analytics/top-states`);
    if (!response.ok) throw new Error("Failed to fetch state hiring data");
    const states = await response.json();

    const dataArray = [["State", "Jobs"]];
    states.forEach((item) => {
      dataArray.push([item.state, item.count]);
    });

    const data = google.visualization.arrayToDataTable(dataArray);
    const options = {
      region: "IN",
      displayMode: "regions",
      resolution: "provinces",
      colorAxis: { colors: ["#e0f2fe", "#0284c7"] }
    };

    const chart = new google.visualization.GeoChart(mapElement);
    chart.draw(data, options);
  } catch (error) {
    console.error("India map loading failed:", error);
  }
}