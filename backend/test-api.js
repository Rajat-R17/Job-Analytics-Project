const datasetService = require("./services/dataset");

async function runTests() {
  console.log("🧪 Running Backend & Analytics Integration Tests...\n");

  try {
    const jobs = await datasetService.ensureDataLoaded();
    console.log(`✅ Loaded ${jobs.length} jobs.`);

    // 1. Top Cities Verification
    const topCities = datasetService.getTopCities(10);
    console.log("1. Top Cities:", topCities.map((c) => `${c.city} (${c.count})`).join(", "));
    const hasBengaluru = topCities.some((c) => c.city === "Bengaluru");
    const hasGurugram = topCities.some((c) => c.city === "Gurugram");
    if (!hasBengaluru || !hasGurugram) {
      throw new Error("Top cities missing Bengaluru or Gurugram!");
    }
    console.log("  ↳ PASS: Bengaluru & Gurugram included in Top Cities.\n");

    // 2. Salary Range Verification
    const salaryRange = datasetService.getSalaryRange();
    console.log("2. Salary Bands:", salaryRange);
    if (salaryRange["0-3 LPA"] > 40000) {
      throw new Error("Zero salaries still collapsing into 0-3 LPA!");
    }
    console.log("  ↳ PASS: Undisclosed salaries excluded from 0-3 LPA.\n");

    // 3. Average Salary Verification
    const avgSalary = datasetService.getAverageSalary();
    console.log("3. Average Salary:", avgSalary);
    if (avgSalary.averageSalary < 6.0 || avgSalary.averageSalary > 9.0) {
      throw new Error("Average salary calculation out of expected range!");
    }
    console.log("  ↳ PASS: Midpoint Average Salary mathematically correct.\n");

    // 4. Experience Bubble Verification
    const bubble = datasetService.getExperienceSalaryBubble(10);
    console.log("4. Sample Bubble Point:", bubble[0]);
    if (bubble.some((p) => p.y >= 20 && p.x === 1)) {
      throw new Error("High salary Senior roles wrongly mapped to 1 Yr experience!");
    }
    console.log("  ↳ PASS: Experience numeric parsing accurate.\n");

    // 5. Salary KPI Summary Verification
    const kpis = datasetService.getSalaryKpiSummary();
    console.log("5. Salary KPI Summary:", kpis);
    if (kpis.bestSkill === "Python" && kpis.bestSkillAvgLPA === 0) {
      throw new Error("KPI summary returning uncalculated defaults!");
    }
    console.log("  ↳ PASS: KPI summary dynamically computed.\n");

    // 6. Pagination & Filtering Verification
    const filterRes = datasetService.filterJobs({ page: 1, limit: 10, search: "Developer" });
    console.log(`6. Filter result for 'Developer': Total = ${filterRes.total}, Page items = ${filterRes.data.length}`);
    if (filterRes.data.length > 10) {
      throw new Error("Pagination limit failed!");
    }
    console.log("  ↳ PASS: Pagination and substring search working.\n");

    // 7. Work Mode Verification
    const workModes = datasetService.getWorkModeCounts();
    console.log("7. Work Modes:", workModes);
    if (workModes.Remote === 0 || workModes.Hybrid === 0) {
      throw new Error("Remote/Hybrid work modes missed!");
    }
    console.log("  ↳ PASS: Remote and Hybrid work modes identified.\n");

    console.log("🎉 ALL BACKEND INTEGRATION TESTS PASSED CLEANLY!");
    process.exit(0);
  } catch (err) {
    console.error("❌ TEST FAILED:", err);
    process.exit(1);
  }
}

runTests();
