const analyticsRoute = require("./routes/analytics");
const uploadRoute = require("./routes/upload");
const express = require("express");
const cors = require("cors");
const datasetService = require("./services/dataset");

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all origins and preflight requests
app.use(cors());
app.options("*", cors());

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "Job Market Analytics Backend Running 🚀",
    version: "1.0.0"
  });
});

app.use("/upload", uploadRoute);
app.use("/analytics", analyticsRoute);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", err);
  res.status(500).json({ error: "Internal server error", message: err.message });
});

// Pre-load dataset on server boot
datasetService.ensureDataLoaded()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("⚠️ Failed to pre-load dataset on boot:", err);
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`⚠️ Server running on port ${PORT} (Dataset uninitialized)`);
    });
  });