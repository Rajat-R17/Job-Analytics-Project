const express = require("express");
const router = express.Router();
const datasetService = require("../services/dataset");

/* Middleware to ensure dataset is loaded */
router.use(async (req, res, next) => {
  try {
    await datasetService.ensureDataLoaded();
    next();
  } catch (err) {
    res.status(500).json({ error: "Failed to initialize job market dataset." });
  }
});

/* =========================================================
   ROUTES
========================================================= */

// GET /analytics/top-skills
router.get("/top-skills", (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  res.json(datasetService.getTopSkills(limit));
});

// GET /analytics/salary-range
router.get("/salary-range", (req, res) => {
  res.json(datasetService.getSalaryRange());
});

// GET /analytics/average-salary
router.get("/average-salary", (req, res) => {
  res.json(datasetService.getAverageSalary());
});

// GET /analytics/filter
router.get("/filter", (req, res) => {
  const result = datasetService.filterJobs(req.query);
  res.json(result);
});

// GET /analytics/all-cities
router.get("/all-cities", (req, res) => {
  res.json(datasetService.getAllCitiesList());
});

// GET /analytics/experience-salary-bubble
router.get("/experience-salary-bubble", (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 200;
  res.json(datasetService.getExperienceSalaryBubble(limit));
});

// GET /analytics/top-companies
router.get("/top-companies", (req, res) => {
  const jobs = datasetService.getJobs();
  const companyCount = {};

  jobs.forEach((job) => {
    const c = job.companyName;
    if (c && c.toLowerCase() !== "unknown" && c.toLowerCase() !== "n/a") {
      companyCount[c] = (companyCount[c] || 0) + 1;
    }
  });

  const result = Object.entries(companyCount)
    .map(([company, count]) => ({ company, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  res.json(result);
});

// GET /analytics/top-states
router.get("/top-states", (req, res) => {
  res.json(datasetService.getTopStates());
});

// GET /analytics/skills-city-heatmap
router.get("/skills-city-heatmap", (req, res) => {
  res.json(datasetService.getSkillsCityHeatmap());
});

// GET /analytics/salary-kpi-summary
router.get("/salary-kpi-summary", (req, res) => {
  res.json(datasetService.getSalaryKpiSummary());
});

// GET /analytics/top-cities
router.get("/top-cities", (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  res.json(datasetService.getTopCities(limit));
});

// GET /analytics/experience-level
router.get("/experience-level", (req, res) => {
  res.json(datasetService.getExperienceLevels());
});

// GET /analytics/remote-onsite
router.get("/remote-onsite", (req, res) => {
  res.json(datasetService.getWorkModeCounts());
});

module.exports = router;