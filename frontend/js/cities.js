/* =========================================================
   CITIES PAGE SCRIPT — cities.js
========================================================= */

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

/* MAIN CITIES PAGE LOADER */
async function loadCitiesPage() {
  try {
    const [topCitiesRes, avgSalaryRes, workModeRes] = await Promise.all([
      fetch(`${API_BASE_URL}/analytics/top-cities?limit=10`),
      fetch(`${API_BASE_URL}/analytics/average-salary`),
      fetch(`${API_BASE_URL}/analytics/remote-onsite`)
    ]);

    if (!topCitiesRes.ok || !avgSalaryRes.ok || !workModeRes.ok) {
      throw new Error("Failed to load cities analytics data.");
    }

    const topCities = await topCitiesRes.json();
    const avgSalaryData = await avgSalaryRes.json();
    const workModes = await workModeRes.json();

    const labels = topCities.map((item) => item.city);
    const counts = topCities.map((item) => item.count);

    /* 1. KPI CARD VALUES */
    const topCityEl = document.getElementById("topCity");
    if (topCityEl) topCityEl.textContent = labels[0] || "N/A";

    const totalCityJobsEl = document.getElementById("totalCityJobs");
    if (totalCityJobsEl) {
      const totalJobsInTopCities = counts.reduce((sum, count) => sum + count, 0);
      totalCityJobsEl.textContent = totalJobsInTopCities.toLocaleString();
    }

    const cityAvgSalaryEl = document.getElementById("cityAvgSalary");
    if (cityAvgSalaryEl) {
      cityAvgSalaryEl.textContent = `₹${avgSalaryData.averageSalary} LPA`;
    }

    const growthCityEl = document.getElementById("growthCity");
    if (growthCityEl) {
      growthCityEl.textContent = labels[1] || "Hyderabad";
    }

    /* 2. MAIN TOP CITIES CHART */
    const citiesCanvas = document.getElementById("citiesChart");
    if (citiesCanvas) {
      new Chart(citiesCanvas, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: "City Demand",
            data: counts,
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

    /* 3. CITY DEMAND VS SALARY COMPARISON CHART */
    const comparisonCanvas = document.getElementById("cityComparisonChart");
    if (comparisonCanvas && topCities.length >= 5) {
      const top5Cities = topCities.slice(0, 5);
      const top5Labels = top5Cities.map((item) => item.city);
      const top5Counts = top5Cities.map((item) => item.count);

      new Chart(comparisonCanvas, {
        type: "bar",
        data: {
          labels: top5Labels,
          datasets: [{
            label: "Job Volume",
            data: top5Counts,
            backgroundColor: "#3b82f6",
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "top" } }
        }
      });
    }

    /* 4. WORK MODE DISTRIBUTION (Replacing static fake chart) */
    const growthCanvas = document.getElementById("cityGrowthChart");
    if (growthCanvas) {
      new Chart(growthCanvas, {
        type: "doughnut",
        data: {
          labels: Object.keys(workModes),
          datasets: [{
            data: Object.values(workModes),
            backgroundColor: ["#2563eb", "#10b981", "#f59e0b"],
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

    /* 5. DYNAMIC CITY INSIGHTS */
    const cityInsightEl = document.getElementById("cityInsight");
    if (cityInsightEl) {
      cityInsightEl.innerHTML = `
        🚀 <b>${labels[0]}</b> leads overall hiring demand with <b>${counts[0]?.toLocaleString()}</b> active job opportunities.<br><br>
        💰 Major hubs continue to offer average compensation of <b>₹${avgSalaryData.averageSalary} LPA</b>.<br><br>
        🔥 <b>${labels[1] || "Hyderabad"}</b> and <b>${labels[2] || "Pune"}</b> follow closely as major tech destinations.
      `;
    }

  } catch (error) {
    console.error("Cities page loading failed:", error);
  }
}

window.addEventListener("load", loadCitiesPage);