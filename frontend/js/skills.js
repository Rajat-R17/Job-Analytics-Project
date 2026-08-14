/* =========================================================
   SKILLS PAGE SCRIPT — skills.js
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

/* RENDER CLEAN HTML/CSS HEATMAP MATRIX */
function renderHeatmapMatrix(heatmapData) {
  const container = document.getElementById("skillsHeatmap");
  if (!container) return;

  if (!heatmapData || !heatmapData.length) {
    container.innerHTML = "<p style='padding:20px; text-align:center;'>No heatmap data available.</p>";
    return;
  }

  const cities = ["Bengaluru", "Hyderabad", "Pune", "Mumbai", "Chennai", "Gurugram"];

  let maxVal = 1;
  heatmapData.forEach((row) => {
    cities.forEach((c) => {
      if (row[c] && row[c] > maxVal) maxVal = row[c];
    });
  });

  let html = `
    <div style="overflow-x: auto; width: 100%;">
      <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 0.9rem;">
        <thead>
          <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 12px; text-align: left;">Skill</th>
  `;

  cities.forEach((city) => {
    html += `<th style="padding: 12px;">${city}</th>`;
  });

  html += `</tr></thead><tbody>`;

  heatmapData.forEach((row) => {
    html += `<tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 12px; text-align: left; font-weight: 600; color: #1e293b;">${row.skill}</td>`;

    cities.forEach((city) => {
      const val = row[city] || 0;
      const intensity = Math.min(1, val / maxVal);
      const bgColor = val > 0 ? `rgba(37, 99, 235, ${Math.max(0.1, intensity.toFixed(2))})` : "#f8fafc";
      const textColor = intensity > 0.5 ? "#ffffff" : "#1e293b";

      html += `<td style="padding: 12px; background-color: ${bgColor}; color: ${textColor}; font-weight: 500; border-radius: 4px;" title="${row.skill} in ${city}: ${val} jobs">
        ${val.toLocaleString()}
      </td>`;
    });

    html += `</tr>`;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

/* MAIN SKILLS PAGE LOADER */
async function loadSkillsPage() {
  try {
    const [skillsRes, salaryRes, heatmapRes] = await Promise.all([
      fetch(`${API_BASE_URL}/analytics/top-skills`),
      fetch(`${API_BASE_URL}/analytics/average-salary`),
      fetch(`${API_BASE_URL}/analytics/skills-city-heatmap`)
    ]);

    if (!skillsRes.ok || !salaryRes.ok || !heatmapRes.ok) {
      throw new Error("Failed to load skills data.");
    }

    const skillsData = await skillsRes.json();
    const salaryData = await salaryRes.json();
    const heatmapData = await heatmapRes.json();

    const topSkill = skillsData[0]?.skill || "Python";
    const topCount = skillsData[0]?.count || 0;
    const premiumSkill = skillsData[1]?.skill || "Machine Learning";

    // 1. KPI Cards
    const topSkillNameEl = document.getElementById("topSkillName");
    if (topSkillNameEl) topSkillNameEl.textContent = topSkill;

    const skillJobsEl = document.getElementById("skillJobs");
    if (skillJobsEl) skillJobsEl.textContent = topCount.toLocaleString();

    const skillSalaryEl = document.getElementById("skillSalary");
    if (skillSalaryEl) skillSalaryEl.textContent = `₹${salaryData.averageSalary} LPA`;

    const futureSkillEl = document.getElementById("futureSkill");
    if (futureSkillEl) futureSkillEl.textContent = premiumSkill;

    // 2. Render Heatmap Matrix
    renderHeatmapMatrix(heatmapData);

    // 3. Smart Skill Insights
    const skillInsightEl = document.getElementById("skillInsight");
    if (skillInsightEl) {
      skillInsightEl.innerHTML = `
        🚀 <b>${topSkill}</b> leads overall hiring demand with <b>${topCount.toLocaleString()}</b> active postings.<br><br>
        💰 Professionals mastering <b>${topSkill}</b> and <b>${premiumSkill}</b> achieve stronger salary acceleration.<br><br>
        🔥 <b>${premiumSkill}</b> remains a high-value premium skill across tech hubs.
      `;
    }

    // 4. Learning Path Roadmap
    const learningPathEl = document.getElementById("learningPath");
    if (learningPathEl) {
      learningPathEl.innerHTML = `
        <li>Master core ${topSkill} fundamentals</li>
        <li>Pair with database & API development (SQL / Node.js)</li>
        <li>Build 2 full-stack analytics portfolio projects</li>
        <li>Learn cloud deployment & automated CI/CD pipelines</li>
        <li>Add system design & algorithm optimization skills</li>
      `;
    }

  } catch (error) {
    console.error("Skills page loading failed:", error);
    const topSkillNameEl = document.getElementById("topSkillName");
    if (topSkillNameEl) topSkillNameEl.textContent = "Connecting...";
  }
}

if (document.readyState === "complete" || document.readyState === "interactive") {
  setTimeout(loadSkillsPage, 1);
} else {
  window.addEventListener("DOMContentLoaded", loadSkillsPage);
}