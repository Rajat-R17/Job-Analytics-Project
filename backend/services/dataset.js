const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

/* =========================================================
   STATE & DATA STORE
========================================================= */

let jobsData = [];
let isLoaded = false;
let loadPromise = null;

const DEFAULT_CSV_PATH = fs.existsSync(path.join(__dirname, "../uploads/jobs.csv"))
  ? path.join(__dirname, "../uploads/jobs.csv")
  : path.join(__dirname, "../dataset/jobs.csv");

/* =========================================================
   CITY NORMALIZATION ENGINE
========================================================= */

const CITY_ALIAS_MAP = {
  bangalore: "Bengaluru",
  bengaluru: "Bengaluru",
  gurgaon: "Gurugram",
  gurugram: "Gurugram",
  bombay: "Mumbai",
  mumbai: "Mumbai",
  "navi mumbai": "Navi Mumbai",
  thane: "Thane",
  calcutta: "Kolkata",
  kolkata: "Kolkata",
  madras: "Chennai",
  chennai: "Chennai",
  delhi: "Delhi",
  "new delhi": "Delhi",
  "delhi ncr": "Delhi NCR",
  ncr: "Delhi NCR",
  noida: "Noida",
  "greater noida": "Noida",
  pune: "Pune",
  hyderabad: "Hyderabad",
  ahmedabad: "Ahmedabad",
  jaipur: "Jaipur",
  lucknow: "Lucknow",
  indore: "Indore",
  surat: "Surat",
  kochi: "Kochi",
  cochin: "Kochi",
  chandigarh: "Chandigarh",
  mohali: "Mohali",
  nagpur: "Nagpur",
  coimbatore: "Coimbatore",
  vadodara: "Vadodara",
  baroda: "Vadodara",
  visakhapatnam: "Visakhapatnam",
  vizag: "Visakhapatnam"
};

const CITY_TO_STATE_MAP = {
  Bengaluru: "Karnataka",
  Gurugram: "Haryana",
  Faridabad: "Haryana",
  Mumbai: "Maharashtra",
  "Navi Mumbai": "Maharashtra",
  Thane: "Maharashtra",
  Pune: "Maharashtra",
  Nagpur: "Maharashtra",
  Hyderabad: "Telangana",
  Chennai: "Tamil Nadu",
  Coimbatore: "Tamil Nadu",
  Delhi: "Delhi NCR",
  "Delhi NCR": "Delhi NCR",
  Noida: "Uttar Pradesh",
  Lucknow: "Uttar Pradesh",
  Kolkata: "West Bengal",
  Ahmedabad: "Gujarat",
  Vadodara: "Gujarat",
  Surat: "Gujarat",
  Jaipur: "Rajasthan",
  Kochi: "Kerala",
  Chandigarh: "Punjab",
  Mohali: "Punjab",
  Indore: "Madhya Pradesh",
  Visakhapatnam: "Andhra Pradesh"
};

function normalizeCity(rawLocation) {
  if (!rawLocation || typeof rawLocation !== "string") return "Other";

  let clean = rawLocation
    .replace(/^hybrid\s*-\s*/i, "")
    .replace(/^remote\s*-\s*/i, "")
    .replace(/^work\s+from\s+home\s*-\s*/i, "")
    .split(",")[0]
    .split("/")[0]
    .replace(/\(.*\)/g, "")
    .trim();

  const key = clean.toLowerCase().replace(/\s+/g, " ");

  if (CITY_ALIAS_MAP[key]) {
    return CITY_ALIAS_MAP[key];
  }

  // Substring check for major cities if prefix/suffix attached
  for (const [alias, target] of Object.entries(CITY_ALIAS_MAP)) {
    if (key.includes(alias)) {
      return target;
    }
  }

  if (!clean || clean.toLowerCase() === "india" || clean.toLowerCase() === "n/a") {
    return "Other";
  }

  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/* =========================================================
   SALARY & EXPERIENCE HELPERS
========================================================= */

function isValidSalary(sal) {
  const num = Number(sal);
  return !isNaN(num) && num > 0 && num <= 50000000;
}

function getSalaryMidpoint(job) {
  const min = Number(job.minimumSalary) || 0;
  const max = Number(job.maximumSalary) || 0;

  const validMin = isValidSalary(min);
  const validMax = isValidSalary(max);

  if (validMin && validMax) {
    return (min + max) / 2;
  }
  if (validMin) return min;
  if (validMax) return max;
  return 0;
}

function getSalaryBand(salaryInRupees) {
  if (!isValidSalary(salaryInRupees)) return "Undisclosed";
  const lpa = salaryInRupees / 100000;

  if (lpa <= 3) return "0-3 LPA";
  if (lpa <= 6) return "3-6 LPA";
  if (lpa <= 10) return "6-10 LPA";
  if (lpa <= 15) return "10-15 LPA";
  if (lpa <= 20) return "15-20 LPA";
  return "20+ LPA";
}

function parseExperienceYears(job) {
  const minExp = Number(job.minimumExperience);
  const maxExp = Number(job.maximumExperience);

  if (!isNaN(minExp) && minExp >= 0 && minExp <= 40) {
    if (!isNaN(maxExp) && maxExp >= minExp && maxExp <= 40) {
      return (minExp + maxExp) / 2;
    }
    return minExp;
  }

  // Fallback string parsing
  const expStr = String(job.experience || "").trim();
  const matches = expStr.match(/(\d+)\s*[-to]*\s*(\d*)/i);

  if (matches) {
    const num1 = parseInt(matches[1], 10);
    const num2 = matches[2] ? parseInt(matches[2], 10) : num1;
    if (!isNaN(num1) && num1 <= 40) {
      return !isNaN(num2) && num2 >= num1 && num2 <= 40 ? (num1 + num2) / 2 : num1;
    }
  }

  return 2; // Default median experience
}

function getExperienceBin(years) {
  if (years <= 2) return "0-2 Years";
  if (years <= 5) return "3-5 Years";
  if (years <= 8) return "6-8 Years";
  if (years <= 12) return "9-12 Years";
  if (years <= 15) return "13-15 Years";
  return "16+ Years";
}

function parseWorkMode(job) {
  const combined = (
    (job.location || "") + " " +
    (job.title || "") + " " +
    (job.tagsAndSkills || "")
  ).toLowerCase();

  if (combined.includes("remote") || combined.includes("work from home") || combined.includes("wfh")) {
    return "Remote";
  }
  if (combined.includes("hybrid")) {
    return "Hybrid";
  }
  return "Onsite";
}

/* =========================================================
   DATASET PARSER & LOADER
========================================================= */

function loadDataset(filePath = DEFAULT_CSV_PATH) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ CSV File not found at: ${filePath}`);
      return reject(new Error(`CSV File not found at: ${filePath}`));
    }

    const tempJobs = [];

    fs.createReadStream(filePath)
      .pipe(
        csv({
          separator: ",",
          strict: false,
          skipLines: 0,
          mapHeaders: ({ header }) => header.trim().replace(/^\uFEFF/, "")
        })
      )
      .on("data", (row) => {
        const title = row.title || row["Job Title"] || row.jobTitle || row.Role || "N/A";
        const companyName = row.companyName || row.Company || "N/A";

        if (title !== "N/A" && companyName !== "N/A") {
          const minSal = Number(row.minimumSalary) || 0;
          const maxSal = Number(row.maximumSalary) || 0;
          const minExp = Number(row.minimumExperience);
          const maxExp = Number(row.maximumExperience);

          tempJobs.push({
            jobId: row.jobId || String(tempJobs.length + 1),
            title: title.trim(),
            companyName: companyName.trim(),
            location: (row.location || "N/A").trim(),
            normalizedCity: normalizeCity(row.location),
            experience: (row.experience || "N/A").trim(),
            minimumExperience: !isNaN(minExp) ? minExp : 0,
            maximumExperience: !isNaN(maxExp) ? maxExp : 0,
            minimumSalary: minSal,
            maximumSalary: maxSal,
            salaryMidpoint: getSalaryMidpoint({ minimumSalary: minSal, maximumSalary: maxSal }),
            rawSalary: row.salary || "Not disclosed",
            jobUploaded: (row.jobUploaded || row.Uploaded || "N/A").trim(),
            AggregateRating: (row.AggregateRating || row.Rating || "N/A").trim(),
            tagsAndSkills: (row.tagsAndSkills || row.skills || "").trim(),
            workMode: parseWorkMode(row)
          });
        }
      })
      .on("end", () => {
        jobsData = tempJobs;
        isLoaded = true;
        console.log(`✅ ${jobsData.length} clean jobs active in dataset service`);
        resolve(jobsData);
      })
      .on("error", (err) => {
        console.error("❌ Error parsing CSV dataset:", err);
        reject(err);
      });
  });
}

function ensureDataLoaded() {
  if (isLoaded) return Promise.resolve(jobsData);
  if (!loadPromise) {
    loadPromise = loadDataset();
  }
  return loadPromise;
}

function getJobs() {
  return jobsData;
}

/* =========================================================
   ANALYTICS COMPUTATIONS
========================================================= */

function getTopSkills(limit = 10) {
  const skillCountMap = new Map();
  const skillCasingMap = new Map();

  jobsData.forEach((job) => {
    if (!job.tagsAndSkills) return;
    const skills = job.tagsAndSkills.split(",");
    const seenInJob = new Set();

    skills.forEach((s) => {
      const clean = s.trim();
      if (!clean) return;
      const lower = clean.toLowerCase();

      if (!seenInJob.has(lower)) {
        seenInJob.add(lower);
        skillCountMap.set(lower, (skillCountMap.get(lower) || 0) + 1);

        if (!skillCasingMap.has(lower) || (clean[0] === clean[0].toUpperCase() && clean !== clean.toUpperCase())) {
          skillCasingMap.set(lower, clean);
        }
      }
    });
  });

  return Array.from(skillCountMap.entries())
    .map(([lower, count]) => ({
      skill: skillCasingMap.get(lower) || lower,
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function getSalaryRange() {
  const ranges = {
    "0-3 LPA": 0,
    "3-6 LPA": 0,
    "6-10 LPA": 0,
    "10-15 LPA": 0,
    "15-20 LPA": 0,
    "20+ LPA": 0,
    Undisclosed: 0
  };

  jobsData.forEach((job) => {
    const band = getSalaryBand(job.salaryMidpoint);
    ranges[band] = (ranges[band] || 0) + 1;
  });

  return ranges;
}

function getAverageSalary() {
  let totalMidpoint = 0;
  let validJobs = 0;

  jobsData.forEach((job) => {
    if (job.salaryMidpoint > 0) {
      totalMidpoint += job.salaryMidpoint;
      validJobs++;
    }
  });

  const averageLPA = validJobs > 0 ? Number((totalMidpoint / validJobs / 100000).toFixed(2)) : 0;

  return {
    averageSalary: averageLPA,
    validJobs,
    totalJobs: jobsData.length
  };
}

function getTopCities(limit = 10) {
  const cityCount = {};

  jobsData.forEach((job) => {
    const city = job.normalizedCity;
    if (city && city !== "Other") {
      cityCount[city] = (cityCount[city] || 0) + 1;
    }
  });

  return Object.entries(cityCount)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function getTopStates() {
  const stateCount = {};

  jobsData.forEach((job) => {
    const city = job.normalizedCity;
    const state = CITY_TO_STATE_MAP[city];
    if (state) {
      stateCount[state] = (stateCount[state] || 0) + 1;
    }
  });

  return Object.entries(stateCount)
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count);
}

function getExperienceSalaryBubble(limit = 200) {
  const result = [];

  jobsData.forEach((job) => {
    if (job.salaryMidpoint > 0) {
      const expYears = parseExperienceYears(job);
      const lpa = Number((job.salaryMidpoint / 100000).toFixed(1));

      result.push({
        x: Number(expYears.toFixed(1)),
        y: lpa,
        r: 6,
        city: job.normalizedCity
      });
    }
  });

  return result.slice(0, limit);
}

function getExperienceLevels() {
  const bins = {
    "0-2 Years": 0,
    "3-5 Years": 0,
    "6-8 Years": 0,
    "9-12 Years": 0,
    "13-15 Years": 0,
    "16+ Years": 0
  };

  jobsData.forEach((job) => {
    const years = parseExperienceYears(job);
    const bin = getExperienceBin(years);
    bins[bin] = (bins[bin] || 0) + 1;
  });

  return bins;
}

function getSalaryKpiSummary() {
  // 1. Best paying skill (min 15 jobs with valid salary)
  const skillSalMap = new Map();
  jobsData.forEach((job) => {
    if (job.salaryMidpoint <= 0 || !job.tagsAndSkills) return;
    const skills = job.tagsAndSkills.split(",");
    const seen = new Set();
    skills.forEach((s) => {
      const lower = s.trim().toLowerCase();
      if (lower && !seen.has(lower)) {
        seen.add(lower);
        if (!skillSalMap.has(lower)) {
          skillSalMap.set(lower, { sum: 0, count: 0, original: s.trim() });
        }
        const obj = skillSalMap.get(lower);
        obj.sum += job.salaryMidpoint;
        obj.count += 1;
      }
    });
  });

  let bestSkill = "Python";
  let maxSkillAvg = 0;

  for (const [_, data] of skillSalMap.entries()) {
    if (data.count >= 15) {
      const avg = data.sum / data.count;
      if (avg > maxSkillAvg) {
        maxSkillAvg = avg;
        bestSkill = data.original;
      }
    }
  }

  // 2. Top salary city by average salary (min 15 jobs)
  const citySalMap = {};
  jobsData.forEach((job) => {
    if (job.salaryMidpoint <= 0 || job.normalizedCity === "Other") return;
    if (!citySalMap[job.normalizedCity]) {
      citySalMap[job.normalizedCity] = { sum: 0, count: 0 };
    }
    citySalMap[job.normalizedCity].sum += job.salaryMidpoint;
    citySalMap[job.normalizedCity].count += 1;
  });

  let topCity = "Bengaluru";
  let maxCityAvg = 0;

  Object.entries(citySalMap).forEach(([city, data]) => {
    if (data.count >= 15) {
      const avg = data.sum / data.count;
      if (avg > maxCityAvg) {
        maxCityAvg = avg;
        topCity = city;
      }
    }
  });

  // 3. Highest paying experience band
  const expSalMap = {};
  jobsData.forEach((job) => {
    if (job.salaryMidpoint <= 0) return;
    const bin = getExperienceBin(parseExperienceYears(job));
    if (!expSalMap[bin]) expSalMap[bin] = { sum: 0, count: 0 };
    expSalMap[bin].sum += job.salaryMidpoint;
    expSalMap[bin].count += 1;
  });

  let topExperience = "16+ Years";
  let maxExpAvg = 0;

  Object.entries(expSalMap).forEach(([bin, data]) => {
    if (data.count >= 15) {
      const avg = data.sum / data.count;
      if (avg > maxExpAvg) {
        maxExpAvg = avg;
        topExperience = bin;
      }
    }
  });

  return {
    bestSkill,
    bestSkillAvgLPA: Number((maxSkillAvg / 100000).toFixed(1)),
    topCity,
    topCityAvgLPA: Number((maxCityAvg / 100000).toFixed(1)),
    topExperience,
    topExperienceAvgLPA: Number((maxExpAvg / 100000).toFixed(1))
  };
}

function getSkillsCityHeatmap() {
  const targetCities = ["Bengaluru", "Hyderabad", "Pune", "Mumbai", "Chennai", "Gurugram"];
  const targetSkills = ["Python", "SQL", "Java", "Sales", "Project Management", "Machine Learning"];

  const matrix = [];

  targetSkills.forEach((skill) => {
    const row = { skill };
    targetCities.forEach((city) => (row[city] = 0));

    jobsData.forEach((job) => {
      const skills = (job.tagsAndSkills || "").toLowerCase();
      if (skills.includes(skill.toLowerCase()) && job.normalizedCity) {
        if (targetCities.includes(job.normalizedCity)) {
          row[job.normalizedCity]++;
        }
      }
    });

    matrix.push(row);
  });

  return matrix;
}

function getWorkModeCounts() {
  const counts = {
    Onsite: 0,
    Hybrid: 0,
    Remote: 0
  };

  jobsData.forEach((job) => {
    counts[job.workMode] = (counts[job.workMode] || 0) + 1;
  });

  return counts;
}

function getAllCitiesList() {
  const citySet = new Set();

  jobsData.forEach((job) => {
    if (job.normalizedCity && job.normalizedCity !== "Other") {
      citySet.add(job.normalizedCity);
    }
  });

  return Array.from(citySet).sort((a, b) => a.localeCompare(b));
}

function filterJobs({ skill, city, salary, experience, search, sort, page = 1, limit = 25 }) {
  let filtered = jobsData;

  if (search) {
    const s = search.trim().toLowerCase();
    filtered = filtered.filter(
      (job) =>
        job.title.toLowerCase().includes(s) ||
        job.companyName.toLowerCase().includes(s) ||
        job.tagsAndSkills.toLowerCase().includes(s) ||
        job.normalizedCity.toLowerCase().includes(s)
    );
  }

  if (skill) {
    const sk = skill.trim().toLowerCase();
    filtered = filtered.filter((job) => job.tagsAndSkills.toLowerCase().includes(sk));
  }

  if (city) {
    const c = city.trim().toLowerCase();
    filtered = filtered.filter((job) => job.normalizedCity.toLowerCase() === c || job.location.toLowerCase().includes(c));
  }

  if (experience) {
    const exp = experience.trim();
    filtered = filtered.filter((job) => {
      const bin = getExperienceBin(parseExperienceYears(job));
      return bin.toLowerCase() === exp.toLowerCase() || job.experience.toLowerCase().includes(exp.toLowerCase());
    });
  }

  if (salary) {
    filtered = filtered.filter((job) => {
      const sal = job.salaryMidpoint;
      if (sal <= 0) return salary === "Undisclosed";
      const lpa = sal / 100000;

      if (salary === "0-3") return lpa <= 3;
      if (salary === "3-6") return lpa > 3 && lpa <= 6;
      if (salary === "6-10") return lpa > 6 && lpa <= 10;
      if (salary === "10-15") return lpa > 10 && lpa <= 15;
      if (salary === "15-20") return lpa > 15 && lpa <= 20;
      if (salary === "20+") return lpa > 20;
      return true;
    });
  }

  if (sort === "salary-high") {
    filtered.sort((a, b) => b.salaryMidpoint - a.salaryMidpoint);
  } else if (sort === "salary-low") {
    filtered.sort((a, b) => a.salaryMidpoint - b.salaryMidpoint);
  } else if (sort === "latest") {
    filtered.sort((a, b) => b.jobId.localeCompare(a.jobId));
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

  const total = filtered.length;
  const totalPages = Math.ceil(total / limitNum) || 1;
  const start = (pageNum - 1) * limitNum;
  const paginatedData = filtered.slice(start, start + limitNum);

  return {
    data: paginatedData,
    page: pageNum,
    limit: limitNum,
    total,
    totalPages
  };
}

module.exports = {
  loadDataset,
  ensureDataLoaded,
  getJobs,
  normalizeCity,
  getTopSkills,
  getSalaryRange,
  getAverageSalary,
  getTopCities,
  getTopStates,
  getExperienceSalaryBubble,
  getExperienceLevels,
  getSalaryKpiSummary,
  getSkillsCityHeatmap,
  getWorkModeCounts,
  getAllCitiesList,
  filterJobs
};
