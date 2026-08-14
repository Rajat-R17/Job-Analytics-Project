const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const datasetService = require("../services/dataset");

const router = express.Router();

const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage configuration with secure random filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `jobs-${Date.now()}${ext === ".csv" ? ".csv" : ".tmp"}`;
    cb(null, safeName);
  }
});

// File filter validation
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  if (ext === ".csv" || mime === "text/csv" || mime === "application/vnd.ms-excel") {
    cb(null, true);
  } else {
    cb(new Error("Invalid file format. Only CSV files (.csv) are allowed."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB max limit
});

// POST /upload
router.post("/", (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No CSV file provided." });
    }

    const uploadedPath = req.file.path;

    try {
      // Reload and activate new dataset in memory
      const newJobs = await datasetService.loadDataset(uploadedPath);

      // Save a copy to uploads/jobs.csv for persistence across server restarts
      const permanentPath = path.join(uploadsDir, "jobs.csv");
      fs.copyFileSync(uploadedPath, permanentPath);

      res.json({
        message: "CSV uploaded and active in memory successfully ✅",
        totalRecords: newJobs.length,
        sampleData: newJobs.slice(0, 5)
      });
    } catch (parseError) {
      // Clean up invalid temporary file
      if (fs.existsSync(uploadedPath)) {
        fs.unlinkSync(uploadedPath);
      }
      res.status(400).json({
        error: "Failed to parse CSV dataset. Ensure valid CSV headers.",
        details: parseError.message
      });
    }
  });
});

module.exports = router;