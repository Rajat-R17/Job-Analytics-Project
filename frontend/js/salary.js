/* =========================================================
   SALARY PAGE SCRIPT — salary.js
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

/* MAIN SALARY PAGE LOADER */
async function loadSalaryPage() {
  try {
    const [salaryRangeRes, bubbleRes, kpiRes] = await Promise.all([
      fetch(`${API_BASE_URL}/analytics/salary-range`),
      fetch(`${API_BASE_URL}/analytics/experience-salary-bubble?limit=150`),
      fetch(`${API_BASE_URL}/analytics/salary-kpi-summary`)
    ]);

    if (!salaryRangeRes.ok || !bubbleRes.ok || !kpiRes.ok) {
      throw new Error("Failed to load salary analytics data.");
    }

    const salaryRangeData = await salaryRangeRes.json();
    const bubbleData = await bubbleRes.json();
    const kpiData = await kpiRes.json();

    /* 1. HIGHEST SALARY RANGE */
    const nonUndisclosedRanges = Object.entries(salaryRangeData).filter(([key]) => key !== "Undisclosed");
    const highestRange = nonUndisclosedRanges.sort((a, b) => b[1] - a[1])[0]?.[0] || "3-6 LPA";

    /* 2. EXPERIENCE VS SALARY BUBBLE CHART */
    const bubbleCanvas = document.getElementById("salaryBubbleChart");
    if (bubbleCanvas) {
      new Chart(bubbleCanvas, {
        type: "bubble",
        data: {
          datasets: [{
            label: "Salary Intelligence",
            data: bubbleData,
            backgroundColor: "rgba(37, 99, 235, 0.6)",
            borderColor: "#2563eb"
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const point = context.raw;
                  return `Exp: ${point.x} yrs | Salary: ₹${point.y} LPA | ${point.city}`;
                }
              }
            }
          },
          scales: {
            x: {
              title: { display: true, text: "Experience (Years)" },
              beginAtZero: true
            },
            y: {
              title: { display: true, text: "Salary (LPA)" },
              beginAtZero: true
            }
          }
        }
      });
    }

    /* 3. KPI CARD VALUES */
    const topSalaryRangeEl = document.getElementById("topSalaryRange");
    if (topSalaryRangeEl) topSalaryRangeEl.textContent = highestRange;

    const bestSkillEl = document.getElementById("bestSkill");
    if (bestSkillEl) bestSkillEl.textContent = `${kpiData.bestSkill || "N/A"} (${kpiData.bestSkillAvgLPA || 0}L)`;

    const salaryCityEl = document.getElementById("salaryCity");
    if (salaryCityEl) salaryCityEl.textContent = `${kpiData.topCity || "N/A"} (${kpiData.topCityAvgLPA || 0}L)`;

    const topRoleEl = document.getElementById("topRole");
    if (topRoleEl) topRoleEl.textContent = `${kpiData.topExperience || "N/A"} (${kpiData.topExperienceAvgLPA || 0}L)`;

    /* 4. SMART SALARY INSIGHTS */
    const salaryInsightEl = document.getElementById("salaryInsight");
    if (salaryInsightEl) {
      salaryInsightEl.innerHTML = `
        💰 <b>${highestRange}</b> is currently the highest volume salary bracket among disclosed compensation roles.<br><br>
        🚀 <b>${kpiData.bestSkill}</b> leads technical skills with an average compensation of <b>₹${kpiData.bestSkillAvgLPA} LPA</b>.<br><br>
        🏙 <b>${kpiData.topCity}</b> leads average city compensation at <b>₹${kpiData.topCityAvgLPA} LPA</b>.<br><br>
        📈 Professionals in the <b>${kpiData.topExperience}</b> experience bracket command top market compensation (<b>₹${kpiData.topExperienceAvgLPA} LPA</b>).
      `;
    }

  } catch (error) {
    console.error("Salary page loading failed:", error);
  }
}

window.addEventListener("load", loadSalaryPage);